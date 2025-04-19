<template>
  <div class="min-h-screen p-4 game-background">
    <!-- Game Not Found Overlay with loader -->
    <div v-if="gameNotFound" class="game-over-screen">
      <div
        v-if="showNotFoundLoader"
        class="game-over-content flex flex-col items-center justify-center"
      >
        <div class="loader mb-6" />
        <span class="text-lg text-accent-secondary">{{ t("loading") }}...</span>
      </div>
      <div v-else class="game-over-content">
        <h2 class="text-3xl font-bold mb-4">{{ t("gameNotFound") }}</h2>
        <p class="mb-8">{{ t("gameNotFoundDesc") }}</p>
        <BaseButton
          @click="router.push('/')"
          variant="primary"
          :label="t('newGame')"
        />
      </div>
    </div>
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
              t(`phases.${store.gameState.gamePhase}`)
            }}</span>
          </div>
          <div class="flex gap-2 items-center">
            <button
              @click="toggleSettings"
              class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button mr-2"
            >
              ⚙️
            </button>
            <BaseButton
              @click="handleResetGame"
              variant="secondary"
              :label="t('newGame')"
            />
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <GameSettings
        :show-settings="showSettings"
        :is-english="isEnglish"
        v-model:sound-volume="soundVolume"
        @update:show-settings="showSettings = $event"
        @toggle-language="toggleLanguage"
        @test-sound="testSound"
      />

      <!-- Player Scores -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div
          v-for="player in store.gameState.players"
          :key="player.id"
          :class="[
            'game-panel p-4',
            store.currentPlayer.id === player.id ? 'current-player' : '',
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
            {{ t("needsQualification", [store.MIN_QUALIFYING_SCORE]) }}
          </div>
          <div v-else class="text-sm text-success">
            {{ t("qualified") }}
          </div>
        </div>
      </div>

      <!-- Computer AI Status -->
      <ComputerAI ref="computerAIRef" />

      <!-- Game Over Screen -->
      <div v-if="store.gameState.isGameOver" class="game-over-screen">
        <div class="game-over-content">
          <h2 class="text-4xl font-bold mb-4">{{ t("phases.Game Over") }}</h2>
          <p class="text-2xl mb-6">
            <span class="text-xl font-bold">{{ getWinnerName() }}</span>
            {{ t("wonTheGame") }}!
          </p>
          <p class="text-xl mb-8">
            {{ t("finalScore") }}: {{ getWinnerScore() }}
          </p>
          <BaseButton
            @click="handleResetGame"
            variant="secondary"
            :label="t('playAgain')"
          />
        </div>
      </div>

      <!-- Show waiting message if host is waiting for player 2 -->
      <div
        v-if="store.isWaitingForPlayer2"
        class="game-panel p-6 mb-6 text-center"
      >
        <h2 class="text-2xl font-bold mb-4 text-accent">
          {{ t("waitingForPlayer2") }}
        </h2>
        <p class="text-lg">
          {{ t("waitingForPlayer2Desc", [store.multiplayer?.code || ""]) }}
        </p>
      </div>

      <!-- Game Board -->
      <div v-else class="game-panel p-6 mb-6">
        <!-- Scoring -->
        <GameScoring
          :current-turn-score="store.gameState.currentTurnScore"
          :is-first-roll="store.gameState.isFirstRoll"
          :last-roll-score="store.gameState.lastRollScore"
          :potential-score="store.gameState.potentialScore"
        />

        <!-- Dice Area with animation -->
        <DiceDisplay
          v-if="!store.gameState.diceHidden"
          :dice="store.gameState.dice.map((die: any) => ({
            value: die.value,
            selected: die.isSelected,
            locked: die.isLocked,
            isValidSelection: die.isValidSelection
          }))"
          :is-rolling="spinningDice.some((spinning: boolean) => spinning)"
          :is-player-turn="store.isPlayerTurn"
          @toggle-die-selection="store.toggleDieSelection"
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
          :can-roll="store.canRoll && store.isPlayerTurn"
          :is-first-roll="store.gameState.isFirstRoll"
          :can-bank="store.canKeepScore && store.isPlayerTurn"
          :current-turn-score="store.gameState.currentTurnScore"
          :potential-score="store.gameState.potentialScore"
          :roll-button-tooltip="rollDiceButtonTooltip"
          :bank-button-tooltip="keepScoreButtonTooltip"
          :is-qualified="store.currentPlayer.isQualified"
          :qualification-score="store.MIN_QUALIFYING_SCORE"
          @roll-dice="handleRollDice"
          @bank-points="handleKeepScore"
        />

        <!-- Bust Message -->
        <div v-if="store.gameState.isBust" class="text-center mt-4 mb-2">
          <div class="p-3 rounded relative bust-message" role="alert">
            <span class="block sm:inline text-lg font-bold">{{
              store.gameState.bustMessage
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
              {{ t("qualificationNeeded", [store.MIN_QUALIFYING_SCORE]) }}
              {{
                store.gameState.currentTurnScore +
                store.gameState.potentialScore
              }}
            </p>
          </div>
        </div>

        <!-- Dice Legend -->
        <!-- <div
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
        </div> -->
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
  <DevPanel v-if="isDev" />
</template>

<script setup lang="ts">
import { useGameStore } from "../stores/gameStore"
import { useI18n } from "../i18n"
import ComputerAI from "../components/ComputerAI.vue"
import GameSettings from "../components/GameSettings.vue"
import GameScoring from "../components/GameScoring.vue"
import DiceDisplay from "../components/DiceDisplay.vue"
import DiceControls from "../components/DiceControls.vue"
import DevPanel from "../components/DevPanel.vue"
import { computed, onMounted, ref, watch } from "vue"
import BaseButton from "../components/BaseButton.vue"
import { useRouter, useRoute } from "vue-router"
import { useGameState } from "../utils/firebase"

// Use the store directly to maintain reactivity
const store = useGameStore()
const route = useRoute()

onMounted(() => {
  // If /game/:code is present, auto-connect to multiplayer
  const code = route.params.code as string | undefined
  if (code) {
    // Determine role: if joining from menu, should be join; if host, should be host
    // You can store the role in localStorage or as a query param when navigating
    const role =
      localStorage.getItem("multiplayerRole") === "host" ? "host" : "join"
    store.joinGame(code, role, false)
  }
})

// Loader for not found modal
const showNotFoundLoader = ref(true)

// Computed property to detect if the game does not exist
const gameNotFound = computed(() => {
  // If we're in multiplayer mode and the code param exists, but there is no game state or no players, consider it not found
  const code = route.params.code as string | undefined
  if (!code) return false
  // If the multiplayer code does not match or game state is missing/empty
  if (!store.multiplayer || store.multiplayer.code !== code) return false
  // If game state is missing or has no players, consider it not found
  const { data: remoteState } = useGameState(code)
  return !remoteState.value
})

// Watch for gameNotFound to show loader for 1 second
watch(gameNotFound, (val) => {
  if (val) {
    showNotFoundLoader.value = true
    setTimeout(() => {
      showNotFoundLoader.value = false
    }, 1000)
  } else {
    showNotFoundLoader.value = true
  }
})

const isDev = import.meta.env.DEV

// Initialize i18n
const { t, isEnglish, toggleLanguage } = useI18n()

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

// Function to animate dice rolling
const animateDice = () => {
  // After a delay, stop the spinning animation
  setTimeout(() => {
    spinningDice.value = Array(5).fill(false)
  }, 1000)
}

// Computed property to determine if qualification warning should be shown
const showQualificationWarning = computed(() => {
  // Only show the warning if it's the player's turn and they're not qualified
  if (!store.isPlayerTurn || store.gameState.isBust) return false

  // Check if the current player is qualified
  if (store.currentPlayer.isQualified) return false

  // Check if the player has enough points to qualify
  return (
    store.gameState.gamePhase === "QUALIFICATION" &&
    store.gameState.potentialScore < store.MIN_QUALIFYING_SCORE &&
    store.currentPlayer.totalScore + store.gameState.potentialScore <
      store.MIN_QUALIFYING_SCORE
  )
})

// Tooltip for the Keep Score button
const keepScoreButtonTooltip = computed(() => {
  const turnTotal =
    store.gameState.currentTurnScore + store.gameState.potentialScore

  if (
    !store.currentPlayer.isQualified &&
    turnTotal < store.MIN_QUALIFYING_SCORE
  ) {
    return t("qualificationNeeded", [store.MIN_QUALIFYING_SCORE, turnTotal])
  }

  if (!store.canKeepScore) {
    return t("noPointsToKeep")
  }

  if (!store.isPlayerTurn) {
    return t("notYourTurnKeep")
  }

  return t("bankPoints")
})

// Tooltip for the Roll Dice button
const rollDiceButtonTooltip = computed(() => {
  if (!store.isPlayerTurn) {
    return t("notYourTurn")
  }

  // We should use our own detailed tooltips instead of the ones from the store
  // since we have proper translations
  if (store.gameState.isBust) {
    return t("cantRollBust")
  }

  if (!store.gameState.dice.some((die: any) => !die.isLocked)) {
    return t("allDiceLocked")
  }

  if (
    !store.gameState.isFirstRoll &&
    !store.gameState.dice.some((die: any) => die.isSelected)
  ) {
    return t("mustSelectDie")
  }

  if (store.gameState.isFirstRoll) {
    return t("rollToStartTurn")
  }

  return t("rollDiceTooltip")
})

// Set up the roll animation callback
onMounted(() => {
  console.log(
    "GameBoard received store with players:",
    store.gameState.players.map((p: any) => p.name)
  )

  store.setRollCallback((rollingDiceIndices: number[]) => {
    // Reset spinning state
    spinningDice.value = Array(5).fill(false)

    // Mark dice that are rolling as spinning
    rollingDiceIndices.forEach((index) => {
      spinningDice.value[index] = true
    })

    // Play dice sound
    playDiceSound()

    // After a delay, stop the spinning animation
    setTimeout(() => {
      spinningDice.value = Array(5).fill(false)
    }, 1000)
  })
})

// Watch for end turn transitions to make sure computer's turn is triggered
watch(
  () => store.gameState.currentPlayer,
  (newPlayerIndex) => {
    // The endTurn function in the store now handles starting the computer's turn automatically
    // This watcher is just for logging purposes now
    const player = store.gameState.players[newPlayerIndex]
    console.log(`GameBoard detected player change to: ${player.name}`, {
      currentPlayerIdx: newPlayerIndex,
      isComputer: player.isComputer,
      isGameOver: store.gameState.isGameOver,
    })
  }
)

// Also ensure computer plays after a game reset
const router = useRouter()

function handleResetGame() {
  console.log(
    "Resetting game with player names:",
    store.gameState.players.map((p: any) => p.name)
  )
  store.resetGame()
  console.log(
    "Game reset, player names are now:",
    store.gameState.players.map((p: any) => p.name)
  )
  // The menu will be shown automatically because we set showMenu to true in resetGame
  router.push("/")
}

// Function to test sound
const testSound = () => {
  playDiceSound()
}

// Function to get the winner's name
const getWinnerName = () => {
  const winner = store.gameState.players.find(
    (player: { totalScore: number }) => player.totalScore === 10000
  )
  return winner ? winner.name : ""
}

// Function to get the winner's score
const getWinnerScore = () => {
  const winner = store.gameState.players.find(
    (player: { totalScore: number }) => player.totalScore === 10000
  )
  return winner ? winner.totalScore : 0
}

// Function to keep score
const handleKeepScore = () => {
  // Can only keep score if it's allowed
  if (!store.canKeepScore || !store.isPlayerTurn) return

  // Keep score
  store.keepScore()
}

// Function to handle roll button click
const handleRollDice = () => {
  // Can only roll if it's allowed
  if (!store.canRoll || !store.isPlayerTurn) return

  // Play sound
  playDiceSound()

  // Roll the dice
  store.rollDice()

  // Reset the spinning dice
  spinningDice.value = store.gameState.dice.map(() => true)

  // Start the animation
  animateDice()
}
</script>

<style scoped>
.loader {
  border: 6px solid #eee;
  border-top: 6px solid var(--color-accent);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.game-not-found-message {
  color: var(--color-danger);
  font-size: 1.5rem;
  text-align: center;
  margin-top: 4rem;
}

/* ... */
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
  background-clip: text;
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
