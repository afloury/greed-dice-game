export interface Player {
  id: number
  name: string
  totalScore: number
  isQualified: boolean
  isComputer: boolean
}

export interface Die {
  value: number
  isSelected: boolean
  isLocked: boolean
}

export interface GameState {
  players: Player[]
  currentPlayer: number
  currentTurnScore: number
  dice: Die[]
  gamePhase: "QUALIFICATION" | "NORMAL" | "END_GAME"
  isGameOver: boolean
  lastRollScore: number
  potentialScore: number
  isFirstRoll: boolean
}

export interface ScoringRule {
  pattern: number[]
  points: number
  description: string
}

export const SCORING_RULES: ScoringRule[] = [
  { pattern: [1], points: 100, description: "Single 1" },
  { pattern: [5], points: 50, description: "Single 5" },
  { pattern: [1, 1, 1], points: 1000, description: "Three 1s" },
  { pattern: [2, 2, 2], points: 200, description: "Three 2s" },
  { pattern: [3, 3, 3], points: 300, description: "Three 3s" },
  { pattern: [4, 4, 4], points: 400, description: "Three 4s" },
  { pattern: [5, 5, 5], points: 500, description: "Three 5s" },
  { pattern: [6, 6, 6], points: 600, description: "Three 6s" },
  { pattern: [1, 2, 3, 4, 5], points: 1500, description: "Straight 1-5" },
  { pattern: [2, 3, 4, 5, 6], points: 1500, description: "Straight 2-6" },
]
