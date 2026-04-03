import { defineStore } from "pinia"
import { ref, computed, watch } from "vue"
import type { GameState } from "../types/game"
import type { GuestAction } from "../types/multiplayer"
import { useI18n } from "../i18n"
import { scoreDiceRoll, scoreSelectedDice } from "../composables/useScoringEngine"
import { useComputerAI } from "../composables/useComputerAI"
import { useDevActions } from "../composables/useDevActions"

const MIN_QUALIFYING_SCORE_OPTIONS = [500, 750, 1000]
const WINNING_SCORE = 10000
const DEFAULT_QUALIFICATION_SCORE = 1000

const DEFAULT_NAMES_BY_LANG = {
  player: ["Player", "Joueur"],
  player1: ["Player 1", "Joueur 1"],
  player2: ["Player 2", "Joueur 2"],
  computer: ["Computer", "Ordinateur"],
}

function isDefaultName(name: string): boolean {
  return Object.values(DEFAULT_NAMES_BY_LANG).some((names) => names.includes(name))
}

function freshDice() {
  return Array(5).fill(null).map(() => ({
    value: 1, isSelected: false, isLocked: false, isValidSelection: false,
  }))
}

export const useGameStore = defineStore("game", () => {
  const { isEnglish, toggleLanguage, t } = useI18n()

  // --- State ---
  const showMenu = ref(true)
  const gameMode = ref<"vs-computer" | "vs-player-online">("vs-computer")
  const multiplayerRole = ref<"host" | "guest" | null>(null)

  const gameState = ref<GameState>({
    players: [
      { id: 0, name: t("player"), totalScore: 0, isQualified: false, isComputer: false },
      { id: 1, name: t("computer"), totalScore: 0, isQualified: false, isComputer: true },
    ],
    currentPlayer: 0,
    currentTurnScore: 0,
    dice: freshDice(),
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

  const isPlayerTurn = computed(() => {
    if (gameMode.value === "vs-player-online") {
      const localPlayerIndex = multiplayerRole.value === "host" ? 0 : 1
      return gameState.value.currentPlayer === localPlayerIndex
    }
    return !currentPlayer.value.isComputer
  })

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

  /** Resolve a player name: keep custom names, translate default ones */
  function resolvePlayerName(name: string, isComputer: boolean, isVsComputer: boolean): string {
    if (!isDefaultName(name)) return name
    if (isComputer) return isVsComputer ? t("computer") : t("player2")
    return isVsComputer ? t("player") : t("player1")
  }

  // --- Language change watcher ---
  watch(isEnglish, () => {
    const isVsComputer = gameState.value.players.length > 1
      ? gameState.value.players[1].isComputer
      : true

    gameState.value.players.forEach((player) => {
      player.name = resolvePlayerName(player.name, player.isComputer, isVsComputer)
    })

    if (gameState.value.bustMessage) {
      gameState.value.bustMessage = gameState.value.currentTurnScore > 0
        ? t("bustLostPoints", [
            gameState.value.players[gameState.value.currentPlayer].name,
            gameState.value.currentTurnScore,
          ])
        : t("bustGeneric")
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

    if (gameMode.value === "vs-computer" && currentPlayer.value.isComputer && !gameState.value.isGameOver) {
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
    gameState.value.dice = freshDice()
  }

  function setQualificationScore(score: number) {
    if (MIN_QUALIFYING_SCORE_OPTIONS.includes(score)) {
      gameState.value.qualificationScore = score
    }
  }

  function resetGame(qualificationScore?: number) {
    const isVsComputer = gameState.value.players.length > 1
      ? gameState.value.players[1].isComputer
      : true

    const players = gameState.value.players.map((p) => ({
      id: p.id,
      name: resolvePlayerName(p.name, p.isComputer, isVsComputer),
      isComputer: p.isComputer,
    }))

    gameMode.value = "vs-computer"
    multiplayerRole.value = null
    showMenu.value = true
    setTimeout(() => {
      setPlayers(players, qualificationScore)
    }, 1000)
  }

  function startGame(
    players: Array<{ id: number; name: string; isComputer: boolean }>,
    options?: { qualificationScore?: number; mode?: "vs-computer" | "vs-player-online"; role?: "host" | "guest" }
  ) {
    gameMode.value = options?.mode ?? "vs-computer"
    multiplayerRole.value = options?.role ?? null
    setPlayers(players, options?.qualificationScore)
    showMenu.value = false
  }

  /** Guest: replace local state entirely with host's state */
  function applyRemoteState(state: GameState) {
    Object.assign(gameState.value, state)
  }

  /** Host: process an action received from the guest */
  function handleRemoteAction(action: GuestAction) {
    // Only host processes guest actions, and only during guest's turn
    if (multiplayerRole.value !== "host") return
    if (gameState.value.currentPlayer !== 1) return

    switch (action.kind) {
      case "roll":
        rollDice()
        break
      case "select-die":
      case "deselect-die":
        toggleDieSelection(action.index)
        break
      case "bank":
        keepScore()
        break
    }
  }

  // --- Wire composables ---
  const { playComputerTurn } = useComputerAI({
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

  // --- Public API ---
  return {
    gameState,
    showMenu,
    gameMode,
    multiplayerRole,

    MIN_QUALIFYING_SCORE,
    MIN_QUALIFYING_SCORE_OPTIONS,
    WINNING_SCORE,
    currentPlayer,
    isPlayerTurn,
    canRoll,
    canKeepScore,

    setQualificationScore,
    setRollCallback,
    rollDice,
    calculatePotentialScore,
    toggleDieSelection,
    keepScore,
    endTurn,
    playComputerTurn,
    resetGame,
    toggleLanguage,
    updatePlayerScore,
    qualifyPlayer,
    setGameOver,
    updateDieValue,
    startGame,
    applyRemoteState,
    handleRemoteAction,
  }
})
