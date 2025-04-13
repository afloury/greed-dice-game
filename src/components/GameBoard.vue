<template>
  <div class="min-h-screen p-4 game-background">
    <div class="max-w-4xl mx-auto">
      <!-- Game Header -->
      <div class="game-panel p-6 mb-6">
        <h1 class="text-3xl font-bold text-center mb-4 game-title">
          {{ t("gameTitle") }}
        </h1>
        <div class="flex justify-between items-center">
          <div class="text-lg">
            {{ t("currentPhase") }}
            <span class="font-semibold text-accent">{{
              t(`phases.${gameState.gamePhase}`)
            }}</span>
          </div>
          <div class="flex gap-2">
            <button
              @click="toggleSettings"
              class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button"
            >
              ⚙️
            </button>
            <button
              @click="handleResetGame"
              class="px-4 py-2 rounded-lg font-semibold transition-all duration-200 game-button-secondary"
            >
              {{ t("newGame") }}
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <GameSettings
        :show-settings="showSettings"
        :is-dark-mode="isDarkMode"
        :is-english="isEnglish"
        v-model:sound-volume="soundVolume"
        @update:show-settings="showSettings = $event"
        @toggle-dark-mode="toggleDarkMode"
        @toggle-language="toggleLanguage"
        @test-sound="testSound"
      />

      <!-- Player Scores -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div
          v-for="player in gameState.players"
          :key="player.id"
          :class="[
            'game-panel p-4',
            currentPlayer.id === player.id ? 'current-player' : '',
          ]"
        >
          <h2 class="text-xl font-bold mb-2">
            {{ player.name }}
            <span
              v-if="player.isComputer"
              class="text-sm text-accent-secondary"
            >
              ({{ t("computer") }})
            </span>
            <span v-else class="text-sm text-accent-secondary">
              ({{ t(player.id === 0 ? "player1" : "player2") }})
            </span>
          </h2>
          <div class="text-lg">
            {{ t("totalScore") }}
            <span class="font-semibold text-accent">{{
              player.totalScore
            }}</span>
          </div>
          <div v-if="!player.isQualified" class="text-sm text-danger">
            {{ t("needsQualification", [MIN_QUALIFYING_SCORE]) }}
          </div>
          <div v-else class="text-sm text-success">
            {{ t("qualified") }}
          </div>
        </div>
      </div>

      <!-- Computer AI Status -->
      <ComputerAI ref="computerAIRef" />

      <!-- Game Over Screen -->
      <div v-if="gameState.isGameOver" class="game-over-screen">
        <div class="game-over-content">
          <h2 class="text-4xl font-bold mb-4">{{ t("phases.Game Over") }}</h2>
          <p class="text-2xl mb-6">
            <span class="font-bold">{{ getWinnerName() }}</span>
            {{ t("wonTheGame") }}!
          </p>
          <p class="text-xl mb-8">
            {{ t("finalScore") }}: {{ getWinnerScore() }}
          </p>
          <button
            @click="handleResetGame"
            class="px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-200 game-button-primary"
          >
            {{ t("playAgain") }}
          </button>
        </div>
      </div>

      <!-- Game Board -->
      <div class="game-panel p-6 mb-6">
        <!-- Scoring -->
        <GameScoring
          :current-turn-score="gameState.currentTurnScore"
          :is-first-roll="gameState.isFirstRoll"
          :last-roll-score="gameState.lastRollScore"
          :potential-score="gameState.potentialScore"
        />

        <!-- Dice Area with animation -->
        <DiceDisplay
          v-if="!gameState.diceHidden"
          :dice="gameState.dice.map((die: any) => ({
            value: die.value,
            selected: die.isSelected,
            locked: die.isLocked,
            isValidSelection: die.isValidSelection
          }))"
          :is-rolling="spinningDice.some((spinning: boolean) => spinning)"
          :is-player-turn="isPlayerTurn"
          @toggle-die-selection="toggleDieSelection"
        />

        <div v-else class="dice-placeholder text-center my-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-16 h-16 mx-auto opacity-50"
          >
            <path
              d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            ></path>
            <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
            <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
            <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <p class="mt-4 text-accent-secondary">{{ t("rollToStart") }}</p>
        </div>

        <!-- Game Controls -->
        <DiceControls
          :is-rolling="spinningDice.some((spinning) => spinning)"
          :can-roll="canRoll && isPlayerTurn"
          :is-first-roll="gameState.isFirstRoll"
          :can-bank="canKeepScore && isPlayerTurn"
          :current-turn-score="gameState.currentTurnScore"
          :potential-score="gameState.potentialScore"
          :roll-button-tooltip="rollDiceButtonTooltip"
          :bank-button-tooltip="keepScoreButtonTooltip"
          :is-qualified="currentPlayer.isQualified"
          :qualification-score="MIN_QUALIFYING_SCORE"
          @roll-dice="rollDice"
          @bank-points="keepScore"
        />

        <!-- Bust Message -->
        <div v-if="gameState.isBust" class="text-center mt-4 mb-2">
          <div class="p-3 rounded relative bust-message" role="alert">
            <span class="block sm:inline text-lg font-bold">{{
              gameState.bustMessage
            }}</span>
            <p class="text-sm">
              {{ t("transitioningToNextPlayer") }}
            </p>
          </div>
        </div>

        <!-- Qualification Warning Message -->
        <div v-if="showQualificationWarning" class="text-center mt-4 mb-2">
          <div class="p-3 rounded relative qualification-warning" role="alert">
            <span class="block sm:inline text-lg font-bold">
              {{ t("qualificationRequired") }}
            </span>
            <p class="text-sm">
              {{ t("qualificationMessage", [MIN_QUALIFYING_SCORE]) }}
              {{ gameState.currentTurnScore + gameState.potentialScore }}
            </p>
          </div>
        </div>

        <!-- Dice Legend -->
        <div
          class="mt-6 p-3 text-xs grid grid-cols-2 gap-2 max-w-md mx-auto rounded-lg legend-panel"
        >
          <div class="flex items-center">
            <div class="w-4 h-4 mr-1 die-sample selectable-sample"></div>
            <span>{{ t("selectable") }}</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 mr-1 die-sample selected-sample"></div>
            <span>{{ t("selectedDie") }}</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 mr-1 die-sample locked-sample"></div>
            <span>{{ t("locked") }}</span>
          </div>
          <div class="flex items-center">
            <div
              class="w-4 h-4 opacity-70 mr-1 die-sample invalid-sample"
            ></div>
            <span>{{ t("notScorable") }}</span>
          </div>
        </div>
      </div>

      <!-- Game Rules -->
      <div class="game-panel p-6 mb-6">
        <h2 class="text-xl font-bold mb-4 text-center">
          {{ t("scoringRules") }}
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <div class="rules-card p-3 rounded-lg">
            <ul class="list-disc pl-5">
              <li>{{ t("singleOne") }}</li>
              <li>{{ t("singleFive") }}</li>
              <li>{{ t("threeOnes") }}</li>
              <li>{{ t("threeOfAKind") }}</li>
            </ul>
          </div>
          <div class="rules-card p-3 rounded-lg">
            <ul class="list-disc pl-5">
              <li>{{ t("fourOfAKind") }}</li>
              <li>{{ t("fiveOfAKind") }}</li>
              <li>{{ t("straight") }}</li>
              <li class="text-red-600 font-semibold">
                {{ t("noScoringDice") }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Dev Panel - Only visible in development mode -->
  <!-- <DevPanel /> -->
</template>

<script setup lang="ts">
import { useGameStore } from "../composables/useGameStore"
import { useI18n } from "../i18n"
import ComputerAI from "./ComputerAI.vue"
import GameSettings from "./GameSettings.vue"
import GameScoring from "./GameScoring.vue"
import DiceDisplay from "./DiceDisplay.vue"
import DiceControls from "./DiceControls.vue"
import DevPanel from "./DevPanel.vue"
import { ref, watch, computed, onMounted, defineProps } from "vue"

// Accept store as a prop
const props = defineProps({
  store: Object,
})

// Use the provided store or create a new one if not provided (for backward compatibility)
const localStore = props.store || useGameStore()

// Initialize i18n
const { t } = useI18n()

// Define the interface for the exposed methods from ComputerAI
interface ComputerAIExpose {
  computerActions: {
    makeDecision: () => void
  }
}

const computerAIRef = ref<ComputerAIExpose | null>(null)

// Track which dice are currently spinning
const spinningDice = ref<boolean[]>([false, false, false, false, false])

// Audio for dice rolling
let diceSound: HTMLAudioElement | null = null

// Sound settings
const soundVolume = ref(50) // Default volume 50%
const showSettings = ref(false)

// Toggle and close settings modal
const toggleSettings = () => {
  showSettings.value = !showSettings.value
  // If opening the modal, add a class to the body to prevent scrolling
  if (showSettings.value) {
    document.body.classList.add("modal-open")
  } else {
    document.body.classList.remove("modal-open")
  }
}

// Watch for sound volume changes
watch(
  () => soundVolume.value,
  (newVolume) => {
    // Update volume on the sound object if it exists
    if (diceSound) {
      diceSound.volume = newVolume / 100
    }
  }
)

// Function to play dice sound
const playDiceSound = () => {
  try {
    if (!diceSound) {
      // Try multiple possible locations for the sound file
      diceSound = new Audio("/dice-roll.mp3")

      // Fallback to not playing sound if there's an issue
      diceSound.addEventListener("error", () => {
        console.log("Dice sound file not found or not supported")
        diceSound = null
      })
    }

    if (diceSound) {
      diceSound.volume = soundVolume.value / 100
      diceSound.currentTime = 0
      diceSound.play().catch((err) => console.log("Audio play error:", err))
    }
  } catch (error) {
    console.log("Error playing dice sound:", error)
  }
}

// Use the store provided by props
const {
  gameState,
  currentPlayer,
  isPlayerTurn,
  canRoll,
  canKeepScore,
  rollDice,
  toggleDieSelection,
  keepScore,
  resetGame,
  isDarkMode,
  toggleDarkMode,
  isEnglish,
  toggleLanguage,
  setRollCallback,
  MIN_QUALIFYING_SCORE,
} = localStore

// Computed property to determine if qualification warning should be shown
const showQualificationWarning = computed(() => {
  // Only show for the human player's turn
  if (!isPlayerTurn.value || gameState.value.isBust) return false

  // Only show if not already qualified
  if (currentPlayer.value.isQualified) return false

  // Show if there are points selected but not enough to qualify
  const turnTotal =
    gameState.value.currentTurnScore + gameState.value.potentialScore
  return turnTotal > 0 && turnTotal < MIN_QUALIFYING_SCORE.value
})

// Tooltip for the Keep Score button
const keepScoreButtonTooltip = computed(() => {
  const turnTotal =
    gameState.value.currentTurnScore + gameState.value.potentialScore

  if (
    !currentPlayer.value.isQualified &&
    turnTotal < MIN_QUALIFYING_SCORE.value
  ) {
    return t("qualificationNeeded", [MIN_QUALIFYING_SCORE.value, turnTotal])
  }

  if (!canKeepScore.value) {
    return t("noPointsToKeep")
  }

  if (!isPlayerTurn.value) {
    return t("notYourTurnKeep")
  }

  return t("bankPoints")
})

// Tooltip for the Roll Dice button
const rollDiceButtonTooltip = computed(() => {
  if (!isPlayerTurn.value) {
    return t("notYourTurn")
  }

  // We should use our own detailed tooltips instead of the ones from the store
  // since we have proper translations
  if (gameState.value.isBust) {
    return t("cantRollBust")
  }

  if (!gameState.value.dice.some((die: any) => !die.isLocked)) {
    return t("allDiceLocked")
  }

  if (
    !gameState.value.isFirstRoll &&
    !gameState.value.dice.some((die: any) => die.isSelected)
  ) {
    return t("mustSelectDie")
  }

  if (gameState.value.isFirstRoll) {
    return t("rollToStartTurn")
  }

  return t("rollDiceTooltip")
})

// Set up the roll animation callback
onMounted(() => {
  console.log(
    "GameBoard received store with players:",
    props.store?.gameState.value.players.map((p: any) => p.name)
  )
  console.log(
    "GameBoard using localStore, player names:",
    gameState.value.players.map((p: any) => p.name)
  )

  setRollCallback((rollingDiceIndices: number[]) => {
    // Only play sound and animate if there are dice to roll
    if (rollingDiceIndices.length > 0) {
      // Play dice rolling sound
      playDiceSound()

      // Reset all dice to not spinning
      spinningDice.value = [false, false, false, false, false]

      // Set spinning for dice that will be rolled
      rollingDiceIndices.forEach((index: number) => {
        spinningDice.value[index] = true
      })

      // Stop spinning after animation completes
      setTimeout(() => {
        spinningDice.value = [false, false, false, false, false]
      }, 800) // Match animation duration
    }
  })
})

// Watch for end turn transitions to make sure computer's turn is triggered
watch(
  () => gameState.value.currentPlayer,
  (newPlayerIndex) => {
    // The endTurn function in the store now handles starting the computer's turn automatically
    // This watcher is just for logging purposes now
    const player = gameState.value.players[newPlayerIndex]
    console.log(`GameBoard detected player change to: ${player.name}`, {
      currentPlayerIdx: newPlayerIndex,
      isComputer: player.isComputer,
      isGameOver: gameState.value.isGameOver,
    })
  }
)

// Also ensure computer plays after a game reset
function handleResetGame() {
  console.log(
    "Resetting game with player names:",
    gameState.value.players.map((p: any) => p.name)
  )
  resetGame()
  console.log(
    "Game reset, player names are now:",
    gameState.value.players.map((p: any) => p.name)
  )
  // The menu will be shown automatically because we set showMenu to true in resetGame
}

// Function to test sound
const testSound = () => {
  playDiceSound()
}

// Function to get the winner's name
const getWinnerName = () => {
  const winner = gameState.value.players.find(
    (player) => player.totalScore === 10000
  )
  return winner ? winner.name : ""
}

// Function to get the winner's score
const getWinnerScore = () => {
  const winner = gameState.value.players.find(
    (player) => player.totalScore === 10000
  )
  return winner ? winner.totalScore : 0
}
</script>

<style scoped>
/* Game-specific styles */
.game-background {
  background-color: var(--color-bg);
  background-image: radial-gradient(
      circle at 10% 20%,
      rgba(90, 92, 152, 0.1) 0%,
      rgba(0, 0, 0, 0) 80%
    ),
    radial-gradient(
      circle at 90% 80%,
      rgba(247, 86, 124, 0.1) 0%,
      rgba(0, 0, 0, 0) 80%
    );
}

.game-title {
  background: linear-gradient(
    90deg,
    var(--color-accent),
    var(--color-accent-secondary)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: none;
}

.dark .game-title {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.current-player {
  border: 2px solid var(--color-accent);
  box-shadow: 0 0 15px rgba(247, 86, 124, 0.5);
  position: relative;
  overflow: hidden;
}

.game-icon-button {
  background-color: var(--color-card);
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  font-size: 1.2rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.game-icon-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);
}

.game-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.bust-message {
  background-color: rgba(255, 90, 90, 0.15);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}

.qualification-warning {
  background-color: rgba(255, 182, 39, 0.15);
  border: 1px solid var(--color-warning);
  color: var(--color-warning);
}

.legend-panel {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
}

.die-sample {
  border-radius: 2px;
}

.selectable-sample {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--color-border);
}

.selected-sample {
  background-color: rgba(92, 184, 228, 0.2);
  border: 1px solid var(--color-accent-secondary);
}

.locked-sample {
  background-color: rgba(68, 207, 108, 0.2);
  border: 1px solid var(--color-success);
}

.invalid-sample {
  background-color: rgba(45, 55, 72, 0.3);
}

.rules-card {
  background-color: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-border);
}

.text-accent {
  color: var(--color-accent);
}

.text-accent-secondary {
  color: var(--color-accent-secondary);
}

.text-success {
  color: var(--color-success);
}

.text-danger {
  color: var(--color-danger);
}

.game-over-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.game-over-content {
  background-color: var(--color-card);
  border: 2px solid var(--color-accent);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  max-width: 90%;
  width: 500px;
  box-shadow: 0 0 30px rgba(247, 86, 124, 0.5);
  animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pop-in {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
