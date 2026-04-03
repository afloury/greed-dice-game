# Greed (10,000) Dice Game

A Vue 3 implementation of the classic dice game "10,000" (also known as Greed or Farkle). Play against the computer or challenge a friend online in real-time multiplayer.

**Play now:** [greed.antd3v.com](https://greed.antd3v.com)

## Game Rules

### Basic Setup

- 5 dice game
- 2 players (vs Computer or vs Player Online)
- First to reach 10,000 points wins
- Minimum qualifying score: configurable (default 1,000 points)

### Scoring System

| Combination | Points |
|-------------|--------|
| Single 1 | 100 |
| Single 5 | 50 |
| Three of a kind | Number x 100 (e.g., three 3s = 300) |
| Three 1s | 1,000 |
| Four of a kind | Double three-of-a-kind value |
| Five of a kind | Triple three-of-a-kind value |
| Straight (1-2-3-4-5 or 2-3-4-5-6) | 1,500 |

### Game Flow

1. Player rolls all 5 dice
2. Select valid scoring dice
3. Choose to either:
   - Reroll remaining dice
   - Bank points and end turn
4. Turn ends if:
   - Player chooses to bank points
   - No scoring dice in a roll (Nenette/Bust)

## Features

- **Online Multiplayer** — Real-time WebSocket multiplayer via Cloudflare Durable Objects
- **Computer AI** — Play against a computer opponent with configurable difficulty
- **Reconnection** — Refresh the page mid-game and reconnect without losing state
- **i18n** — English and French (with "Nenette" for bust in French!)
- **Sound effects** — Dice rolling sounds with volume control
- **Responsive design** — Works on desktop and mobile
- **Dev tools** — Built-in dev panel for testing

## Tech Stack

- **Frontend:** Vue 3 (Composition API), Pinia, TypeScript, Tailwind CSS, Vite
- **Multiplayer:** Cloudflare Workers + Durable Objects (WebSocket relay)
- **Hosting:** Cloudflare Workers with static assets (free tier)
- **Local dev:** Node.js WebSocket server mirroring DO behavior

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server (single player only)
pnpm run dev

# Start dev server with multiplayer support
pnpm run dev:all

# Build for production
pnpm run build

# Deploy to Cloudflare
pnpm run build && npx wrangler deploy
```

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Vite dev server |
| `pnpm run dev-host` | Vite dev server (exposed on network) |
| `pnpm run dev:all` | Vite + local multiplayer server (concurrent) |
| `pnpm run worker:dev` | Wrangler local dev (uses workerd) |
| `pnpm run worker:dev-local` | Node.js multiplayer server (port 8787) |
| `pnpm run build` | Type-check + production build |
| `pnpm run worker:deploy` | Deploy worker to Cloudflare |

## Project Structure

```
src/
├── pages/                  # Route-level components
│   ├── GameMenu.vue        # Main menu (game mode selection)
│   ├── GameBoard.vue       # Game board (gameplay + multiplayer wiring)
│   ├── MultiplayerLobby.vue # Room creation / join UI
│   └── Playground.vue      # WebRTC playground (legacy)
├── components/             # Reusable UI components
│   ├── BaseButton.vue
│   ├── SelectorButton.vue
│   ├── ComputerAI.vue
│   ├── DiceDisplay.vue
│   ├── DiceFace.vue
│   ├── DiceControls.vue
│   ├── GameScoring.vue
│   ├── GameSettings.vue
│   └── DevPanel.vue
├── composables/            # Reusable logic
│   ├── useMultiplayer.ts   # WebSocket client, reconnection, state sync
│   ├── useComputerAI.ts    # Computer opponent logic
│   ├── useGameSound.ts     # Sound effects
│   ├── useScoringEngine.ts # Dice scoring calculations
│   └── useDevActions.ts    # Dev panel actions
├── stores/
│   └── gameStore.ts        # Pinia store (game state, host authority)
├── types/
│   ├── game.ts             # Game state types
│   └── multiplayer.ts      # Message protocol types
├── i18n/                   # Translations (en.ts, fr.ts)
├── router.ts               # Vue Router config
├── main.ts                 # App entry point
└── style.css               # Global styles

worker/
├── src/
│   ├── index.ts            # Worker entrypoint (HTTP routes, asset serving)
│   └── game-room.ts        # Durable Object (WebSocket relay)
└── dev-server.ts           # Local dev server (mirrors DO behavior)

docs/
└── multiplayer.md          # Detailed multiplayer architecture docs

wrangler.toml               # Cloudflare Workers config
```

## Multiplayer Architecture

The multiplayer uses a **host-authoritative relay** pattern:

1. Host creates a room, gets a 6-character code
2. Guest joins with the code
3. Both connect via WebSocket to a Cloudflare Durable Object
4. The DO relays messages between host and guest (no game logic server-side)
5. Host sends full game state on every change; guest applies it
6. Guest sends actions (roll, select die, bank); host processes them

See [docs/multiplayer.md](docs/multiplayer.md) for the full technical documentation.

## License

MIT
