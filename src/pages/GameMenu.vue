<template>
  <div
    class="min-h-screen p-4 game-background flex items-center justify-center"
  >
    <div class="game-panel p-8 max-w-lg w-full">
      <h1 class="text-4xl font-bold text-center mb-6 game-title">
        {{ t("gameTitle") }}
      </h1>
      <!-- Qualification Score Selection -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ t("qualificationScore") }}
        </h2>
        <SelectorButton
          :items="
            qualificationScoreOptions.map((score) => ({
              value: score,
              text: String(score),
            }))
          "
          :selected-value="qualificationScore"
          @update:selected="qualificationScore = $event"
        />
      </div>

      <!-- Player Names -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ t("playerNames") }}
        </h2>
        <div class="mb-4">
          <label class="block mb-2">
            {{ t("player") }}
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
        <!-- Computer player name (shown only for vs-computer mode) -->
        <div class="mb-4">
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
import { ref, watch, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useGameStore } from "../stores/gameStore"
import { useI18n } from "../i18n"
import SelectorButton from "../components/SelectorButton.vue"
import BaseButton from "../components/BaseButton.vue"
import { useDark, useToggle } from "@vueuse/core"

// Use the game store and i18n directly
const { MIN_QUALIFYING_SCORE_OPTIONS, startGame } = useGameStore()
const { isEnglish, toggleLanguage, t } = useI18n()
const isDark = useDark()
const toggleDark = useToggle(isDark)

// --- MENU STATE PERSISTENCE ---
const MENU_STATE_KEY = "greed-game-menu-state"

function saveMenuState() {
  localStorage.setItem(
    MENU_STATE_KEY,
    JSON.stringify({
      qualificationScore: qualificationScore.value,
      player1Name: player1Name.value,
      player2Name: player2Name.value,
    })
  )
}

function loadMenuState() {
  try {
    const raw = localStorage.getItem(MENU_STATE_KEY)
    if (!raw) return
    const state = JSON.parse(raw)
    if (state.qualificationScore)
      qualificationScore.value = state.qualificationScore
    if (state.player1Name) player1Name.value = state.player1Name
    if (state.player2Name) player2Name.value = state.player2Name
  } catch (e) {
    // Ignore errors
  }
}

/* function clearMenuState() {
  localStorage.removeItem(MENU_STATE_KEY)
} */

// Qualification score options and selection
const qualificationScoreOptions = MIN_QUALIFYING_SCORE_OPTIONS
// Use the store's synced qualification score
const store = useGameStore()
const qualificationScore = computed({
  get: () => store.gameState.qualificationScore,
  set: (val: number) => store.setQualificationScore(val),
})

// Player names
const player1Name = ref("")
const player2Name = ref("")

// --- WATCHERS FOR MENU STATE PERSISTENCE ---
watch(
  [qualificationScore, player1Name, player2Name],
  saveMenuState,
  { deep: true }
)

onMounted(() => {
  loadMenuState()
})

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

const router = useRouter()

const handleStartGame = () => {
  const player1NameValue = player1Name.value.trim() || t("player")
  const player2NameValue = player2Name.value.trim() || t("computer")

  const players = [
    { id: 0, name: player1NameValue, isComputer: false },
    { id: 1, name: player2NameValue, isComputer: true },
  ]

  startGame(players, { qualificationScore: qualificationScore.value })
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
