import { ref, computed, watch } from "vue"
import type { GameState, Player, Die, ScoringRule } from "../types/game"
import { SCORING_RULES } from "../types/game"

const MIN_QUALIFYING_SCORE = 1000
const WINNING_SCORE = 10000

export function useGameStore() {
  // Dark mode state
  const isDarkMode = ref(
    window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  )

  // Toggle dark mode
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
    document.documentElement.classList.toggle("dark", isDarkMode.value)
  }

  // Language state
  const isEnglish = ref(true)

  // Toggle language
  const toggleLanguage = () => {
    isEnglish.value = !isEnglish.value
    updatePlayerNames() // Update player names when language changes
  }

  // Update player names based on language
  const updatePlayerNames = () => {
    gameState.value.players[0].name = isEnglish.value ? "Player" : "Joueur"
    gameState.value.players[1].name = isEnglish.value
      ? "Computer"
      : "Ordinateur"
  }

  // Initialize dark mode based on system preference
  if (isDarkMode.value) {
    document.documentElement.classList.add("dark")
  }

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
        isValidSelection: false,
      })),
    gamePhase: "QUALIFICATION",
    isGameOver: false,
    lastRollScore: 0,
    potentialScore: 0,
    isFirstRoll: true,
    isBust: false,
    bustMessage: "",
    diceHidden: true, // Initially hide dice until first roll
  })

  const currentPlayer = computed(
    () => gameState.value.players[gameState.value.currentPlayer]
  )
  const isPlayerTurn = computed(() => !currentPlayer.value.isComputer)
  const canRoll = computed(() => {
    // Can roll for the first time in a turn (all dice are unlocked and none selected)
    if (gameState.value.isFirstRoll) {
      return !gameState.value.isBust
    }

    // Can't roll if all dice are locked or if there's a bust
    if (
      !gameState.value.dice.some((die) => !die.isLocked) ||
      gameState.value.isBust
    ) {
      return false
    }

    // Don't allow rerolling without selecting dice (must select at least one die to continue)
    if (!gameState.value.dice.some((die) => die.isSelected)) {
      return false
    }

    return true
  })
  const canKeepScore = computed(() => {
    const totalScore =
      gameState.value.currentTurnScore + gameState.value.potentialScore

    // Cannot keep score if there's a bust
    if (gameState.value.isBust) return false

    // Cannot keep score if there are no points
    if (totalScore <= 0) return false

    // Check qualification criteria
    const isQualified = currentPlayer.value.isQualified
    const meetsQualificationThreshold = totalScore >= MIN_QUALIFYING_SCORE

    // Either player must be qualified already OR the current score must meet the threshold
    return isQualified || meetsQualificationThreshold
  })

  const rollButtonTooltip = computed(() => {
    if (gameState.value.isBust) {
      return "Cannot roll after busting"
    }

    if (!gameState.value.dice.some((die) => !die.isLocked)) {
      return "All dice are locked"
    }

    if (
      !gameState.value.isFirstRoll &&
      !gameState.value.dice.some((die) => die.isSelected)
    ) {
      return "You must select at least one die before rerolling"
    }

    if (gameState.value.isFirstRoll) {
      return "Roll the dice to start your turn"
    }

    return "Roll the dice"
  })

  function rollDice() {
    // Don't allow rolling if it's a bust
    if (gameState.value.isBust) return

    // Show dice when rolling
    gameState.value.diceHidden = false

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
        // Locked dice are always valid
        die.isValidSelection = true
      }
    })

    // Check if all dice are locked, and if so, unlock them all for a fresh roll
    const allLocked = gameState.value.dice.every((die) => die.isLocked)
    if (allLocked) {
      gameState.value.dice.forEach((die) => {
        die.isLocked = false
        die.isValidSelection = false
      })
    }

    // Roll any unlocked dice
    let hasRolledDice = false
    gameState.value.dice.forEach((die) => {
      if (!die.isLocked) {
        die.value = Math.floor(Math.random() * 6) + 1
        die.isSelected = false
        die.isValidSelection = false
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

  function checkForPossibleScores(rolledDice: number[]): boolean {
    if (rolledDice.length === 0) return false

    // Check for straights only if we rolled all 5 dice
    if (rolledDice.length === 5) {
      const isStraight1 = [1, 2, 3, 4, 5].every((num) =>
        rolledDice.includes(num)
      )
      const isStraight2 = [2, 3, 4, 5, 6].every((num) =>
        rolledDice.includes(num)
      )

      if (isStraight1 || isStraight2) {
        return true
      }
    }

    // Check for triplets, four of a kind, or five of a kind
    const valueCounts: Record<number, number> = {}
    rolledDice.forEach((value) => {
      valueCounts[value] = (valueCounts[value] || 0) + 1
    })

    for (let value = 1; value <= 6; value++) {
      // Check for any set of 3 or more dice
      if (valueCounts[value] && valueCounts[value] >= 3) {
        return true
      }
    }

    // Check for individual 1s and 5s
    if (rolledDice.includes(1) || rolledDice.includes(5)) {
      return true
    }

    return false
  }

  function calculateRollScore() {
    // Get newly rolled dice (unlocked and not selected)
    const rolledDice = gameState.value.dice
      .filter((die) => !die.isLocked && !die.isSelected)
      .map((die) => die.value)
      .sort()

    // First, mark all unselected dice as not valid for selection
    gameState.value.dice.forEach((die) => {
      if (!die.isLocked && !die.isSelected) {
        die.isValidSelection = false
      }
    })

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

        // All dice in a straight are valid for selection
        gameState.value.dice.forEach((die, index) => {
          if (!die.isLocked && !die.isSelected) {
            die.isValidSelection = true
          }
        })
      }
    }

    if (remainingDice.length > 0) {
      // Process scoring combinations (in order of priority)
      // First look for sets of 3 or more
      const valueCounts: Record<number, number> = {}
      remainingDice.forEach((value) => {
        valueCounts[value] = (valueCounts[value] || 0) + 1
      })

      // Get indices of dice for each value
      const valueIndices: Record<number, number[]> = {}
      gameState.value.dice.forEach((die, index) => {
        if (!die.isLocked && !die.isSelected) {
          if (!valueIndices[die.value]) {
            valueIndices[die.value] = []
          }
          valueIndices[die.value].push(index)
        }
      })

      // Check for four/five of a kind or triplets
      for (let value = 1; value <= 6; value++) {
        if (valueCounts[value]) {
          const count = valueCounts[value]
          let countToRemove = 0
          let pointsForSet = 0

          if (count >= 5) {
            // Five of a kind: 3× three of a kind
            pointsForSet = value === 1 ? 3000 : value * 300 // 3x the three-of-a-kind value
            countToRemove = 5
          } else if (count >= 4) {
            // Four of a kind: 2× three of a kind
            pointsForSet = value === 1 ? 2000 : value * 200 // 2x the three-of-a-kind value
            countToRemove = 4
          } else if (count >= 3) {
            // Three of a kind
            pointsForSet = value === 1 ? 1000 : value * 100
            countToRemove = 3
          }

          if (countToRemove > 0) {
            score += pointsForSet

            // Mark dice in this set as valid selections
            if (valueIndices[value]) {
              valueIndices[value].slice(0, countToRemove).forEach((index) => {
                gameState.value.dice[index].isValidSelection = true
              })
            }

            // Remove these dice from consideration
            remainingDice = remainingDice.filter((v) => {
              if (v === value && countToRemove > 0) {
                countToRemove--
                return false // Remove this die
              }
              return true // Keep this die
            })
          }
        }
      }

      // Then check for individual 1s and 5s
      remainingDice.forEach((value) => {
        if (value === 1 || value === 5) {
          if (value === 1) {
            score += 100 // Single 1 = 100 points
          } else if (value === 5) {
            score += 50 // Single 5 = 50 points
          }

          // Mark individual 1s and 5s as valid selections
          if (valueIndices[value]) {
            // Find the first unprocessed die of this value
            const index = valueIndices[value].find(
              (i) => !gameState.value.dice[i].isValidSelection
            )
            if (index !== undefined) {
              gameState.value.dice[index].isValidSelection = true
            }
          }
        }
      })
    }

    // Set last roll score to what we just calculated
    gameState.value.lastRollScore = score

    // Check for bust condition: no scoring dice in the current roll
    if (score === 0) {
      handleBust()
    }
  }

  function handleBust() {
    // Bust - lose all current turn points and end turn
    const player = currentPlayer.value
    let message = ""

    if (gameState.value.currentTurnScore > 0) {
      message = `Bust! ${player.name} lost ${gameState.value.currentTurnScore} points from this turn!`
    } else {
      message = `Bust! No scoring combinations possible!`
    }

    gameState.value.bustMessage = message
    gameState.value.isBust = true

    // Disable all dice selection
    gameState.value.dice.forEach((die) => {
      die.isSelected = false
    })

    // Calculate next player to help with UI updates
    const nextPlayerIndex =
      (gameState.value.currentPlayer + 1) % gameState.value.players.length
    const nextPlayer = gameState.value.players[nextPlayerIndex]
    console.log(`Current player busted. Next player will be ${nextPlayer.name}`)

    // Automatically transition to next player after a delay
    setTimeout(() => {
      console.log("Ending turn after bust timeout")
      gameState.value.currentTurnScore = 0
      endTurn()
    }, 2000)
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

      // Check for four/five of a kind or triplets
      for (let value = 1; value <= 6; value++) {
        if (valueCounts[value]) {
          const count = valueCounts[value]
          let countToRemove = 0
          let pointsForSet = 0

          if (count >= 5) {
            // Five of a kind: 3× three of a kind
            pointsForSet = value === 1 ? 3000 : value * 300 // 3x the three-of-a-kind value
            countToRemove = 5
          } else if (count >= 4) {
            // Four of a kind: 2× three of a kind
            pointsForSet = value === 1 ? 2000 : value * 200 // 2x the three-of-a-kind value
            countToRemove = 4
          } else if (count >= 3) {
            // Three of a kind
            pointsForSet = value === 1 ? 1000 : value * 100
            countToRemove = 3
          }

          if (countToRemove > 0) {
            score += pointsForSet

            // Remove these dice from consideration
            remainingDice = remainingDice.filter((v) => {
              if (v === value && countToRemove > 0) {
                countToRemove--
                return false // Remove this die
              }
              return true // Keep this die
            })
          }
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
    if (
      !isPlayerTurn.value ||
      gameState.value.dice[index].isLocked ||
      gameState.value.isBust ||
      gameState.value.diceHidden ||
      (!gameState.value.dice[index].isSelected &&
        !gameState.value.dice[index].isValidSelection)
    )
      return

    gameState.value.dice[index].isSelected =
      !gameState.value.dice[index].isSelected

    // Calculate potential score after selection change
    calculatePotentialScore()
  }

  function keepScore() {
    if (!canKeepScore.value) return

    const player = currentPlayer.value
    const turnTotal =
      gameState.value.currentTurnScore + gameState.value.potentialScore

    // Additional safety check: Don't allow keeping score below qualification threshold
    // if player is not yet qualified
    if (!player.isQualified && turnTotal < MIN_QUALIFYING_SCORE) {
      console.log(
        `Cannot keep score of ${turnTotal} - below qualification threshold of ${MIN_QUALIFYING_SCORE}`
      )
      return
    }

    // Add both current turn score and potential score
    player.totalScore += turnTotal

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
    console.log("Ending turn for player:", currentPlayer.value.name)

    // Reset all turn-related state
    gameState.value.currentTurnScore = 0
    gameState.value.lastRollScore = 0
    gameState.value.potentialScore = 0
    gameState.value.isFirstRoll = true
    gameState.value.isBust = false
    gameState.value.bustMessage = ""

    // Reset all dice
    gameState.value.dice.forEach((die) => {
      die.isLocked = false
      die.isSelected = false
      die.isValidSelection = false
    })

    // Change to next player
    const oldPlayerIndex = gameState.value.currentPlayer
    gameState.value.currentPlayer =
      (gameState.value.currentPlayer + 1) % gameState.value.players.length

    console.log(
      `Turn changed from ${gameState.value.players[oldPlayerIndex].name} to ${currentPlayer.value.name}`
    )

    // If the new player is the computer, start its turn after a delay
    if (currentPlayer.value.isComputer && !gameState.value.isGameOver) {
      console.log("Computer's turn is starting automatically from the store")
      setTimeout(playComputerTurn, 2000)
    }

    // Set diceHidden to true after a turn ends
    gameState.value.diceHidden = true
  }

  // Function to handle the computer's turn
  function playComputerTurn() {
    // Safety check - make sure it's still computer's turn
    if (!currentPlayer.value.isComputer || gameState.value.isGameOver) {
      console.log(
        "Computer turn canceled in store - no longer computer's turn or game over"
      )
      return
    }

    console.log("Computer is rolling dice...")

    // Simple strategy: Just roll the dice
    rollDice()

    // After dice are rolled, schedule next computer action
    setTimeout(() => {
      if (!currentPlayer.value.isComputer || gameState.value.isGameOver) {
        console.log("Computer turn ended during delay")
        return
      }

      // Select any scoring dice
      selectComputerDice()

      // After selecting dice, decide whether to keep or roll again
      setTimeout(() => {
        if (!currentPlayer.value.isComputer || gameState.value.isGameOver) {
          console.log("Computer turn ended during selection delay")
          return
        }

        // Calculate available score for this turn
        const totalAvailable =
          gameState.value.currentTurnScore + gameState.value.potentialScore

        // Check if computer is qualified
        const isComputerQualified = currentPlayer.value.isQualified

        // Different strategies based on qualification status
        if (!isComputerQualified) {
          // If not qualified yet, only keep score if it meets the minimum qualifying score
          if (totalAvailable >= MIN_QUALIFYING_SCORE) {
            console.log(
              `Computer keeping score: ${totalAvailable} (meets qualification threshold)`
            )
            keepScore()
          } else {
            // Not enough to qualify, keep rolling
            console.log(
              `Computer rolling again: ${totalAvailable} not enough to qualify (need ${MIN_QUALIFYING_SCORE})`
            )
            playComputerTurn() // Recursive call for next action
          }
        } else {
          // Already qualified, use normal strategy
          if (totalAvailable >= 300) {
            console.log(
              `Computer keeping score: ${totalAvailable} (already qualified)`
            )
            keepScore()
          } else {
            console.log("Computer rolling again for more points")
            playComputerTurn() // Recursive call for next action
          }
        }
      }, 1500)
    }, 1500)
  }

  // Function to select the best dice for the computer
  function selectComputerDice() {
    // Don't select dice if they're hidden
    if (gameState.value.diceHidden) {
      console.log("Cannot select dice while hidden")
      return
    }

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
      console.log("No unlocked dice for computer to select")
      return
    }

    // Group dice by values
    const diceByValue: Record<number, { index: number; value: number }[]> = {}
    unlockedDice.forEach((die) => {
      const key = die.value
      if (!diceByValue[key]) {
        diceByValue[key] = []
      }
      diceByValue[key].push(die)
    })

    // First check for straights if all 5 dice are available
    if (unlockedDice.length === 5) {
      const values = unlockedDice.map((die) => die.value).sort()
      const isStraight1 = [1, 2, 3, 4, 5].every((num) => values.includes(num))
      const isStraight2 = [2, 3, 4, 5, 6].every((num) => values.includes(num))

      if (isStraight1 || isStraight2) {
        // Select all dice if straight
        unlockedDice.forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
        })
        calculatePotentialScore()
        return
      }
    }

    // Select sets based on their value (five of a kind, four of a kind, three of a kind)
    let selectionMade = false

    // First prioritize any sets of five
    for (let value = 1; value <= 6; value++) {
      if (diceByValue[value] && diceByValue[value].length >= 5) {
        diceByValue[value].slice(0, 5).forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
          selectionMade = true
        })
        // If we found a set of five, we've used all dice
        if (selectionMade) {
          calculatePotentialScore()
          return
        }
      }
    }

    // Then check for sets of four
    for (let value = 1; value <= 6; value++) {
      if (diceByValue[value] && diceByValue[value].length >= 4) {
        diceByValue[value].slice(0, 4).forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
          selectionMade = true
        })
        // Remove these dice from consideration
        diceByValue[value] = diceByValue[value].slice(4)
      }
    }

    // Then check for sets of three
    for (let value = 1; value <= 6; value++) {
      if (diceByValue[value] && diceByValue[value].length >= 3) {
        diceByValue[value].slice(0, 3).forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
          selectionMade = true
        })
        // Remove these dice from consideration
        diceByValue[value] = diceByValue[value].slice(3)
      }
    }

    // Then select any individual 1s and 5s that aren't part of sets
    if (diceByValue[1]) {
      diceByValue[1].forEach((die) => {
        gameState.value.dice[die.index].isSelected = true
        selectionMade = true
      })
    }

    if (diceByValue[5]) {
      diceByValue[5].forEach((die) => {
        gameState.value.dice[die.index].isSelected = true
        selectionMade = true
      })
    }

    // If a selection was made, calculate the potential score
    if (selectionMade) {
      calculatePotentialScore()
    }
  }

  function resetGame() {
    gameState.value = {
      players: [
        {
          id: 0,
          name: isEnglish.value ? "Player" : "Joueur",
          totalScore: 0,
          isQualified: false,
          isComputer: false,
        },
        {
          id: 1,
          name: isEnglish.value ? "Computer" : "Ordinateur",
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
          isValidSelection: false,
        })),
      gamePhase: "QUALIFICATION",
      isGameOver: false,
      lastRollScore: 0,
      potentialScore: 0,
      isFirstRoll: true,
      isBust: false,
      bustMessage: "",
      diceHidden: true, // Start with hidden dice
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
    playComputerTurn,
    isDarkMode,
    toggleDarkMode,
    rollButtonTooltip,
    isEnglish,
    toggleLanguage,
  }
}
