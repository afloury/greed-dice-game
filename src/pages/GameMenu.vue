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
            {
              value: 'multiplayer',
              text: t('multiplayerOnline'),
              disabled: !isDev,
            },
          ]"
          :selected-value="gameMode"
          @update:selected="gameMode = $event"
        />
        <div v-if="!isDev" class="text-xs text-red-500 mt-2">
          {{ "Multiplayer is not ready yet." }}
        </div>
      </div>

      <!-- Multiplayer options -->
      <div v-if="gameMode === 'multiplayer'" class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ t("multiplayerOptions") || "Multiplayer Options" }}
        </h2>
        <SelectorButton
          :items="[
            { value: 'host', text: t('hostGame') },
            { value: 'join', text: t('joinGame') },
          ]"
          :selected-value="multiplayerRole"
          @update:selected="multiplayerRole = $event"
        />
        <div v-if="multiplayerRole === 'host'" class="mt-4">
          <label class="block mb-2">{{ t("gameCode") || "Game Code" }}</label>
          <input
            v-model="multiplayerCode"
            type="text"
            class="flex-1 p-2 rounded border input-field"
          />
          <button
            @click="multiplayerCode = generateRandomCode()"
            class="p-2 rounded-lg game-button-secondary ml-2"
            title="Generate random code"
          >
            🎲
          </button>
        </div>
        <div v-else class="mt-4">
          <label class="block mb-2">{{
            t("enterGameCode") || "Enter Game Code"
          }}</label>
          <input
            v-model="multiplayerCode"
            type="text"
            class="flex-1 p-2 rounded border input-field"
          />
        </div>
      </div>
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
          :selected-value="selectedQualificationScore"
          @update:selected="selectedQualificationScore = $event"
        />
      </div>

      <!-- Player Names -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ t("playerNames") }}
        </h2>
        <div
          class="mb-4"
          v-if="
            gameMode === 'vs-computer' ||
            (gameMode === 'multiplayer' && multiplayerRole === 'host')
          "
        >
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
        <div
          v-if="gameMode === 'multiplayer' && multiplayerRole === 'join'"
          class="mb-4"
        >
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
        {{
          gameMode === "vs-computer"
            ? t("newGame")
            : multiplayerRole === "host"
            ? t("createGame")
            : t("joinGame")
        }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useGameStore } from "../stores/gameStore"
import { setGameState } from "../utils/firebase"
import { useI18n } from "../i18n"
import SelectorButton from "../components/SelectorButton.vue"
import BaseButton from "../components/BaseButton.vue"
import { useDark, useToggle } from "@vueuse/core"

// Use the game store and i18n directly
const { MIN_QUALIFYING_SCORE_OPTIONS, setQualificationScore, startGame } =
  useGameStore()
const { isEnglish, toggleLanguage, t } = useI18n()
const isDark = useDark()
const isDev = import.meta.env.DEV
const toggleDark = useToggle(isDark)

// Game mode (vs friend or vs computer)
const gameMode = ref<"vs-computer" | "multiplayer">("vs-computer")
const multiplayerRole = ref<"host" | "join">("host")
const multiplayerCode = ref(generateRandomCode())

// Qualification score options and selection
const qualificationScoreOptions = MIN_QUALIFYING_SCORE_OPTIONS
const selectedQualificationScore = ref(1000)

// Player names
const player1Name = ref("")
const player2Name = ref("")

// Watch for multiplayer mode changes
watch(gameMode, (newMode: "vs-computer" | "multiplayer") => {
  if (newMode === "multiplayer") {
    multiplayerRole.value = "host"
    multiplayerCode.value = generateRandomCode()
  }
})
watch(multiplayerRole, (newRole: "host" | "join") => {
  if (newRole === "join") {
    multiplayerCode.value = ""
  } else {
    multiplayerCode.value = generateRandomCode()
  }
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

// Multiplayer helpers
function generateRandomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

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
  if (gameMode.value === "multiplayer") {
    startGame(players, {
      mode: "multiplayer",
      code: multiplayerCode.value,
      role: multiplayerRole.value,
    })
    // If joining, update player 2 name in Firebase
    if (multiplayerRole.value === "join") {
      setTimeout(() => {
        const store = useGameStore()
        store.updateJoiningPlayerName(player2Name.value.trim() || t("player2"))
      }, 300)
    }
    localStorage.setItem("multiplayerRole", multiplayerRole.value)
    router.push(`/game/${multiplayerCode.value}`)
  } else {
    startGame(players, { mode: "vs-computer" })
    router.push("/game")
  }
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
