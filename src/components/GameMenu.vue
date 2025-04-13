<template>
  <div
    class="min-h-screen p-4 game-background flex items-center justify-center"
  >
    <div class="game-panel p-8 max-w-lg w-full">
      <h1 class="text-4xl font-bold text-center mb-6 game-title">
        {{ t("gameTitle") }}
      </h1>

      <!-- Game Mode Selection -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ t("gameModes") }}
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <button
            @click="gameMode = 'vs-computer'"
            :class="[
              'p-4 rounded-lg transition-all duration-200 game-mode-btn',
              gameMode === 'vs-computer'
                ? 'game-button-primary font-bold border-2 border-accent shadow-lg transform -translate-y-1'
                : 'game-button-secondary border border-neutral-400',
            ]"
          >
            {{ t("vsComputer") }}
          </button>
          <button
            @click="gameMode = 'vs-friend'"
            :class="[
              'p-4 rounded-lg transition-all duration-200 game-mode-btn',
              gameMode === 'vs-friend'
                ? 'game-button-primary font-bold border-2 border-accent shadow-lg transform -translate-y-1'
                : 'game-button-secondary border border-neutral-400',
            ]"
          >
            {{ t("vsFriend") }}
          </button>
        </div>
      </div>

      <!-- Qualification Score Selection -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ t("qualificationScore") || "Qualification Score" }}
        </h2>
        <div class="grid grid-cols-3 gap-4">
          <button
            v-for="score in qualificationScoreOptions"
            :key="score"
            @click="selectedQualificationScore = score"
            :class="[
              'p-4 rounded-lg transition-all duration-200 game-mode-btn',
              selectedQualificationScore === score
                ? 'game-button-primary font-bold border-2 border-accent shadow-lg transform -translate-y-1'
                : 'game-button-secondary border border-neutral-400',
            ]"
          >
            {{ score }}
          </button>
        </div>
      </div>

      <!-- Player Names -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ t("playerNames") }}
        </h2>
        <div class="mb-4">
          <label class="block mb-2">
            {{ gameMode === "vs-computer" ? t("player") : t("player1") }}
          </label>
          <div class="flex gap-2">
            <input
              v-model="player1Name"
              type="text"
              :placeholder="t('enterName')"
              class="flex-1 p-2 rounded border input-field"
            />
            <button
              @click="generateRandomName(1)"
              class="p-2 rounded-lg game-button-secondary"
              title="Generate random name"
            >
              🎲
            </button>
          </div>
        </div>
        <div v-if="gameMode === 'vs-friend'" class="mb-4">
          <label class="block mb-2">
            {{ t("player2") }}
          </label>
          <div class="flex gap-2">
            <input
              v-model="player2Name"
              type="text"
              :placeholder="t('enterName')"
              class="flex-1 p-2 rounded border input-field"
            />
            <button
              @click="generateRandomName(2)"
              class="p-2 rounded-lg game-button-secondary"
              title="Generate random name"
            >
              🎲
            </button>
          </div>
        </div>
        <!-- Computer player name (shown only for vs-computer mode) -->
        <div v-if="gameMode === 'vs-computer'" class="mb-4">
          <label class="block mb-2">
            {{ t("computer") }}
          </label>
          <div class="flex gap-2">
            <input
              v-model="player2Name"
              type="text"
              :placeholder="t('computer')"
              class="flex-1 p-2 rounded border input-field"
            />
            <button
              @click="generateRandomName(2)"
              class="p-2 rounded-lg game-button-secondary"
              title="Generate random name"
            >
              🎲
            </button>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="mb-8">
        <div class="flex justify-between items-center">
          <div>
            <button
              @click="toggleLanguage"
              class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button"
            >
              {{ isEnglish ? "🇫🇷" : "🇬🇧" }}
            </button>
            <button
              @click="toggleDarkMode"
              class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button ml-2"
            >
              {{ isDarkMode ? "☀️" : "🌙" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Start Game Button -->
      <button
        @click="startGame"
        class="w-full p-4 rounded-lg font-bold text-xl game-button-primary transition-all duration-200"
      >
        {{ t("newGame") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useGameStore } from "../composables/useGameStore"
import { useI18n } from "../i18n"

// Use the game store and i18n directly
const {
  isDarkMode,
  toggleDarkMode,
  MIN_QUALIFYING_SCORE_OPTIONS,
  setQualificationScore,
} = useGameStore()
const { isEnglish, toggleLanguage, t } = useI18n()

// Emits
const emit = defineEmits<{
  startGame: [players: Array<{ id: number; name: string; isComputer: boolean }>]
}>()

// Game mode (vs friend or vs computer)
const gameMode = ref<"vs-computer" | "vs-friend">("vs-computer")

// Qualification score options and selection
const qualificationScoreOptions = MIN_QUALIFYING_SCORE_OPTIONS
const selectedQualificationScore = ref(1000)

// Player names
const player1Name = ref("")
const player2Name = ref("")

// Random nickname generator
const nicknames = {
  english: [
    "High Roller",
    "Dice Master",
    "Lucky Six",
    "Roll King",
    "Fortune Roller",
    "Chance Taker",
    "Dice Wizard",
    "Double Six",
    "Straight Shooter",
    "Dice Baron",
    "Gold Digger",
    "Risk Taker",
  ],
  french: [
    "Grand Joueur",
    "Maître des Dés",
    "Chanceux",
    "Roi du Lancer",
    "Rouleur Fortuné",
    "Preneur de Risque",
    "Magicien des Dés",
    "Double Six",
    "Tireur Droit",
    "Baron des Dés",
    "Chercheur d'Or",
    "Risqueur",
  ],
}

// Generate a random nickname based on current language
const generateRandomName = (playerNumber: 1 | 2) => {
  const list = isEnglish.value ? nicknames.english : nicknames.french
  const randomIndex = Math.floor(Math.random() * list.length)
  const newNickname = list[randomIndex]

  // Ensure players don't get the same nickname
  if (playerNumber === 2 && player1Name.value === newNickname) {
    return generateRandomName(playerNumber) // Try again
  }

  // Set the nickname to the appropriate player
  if (playerNumber === 1) {
    player1Name.value = newNickname
  } else {
    player2Name.value = newNickname
  }
}

// Start the game with current players
const startGame = () => {
  // Set default names if empty
  let player1NameValue = player1Name.value.trim()
  let player2NameValue = player2Name.value.trim()

  // If playing vs computer and player name empty, use "Player"
  if (gameMode.value === "vs-computer") {
    if (!player1NameValue) {
      player1NameValue = t("player")
    }
    if (!player2NameValue) {
      player2NameValue = t("computer")
    }
  } else {
    // If playing vs friend and player names empty, use "Player 1" and "Player 2"
    if (!player1NameValue) {
      player1NameValue = t("player1")
    }
    if (!player2NameValue) {
      player2NameValue = t("player2")
    }
  }

  // Set the qualification score
  setQualificationScore(selectedQualificationScore.value)

  // Create player objects
  const players = [
    {
      id: 0,
      name: player1NameValue,
      isComputer: false,
    },
    {
      id: 1,
      name: player2NameValue,
      isComputer: gameMode.value === "vs-computer",
    },
  ]

  emit("startGame", players)
}
</script>

<style scoped>
.input-field {
  background-color: transparent;
  border-color: var(--color-border);
}

.input-field:focus {
  outline: none;
  border-color: var(--color-accent);
}

.border-accent {
  border-color: var(--color-accent);
}

.game-button-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.game-mode-btn {
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.game-mode-btn:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.game-mode-btn.game-button-secondary {
  background-color: rgba(255, 255, 255, 0.05);
}

.game-mode-btn.game-button-secondary:hover {
  border-color: var(--color-accent);
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
