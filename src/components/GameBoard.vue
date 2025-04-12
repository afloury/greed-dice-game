<template>
  <div
    class="min-h-screen p-4"
    :class="{ 'bg-gray-100': !isDarkMode, 'bg-gray-900': isDarkMode }"
  >
    <div class="max-w-4xl mx-auto">
      <!-- Game Header -->
      <div
        class="rounded-lg shadow-lg p-4 mb-4"
        :class="{ 'bg-white': !isDarkMode, 'bg-gray-800': isDarkMode }"
      >
        <h1 class="text-3xl font-bold text-center mb-4">
          {{ isEnglish ? "10,000 Dice Game" : "Jeu de Dés 10,000" }}
        </h1>
        <div class="flex justify-between items-center">
          <div class="text-lg">
            {{ isEnglish ? "Current Phase:" : "Phase Actuelle:" }}
            <span class="font-semibold">{{
              translateGamePhase(gameState.gamePhase)
            }}</span>
          </div>
          <div class="flex gap-2">
            <button
              @click="toggleSettings"
              class="p-2 rounded-lg font-semibold transition-all duration-200"
              :class="[
                isDarkMode
                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                  : 'bg-gray-500 text-white hover:bg-gray-600',
              ]"
            >
              ⚙️
            </button>
            <button
              @click="toggleDarkMode"
              class="p-2 rounded-lg font-semibold transition-all duration-200"
              :class="[
                isDarkMode
                  ? 'bg-yellow-500 text-white hover:bg-yellow-400'
                  : 'bg-gray-700 text-white hover:bg-gray-600',
              ]"
            >
              {{ isDarkMode ? "☀️" : "🌙" }}
            </button>
            <button
              @click="toggleLanguage"
              class="p-2 rounded-lg font-semibold transition-all duration-200"
              :class="[
                isDarkMode
                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                  : 'bg-gray-500 text-white hover:bg-gray-600',
              ]"
            >
              {{ isEnglish ? "🇫🇷" : "🇬🇧" }}
            </button>
            <button
              @click="handleResetGame"
              class="px-4 py-2 rounded-lg font-semibold transition-all duration-200"
              :class="[
                isDarkMode
                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                  : 'bg-gray-500 text-white hover:bg-gray-600',
              ]"
            >
              {{ isEnglish ? "New Game" : "Nouvelle Partie" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <Teleport to="body">
        <div
          v-if="showSettings"
          class="settings-modal-overlay"
          @click="closeSettings"
        >
          <div
            class="settings-modal"
            :class="{ 'dark-mode': isDarkMode }"
            @click.stop
          >
            <div class="settings-modal-header">
              <h2>{{ isEnglish ? "Settings" : "Paramètres" }}</h2>
              <button @click="closeSettings">×</button>
            </div>
            <div class="settings-modal-body">
              <div class="settings-section">
                <label class="block mb-2">
                  {{
                    isEnglish
                      ? "Sound Effects Volume:"
                      : "Volume des Effets Sonores:"
                  }}
                </label>
                <div class="flex items-center gap-3">
                  <span>🔈</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    v-model="soundVolume"
                    class="volume-slider"
                    @input="updateSoundVolume"
                  />
                  <span>🔊</span>
                </div>
                <div class="volume-value">{{ soundVolume }}%</div>

                <div class="text-center mt-3">
                  <button @click="testSound" class="test-sound-btn">
                    {{ isEnglish ? "Test Sound" : "Tester le Son" }}
                  </button>
                </div>
              </div>
            </div>
            <div class="settings-modal-footer">
              <button @click="closeSettings" class="close-btn">
                {{ isEnglish ? "Close" : "Fermer" }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Player Scores -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div
          v-for="player in gameState.players"
          :key="player.id"
          :class="[
            'rounded-lg shadow-lg p-4',
            currentPlayer.id === player.id ? 'ring-2 ring-blue-500' : '',
            isDarkMode ? 'bg-gray-800' : 'bg-white',
          ]"
        >
          <h2 class="text-xl font-bold mb-2">{{ player.name }}</h2>
          <div class="text-lg">
            {{ isEnglish ? "Total Score:" : "Score Total:" }}
            <span class="font-semibold">{{ player.totalScore }}</span>
          </div>
          <div v-if="!player.isQualified" class="text-sm text-red-500">
            {{
              isEnglish
                ? `Needs ${MIN_QUALIFYING_SCORE} points to qualify`
                : `Besoin de ${MIN_QUALIFYING_SCORE} points pour se qualifier`
            }}
          </div>
          <div v-else class="text-sm text-green-500">
            {{ isEnglish ? "Qualified" : "Qualifié" }}
          </div>
        </div>
      </div>

      <!-- Computer AI Status -->
      <ComputerAI ref="computerAIRef" />

      <!-- Game Board -->
      <div
        class="rounded-lg shadow-lg p-4 mb-4"
        :class="{ 'bg-white': !isDarkMode, 'bg-gray-800': isDarkMode }"
      >
        <!-- Scoring -->
        <div class="text-center mb-4">
          <h2 class="text-xl font-bold">
            {{ isEnglish ? "Scoring" : "Points" }}
          </h2>
          <div class="grid grid-cols-2 gap-2 text-left max-w-md mx-auto mt-2">
            <div class="text-green-500">
              <span class="font-medium">{{
                isEnglish ? "Banked Points:" : "Points en Banque:"
              }}</span>
              <span class="ml-2">{{ gameState.currentTurnScore }}</span>
            </div>
            <div>
              <span class="font-medium">{{
                isEnglish ? "Roll score:" : "Score du Lancer:"
              }}</span>
              <span class="ml-2">{{
                gameState.isFirstRoll ? 0 : gameState.lastRollScore
              }}</span>
            </div>
            <div class="text-blue-500">
              <span class="font-medium">{{
                isEnglish ? "Selected:" : "Sélectionné:"
              }}</span>
              <span class="ml-2">{{ gameState.potentialScore }}</span>
            </div>
            <div class="text-indigo-600 font-medium">
              <span class="font-medium">{{
                isEnglish ? "Total Available:" : "Total Disponible:"
              }}</span>
              <span class="ml-2">{{
                gameState.currentTurnScore + gameState.potentialScore
              }}</span>
            </div>
          </div>
        </div>

        <!-- Dice Area with animation -->
        <div class="flex justify-center gap-4 mb-4">
          <div
            v-for="(die, index) in gameState.dice"
            :key="index"
            :class="[
              'w-12 h-12 md:w-16 md:h-16 rounded-lg shadow-lg flex items-center justify-center text-2xl font-bold transition-all duration-200',
              // Dice that are selected
              die.isSelected
                ? isDarkMode
                  ? 'bg-blue-800 ring-2 ring-blue-400 text-blue-100'
                  : 'bg-blue-100 ring-2 ring-blue-500 text-blue-800'
                : '',
              // Dice that are locked (banked from previous roll)
              die.isLocked
                ? isDarkMode
                  ? 'bg-green-800 border-2 border-green-400 cursor-not-allowed text-green-100'
                  : 'bg-green-100 border-2 border-green-500 cursor-not-allowed text-green-800'
                : '',
              // Dice that are hidden between turns
              gameState.diceHidden
                ? isDarkMode
                  ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                  : 'bg-gray-300 cursor-not-allowed text-gray-500'
                : '',
              // Dice that cannot be selected (not part of a scoring combination)
              !die.isLocked &&
              !die.isSelected &&
              !die.isValidSelection &&
              !gameState.diceHidden
                ? isDarkMode
                  ? 'bg-gray-800 opacity-70 cursor-not-allowed text-gray-400'
                  : 'bg-gray-100 opacity-70 cursor-not-allowed text-gray-500'
                : '',
              // Disable during computer turn
              !isPlayerTurn ? 'cursor-not-allowed opacity-80' : '',
              // Default style for selectable dice
              !die.isLocked &&
              !die.isSelected &&
              die.isValidSelection &&
              !gameState.diceHidden &&
              isPlayerTurn
                ? isDarkMode
                  ? 'bg-gray-600 text-white cursor-pointer hover:bg-gray-500'
                  : 'bg-white cursor-pointer hover:bg-blue-50'
                : '',
            ]"
            @click="isPlayerTurn && toggleDieSelection(index)"
          >
            <template v-if="gameState.diceHidden">
              <div class="text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-6 h-6 mx-auto"
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
              </div>
            </template>
            <DiceFace
              v-else
              :value="die.value"
              :is-spinning="spinningDice[index]"
            />
          </div>
        </div>

        <!-- Hidden Dice Message -->
        <div
          v-if="gameState.diceHidden"
          class="text-center text-gray-500 text-sm mb-4"
        >
          {{
            isEnglish
              ? "Roll dice to start your turn"
              : "Lancez les dés pour commencer votre tour"
          }}
        </div>

        <!-- Game Controls -->
        <div class="flex justify-center gap-4 mb-4">
          <button
            @click="rollDice"
            :disabled="!canRoll || !isPlayerTurn"
            :title="rollDiceButtonTooltip"
            :class="[
              'px-4 py-2 rounded-lg font-semibold transition-all duration-200',
              canRoll && isPlayerTurn
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            ]"
          >
            {{ isEnglish ? "Roll Dice" : "Lancer les Dés" }}
          </button>
          <button
            @click="keepScore"
            :disabled="!canKeepScore || !isPlayerTurn"
            :class="[
              'px-4 py-2 rounded-lg font-semibold transition-all duration-200',
              canKeepScore && isPlayerTurn
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            ]"
            :title="keepScoreButtonTooltip"
          >
            {{ isEnglish ? "Keep Score" : "Garder les Points"
            }}{{
              !currentPlayer.isQualified
                ? isEnglish
                  ? ` (Need ${MIN_QUALIFYING_SCORE})`
                  : ` (Besoin de ${MIN_QUALIFYING_SCORE})`
                : ""
            }}
          </button>
        </div>

        <!-- Dice Legend -->
        <div
          class="mt-2 text-xs grid grid-cols-2 gap-2 max-w-md mx-auto"
          :class="{
            'text-gray-600': !isDarkMode,
            'text-gray-300': isDarkMode,
          }"
        >
          <div class="flex items-center">
            <div
              class="w-4 h-4 border mr-1"
              :class="[
                isDarkMode
                  ? 'bg-gray-600 border-gray-500'
                  : 'bg-white border-gray-300',
              ]"
            ></div>
            <span>{{
              isEnglish
                ? "Selectable (scores points)"
                : "Sélectionnable (donne des points)"
            }}</span>
          </div>
          <div class="flex items-center">
            <div
              class="w-4 h-4 ring-1 mr-1"
              :class="[
                isDarkMode
                  ? 'bg-blue-800 ring-blue-400 text-blue-100'
                  : 'bg-blue-100 ring-blue-500',
              ]"
            ></div>
            <span>{{ isEnglish ? "Selected" : "Sélectionné" }}</span>
          </div>
          <div class="flex items-center">
            <div
              class="w-4 h-4 border-2 mr-1"
              :class="[
                isDarkMode
                  ? 'bg-green-800 border-green-400'
                  : 'bg-green-100 border-green-500',
              ]"
            ></div>
            <span>{{
              isEnglish
                ? "Locked (banked points)"
                : "Verrouillé (points en banque)"
            }}</span>
          </div>
          <div class="flex items-center">
            <div
              class="w-4 h-4 opacity-70 mr-1"
              :class="[
                isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100',
              ]"
            ></div>
            <span>{{
              isEnglish ? "Not scorable" : "Non comptabilisable"
            }}</span>
          </div>
        </div>

        <!-- Bust Message -->
        <div v-if="gameState.isBust" class="text-center mt-4 mb-2">
          <div
            class="p-3 rounded relative"
            role="alert"
            :class="{
              'bg-red-100 border border-red-400 text-red-700': !isDarkMode,
              'bg-red-900 border border-red-800 text-red-200': isDarkMode,
            }"
          >
            <span class="block sm:inline text-lg font-bold">{{
              translateBustMessage(gameState.bustMessage)
            }}</span>
            <p class="text-sm">
              {{
                isEnglish
                  ? "Transitioning to next player..."
                  : "Passage au joueur suivant..."
              }}
            </p>
          </div>
        </div>

        <!-- Qualification Warning Message -->
        <div v-if="showQualificationWarning" class="text-center mt-4 mb-2">
          <div
            class="p-3 rounded relative"
            role="alert"
            :class="{
              'bg-yellow-100 border border-yellow-400 text-yellow-800':
                !isDarkMode,
              'bg-yellow-900 border border-yellow-700 text-yellow-200':
                isDarkMode,
            }"
          >
            <span class="block sm:inline text-lg font-bold">
              {{
                isEnglish ? "Qualification Required!" : "Qualification Requise!"
              }}
            </span>
            <p class="text-sm">
              {{
                isEnglish
                  ? `You need at least ${MIN_QUALIFYING_SCORE} points in one turn to qualify. Current turn total:`
                  : `Vous avez besoin d'au moins ${MIN_QUALIFYING_SCORE} points en un tour pour vous qualifier. Total du tour actuel:`
              }}
              {{ gameState.currentTurnScore + gameState.potentialScore }}
            </p>
          </div>
        </div>
      </div>

      <!-- Game Rules -->
      <div
        class="rounded-lg shadow-lg p-4 mb-4"
        :class="{ 'bg-white': !isDarkMode, 'bg-gray-800': isDarkMode }"
      >
        <h2 class="text-xl font-bold mb-2 text-center">
          {{ isEnglish ? "Scoring Rules" : "Règles de Scoring" }}
        </h2>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <ul class="list-disc pl-5">
              <li>
                {{
                  isEnglish ? "Single 1: 100 points" : "Un seul 1: 100 points"
                }}
              </li>
              <li>
                {{ isEnglish ? "Single 5: 50 points" : "Un seul 5: 50 points" }}
              </li>
              <li>
                {{
                  isEnglish ? "Three 1s: 1,000 points" : "Trois 1: 1,000 points"
                }}
              </li>
              <li>
                {{
                  isEnglish
                    ? "Three of a kind: number × 100"
                    : "Brelan: chiffre × 100"
                }}
              </li>
            </ul>
          </div>
          <div>
            <ul class="list-disc pl-5">
              <li>
                {{
                  isEnglish
                    ? "Four of a kind: 2× three of a kind"
                    : "Carré: 2× brelan"
                }}
              </li>
              <li>
                {{
                  isEnglish
                    ? "Five of a kind: 3× three of a kind"
                    : "Cinq identiques: 3× brelan"
                }}
              </li>
              <li>
                {{
                  isEnglish
                    ? "Straight (1-5 or 2-6): 1,500 points"
                    : "Suite (1-5 ou 2-6): 1,500 points"
                }}
              </li>
              <li class="text-red-600 font-semibold">
                {{
                  isEnglish
                    ? "No scoring dice: Bust (lose all turn points!)"
                    : "Aucun dé comptabilisable: Échec (perte de tous les points du tour!)"
                }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Game Status -->
      <div
        v-if="gameState.isGameOver"
        class="rounded-lg shadow-lg p-4 text-center"
        :class="{ 'bg-white': !isDarkMode, 'bg-gray-800': isDarkMode }"
      >
        <h2 class="text-2xl font-bold text-green-500 mb-2">
          {{ isEnglish ? "Game Over!" : "Partie Terminée!" }}
        </h2>
        <p class="text-lg">
          {{
            gameState.players.find((p) => p.totalScore >= 10000)?.name ||
            currentPlayer.name
          }}
          {{ isEnglish ? "wins with" : "gagne avec" }}
          {{
            gameState.players.find((p) => p.totalScore >= 10000)?.totalScore ||
            currentPlayer.totalScore
          }}
          {{ isEnglish ? "points!" : "points!" }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from "../composables/useGameStore"
import ComputerAI from "./ComputerAI.vue"
import DiceFace from "./DiceFace.vue"
import { ref, watch, computed, onMounted } from "vue"

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

const closeSettings = () => {
  showSettings.value = false
  document.body.classList.remove("modal-open")
}

// Update sound volume function
const updateSoundVolume = () => {
  // Update volume on the sound object if it exists
  if (diceSound) {
    diceSound.volume = soundVolume.value / 100
  }
}

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
  rollButtonTooltip,
  isEnglish,
  toggleLanguage,
  setRollCallback,
} = useGameStore()

const MIN_QUALIFYING_SCORE = 1000

// Translate game phases
const translateGamePhase = (phase: string) => {
  if (isEnglish.value) return phase

  const translations: Record<string, string> = {
    QUALIFICATION: "QUALIFICATION",
    NORMAL: "NORMAL",
    END_GAME: "FIN DE PARTIE",
    Rolling: "Lancer",
    Selecting: "Sélection",
    "End Turn": "Fin du Tour",
    "Game Over": "Partie Terminée",
  }

  return translations[phase] || phase
}

// Translate bust messages
const translateBustMessage = (message: string) => {
  if (isEnglish.value) return message

  if (message.includes("BUST")) {
    return "ÉCHEC! Aucun dé comptabilisable"
  }

  return message
}

// Computed property to determine if qualification warning should be shown
const showQualificationWarning = computed(() => {
  // Only show for the human player's turn
  if (!isPlayerTurn.value || gameState.value.isBust) return false

  // Only show if not already qualified
  if (currentPlayer.value.isQualified) return false

  // Show if there are points selected but not enough to qualify
  const turnTotal =
    gameState.value.currentTurnScore + gameState.value.potentialScore
  return turnTotal > 0 && turnTotal < MIN_QUALIFYING_SCORE
})

// Tooltip for the Keep Score button
const keepScoreButtonTooltip = computed(() => {
  const turnTotal =
    gameState.value.currentTurnScore + gameState.value.potentialScore

  if (!currentPlayer.value.isQualified && turnTotal < MIN_QUALIFYING_SCORE) {
    return isEnglish.value
      ? `You need at least ${MIN_QUALIFYING_SCORE} points in one turn to qualify. Current: ${turnTotal}`
      : `Vous avez besoin d'au moins ${MIN_QUALIFYING_SCORE} points en un tour pour vous qualifier. Actuel: ${turnTotal}`
  }

  if (!canKeepScore.value) {
    return isEnglish.value ? "No points to keep" : "Aucun point à garder"
  }

  if (!isPlayerTurn.value) {
    return isEnglish.value ? "Not your turn" : "Ce n'est pas votre tour"
  }

  return isEnglish.value
    ? "Bank your points and end your turn"
    : "Mettez vos points en banque et terminez votre tour"
})

// Tooltip for the Roll Dice button
const rollDiceButtonTooltip = computed(() => {
  if (!isPlayerTurn.value) {
    return isEnglish.value
      ? "It's not your turn to roll"
      : "Ce n'est pas votre tour de lancer"
  }

  if (isEnglish.value) {
    return rollButtonTooltip.value
  } else {
    // Translate the roll button tooltip
    if (rollButtonTooltip.value.includes("No dice selected")) {
      return "Aucun dé sélectionné pour le nouveau lancer"
    } else if (rollButtonTooltip.value.includes("Roll the dice")) {
      return "Lancez les dés pour commencer votre tour"
    } else {
      return rollButtonTooltip.value
    }
  }
})

// Set up the roll animation callback
onMounted(() => {
  setRollCallback((rollingDiceIndices) => {
    // Only play sound and animate if there are dice to roll
    if (rollingDiceIndices.length > 0) {
      // Play dice rolling sound
      playDiceSound()

      // Reset all dice to not spinning
      spinningDice.value = [false, false, false, false, false]

      // Set spinning for dice that will be rolled
      rollingDiceIndices.forEach((index) => {
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
  resetGame()
  console.log("Game reset, computer will start automatically if it's first")
}

// Function to test sound
const testSound = () => {
  playDiceSound()
}
</script>

<style scoped>
/* Add this to your style section */
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.settings-modal {
  width: 90%;
  max-width: 450px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.settings-modal.dark-mode {
  background-color: #1f2937;
  color: white;
}

.settings-modal-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dark-mode .settings-modal-header {
  border-bottom-color: #374151;
}

.settings-modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.settings-modal-header button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.5rem;
  line-height: 1;
}

.settings-modal-body {
  padding: 1.5rem;
}

.settings-section {
  margin-bottom: 1.5rem;
}

.volume-slider {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  appearance: none;
  cursor: pointer;
}

.dark-mode .volume-slider {
  background-color: #4b5563;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background-color: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.volume-value {
  text-align: center;
  margin-top: 0.5rem;
  font-weight: 500;
}

.test-sound-btn {
  padding: 0.5rem 1rem;
  background-color: #4b5563;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.test-sound-btn:hover {
  background-color: #374151;
}

.dark-mode .test-sound-btn {
  background-color: #6b7280;
}

.dark-mode .test-sound-btn:hover {
  background-color: #4b5563;
}

.settings-modal-footer {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
}

.dark-mode .settings-modal-footer {
  border-top-color: #374151;
}

.close-btn {
  padding: 0.5rem 1rem;
  background-color: #4b5563;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #374151;
}

.dark-mode .close-btn {
  background-color: #6b7280;
}

.dark-mode .close-btn:hover {
  background-color: #4b5563;
}

/* Add this to body when modal is open to prevent scrolling */
:global(.modal-open) {
  overflow: hidden;
}
</style>
