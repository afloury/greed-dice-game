<template>
  <div class="min-h-screen p-4 game-background">
    <div class="max-w-4xl mx-auto">
      <!-- Game Header -->
      <div class="game-panel p-6 mb-6">
        <h1 class="text-3xl font-bold text-center mb-4 game-title">
          {{ isEnglish ? "10,000 Dice Game" : "Jeu de Dés 10,000" }}
        </h1>
        <div class="flex justify-between items-center">
          <div class="text-lg">
            {{ isEnglish ? "Current Phase:" : "Phase Actuelle:" }}
            <span class="font-semibold text-accent">{{
              translateGamePhase(gameState.gamePhase)
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
          <div class="game-panel settings-modal" @click.stop>
            <div class="settings-modal-header">
              <h2>{{ isEnglish ? "Settings" : "Paramètres" }}</h2>
              <button @click="closeSettings">×</button>
            </div>
            <div class="settings-modal-body">
              <div class="settings-section">
                <h3 class="text-lg font-medium mb-4">
                  {{ isEnglish ? "Display" : "Affichage" }}
                </h3>
                <div class="flex items-center justify-between mb-4">
                  <span>{{ isEnglish ? "Dark Mode" : "Mode Sombre" }}</span>
                  <button
                    @click="toggleDarkMode"
                    class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button"
                  >
                    {{ isDarkMode ? "☀️" : "🌙" }}
                  </button>
                </div>
                <div class="flex items-center justify-between mb-6">
                  <span>{{ isEnglish ? "Language" : "Langue" }}</span>
                  <button
                    @click="toggleLanguage"
                    class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button"
                  >
                    {{ isEnglish ? "🇫🇷" : "🇬🇧" }}
                  </button>
                </div>

                <h3 class="text-lg font-medium mb-4">
                  {{ isEnglish ? "Sound" : "Son" }}
                </h3>
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
                  <button
                    @click="testSound"
                    class="game-button-secondary test-sound-btn"
                  >
                    {{ isEnglish ? "Test Sound" : "Tester le Son" }}
                  </button>
                </div>
              </div>
            </div>
            <div class="settings-modal-footer">
              <button @click="closeSettings" class="game-button close-btn">
                {{ isEnglish ? "Close" : "Fermer" }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

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
          <h2 class="text-xl font-bold mb-2">{{ player.name }}</h2>
          <div class="text-lg">
            {{ isEnglish ? "Total Score:" : "Score Total:" }}
            <span class="font-semibold text-accent">{{
              player.totalScore
            }}</span>
          </div>
          <div v-if="!player.isQualified" class="text-sm text-danger">
            {{
              isEnglish
                ? `Needs ${MIN_QUALIFYING_SCORE} points to qualify`
                : `Besoin de ${MIN_QUALIFYING_SCORE} points pour se qualifier`
            }}
          </div>
          <div v-else class="text-sm text-success">
            {{ isEnglish ? "Qualified" : "Qualifié" }}
          </div>
        </div>
      </div>

      <!-- Computer AI Status -->
      <ComputerAI ref="computerAIRef" />

      <!-- Game Board -->
      <div class="game-panel p-6 mb-6">
        <!-- Scoring -->
        <div class="text-center mb-6">
          <h2 class="text-xl font-bold">
            {{ isEnglish ? "Scoring" : "Points" }}
          </h2>
          <div class="grid grid-cols-2 gap-4 text-left max-w-md mx-auto mt-4">
            <div class="text-success p-3 rounded-lg scoring-card">
              <span class="font-medium">{{
                isEnglish ? "Banked Points:" : "Points en Banque:"
              }}</span>
              <span class="ml-2 text-xl font-bold">{{
                gameState.currentTurnScore
              }}</span>
            </div>
            <div class="p-3 rounded-lg scoring-card">
              <span class="font-medium">{{
                isEnglish ? "Roll score:" : "Score du Lancer:"
              }}</span>
              <span class="ml-2 text-xl font-bold">{{
                gameState.isFirstRoll ? 0 : gameState.lastRollScore
              }}</span>
            </div>
            <div class="text-accent-secondary p-3 rounded-lg scoring-card">
              <span class="font-medium">{{
                isEnglish ? "Selected:" : "Sélectionné:"
              }}</span>
              <span class="ml-2 text-xl font-bold">{{
                gameState.potentialScore
              }}</span>
            </div>
            <div class="text-accent p-3 rounded-lg scoring-card">
              <span class="font-medium">{{
                isEnglish ? "Total Available:" : "Total Disponible:"
              }}</span>
              <span class="ml-2 text-xl font-bold">{{
                gameState.currentTurnScore + gameState.potentialScore
              }}</span>
            </div>
          </div>
        </div>

        <!-- Dice Area with animation -->
        <div class="flex justify-center flex-wrap gap-4 mb-6">
          <div
            v-for="(die, index) in gameState.dice"
            :key="index"
            :class="[
              'w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-200 die-container',
              // Dice that are selected
              die.isSelected ? 'die-selected' : '',
              // Dice that are locked (banked from previous roll)
              die.isLocked ? 'die-locked' : '',
              // Dice that are hidden between turns
              gameState.diceHidden ? 'die-hidden' : '',
              // Dice that cannot be selected (not part of a scoring combination)
              !die.isLocked &&
              !die.isSelected &&
              !die.isValidSelection &&
              !gameState.diceHidden
                ? 'die-invalid'
                : '',
              // Disable during computer turn
              !isPlayerTurn ? 'cursor-not-allowed opacity-80' : '',
              // Default style for selectable dice
              !die.isLocked &&
              !die.isSelected &&
              die.isValidSelection &&
              !gameState.diceHidden &&
              isPlayerTurn
                ? 'die-selectable'
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
                  class="w-8 h-8 mx-auto"
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

        <!-- Game Controls -->
        <div class="flex justify-center gap-4 mb-4">
          <button
            @click="rollDice"
            :disabled="!canRoll || !isPlayerTurn"
            :title="rollDiceButtonTooltip"
            :class="[
              'game-button',
              !canRoll || !isPlayerTurn ? 'disabled' : '',
            ]"
          >
            {{ isEnglish ? "Roll Dice" : "Lancer les Dés" }}
          </button>
          <button
            @click="keepScore"
            :disabled="!canKeepScore || !isPlayerTurn"
            :class="[
              'game-button',
              !canKeepScore || !isPlayerTurn ? 'disabled' : '',
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

        <!-- Hidden Dice Message -->
        <div
          v-if="gameState.diceHidden"
          class="text-center text-accent-secondary text-sm mt-4 mb-2"
        >
          {{
            isEnglish
              ? "Roll dice to start your turn"
              : "Lancez les dés pour commencer votre tour"
          }}
        </div>

        <!-- Bust Message -->
        <div v-if="gameState.isBust" class="text-center mt-4 mb-2">
          <div class="p-3 rounded relative bust-message" role="alert">
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
          <div class="p-3 rounded relative qualification-warning" role="alert">
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

        <!-- Dice Legend -->
        <div
          class="mt-6 p-3 text-xs grid grid-cols-2 gap-2 max-w-md mx-auto rounded-lg legend-panel"
        >
          <div class="flex items-center">
            <div class="w-4 h-4 mr-1 die-sample selectable-sample"></div>
            <span>{{
              isEnglish
                ? "Selectable (scores points)"
                : "Sélectionnable (donne des points)"
            }}</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 mr-1 die-sample selected-sample"></div>
            <span>{{ isEnglish ? "Selected" : "Sélectionné" }}</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 mr-1 die-sample locked-sample"></div>
            <span>{{
              isEnglish
                ? "Locked (banked points)"
                : "Verrouillé (points en banque)"
            }}</span>
          </div>
          <div class="flex items-center">
            <div
              class="w-4 h-4 opacity-70 mr-1 die-sample invalid-sample"
            ></div>
            <span>{{
              isEnglish ? "Not scorable" : "Non comptabilisable"
            }}</span>
          </div>
        </div>
      </div>

      <!-- Game Rules -->
      <div class="game-panel p-6 mb-6">
        <h2 class="text-xl font-bold mb-4 text-center">
          {{ isEnglish ? "Scoring Rules" : "Règles de Scoring" }}
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <div class="rules-card p-3 rounded-lg">
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
          <div class="rules-card p-3 rounded-lg">
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
  // The menu will be shown automatically because we set showMenu to true in resetGame
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
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.settings-modal {
  width: 90%;
  max-width: 450px;
  overflow: hidden;
}

.settings-modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  background-color: var(--color-border);
  border-radius: 4px;
  appearance: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background-color: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.volume-value {
  text-align: center;
  margin-top: 0.5rem;
  font-weight: 500;
}

.settings-modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

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

.current-player::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(
    90deg,
    var(--color-accent),
    var(--color-accent-secondary)
  );
  z-index: 1;
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

.scoring-card {
  background-color: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.die-container {
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px var(--color-shadow);
}

.die-selected {
  background-color: rgba(92, 184, 228, 0.1) !important;
  box-shadow: 0 0 12px rgba(92, 184, 228, 0.4);
  border: 2px solid var(--color-accent-secondary);
  transform: translateY(-2px);
}

.die-locked {
  background-color: rgba(68, 207, 108, 0.1) !important;
  box-shadow: 0 0 12px rgba(68, 207, 108, 0.3);
  border: 2px solid var(--color-success);
  transform: translateY(-1px);
}

.die-hidden {
  background-color: rgba(45, 55, 72, 0.2) !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  opacity: 0.6;
}

.die-invalid {
  background-color: rgba(45, 55, 72, 0.15) !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  opacity: 0.5;
}

.die-selectable {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid var(--color-border);
  box-shadow: 0 3px 6px var(--color-shadow);
}

.die-selectable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px var(--color-shadow);
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

/* Add this to body when modal is open to prevent scrolling */
:global(.modal-open) {
  overflow: hidden;
}
</style>
