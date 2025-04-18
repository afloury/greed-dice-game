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
        <SelectorButton
          :items="[
            { value: 'vs-computer', text: t('vsComputer') },
            { value: 'vs-friend', text: t('vsFriend') },
          ]"
          :selected-value="gameMode"
          @update:selected="gameMode = $event"
        />
      </div>

      <!-- Qualification Score Selection -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ t("qualificationScore") || "Qualification Score" }}
        </h2>
        <SelectorButton
          :items="
            qualificationScoreOptions.map((score) => ({
              value: score,
              text: String(score),
            }))
          "
          :selected-value="selectedQualificationScore"
          @update:selected="selectedQualificationScore = $event"
        />
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
              @click="toggleDark()"
              class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button ml-2"
            >
              {{ isDark ? "☀️" : "🌙" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Start Game Button -->
      <BaseButton
        @click="handleStartGame"
        class="mt-6"
        size="lg"
        variant="primary"
      >
        {{ t("newGame") }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useGameStore } from "../stores/gameStore"
import { useI18n } from "../i18n"
import SelectorButton from "../components/SelectorButton.vue"
import BaseButton from "../components/BaseButton.vue"
import { useDark, useToggle } from "@vueuse/core"

// Use the game store and i18n directly
const { MIN_QUALIFYING_SCORE_OPTIONS, setQualificationScore, startGame } =
  useGameStore()
const { isEnglish, toggleLanguage, t } = useI18n()
const isDark = useDark()
const toggleDark = useToggle(isDark)

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
const router = useRouter()

const handleStartGame = () => {
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
  startGame(players)
  router.push("/game")
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
</style>
