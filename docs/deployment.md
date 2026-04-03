# Cloudflare Deployment Guide

This documents how the game is deployed to Cloudflare Workers, serving both the Vue SPA and the multiplayer WebSocket relay from a single worker on a custom domain.

## Architecture

```
greed.antd3v.com
  ├── /api/rooms       → Worker (create room)
  ├── /api/ws          → Worker → Durable Object (WebSocket relay)
  └── /*               → Static assets (Vue SPA with index.html fallback)
```

Everything runs on a single Cloudflare Worker. The worker handles API routes directly, proxies WebSocket connections to Durable Objects, and falls through to static assets for everything else.

## Prerequisites

- Node.js and pnpm installed
- A Cloudflare account (free tier is sufficient)
- `wrangler` CLI (installed as a dev dependency)

## Initial Setup (done once)

### 1. Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser for OAuth. Verify with:

```bash
npx wrangler whoami
```

### 2. Create the KV namespace

We initially used KV for signaling before switching to Durable Objects. The current setup uses only Durable Objects, but if you ever need KV:

```bash
npx wrangler kv namespace create SIGNAL_KV
```

This outputs an `id` to put in `wrangler.toml`.

### 3. Configure `wrangler.toml`

```toml
name = "greed-game-worker"
main = "worker/src/index.ts"
compatibility_date = "2024-12-01"

# Custom domain — requires the domain to be on Cloudflare DNS
routes = [
  { pattern = "greed.antd3v.com", custom_domain = true }
]

# Serve the Vue SPA build output as static assets
[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"  # serves index.html for unknown paths

# Durable Object for WebSocket relay rooms
[[durable_objects.bindings]]
name = "GAME_ROOMS"
class_name = "GameRoom"

# Required migration — free tier requires new_sqlite_classes (not new_classes)
[[migrations]]
tag = "v1"
new_sqlite_classes = ["GameRoom"]
```

Key decisions:
- **`not_found_handling = "single-page-application"`** — Without this, refreshing on `/lobby` or `/game/ABC123` returns 404 because no static file exists at that path. This tells Cloudflare to serve `index.html` for any path that doesn't match a static file.
- **`new_sqlite_classes`** — The free tier requires SQLite-backed Durable Objects. Using `new_classes` instead will fail with error `10097`.
- **`binding = "ASSETS"`** — The worker code uses `env.ASSETS.fetch(request)` to serve static files for non-API routes.

### 4. Worker code for asset serving

In `worker/src/index.ts`, the worker handles API routes and falls through to static assets:

```typescript
interface Env {
  GAME_ROOMS: DurableObjectNamespace<GameRoom>
  ASSETS: Fetcher  // bound to static assets
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // API routes...
    if (url.pathname === "/api/rooms" && request.method === "POST") { ... }
    if (url.pathname === "/api/ws") { ... }

    // Everything else → static assets (Vue SPA)
    return env.ASSETS.fetch(request)
  },
}
```

### 5. Custom domain

The `routes` config with `custom_domain = true` tells Cloudflare to:
1. Create a DNS record for `greed.antd3v.com` pointing to the worker
2. Provision an SSL certificate automatically
3. Route all traffic for that subdomain to the worker

**Prerequisite:** The parent domain (`antd3v.com`) must already be on Cloudflare DNS.

DNS propagation typically takes 1-2 minutes.

## Deploying

### Build and deploy

```bash
pnpm run build && npx wrangler deploy
```

This:
1. Runs `vue-tsc -b` (type checking) then `vite build` → outputs to `dist/`
2. Uploads new/changed static assets to Cloudflare
3. Deploys the worker code
4. Applies any pending Durable Object migrations

### Deploy output

```
🌀 Building list of assets...
✨ Read 7 files from dist/
🌀 Found 3 new or modified static assets to upload.
✨ Success! Uploaded 3 files (3 already uploaded)

Your Worker has access to the following bindings:
  env.GAME_ROOMS (GameRoom)   Durable Object
  env.ASSETS                  Assets

Uploaded greed-game-worker (10s)
Deployed greed-game-worker triggers (3s)
  greed.antd3v.com (custom domain)
```

Only changed assets are uploaded — Cloudflare deduplicates by content hash.

## Cloudflare Free Tier Limits

| Resource | Free Tier Limit | Our Usage |
|----------|----------------|-----------|
| Workers requests | 100,000/day | ~6 req/s per active game |
| Durable Object requests | 100,000/day | 1 DO per game room |
| Durable Object duration | 13,000 GB-s/day | Minimal (relay only) |
| Workers Assets | Unlimited sites | 1 |
| KV reads | 100,000/day | Not currently used |
| KV writes | 1,000/day | Not currently used |

More than enough for casual multiplayer games.

## Troubleshooting

### `error 10097: must create a namespace using new_sqlite_classes`

Free tier requires SQLite-backed Durable Objects. Change `new_classes` to `new_sqlite_classes` in the `[[migrations]]` section.

### `workerd` platform mismatch

If `node_modules` were installed on a different platform (e.g., Linux ARM in Docker), wrangler commands fail. Fix:

```bash
pnpm install  # reinstalls native binaries for current platform
```

### `workers_dev` disabled warning

When using a custom domain, the default `*.workers.dev` subdomain is disabled. To keep both:

```toml
workers_dev = true
```

### SPA routes return 404

Make sure `not_found_handling = "single-page-application"` is set in the `[assets]` section.

## Local Development

For local development without Cloudflare:

```bash
pnpm run dev:all
```

This runs:
- **Vite** on port 5173 (proxies `/api` → port 8787)
- **Node.js dev server** on port 8787 (mirrors Durable Object behavior using in-memory state and the `ws` library)

The dev server (`worker/dev-server.ts`) replicates the DO WebSocket relay so multiplayer works locally without `workerd`.
