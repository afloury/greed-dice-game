import type { Ref, ComputedRef } from "vue"
import type { GameState } from "../types/game"

interface DevActionsDeps {
  gameState: Ref<GameState>
  minQualifyingScore: ComputedRef<number>
  calculateRollScore: () => void
  calculatePotentialScore: () => number
}

export function useDevActions(deps: DevActionsDeps) {
  const { gameState, minQualifyingScore, calculateRollScore, calculatePotentialScore } = deps

  function updatePlayerScore(playerIndex: number, score: number) {
    if (score >= 0 && score <= 10000) {
      const player = { ...gameState.value.players[playerIndex] }
      player.totalScore = score
      if (score >= minQualifyingScore.value) {
        player.isQualified = true
      }
      gameState.value.players[playerIndex] = player
    }
  }

  function qualifyPlayer(playerIndex: number) {
    const player = { ...gameState.value.players[playerIndex] }
    player.isQualified = true
    gameState.value.players[playerIndex] = player
  }

  function setGameOver(isOver: boolean) {
    gameState.value.isGameOver = isOver
  }

  function updateDieValue(dieIndex: number, value: number) {
    if (value >= 1 && value <= 6) {
      const die = { ...gameState.value.dice[dieIndex] }
      die.value = value
      gameState.value.dice[dieIndex] = die
      calculateRollScore()
      calculatePotentialScore()
    }
  }

  return { updatePlayerScore, qualifyPlayer, setGameOver, updateDieValue }
}
