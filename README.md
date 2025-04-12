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
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Technologies Used

- Vue 3 with Composition API
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
src/
├── components/
│   ├── GameBoard.vue    # Main game interface
│   └── ComputerAI.vue   # Computer player logic
├── composables/
│   └── useGameStore.ts  # Game state management
├── types/
│   └── game.ts          # TypeScript interfaces
└── style.css            # Global styles
```

## License

MIT
