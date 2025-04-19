import { defineStore } from "pinia"
import { ref, computed, watch } from "vue"
import type { GameState } from "../types/game"
import { useI18n } from "../i18n"
import {
  useGameState,
  setGameState,
  updateGameState,
  deleteGameState,
} from "../utils/firebase"

// Constants moved outside the store
const MIN_QUALIFYING_SCORE_OPTIONS = [500, 750, 1000]
const WINNING_SCORE = 10000
const DEFAULT_QUALIFICATION_SCORE = 1000

export const useGameStore = defineStore("game", () => {
  // Multiplayer state
  const multiplayer = ref<{
    code: string
    role: "host" | "join"
    unbind?: () => void
  } | null>(null)

  // Initialize i18n
  const { isEnglish, toggleLanguage, t } = useI18n()

  // Store state
  // Removed selectedQualificationScore. Now using gameState.value.qualificationScore everywhere.
  const showMenu = ref(true)

  const gameState = ref<GameState>({
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: [
      {
        id: 0,
        name: t("player"),
        totalScore: 0,
        isQualified: false,
        isComputer: false,
      },
      {
        id: 1,
        name: t("computer"),
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
    qualificationScore: DEFAULT_QUALIFICATION_SCORE, // NEW: Syncs via Firebase
  })

  // Computed values
  const MIN_QUALIFYING_SCORE = computed(
    () => gameState.value.qualificationScore
  )

  const currentPlayer = computed(() => {
    return gameState.value.players[gameState.value.currentPlayer]
  })

  const isPlayerTurn = computed(() => {
    // Multiplayer: Only allow if it's this client's turn
    if (multiplayer.value) {
      return canModifyGameState()
    }
    // Single player: allow if not computer
    return !currentPlayer.value.isComputer
  })

  const canRoll = computed(() => {
    // Can't roll if game is over
    if (gameState.value.isGameOver) return false

    // Can't roll if it's not the player's turn
    if (!isPlayerTurn.value) return false

    // Can roll if it's the first roll of the turn
    if (gameState.value.isFirstRoll) return !gameState.value.isBust

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
    // Can't keep score if game is over
    if (gameState.value.isGameOver) return false
    // Can't keep score if there's no potential score
    if (gameState.value.potentialScore <= 0) return false

    // Can't keep score if waiting for player 2 in multiplayer
    if (gameState.value.waitingForPlayer2) return false

    // Cannot keep score if there's a bust
    if (gameState.value.isBust) return false
    // Check qualification status
    const currentPlayerObj =
      gameState.value.players[gameState.value.currentPlayer]

    // If player is already qualified, they can keep score
    if (currentPlayerObj.isQualified) return true

    // If player is not qualified, they need enough points to qualify
    const totalTurnPoints =
      gameState.value.currentTurnScore + gameState.value.potentialScore
    return totalTurnPoints >= MIN_QUALIFYING_SCORE.value
  })

  const rollButtonTooltip = computed(() => {
    if (gameState.value.isGameOver) {
      return t("gameOver")
    }

    if (gameState.value.isBust) {
      return t("cantRollBust")
    }

    if (!isPlayerTurn.value) {
      return t("notYourTurn")
    }

    if (gameState.value.waitingForPlayer2) {
      return t("waitingForPlayer2")
    }

    if (!gameState.value.dice.some((die) => !die.isLocked)) {
      return t("allDiceLocked")
    }

    if (
      !gameState.value.isFirstRoll &&
      !gameState.value.dice.some((die) => die.isSelected)
    ) {
      return t("mustSelectDie")
    }

    if (gameState.value.isFirstRoll) {
      return t("rollToStartTurn")
    }

    return t("rollDiceTooltip")
  })

  const isWaitingForPlayer2 = computed(
    () => !!gameState.value.waitingForPlayer2
  )

  // Watch for language changes
  watch(isEnglish, () => {
    // Get player mode
    const isVsComputerMode =
      gameState.value.players.length > 1
        ? gameState.value.players[1].isComputer
        : true

    // Get current player names
    const player1Name = gameState.value.players[0].name
    const player2Name = gameState.value.players[1].name

    // Define expected default names in both languages
    const defaultPlayerNames = ["Player", "Joueur"]
    const defaultPlayer1Names = ["Player 1", "Joueur 1"]
    const defaultPlayer2Names = ["Player 2", "Joueur 2"]
    const defaultComputerNames = ["Computer", "Ordinateur"]

    // Check if current names are any of the default names
    const isPlayer1Default =
      defaultPlayerNames.includes(player1Name) ||
      defaultPlayer1Names.includes(player1Name)

    const isPlayer2Default =
      defaultComputerNames.includes(player2Name) ||
      defaultPlayer2Names.includes(player2Name)

    // Update player names only if they have default names
    if (isPlayer1Default) {
      gameState.value.players[0].name = isVsComputerMode
        ? t("player")
        : t("player1")
    }

    if (isPlayer2Default) {
      gameState.value.players[1].name = isVsComputerMode
        ? t("computer")
        : t("player2")
    }

    // Update the bust message if there is one
    if (gameState.value.bustMessage) {
      // If a bust message exists, refresh it with the current language
      if (gameState.value.currentTurnScore > 0) {
        gameState.value.bustMessage = t("bustLostPoints", [
          gameState.value.players[gameState.value.currentPlayer].name,
          gameState.value.currentTurnScore,
        ])
      } else {
        gameState.value.bustMessage = t("bustGeneric")
      }
    }

    // UI will update automatically with reactive state
  })

  // Functions
  function setQualificationScore(score: number) {
    if (MIN_QUALIFYING_SCORE_OPTIONS.includes(score)) {
      gameState.value.qualificationScore = score
      // Sync to Firebase if multiplayer
      if (multiplayer.value)
        setGameState(multiplayer.value.code, gameState.value)
    }
  }

  function setPlayers(
    players: Array<{ id: number; name: string; isComputer: boolean }>,
    qualificationScore?: number
  ) {
    // Update the players array with new player info
    gameState.value.players = players.map((player) => {
      return {
        id: player.id,
        name: player.name,
        totalScore: 0,
        isQualified: false,
        isComputer: player.isComputer,
      }
    })

    // Reset game state
    gameState.value.currentPlayer = 0
    gameState.value.currentTurnScore = 0
    gameState.value.lastRollScore = 0
    gameState.value.potentialScore = 0
    gameState.value.isFirstRoll = true
    gameState.value.isBust = false
    gameState.value.bustMessage = ""
    gameState.value.gamePhase = "QUALIFICATION"
    gameState.value.isGameOver = false
    gameState.value.diceHidden = true
    gameState.value.qualificationScore =
      qualificationScore ??
      gameState.value.qualificationScore ??
      DEFAULT_QUALIFICATION_SCORE

    // Reset dice
    gameState.value.dice = Array(5)
      .fill(null)
      .map(() => ({
        value: 1,
        isSelected: false,
        isLocked: false,
        isValidSelection: false,
      }))

    // Force reactivity
  }

  // Add new function
  function canModifyGameState() {
    if (!multiplayer.value) return true

    if (multiplayer.value.role === "host") {
      return gameState.value.currentPlayer === 0
    } else {
      return gameState.value.currentPlayer === 1
    }
  }

  // Add new function
  function updateJoiningPlayerName(name: string) {
    if (!multiplayer.value || multiplayer.value.role !== "join") return

    const code = multiplayer.value.code
    updateGameState(code, {
      "players/1/name": name,
    })
  }

  // Roll callback function for animations
  let rollCallback: ((rollingDiceIndices: number[]) => void) | null = null

  function setRollCallback(callback: (rollingDiceIndices: number[]) => void) {
    rollCallback = callback
  }

  function rollDice() {
    // Don't allow rolling if it's a bust or waiting for player 2
    if (gameState.value.isBust || gameState.value.waitingForPlayer2) return

    // Notify about dice to be rolled
    if (rollCallback) {
      const rollingDiceIndices = gameState.value.dice
        .map((die, index) => (!die.isLocked ? index : -1))
        .filter((index) => index !== -1)

      rollCallback(rollingDiceIndices)
    }

    // Make sure dice are visible
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
    gameState.value.dice.forEach((die) => {
      if (!die.isLocked) {
        die.value = Math.floor(Math.random() * 6) + 1
        die.isSelected = false
        die.isValidSelection = false
      }
    })

    // After the very first roll, set isFirstRoll to false
    gameState.value.isFirstRoll = false

    // Calculate score for this roll
    calculateRollScore()
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
        gameState.value.dice.forEach((die) => {
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
      message = t("bustLostPoints", [
        player.name,
        gameState.value.currentTurnScore,
      ])
    } else {
      message = t("bustGeneric")
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
    if (!canModifyGameState() || gameState.value.waitingForPlayer2) return

    // Only allow keeping score if not bust
    if (gameState.value.isBust) return

    const player = currentPlayer.value
    const turnTotal =
      gameState.value.currentTurnScore + gameState.value.potentialScore

    // Additional safety check: Don't allow keeping score below qualification threshold
    // if player is not yet qualified
    if (!player.isQualified && turnTotal < MIN_QUALIFYING_SCORE.value) {
      console.log(
        `Cannot keep score of ${turnTotal} - below qualification threshold of ${MIN_QUALIFYING_SCORE.value}`
      )
      return
    }

    // Calculate what the total would be after adding turn score
    const potentialTotalScore = player.totalScore + turnTotal

    // Check if player would exceed 10,000 points
    if (potentialTotalScore > WINNING_SCORE) {
      // Bust rule for exceeding 10,000 - lose all turn points
      gameState.value.isBust = true
      gameState.value.bustMessage = t("bustExceededMax")

      // No score is added, turn ends
      endTurn()
      return
    }

    // Add both current turn score and potential score
    player.totalScore += turnTotal

    if (
      !player.isQualified &&
      player.totalScore >= MIN_QUALIFYING_SCORE.value
    ) {
      player.isQualified = true
      gameState.value.gamePhase = "NORMAL"
    }

    // Player wins when they reach exactly 10,000 points
    if (player.totalScore === WINNING_SCORE) {
      console.log(
        `${player.name} has reached exactly ${WINNING_SCORE} points and wins!`
      )
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

    console.log(
      `Turn changed from ${gameState.value.players[oldPlayerIndex].name} to ${currentPlayer.value.name}`
    )

    // Only start computer turn if the current player is a computer
    // (This allows vs Friend mode to work correctly)
    if (currentPlayer.value.isComputer && !gameState.value.isGameOver) {
      console.log("Computer's turn is starting automatically from the store")
      setTimeout(playComputerTurn, 2000)
    }

    // Set diceHidden to true after a turn ends
    gameState.value.diceHidden = true
    gameState.value.currentPlayer =
      (gameState.value.currentPlayer + 1) % gameState.value.players.length
    if (multiplayer.value) setGameState(multiplayer.value.code, gameState.value)
  }

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

      // Select any scoring dice - with special endgame strategy
      const isEndgame = currentPlayer.value.totalScore > 9000
      if (isEndgame) {
        selectComputerDiceEndgame()
      } else {
        selectComputerDice()
      }

      // After selecting dice, decide whether to keep or roll again
      setTimeout(() => {
        if (!currentPlayer.value.isComputer || gameState.value.isGameOver) {
          console.log("Computer turn ended during selection delay")
          return
        }

        // Calculate available score for this turn
        const totalAvailable =
          gameState.value.currentTurnScore + gameState.value.potentialScore

        // Calculate what the total would be after adding turn score
        const potentialTotalScore =
          currentPlayer.value.totalScore + totalAvailable

        // Calculate target score needed to reach exactly 10,000
        const targetPoints = WINNING_SCORE - currentPlayer.value.totalScore

        // Check if computer is qualified
        const isComputerQualified = currentPlayer.value.isQualified

        // Different strategies based on qualification status
        if (!isComputerQualified) {
          // If not qualified yet, only keep score if it meets the minimum qualifying score
          if (totalAvailable >= MIN_QUALIFYING_SCORE.value) {
            console.log(
              `Computer keeping score: ${totalAvailable} (meets qualification threshold)`
            )
            keepScore()
          } else {
            // Not enough to qualify, keep rolling
            console.log(
              `Computer rolling again: ${totalAvailable} not enough to qualify (need ${MIN_QUALIFYING_SCORE.value})`
            )
            playComputerTurn() // Recursive call for next action
          }
        } else if (currentPlayer.value.totalScore > 9000) {
          // ENDGAME STRATEGY (over 9,000 points)

          // Check if we'd reach exactly 10,000 points - immediate win!
          if (potentialTotalScore === WINNING_SCORE) {
            console.log(
              `Computer keeping score: ${totalAvailable} (reaches exactly 10,000 and wins!)`
            )
            keepScore()
            return
          }

          // Check if we'd exceed 10,000 points - must not keep score
          if (potentialTotalScore > WINNING_SCORE) {
            console.log(
              `Computer cannot keep score: ${potentialTotalScore} would exceed 10,000 points`
            )
            playComputerTurn() // Roll again and try for a better combination
          }
          // We're still under 10,000 - determine whether to roll or keep
          const unlockedDiceCount = gameState.value.dice.filter(
            (die) => !die.isLocked && !die.isSelected
          ).length

          // Calculate remaining points needed
          const remainingPoints = targetPoints - totalAvailable

          // If very close to target, be conservative
          if (remainingPoints <= 150) {
            // Very close to target - decisions based on remaining dice and probability
            let shouldReroll = false

            // Random probabilities based on dice count (becoming more conservative with fewer dice)
            const randomFactor = Math.random()

            if (unlockedDiceCount === 1 && randomFactor > 0.75)
              shouldReroll = true // 25% chance to reroll
            else if (unlockedDiceCount === 2 && randomFactor > 0.5)
              shouldReroll = true // 50% chance to reroll
            else if (unlockedDiceCount === 3 && randomFactor > 0.7)
              shouldReroll = true // 30% chance to reroll
            else if (unlockedDiceCount === 4 && randomFactor > 0.9)
              shouldReroll = true // 10% chance to reroll
            else if (unlockedDiceCount === 5 && randomFactor > 0.9)
              shouldReroll = true // 10% chance to reroll

            if (shouldReroll) {
              console.log(
                `Computer rolling again (endgame strategy): ${totalAvailable} points so far, needs ${remainingPoints} more for 10,000`
              )
              playComputerTurn()
            } else {
              console.log(
                `Computer keeping score (endgame strategy): ${totalAvailable} points, will have ${potentialTotalScore} total`
              )
              keepScore()
            }
          } else {
            // Still needs a significant number of points - balance risk vs reward
            if (
              totalAvailable >= 300 ||
              (remainingPoints < 300 && totalAvailable > 0)
            ) {
              console.log(
                `Computer keeping score: ${totalAvailable} points, will have ${potentialTotalScore} total`
              )
              keepScore()
            } else {
              console.log(
                `Computer rolling again: needs more points to get closer to 10,000`
              )
              playComputerTurn()
            }
          }
        } else {
          // Regular strategy (not in endgame)
          if (potentialTotalScore > WINNING_SCORE) {
            console.log(
              `Computer rolling again: ${potentialTotalScore} would exceed 10,000 points`
            )
            playComputerTurn() // Roll again and try for a better combination
          }
          // Check if computer would reach exactly 10,000 points
          else if (potentialTotalScore === WINNING_SCORE) {
            console.log(
              `Computer keeping score: ${totalAvailable} (will reach exactly 10,000 and win)`
            )
            keepScore()
          }
          // Normal strategy when not close to 10,000
          else if (totalAvailable >= 300) {
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

  // Specialized function for endgame dice selection
  function selectComputerDiceEndgame() {
    // Don't select dice if they're hidden
    if (gameState.value.diceHidden) {
      console.log("Cannot select dice while hidden")
      return
    }

    // Calculate target score needed to reach exactly 10,000
    const targetPoints =
      WINNING_SCORE -
      currentPlayer.value.totalScore -
      gameState.value.currentTurnScore
    console.log(`Endgame strategy - Target points needed: ${targetPoints}`)

    // Get all unlocked dice that aren't selected
    const unlockedDice = gameState.value.dice
      .map((die, index) => ({
        index,
        value: die.value,
        isLocked: die.isLocked,
        isSelected: die.isSelected,
        isValidSelection: die.isValidSelection,
      }))
      .filter((die) => !die.isLocked && !die.isSelected)

    // If no unlocked dice, nothing to select
    if (unlockedDice.length === 0) {
      console.log("No unlocked dice for computer to select")
      return
    }

    // Group dice by values for easier scoring calculation
    const diceByValue: Record<number, { index: number; value: number }[]> = {}
    unlockedDice.forEach((die) => {
      const key = die.value
      if (!diceByValue[key]) {
        diceByValue[key] = []
      }
      diceByValue[key].push(die)
    })

    // Helper to calculate score for a specific selection of dice values
    const calculateScoreForSelection = (selectedValues: number[]): number => {
      if (selectedValues.length === 0) return 0

      let score = 0
      let remainingValues = [...selectedValues].sort()

      // Check for straights
      if (selectedValues.length === 5) {
        const isStraight1 = [1, 2, 3, 4, 5].every((n) =>
          selectedValues.includes(n)
        )
        const isStraight2 = [2, 3, 4, 5, 6].every((n) =>
          selectedValues.includes(n)
        )

        if (isStraight1 || isStraight2) {
          return 1500 // Straight is worth 1500 points
        }
      }

      // Check for sets (3 or more of a kind)
      const valueCounts: Record<number, number> = {}
      remainingValues.forEach((v) => {
        valueCounts[v] = (valueCounts[v] || 0) + 1
      })

      for (let value = 1; value <= 6; value++) {
        if (!valueCounts[value]) continue

        const count = valueCounts[value]
        let countToRemove = 0
        let points = 0

        if (count >= 5) {
          points = value === 1 ? 3000 : value * 300
          countToRemove = 5
        } else if (count >= 4) {
          points = value === 1 ? 2000 : value * 200
          countToRemove = 4
        } else if (count >= 3) {
          points = value === 1 ? 1000 : value * 100
          countToRemove = 3
        }

        if (countToRemove > 0) {
          score += points

          // Remove these dice from consideration
          for (let i = 0; i < countToRemove; i++) {
            const idx = remainingValues.indexOf(value)
            if (idx >= 0) {
              remainingValues.splice(idx, 1)
            }
          }
        }
      }

      // Then check for individual 1s and 5s
      remainingValues.forEach((value) => {
        if (value === 1) score += 100
        else if (value === 5) score += 50
      })

      return score
    }

    // First check for straights if all 5 dice are available
    if (unlockedDice.length === 5) {
      const values = unlockedDice.map((die) => die.value).sort()
      const isStraight1 = [1, 2, 3, 4, 5].every((num) => values.includes(num))
      const isStraight2 = [2, 3, 4, 5, 6].every((num) => values.includes(num))

      // Only select straight if it doesn't exceed target
      if ((isStraight1 || isStraight2) && 1500 <= targetPoints) {
        unlockedDice.forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
        })
        calculatePotentialScore()
        return
      }
    }

    // Endgame strategy: Try all possible combinations and find the one closest to target
    // without exceeding it

    // Start with single-value selections: 1s and 5s
    let bestSelectionIndices: number[] = []
    let bestScore = 0

    // Check individual 1s
    if (diceByValue[1] && diceByValue[1].length > 0) {
      for (let i = 1; i <= diceByValue[1].length; i++) {
        const selectedValues = Array(i).fill(1)
        const score = calculateScoreForSelection(selectedValues)

        if (score <= targetPoints && score > bestScore) {
          bestScore = score
          bestSelectionIndices = diceByValue[1].slice(0, i).map((d) => d.index)

          // If exact match to target, select immediately
          if (score === targetPoints) {
            break
          }
        }
      }
    }

    // Check individual 5s
    if (diceByValue[5] && diceByValue[5].length > 0) {
      for (let i = 1; i <= diceByValue[5].length; i++) {
        const selectedValues = Array(i).fill(5)
        const score = calculateScoreForSelection(selectedValues)

        if (score <= targetPoints && score > bestScore) {
          bestScore = score
          bestSelectionIndices = diceByValue[5].slice(0, i).map((d) => d.index)

          // If exact match to target, select immediately
          if (score === targetPoints) {
            break
          }
        }
      }
    }

    // Check combinations of 1s and 5s
    if (
      diceByValue[1] &&
      diceByValue[1].length > 0 &&
      diceByValue[5] &&
      diceByValue[5].length > 0
    ) {
      for (let i1 = 1; i1 <= diceByValue[1].length; i1++) {
        for (let i5 = 1; i5 <= diceByValue[5].length; i5++) {
          const selectedValues = [...Array(i1).fill(1), ...Array(i5).fill(5)]
          const score = calculateScoreForSelection(selectedValues)

          if (score <= targetPoints && score > bestScore) {
            bestScore = score
            bestSelectionIndices = [
              ...diceByValue[1].slice(0, i1).map((d) => d.index),
              ...diceByValue[5].slice(0, i5).map((d) => d.index),
            ]

            // If exact match to target, select immediately
            if (score === targetPoints) {
              break
            }
          }
        }
      }
    }

    // Check sets of three (only if individual 1s and 5s didn't give us an exact match)
    if (bestScore < targetPoints) {
      for (let value = 1; value <= 6; value++) {
        if (diceByValue[value] && diceByValue[value].length >= 3) {
          const score = value === 1 ? 1000 : value * 100

          if (score <= targetPoints && score > bestScore) {
            bestScore = score
            bestSelectionIndices = diceByValue[value]
              .slice(0, 3)
              .map((d) => d.index)

            // If exact match to target, select immediately
            if (score === targetPoints) {
              break
            }
          }
        }
      }
    }

    // Apply the best selection we found
    if (bestSelectionIndices.length > 0) {
      bestSelectionIndices.forEach((index) => {
        if (gameState.value.dice[index].isValidSelection) {
          gameState.value.dice[index].isSelected = true
        }
      })

      console.log(
        `Endgame strategy selected ${bestSelectionIndices.length} dice for ${bestScore} points`
      )
      calculatePotentialScore()
    } else {
      // If we couldn't find a valid selection that doesn't exceed the target,
      // fall back to normal selection but be careful
      console.log(
        "No optimal endgame selection found, using standard selection"
      )
      selectComputerDice()
    }
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

  function resetGame(qualificationScore?: number) {
    // Store the current settings before resetting
    const player2IsComputer =
      gameState.value.players.length > 1
        ? gameState.value.players[1].isComputer
        : true

    // Keep original names if they're not default names
    const player1Name = gameState.value.players[0].name
    const player2Name = gameState.value.players[1].name

    // Define default names based on game mode
    const isVsComputerMode = player2IsComputer

    // Define expected default names in both languages
    const defaultPlayerNames = ["Player", "Joueur"]
    const defaultPlayer1Names = ["Player 1", "Joueur 1"]
    const defaultPlayer2Names = ["Player 2", "Joueur 2"]
    const defaultComputerNames = ["Computer", "Ordinateur"]

    // Check if current names are any of the default names
    const isPlayer1Default =
      defaultPlayerNames.includes(player1Name) ||
      defaultPlayer1Names.includes(player1Name)

    const isPlayer2Default =
      defaultComputerNames.includes(player2Name) ||
      defaultPlayer2Names.includes(player2Name)

    // Use custom names if they exist, otherwise use defaults
    const usePlayer1Name = !isPlayer1Default
      ? player1Name
      : isVsComputerMode
      ? t("player")
      : t("player1")

    const usePlayer2Name = !isPlayer2Default
      ? player2Name
      : isVsComputerMode
      ? t("computer")
      : t("player2")

    // Keep the current qualification score (don't reset it)
    // We don't need to explicitly preserve it since it's a separate ref
    if (multiplayer.value?.code) {
      deleteGameState(multiplayer.value.code)
    }
    // Show menu again
    showMenu.value = true
    setTimeout(() => {
      gameState.value = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        qualificationScore:
          qualificationScore ??
          gameState.value.qualificationScore ??
          DEFAULT_QUALIFICATION_SCORE,
        players: [
          {
            id: 0,
            name: usePlayer1Name,
            totalScore: 0,
            isQualified: false,
            isComputer: false,
          },
          {
            id: 1,
            name: usePlayer2Name,
            totalScore: 0,
            isQualified: false,
            isComputer: player2IsComputer, // Preserve the computer/human mode
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
        waitingForPlayer2: false, // Reset waitingForPlayer2
      }
    }, 1000)
  }

  const updatePlayerScore = (playerIndex: number, score: number) => {
    if (score >= 0 && score <= 10000) {
      const player = { ...gameState.value.players[playerIndex] }
      player.totalScore = score

      // Automatically set qualified if score is high enough
      if (score >= MIN_QUALIFYING_SCORE.value) {
        player.isQualified = true
      }

      gameState.value.players[playerIndex] = player
    }
  }

  const qualifyPlayer = (playerIndex: number) => {
    const player = { ...gameState.value.players[playerIndex] }
    player.isQualified = true
    gameState.value.players[playerIndex] = player
  }

  const setGameOver = (isOver: boolean) => {
    gameState.value.isGameOver = isOver
  }

  const updateDieValue = (dieIndex: number, value: number) => {
    if (value >= 1 && value <= 6) {
      const die = { ...gameState.value.dice[dieIndex] }
      die.value = value
      gameState.value.dice[dieIndex] = die

      // Recalculate valid dice
      calculateRollScore()

      // Update potential score
      calculatePotentialScore()
    }
  }

  // --- Multiplayer helpers ---
  function isGameState(val: any): val is GameState {
    return (
      val &&
      typeof val === "object" &&
      Array.isArray(val.players) &&
      Array.isArray(val.dice)
    )
  }

  function joinGame(code: string, role: "host" | "join", startGame?: boolean) {
    if (multiplayer.value && multiplayer.value.unbind)
      multiplayer.value.unbind()
    multiplayer.value = { code, role }
    if (role === "host" && startGame) {
      // Initial push to Firebase
      gameState.value.waitingForPlayer2 = true
      gameState.value.createdAt = new Date().toISOString()
      gameState.value.updatedAt = new Date().toISOString()
      setGameState(code, gameState.value)
    }
    // Host waits for player 2, guest disables waiting
    if (role === "join") {
      gameState.value.waitingForPlayer2 = false
      // Sync to Firebase
      updateGameState(code, { waitingForPlayer2: false })
    }
    // --- NEW: Bind to Firebase game state reactively, just like joiner ---
    const { data: remoteState, stop: stopBinding } = useGameState(code)
    let updatingFromRemote = false

    // Watch remote state and update local state
    const stopRemote = watch(
      remoteState,
      (val) => {
        if (
          isGameState(val) &&
          JSON.stringify(val) !== JSON.stringify(gameState.value)
        ) {
          updatingFromRemote = true
          gameState.value = val
          updatingFromRemote = false
        }
      },
      { deep: true }
    )

    // Watch local state and push to Firebase if host makes changes
    const stopLocal = watch(
      gameState,
      (val) => {
        // Avoid pushing changes that originated from remote
        if (!updatingFromRemote && (canModifyGameState() || showMenu.value)) {
          gameState.value.updatedAt = new Date().toISOString()
          setGameState(code, val)
        }
      },
      { deep: true }
    )

    multiplayer.value.unbind = () => {
      stopRemote()
      stopLocal()
      stopBinding()
    }
  }

  function leaveMultiplayerGame() {
    if (multiplayer.value && multiplayer.value.unbind)
      multiplayer.value.unbind()
    multiplayer.value = null
  }

  // Patch startGame to accept multiplayer
  function startGame(
    players: Array<{ id: number; name: string; isComputer: boolean }>,
    options?: {
      mode?: string
      code?: string
      role?: "host" | "join"
      qualificationScore?: number
    }
  ) {
    setPlayers(players, options?.qualificationScore)
    showMenu.value = false
    if (options?.mode === "multiplayer" && options.code && options.role) {
      joinGame(options.code, options.role, true)
    } else {
      leaveMultiplayerGame()
    }
  }

  // Return store state and methods
  return {
    // State
    gameState,
    showMenu,

    // Computed
    MIN_QUALIFYING_SCORE,
    MIN_QUALIFYING_SCORE_OPTIONS,
    WINNING_SCORE: WINNING_SCORE,
    currentPlayer,
    isPlayerTurn,
    canRoll,
    canKeepScore,
    rollButtonTooltip,
    isWaitingForPlayer2,

    // Methods
    setQualificationScore,

    setPlayers,
    setRollCallback,
    rollDice,
    calculateRollScore,
    handleBust,
    calculatePotentialScore,
    toggleDieSelection,
    keepScore,
    endTurn,
    playComputerTurn,
    selectComputerDice,
    resetGame,
    toggleLanguage,
    updatePlayerScore,
    qualifyPlayer,
    setGameOver,
    updateDieValue,
    startGame,
    leaveMultiplayerGame,
    multiplayer,
    updateJoiningPlayerName,
    canModifyGameState,
    joinGame,
  }
})
