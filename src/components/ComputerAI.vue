<template>
  <div
    v-if="isComputerTurn || (computerStartsAfterBust && gameState.isBust)"
    class="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-center mb-4"
  >
    <p class="text-lg font-semibold">{{ computerActionText }}</p>
    <p class="text-sm mt-1">{{ computerThoughtText }}</p>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, computed, ref } from "vue"
import { useGameStore } from "../composables/useGameStore"

interface DieWithIndex {
  index: number
  value: number
  isLocked: boolean
  isSelected: boolean
}

const computerThoughtText = ref("Deciding what to do...")
const computerActionText = computed(() => {
  if (gameState.value.isBust && computerStartsAfterBust.value) {
    return "Player busted! Computer's turn..."
  }
  return "Computer is thinking..."
})

const { gameState, currentPlayer, rollDice, keepScore } = useGameStore()

// Check if it's the computer's turn
const isComputerTurn = computed(
  () =>
    gameState.value.players[gameState.value.currentPlayer].isComputer &&
    !gameState.value.isGameOver
)

// Check if computer will play next after a player bust
const computerStartsAfterBust = computed(() => {
  const nextPlayerIndex =
    (gameState.value.currentPlayer + 1) % gameState.value.players.length
  return gameState.value.players[nextPlayerIndex].isComputer
})

function selectBestScoringDice() {
  // Get all unlocked dice that aren't selected
  const unlockedDice = gameState.value.dice
    .map((die, index) => ({
      index,
      value: die.value,
      isLocked: die.isLocked,
      isSelected: die.isSelected,
    }))
    .filter((die) => !die.isLocked && !die.isSelected)

  // If no unlocked dice, nothing to select
  if (unlockedDice.length === 0) {
    console.log("No unlocked dice found")
    return false
  }

  // Group dice by values for easier processing
  const diceByValue: Record<number, DieWithIndex[]> = {}
  unlockedDice.forEach((die) => {
    const key = die.value
    if (!diceByValue[key]) {
      diceByValue[key] = []
    }
    diceByValue[key].push(die)
  })

  // First priority: Check for straights if all 5 dice are available
  if (unlockedDice.length === 5) {
    const values = unlockedDice.map((die) => die.value).sort()
    const isStraight1 = [1, 2, 3, 4, 5].every((num) => values.includes(num))
    const isStraight2 = [2, 3, 4, 5, 6].every((num) => values.includes(num))

    if (isStraight1 || isStraight2) {
      // Select all dice if straight
      unlockedDice.forEach((die) => {
        gameState.value.dice[die.index].isSelected = true
      })
      return true
    }
  }

  // Second priority: Select sets of three of a kind
  let foundScoringDice = false
  for (const valueStr in diceByValue) {
    const value = Number(valueStr)
    if (diceByValue[value] && diceByValue[value].length >= 3) {
      // Select exactly three dice of this value
      diceByValue[value].slice(0, 3).forEach((die) => {
        gameState.value.dice[die.index].isSelected = true
      })
      foundScoringDice = true
      // Don't break, we want to find all sets
    }
  }

  // Third priority: Select individual 1s and 5s (if not part of a set already)
  if (diceByValue[1] && diceByValue[1].length < 3) {
    diceByValue[1].forEach((die) => {
      if (!gameState.value.dice[die.index].isSelected) {
        gameState.value.dice[die.index].isSelected = true
        foundScoringDice = true
      }
    })
  }

  if (diceByValue[5] && diceByValue[5].length < 3) {
    diceByValue[5].forEach((die) => {
      if (!gameState.value.dice[die.index].isSelected) {
        gameState.value.dice[die.index].isSelected = true
        foundScoringDice = true
      }
    })
  }

  return foundScoringDice
}

function makeComputerDecision() {
  if (!isComputerTurn.value || gameState.value.isBust) return

  // Add a check for the case where all dice are locked
  const allDiceLocked = gameState.value.dice.every((die) => die.isLocked)
  if (allDiceLocked) {
    // All dice are locked, so roll them all
    computerThoughtText.value = "All dice are locked. Rolling them all again!"
    setTimeout(() => rollDice(), 700)
    return
  }

  computerThoughtText.value = "Analyzing the dice..."

  setTimeout(() => {
    const cp = gameState.value.players[gameState.value.currentPlayer]
    const currentScore = gameState.value.currentTurnScore
    const totalScore = cp.totalScore + currentScore

    // Try to select scoring dice
    const foundScoringDice = selectBestScoringDice()

    // Calculate potential score after selection
    // This is handled by the toggleDieSelection in the store
    // We just need to wait for the score to be calculated
    setTimeout(() => {
      const potentialScore = gameState.value.potentialScore
      const totalAvailable = currentScore + potentialScore

      // Count remaining unlocked and unselected dice
      const remainingDice = gameState.value.dice.filter(
        (die) => !die.isLocked && !die.isSelected
      ).length

      if (!foundScoringDice && remainingDice === 0) {
        // No scoring dice and no dice to roll, must end turn
        computerThoughtText.value = "No scoring combinations found. Turn ends."
        setTimeout(() => keepScore(), 700)
        return
      }

      if (!foundScoringDice && currentScore === 0) {
        // No scoring dice, but we can roll again
        computerThoughtText.value = "No scoring combinations. Rolling again."
        setTimeout(() => rollDice(), 700)
        return
      }

      // Decision logic based on game phase
      if (!cp.isQualified) {
        // Qualification Phase - try to reach 1000 points
        if (totalAvailable >= 1000) {
          computerThoughtText.value =
            "Reached qualification threshold! Banking points."
          setTimeout(() => keepScore(), 700)
        } else {
          computerThoughtText.value =
            "Still need more points to qualify. Rolling again."
          setTimeout(() => rollDice(), 700)
        }
      } else if (totalScore + potentialScore >= 9000) {
        // End Game Phase - more conservative
        if (potentialScore > 0) {
          const keepChance = Math.random() < 0.75
          if (keepChance) {
            computerThoughtText.value =
              "Getting close to winning. Banking points."
            setTimeout(() => keepScore(), 700)
          } else {
            computerThoughtText.value = "Almost there! One more roll."
            setTimeout(() => rollDice(), 700)
          }
        } else if (currentScore > 0) {
          // Already have points, be safe
          computerThoughtText.value = "Already have points, playing it safe."
          setTimeout(() => keepScore(), 700)
        } else {
          // No points yet, need to roll
          computerThoughtText.value = "Need more points. Rolling."
          setTimeout(() => rollDice(), 700)
        }
      } else {
        // Normal Phase - decision based on dice remaining
        if (potentialScore === 0 && currentScore === 0) {
          // No points yet, need to roll
          computerThoughtText.value = "No points yet. Rolling the dice."
          setTimeout(() => rollDice(), 700)
          return
        }

        let keepChance = 0
        switch (remainingDice) {
          case 1:
            keepChance = 0.9
            break // 90% chance to keep with 1 die
          case 2:
            keepChance = 0.7
            break // 70% chance to keep with 2 dice
          case 3:
            keepChance = 0.5
            break // 50% chance to keep with 3 dice
          case 4:
            keepChance = 0.1
            break // 10% chance to keep with 4 dice
          default:
            keepChance = 0 // Always roll with 5 dice
        }

        if (potentialScore > 0 && Math.random() < keepChance) {
          computerThoughtText.value = `Banking ${totalAvailable} points.`
          setTimeout(() => keepScore(), 700)
        } else {
          computerThoughtText.value = "Going for more points!"
          setTimeout(() => rollDice(), 700)
        }
      }
    }, 500) // Wait for potential score calculation
  }, 1000)
}

// Watch for computer's turn
watch(
  isComputerTurn,
  (newValue) => {
    if (newValue) {
      console.log("Computer's turn detected")
      // Start the computer's turn with a delay
      if (gameState.value.isBust) {
        // When it's computer's turn after a player bust, give a longer delay
        // to let the user see the bust message
        computerThoughtText.value = "Getting ready after player bust..."
        setTimeout(makeComputerDecision, 3000)
      } else {
        // Normal computer turn
        setTimeout(makeComputerDecision, 1000)
      }
    }
  },
  { immediate: true }
)

// Handle initial computer turn if needed
onMounted(() => {
  if (isComputerTurn.value) {
    console.log("Computer's turn on mount")
    setTimeout(makeComputerDecision, 1000)
  }
})
</script>
