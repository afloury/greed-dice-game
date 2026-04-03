# Multiplayer Architecture

## Overview

The multiplayer system uses a **host-authoritative relay architecture**. A Cloudflare Durable Object acts as a WebSocket relay between two players. The host holds the game state and is the single source of truth; the guest sends actions and receives state updates.

**Stack:**
- **Frontend:** Vue 3 + Pinia (reactive state management)
- **Relay server:** Cloudflare Durable Object with WebSocket Hibernation API
- **Transport:** Native WebSockets (no library)
- **Hosting:** Cloudflare Workers (free tier) with static assets at `greed.antd3v.com`
- **Local dev:** Node.js HTTP + `ws` server replicating DO behavior

## File Map

| File | Role |
|------|------|
| `src/types/multiplayer.ts` | Message protocol types |
| `src/composables/useMultiplayer.ts` | WebSocket client singleton |
| `src/pages/MultiplayerLobby.vue` | Room creation / join UI |
| `src/pages/GameBoard.vue` | Multiplayer event wiring, reconnection |
| `src/stores/gameStore.ts` | Host-authoritative state, action processing |
| `worker/src/index.ts` | Worker entrypoint, HTTP routes |
| `worker/src/game-room.ts` | Durable Object relay |
| `worker/dev-server.ts` | Local dev server (mirrors DO) |
| `wrangler.toml` | Cloudflare deployment config |

## Message Protocol

### Room Lifecycle

| Message | Direction | Payload |
|---------|-----------|---------|
| `room:created` | Server → Host | `{ roomCode }` |
| `room:joined` | Server → Guest | `{ roomCode, hostName }` |
| `room:player-joined` | Server → Host | `{ guestName }` |
| `room:player-left` | Server → Other | `{ playerId }` |
| `room:player-reconnected` | Server → Other | `{ playerId }` |
| `room:error` | Server → Client | `{ message }` |
| `room:closed` | Server → Both | — |

### Game Messages

| Message | Direction | Payload |
|---------|-----------|---------|
| `game:state-sync` | Host → Guest (via relay) | `{ state: GameState }` |
| `game:action` | Guest → Host (via relay) | `{ action: GuestAction }` |

### Guest Actions

```typescript
type GuestAction =
  | { kind: "roll" }
  | { kind: "select-die"; index: number }
  | { kind: "deselect-die"; index: number }
  | { kind: "bank" }
```

### Heartbeat

`ping` / `pong` every 15 seconds to keep the connection alive.

## Connection Flow

### Creating a Game (Host)

```
1. POST /api/rooms → { roomCode: "ABC123" }
2. Open WebSocket: wss://greed.antd3v.com/api/ws?room=ABC123&role=host&name=Alice
3. Receive: room:created
4. Wait for guest...
5. Receive: room:player-joined { guestName: "Bob" }
6. Navigate to /game/ABC123
```

### Joining a Game (Guest)

```
1. Open WebSocket: wss://greed.antd3v.com/api/ws?room=ABC123&role=guest&name=Bob
2. Receive: room:joined { roomCode, hostName: "Alice" }
3. Navigate to /game/ABC123
```

### Gameplay Loop

```
Host action (roll, select die, bank):
  → gameState mutates locally
  → deep watcher fires (50ms debounce)
  → sendGameState() → WebSocket → DO relay → Guest
  → Guest: applyRemoteState(state)

Guest action (roll, select die, bank):
  → sendAction({ kind, ... }) → WebSocket → DO relay → Host
  → Host: handleRemoteAction(action) → executes locally
  → gameState mutates → synced back to Guest (same flow as above)
```

## Durable Object (Relay Server)

The `GameRoom` Durable Object (`worker/src/game-room.ts`) is a stateful WebSocket relay:

- **No game logic** — it only forwards messages between host and guest
- **2 connections max** — one per role, tagged with `"host"` or `"guest"`
- **Reconnection-aware** — detects if a role was previously filled and sends `room:player-reconnected` instead of `room:player-joined`
- **Socket replacement** — old sockets are closed with reason `"Replaced by reconnection"`, which suppresses the `player-left` notification
- **Auto-cleanup** — rooms close after 5 minutes of inactivity (both players disconnected)

### Message Routing

| Sender | Message Type | Forwarded To |
|--------|-------------|--------------|
| Host | `game:state-sync` | Guest |
| Guest | `game:action` | Host |
| Either | `ping` | Responded locally with `pong` |

## Reconnection

### WebSocket Auto-Reconnect

The `useMultiplayer` composable has built-in reconnection:
- Triggered when a connected WebSocket closes unexpectedly
- Exponential backoff: 1s, 2s, 4s (max 3 attempts)
- Connection state transitions: `connected → reconnecting → connected` (or `disconnected` on failure)

### Page Refresh Recovery

When a player refreshes the browser mid-game:

1. **On game start**, session info is saved to `sessionStorage`:
   ```json
   {
     "mp_session": { "role": "host", "name": "Alice", "code": "ABC123", "guestName": "Bob", "qualificationScore": 500 },
     "mp_gameState": "{ ... full GameState JSON ... }"
   }
   ```

2. **On page load**, `GameBoard.vue` detects the room code in the URL (`/game/:code`), reads session storage, restores game state, and calls `reconnectToRoom()` with the saved role.

3. **The Durable Object** detects the reconnection (role was previously filled), closes the stale socket, and notifies the other player via `room:player-reconnected`.

4. **The other player** dismisses the "Opponent Disconnected" overlay and (if host) re-sends the current game state.

Session storage is cleared when the game component unmounts (navigating away or starting a new game).

## Deployment

### Production (Cloudflare)

```bash
pnpm run build          # Vue SPA → dist/
npx wrangler deploy     # Worker + static assets → greed.antd3v.com
```

The worker serves both the API (`/api/*`) and static assets (SPA with fallback to `index.html`).

**Cloudflare resources used (all free tier):**
- Workers — entrypoint, HTTP routing
- Durable Objects (SQLite-backed) — WebSocket relay per room
- Workers Assets — static file hosting with SPA routing

### Local Development

```bash
pnpm run dev:all
# Runs concurrently:
#   - Vite dev server (port 5173, proxies /api → 8787)
#   - Node.js dev server (port 8787, mirrors DO behavior with in-memory state + ws)
```

The dev server (`worker/dev-server.ts`) replicates the Durable Object relay using an in-memory `Map<string, Room>` and the `ws` library. This allows development without `workerd` (useful in Docker/ARM environments).

### Wrangler Config

```toml
name = "greed-game-worker"
main = "worker/src/index.ts"
compatibility_date = "2024-12-01"
routes = [{ pattern = "greed.antd3v.com", custom_domain = true }]

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

[[durable_objects.bindings]]
name = "GAME_ROOMS"
class_name = "GameRoom"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["GameRoom"]
```

## Design Decisions

- **Host-authoritative** — prevents cheating; guest state is always replaced wholesale by host state
- **Durable Objects over WebRTC** — WebRTC required STUN/TURN servers and had NAT traversal issues; DO WebSockets are simpler and work everywhere
- **No game logic in the relay** — the DO is a dumb pipe; all game rules run in the host's browser
- **Debounced sync (50ms)** — prevents flooding the WebSocket during rapid state changes (e.g., dice animations)
- **Session persistence** — `sessionStorage` survives page refresh but not tab close, which is the right scope for a game session
