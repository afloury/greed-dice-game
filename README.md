# 10,000 Dice Game

A Vue 3 implementation of the classic dice game "10,000" (also known as Farkle). Play against the computer and be the first to reach 10,000 points!

## Game Rules

### Basic Setup

- 5 dice game
- 2 players (Human vs Computer)
- First to reach 10,000 points wins
- Minimum qualifying score: 1,000 points

### Scoring System

- Single 1: 100 points
- Single 5: 50 points
- Three of a kind: number × 100 (e.g., three 3s = 300 points)
- Three 1s: 1,000 points
- Four of a kind: double three of a kind points
- Five of a kind: triple three of a kind points
- Straight (1-2-3-4-5 or 2-3-4-5-6): 1,500 points

### Game Flow

1. Player rolls all 5 dice
2. Select valid scoring dice
3. Choose to either:
   - Reroll remaining dice
   - Bank points and end turn
4. Turn ends if:
   - Player chooses to bank points
   - No scoring dice in a roll (bust)

## Project Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

## Technologies Used

- Vue 3 with Composition API
- Pinia (state management)
- TypeScript
- Tailwind CSS
- Vite

## Features

- Interactive dice selection
- Computer AI opponent
- Score tracking
- Game state management
- Responsive design
- Visual feedback for game status

## Project Structure

```
public/                 # Static assets (e.g., dice-roll.mp3, dice.svg)
src/
├── App.vue             # App root
├── assets/             # Static assets (e.g., vue.svg)
├── components/         # Vue components
│   ├── ComputerAI.vue
│   ├── DevPanel.vue
│   ├── DiceControls.vue
│   ├── DiceDisplay.vue
│   ├── DiceFace.vue
│   ├── GameBoard.vue
│   ├── GameMenu.vue
│   ├── GameScoring.vue
│   ├── GameSettings.vue
│   └── HelloWorld.vue
├── composables/        # (currently empty)
├── i18n/               # Internationalization files (en.ts, fr.ts, index.ts)
├── main.ts             # App entry point (sets up Pinia, mounts app)
├── stores/             # Pinia stores (gameStore.ts)
├── style.css           # Global styles
├── types/              # TypeScript interfaces (game.ts)
├── vite-env.d.ts       # Vite env types
index.html              # Main HTML file
vite.config.ts          # Vite config
pnpm-lock.yaml          # pnpm lockfile
package.json            # Project metadata & scripts
```

### Key Scripts

- `pnpm install` — Install dependencies
- `pnpm run dev` — Start development server
- `pnpm run build` — Build for production
- `pnpm run preview` — Preview production build

### Additional Info

- **State management** is handled by Pinia (see `src/stores/gameStore.ts`).
- **Internationalization** is available in English and French (see `src/i18n/`).
- **Audio/Visual assets** are in `public/` and `src/assets/`.
- **Dev tools**: Includes a `DevPanel` component for debugging or development features.
- **Type safety**: All logic and data structures are written in TypeScript.
- **Responsive & Accessible**: The UI is built with Tailwind CSS for responsive design.

---

## License

MIT
