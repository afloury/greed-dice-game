import { ref, computed } from "vue"
import type { GameState, Player, Die, ScoringRule } from "../types/game"
import { SCORING_RULES } from "../types/game"

const MIN_QUALIFYING_SCORE = 1000
const WINNING_SCORE = 10000

export function useGameStore() {
  const gameState = ref<GameState>({
    players: [
      {
        id: 0,
        name: "Player",
        totalScore: 0,
        isQualified: false,
        isComputer: false,
      },
      {
        id: 1,
        name: "Computer",
        totalScore: 0,
        isQualified: false,
        isComputer: true,
      },
    ],
    currentPlayer: 0,
    currentTurnScore: 0,
    dice: Array(5)
      .fill(null)
      .map(() => ({
        value: 1,
        isSelected: false,
        isLocked: false,
      })),
    gamePhase: "QUALIFICATION",
    isGameOver: false,
    lastRollScore: 0,
    potentialScore: 0,
    isFirstRoll: true,
  })

  const currentPlayer = computed(
    () => gameState.value.players[gameState.value.currentPlayer]
  )
  const isPlayerTurn = computed(() => !currentPlayer.value.isComputer)
  const canRoll = computed(() =>
    gameState.value.dice.some((die) => !die.isLocked)
  )
  const canKeepScore = computed(() => {
    const totalScore =
      gameState.value.currentTurnScore + gameState.value.potentialScore
    return (
      totalScore > 0 &&
      (currentPlayer.value.isQualified || totalScore >= MIN_QUALIFYING_SCORE)
    )
  })

  function rollDice() {
    // Add potential score to current turn score and reset potential score
    gameState.value.currentTurnScore += gameState.value.potentialScore
    gameState.value.potentialScore = 0

    // Reset lastRollScore before rolling new dice
    if (!gameState.value.isFirstRoll) {
      gameState.value.lastRollScore = 0
    }

    // Lock any selected dice
    gameState.value.dice.forEach((die) => {
      if (die.isSelected) {
        die.isLocked = true
        die.isSelected = false
      }
    })

    // Check if all dice are locked, and if so, unlock them all for a fresh roll
    const allLocked = gameState.value.dice.every((die) => die.isLocked)
    if (allLocked) {
      gameState.value.dice.forEach((die) => {
        die.isLocked = false
      })
    }

    // Roll any unlocked dice
    let hasRolledDice = false
    gameState.value.dice.forEach((die) => {
      if (!die.isLocked) {
        die.value = Math.floor(Math.random() * 6) + 1
        die.isSelected = false
        hasRolledDice = true
      }
    })

    // After the very first roll, set isFirstRoll to false
    if (gameState.value.isFirstRoll) {
      gameState.value.isFirstRoll = false
    }

    // Calculate score only for newly rolled dice
    if (hasRolledDice) {
      calculateRollScore()
    }
  }

  function calculateRollScore() {
    // Get newly rolled dice (unlocked and not selected)
    const rolledDice = gameState.value.dice
      .filter((die) => !die.isLocked && !die.isSelected)
      .map((die) => die.value)
      .sort()

    // Check if there are any scoring combinations in the roll
    let score = 0
    let remainingDice = [...rolledDice]

    // Check for straights only if we rolled all 5 dice
    if (rolledDice.length === 5) {
      const isStraight1 = [1, 2, 3, 4, 5].every((num) =>
        rolledDice.includes(num)
      )
      const isStraight2 = [2, 3, 4, 5, 6].every((num) =>
        rolledDice.includes(num)
      )

      if (isStraight1 || isStraight2) {
        score += 1500
        remainingDice = []
      }
    }

    if (remainingDice.length > 0) {
      // Process scoring combinations (in order of priority)
      // First look for sets of 3 or more
      const valueCounts: Record<number, number> = {}
      remainingDice.forEach((value) => {
        valueCounts[value] = (valueCounts[value] || 0) + 1
      })

      // Check for triplets (3 of a kind)
      for (let value = 1; value <= 6; value++) {
        if (valueCounts[value] && valueCounts[value] >= 3) {
          if (value === 1) {
            score += 1000 // Three 1s = 1000 points
          } else {
            score += value * 100 // Three of value = value * 100 points
          }
          // Remove these dice from consideration
          let countToRemove = 3
          remainingDice = remainingDice.filter((v) => {
            if (v === value && countToRemove > 0) {
              countToRemove--
              return false // Remove this die
            }
            return true // Keep this die
          })
        }
      }

      // Then check for individual 1s and 5s
      remainingDice.forEach((value) => {
        if (value === 1) {
          score += 100 // Single 1 = 100 points
        } else if (value === 5) {
          score += 50 // Single 5 = 50 points
        }
      })
    }

    // Set last roll score to what we just calculated
    gameState.value.lastRollScore = score

    // If no scoring dice in the roll and no previously locked dice, it's a bust
    const noPreviouslyLockedDice = !gameState.value.dice.some(
      (die) => die.isLocked
    )

    if (score === 0 && noPreviouslyLockedDice) {
      // Bust - lose all current turn points and end turn
      gameState.value.currentTurnScore = 0
      endTurn()
    }
  }

  function calculatePotentialScore() {
    // Get selected dice values
    const selectedDice = gameState.value.dice
      .filter((die) => die.isSelected)
      .map((die) => die.value)
      .sort()

    if (selectedDice.length === 0) {
      gameState.value.potentialScore = 0
      return 0
    }

    let score = 0
    let remainingDice = [...selectedDice]

    // Check for straights
    if (selectedDice.length === 5) {
      const isStraight1 = [1, 2, 3, 4, 5].every((num) =>
        selectedDice.includes(num)
      )
      const isStraight2 = [2, 3, 4, 5, 6].every((num) =>
        selectedDice.includes(num)
      )

      if (isStraight1 || isStraight2) {
        score = 1500
        remainingDice = []
      }
    }

    if (remainingDice.length > 0) {
      // Process scoring combinations (in order of priority)
      // First look for sets of 3 or more
      const valueCounts: Record<number, number> = {}
      remainingDice.forEach((value) => {
        valueCounts[value] = (valueCounts[value] || 0) + 1
      })

      // Check for triplets (3 of a kind)
      for (let value = 1; value <= 6; value++) {
        if (valueCounts[value] && valueCounts[value] >= 3) {
          if (value === 1) {
            score += 1000 // Three 1s = 1000 points
          } else {
            score += value * 100 // Three of value = value * 100 points
          }
          // Remove these dice from consideration
          let countToRemove = 3
          remainingDice = remainingDice.filter((v) => {
            if (v === value && countToRemove > 0) {
              countToRemove--
              return false // Remove this die
            }
            return true // Keep this die
          })
        }
      }

      // Then check for individual 1s and 5s in the remaining dice
      remainingDice.forEach((value) => {
        if (value === 1) {
          score += 100 // Single 1 = 100 points
        } else if (value === 5) {
          score += 50 // Single 5 = 50 points
        }
      })
    }

    gameState.value.potentialScore = score
    return score
  }

  function toggleDieSelection(index: number) {
    if (!isPlayerTurn.value || gameState.value.dice[index].isLocked) return

    gameState.value.dice[index].isSelected =
      !gameState.value.dice[index].isSelected

    // Calculate potential score after selection change
    calculatePotentialScore()
  }

  function keepScore() {
    if (!canKeepScore.value) return

    const player = currentPlayer.value
    // Add both current turn score and potential score
    player.totalScore +=
      gameState.value.currentTurnScore + gameState.value.potentialScore

    if (!player.isQualified && player.totalScore >= MIN_QUALIFYING_SCORE) {
      player.isQualified = true
      gameState.value.gamePhase = "NORMAL"
    }

    if (player.totalScore >= WINNING_SCORE) {
      gameState.value.isGameOver = true
      gameState.value.gamePhase = "END_GAME"
    }

    endTurn()
  }

  function endTurn() {
    gameState.value.currentTurnScore = 0
    gameState.value.lastRollScore = 0
    gameState.value.potentialScore = 0
    gameState.value.isFirstRoll = true
    gameState.value.dice.forEach((die) => {
      die.isLocked = false
      die.isSelected = false
    })
    gameState.value.currentPlayer =
      (gameState.value.currentPlayer + 1) % gameState.value.players.length
  }

  function resetGame() {
    gameState.value = {
      players: [
        {
          id: 0,
          name: "Player",
          totalScore: 0,
          isQualified: false,
          isComputer: false,
        },
        {
          id: 1,
          name: "Computer",
          totalScore: 0,
          isQualified: false,
          isComputer: true,
        },
      ],
      currentPlayer: 0,
      currentTurnScore: 0,
      dice: Array(5)
        .fill(null)
        .map(() => ({
          value: 1,
          isSelected: false,
          isLocked: false,
        })),
      gamePhase: "QUALIFICATION",
      isGameOver: false,
      lastRollScore: 0,
      potentialScore: 0,
      isFirstRoll: true,
    }
  }

  return {
    gameState,
    currentPlayer,
    isPlayerTurn,
    canRoll,
    canKeepScore,
    rollDice,
    toggleDieSelection,
    keepScore,
    resetGame,
  }
}
