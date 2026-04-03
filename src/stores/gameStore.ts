import { defineStore } from "pinia"
import { ref, computed, watch } from "vue"
import type { GameState } from "../types/game"
import { useI18n } from "../i18n"
import { scoreDiceRoll, scoreSelectedDice } from "../composables/useScoringEngine"
import { useComputerAI } from "../composables/useComputerAI"
import { useDevActions } from "../composables/useDevActions"

const MIN_QUALIFYING_SCORE_OPTIONS = [500, 750, 1000]
const WINNING_SCORE = 10000
const DEFAULT_QUALIFICATION_SCORE = 1000

export const useGameStore = defineStore("game", () => {
  const { isEnglish, toggleLanguage, t } = useI18n()

  // --- State ---
  const showMenu = ref(true)

  const gameState = ref<GameState>({
    players: [
      { id: 0, name: t("player"), totalScore: 0, isQualified: false, isComputer: false },
      { id: 1, name: t("computer"), totalScore: 0, isQualified: false, isComputer: true },
    ],
    currentPlayer: 0,
    currentTurnScore: 0,
    dice: Array(5).fill(null).map(() => ({
      value: 1, isSelected: false, isLocked: false, isValidSelection: false,
    })),
    gamePhase: "QUALIFICATION",
    isGameOver: false,
    lastRollScore: 0,
    potentialScore: 0,
    isFirstRoll: true,
    isBust: false,
    bustMessage: "",
    diceHidden: true,
    qualificationScore: DEFAULT_QUALIFICATION_SCORE,
  })

  // --- Computed ---
  const MIN_QUALIFYING_SCORE = computed(() => gameState.value.qualificationScore)

  const currentPlayer = computed(() => gameState.value.players[gameState.value.currentPlayer])

  const isPlayerTurn = computed(() => !currentPlayer.value.isComputer)

  const canRoll = computed(() => {
    if (gameState.value.isGameOver) return false
    if (!isPlayerTurn.value) return false
    if (gameState.value.isFirstRoll) return !gameState.value.isBust
    if (!gameState.value.dice.some((die) => !die.isLocked) || gameState.value.isBust) return false
    if (!gameState.value.dice.some((die) => die.isSelected)) return false
    return true
  })

  const canKeepScore = computed(() => {
    if (gameState.value.isGameOver) return false
    if (gameState.value.potentialScore <= 0) return false
    if (gameState.value.isBust) return false
    const player = gameState.value.players[gameState.value.currentPlayer]
    if (player.isQualified) return true
    const totalTurnPoints = gameState.value.currentTurnScore + gameState.value.potentialScore
    return totalTurnPoints >= MIN_QUALIFYING_SCORE.value
  })

  const rollButtonTooltip = computed(() => {
    if (gameState.value.isGameOver) return t("gameOver")
    if (gameState.value.isBust) return t("cantRollBust")
    if (!isPlayerTurn.value) return t("notYourTurn")
    if (!gameState.value.dice.some((die) => !die.isLocked)) return t("allDiceLocked")
    if (!gameState.value.isFirstRoll && !gameState.value.dice.some((die) => die.isSelected)) {
      return t("mustSelectDie")
    }
    if (gameState.value.isFirstRoll) return t("rollToStartTurn")
    return t("rollDiceTooltip")
  })

  // --- Language change watcher ---
  watch(isEnglish, () => {
    const isVsComputerMode = gameState.value.players.length > 1
      ? gameState.value.players[1].isComputer
      : true

    const player1Name = gameState.value.players[0].name
    const player2Name = gameState.value.players[1].name

    const defaultPlayerNames = ["Player", "Joueur"]
    const defaultPlayer1Names = ["Player 1", "Joueur 1"]
    const defaultPlayer2Names = ["Player 2", "Joueur 2"]
    const defaultComputerNames = ["Computer", "Ordinateur"]

    const isPlayer1Default =
      defaultPlayerNames.includes(player1Name) || defaultPlayer1Names.includes(player1Name)
    const isPlayer2Default =
      defaultComputerNames.includes(player2Name) || defaultPlayer2Names.includes(player2Name)

    if (isPlayer1Default) {
      gameState.value.players[0].name = isVsComputerMode ? t("player") : t("player1")
    }
    if (isPlayer2Default) {
      gameState.value.players[1].name = isVsComputerMode ? t("computer") : t("player2")
    }

    if (gameState.value.bustMessage) {
      if (gameState.value.currentTurnScore > 0) {
        gameState.value.bustMessage = t("bustLostPoints", [
          gameState.value.players[gameState.value.currentPlayer].name,
          gameState.value.currentTurnScore,
        ])
      } else {
        gameState.value.bustMessage = t("bustGeneric")
      }
    }
  })

  // --- Roll callback for animations ---
  let rollCallback: ((rollingDiceIndices: number[]) => void) | null = null

  function setRollCallback(callback: (rollingDiceIndices: number[]) => void) {
    rollCallback = callback
  }

  // --- Scoring (delegates to pure engine) ---
  function calculateRollScore() {
    const rolledDiceValues: number[] = []
    const rolledDiceIndices: number[] = []

    gameState.value.dice.forEach((die, index) => {
      if (!die.isLocked && !die.isSelected) {
        die.isValidSelection = false
        rolledDiceValues.push(die.value)
        rolledDiceIndices.push(index)
      }
    })

    const { score, validIndices } = scoreDiceRoll(rolledDiceValues, rolledDiceIndices)

    validIndices.forEach((idx) => {
      gameState.value.dice[idx].isValidSelection = true
    })

    gameState.value.lastRollScore = score

    if (score === 0) {
      handleBust()
    }
  }

  function calculatePotentialScore(): number {
    const selectedValues = gameState.value.dice
      .filter((die) => die.isSelected)
      .map((die) => die.value)

    if (selectedValues.length === 0) {
      gameState.value.potentialScore = 0
      return 0
    }

    const score = scoreSelectedDice(selectedValues)
    gameState.value.potentialScore = score
    return score
  }

  // --- Dice actions ---
  function rollDice() {
    if (gameState.value.isBust) return

    if (rollCallback) {
      const rollingDiceIndices = gameState.value.dice
        .map((die, index) => (!die.isLocked ? index : -1))
        .filter((index) => index !== -1)
      rollCallback(rollingDiceIndices)
    }

    gameState.value.diceHidden = false
    gameState.value.currentTurnScore += gameState.value.potentialScore
    gameState.value.potentialScore = 0

    if (!gameState.value.isFirstRoll) {
      gameState.value.lastRollScore = 0
    }

    gameState.value.dice.forEach((die) => {
      if (die.isSelected) {
        die.isLocked = true
        die.isSelected = false
        die.isValidSelection = true
      }
    })

    if (gameState.value.dice.every((die) => die.isLocked)) {
      gameState.value.dice.forEach((die) => {
        die.isLocked = false
        die.isValidSelection = false
      })
    }

    gameState.value.dice.forEach((die) => {
      if (!die.isLocked) {
        die.value = Math.floor(Math.random() * 6) + 1
        die.isSelected = false
        die.isValidSelection = false
      }
    })

    gameState.value.isFirstRoll = false
    calculateRollScore()
  }

  function toggleDieSelection(index: number) {
    const die = gameState.value.dice[index]
    if (
      !isPlayerTurn.value ||
      die.isLocked ||
      gameState.value.isBust ||
      gameState.value.diceHidden ||
      (!die.isSelected && !die.isValidSelection)
    ) return

    die.isSelected = !die.isSelected
    calculatePotentialScore()
  }

  // --- Turn flow ---
  function handleBust() {
    const player = currentPlayer.value
    gameState.value.bustMessage = gameState.value.currentTurnScore > 0
      ? t("bustLostPoints", [player.name, gameState.value.currentTurnScore])
      : t("bustGeneric")
    gameState.value.isBust = true
    gameState.value.dice.forEach((die) => { die.isSelected = false })

    setTimeout(() => {
      gameState.value.currentTurnScore = 0
      endTurn()
    }, 2000)
  }

  function keepScore() {
    if (gameState.value.isBust) return

    const player = currentPlayer.value
    const turnTotal = gameState.value.currentTurnScore + gameState.value.potentialScore

    if (!player.isQualified && turnTotal < MIN_QUALIFYING_SCORE.value) {
      console.log(`Cannot keep ${turnTotal} - below qualification threshold ${MIN_QUALIFYING_SCORE.value}`)
      return
    }

    const potentialTotalScore = player.totalScore + turnTotal
    if (potentialTotalScore > WINNING_SCORE) {
      gameState.value.isBust = true
      gameState.value.bustMessage = t("bustExceededMax")
      endTurn()
      return
    }

    player.totalScore += turnTotal
    if (!player.isQualified && player.totalScore >= MIN_QUALIFYING_SCORE.value) {
      player.isQualified = true
      gameState.value.gamePhase = "NORMAL"
    }

    if (player.totalScore === WINNING_SCORE) {
      console.log(`${player.name} reached ${WINNING_SCORE} and wins!`)
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
    gameState.value.isBust = false
    gameState.value.bustMessage = ""

    gameState.value.dice.forEach((die) => {
      die.isLocked = false
      die.isSelected = false
      die.isValidSelection = false
    })

    gameState.value.diceHidden = true
    gameState.value.currentPlayer =
      (gameState.value.currentPlayer + 1) % gameState.value.players.length

    if (currentPlayer.value.isComputer && !gameState.value.isGameOver) {
      setTimeout(playComputerTurn, 2000)
    }
  }

  function setPlayers(
    players: Array<{ id: number; name: string; isComputer: boolean }>,
    qualificationScore?: number
  ) {
    gameState.value.players = players.map((p) => ({
      id: p.id, name: p.name, totalScore: 0, isQualified: false, isComputer: p.isComputer,
    }))
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
      qualificationScore ?? gameState.value.qualificationScore ?? DEFAULT_QUALIFICATION_SCORE
    gameState.value.dice = Array(5).fill(null).map(() => ({
      value: 1, isSelected: false, isLocked: false, isValidSelection: false,
    }))
  }

  function setQualificationScore(score: number) {
    if (MIN_QUALIFYING_SCORE_OPTIONS.includes(score)) {
      gameState.value.qualificationScore = score
    }
  }

  function resetGame(qualificationScore?: number) {
    const player2IsComputer = gameState.value.players.length > 1
      ? gameState.value.players[1].isComputer
      : true

    const player1Name = gameState.value.players[0].name
    const player2Name = gameState.value.players[1].name
    const isVsComputerMode = player2IsComputer

    const defaultPlayerNames = ["Player", "Joueur"]
    const defaultPlayer1Names = ["Player 1", "Joueur 1"]
    const defaultPlayer2Names = ["Player 2", "Joueur 2"]
    const defaultComputerNames = ["Computer", "Ordinateur"]

    const isPlayer1Default =
      defaultPlayerNames.includes(player1Name) || defaultPlayer1Names.includes(player1Name)
    const isPlayer2Default =
      defaultComputerNames.includes(player2Name) || defaultPlayer2Names.includes(player2Name)

    const usePlayer1Name = !isPlayer1Default
      ? player1Name
      : isVsComputerMode ? t("player") : t("player1")
    const usePlayer2Name = !isPlayer2Default
      ? player2Name
      : isVsComputerMode ? t("computer") : t("player2")

    showMenu.value = true
    setTimeout(() => {
      gameState.value = {
        qualificationScore: qualificationScore ?? gameState.value.qualificationScore ?? DEFAULT_QUALIFICATION_SCORE,
        players: [
          { id: 0, name: usePlayer1Name, totalScore: 0, isQualified: false, isComputer: false },
          { id: 1, name: usePlayer2Name, totalScore: 0, isQualified: false, isComputer: player2IsComputer },
        ],
        currentPlayer: 0,
        currentTurnScore: 0,
        dice: Array(5).fill(null).map(() => ({
          value: 1, isSelected: false, isLocked: false, isValidSelection: false,
        })),
        gamePhase: "QUALIFICATION",
        isGameOver: false,
        lastRollScore: 0,
        potentialScore: 0,
        isFirstRoll: true,
        isBust: false,
        bustMessage: "",
        diceHidden: true,
      }
    }, 1000)
  }

  function startGame(
    players: Array<{ id: number; name: string; isComputer: boolean }>,
    options?: { qualificationScore?: number }
  ) {
    setPlayers(players, options?.qualificationScore)
    showMenu.value = false
  }

  // --- Wire composables ---
  const { playComputerTurn, selectComputerDice } = useComputerAI({
    gameState,
    currentPlayerIndex: () => gameState.value.currentPlayer,
    rollDice,
    keepScore,
    calculatePotentialScore,
    minQualifyingScore: () => MIN_QUALIFYING_SCORE.value,
  })

  const { updatePlayerScore, qualifyPlayer, setGameOver, updateDieValue } = useDevActions({
    gameState,
    minQualifyingScore: MIN_QUALIFYING_SCORE,
    calculateRollScore,
    calculatePotentialScore,
  })

  // --- Public API (unchanged) ---
  return {
    gameState,
    showMenu,

    MIN_QUALIFYING_SCORE,
    MIN_QUALIFYING_SCORE_OPTIONS,
    WINNING_SCORE,
    currentPlayer,
    isPlayerTurn,
    canRoll,
    canKeepScore,
    rollButtonTooltip,

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
  }
})
