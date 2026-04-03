<template>
  <div class="min-h-screen p-4 game-background flex items-center justify-center">
    <div class="game-panel p-8 max-w-lg w-full">
      <h1 class="text-4xl font-bold text-center mb-6 game-title">
        {{ t("gameTitle") }}
      </h1>

      <!-- Error message -->
      <div v-if="multiplayer.error.value" class="mb-6 p-3 rounded bg-[rgba(255,90,90,0.15)] border border-[var(--color-danger)] text-[var(--color-danger)]">
        {{ multiplayer.error.value }}
      </div>

      <!-- Mode selection: Create or Join -->
      <div v-if="!isConnecting && !isWaiting" class="mb-8">
        <h2 class="text-xl font-bold mb-4">{{ t("multiplayerOnline") }}</h2>
        <SelectorButton
          :items="[
            { value: 'create', text: t('createGame') },
            { value: 'join', text: t('joinGame') },
          ]"
          :selected-value="lobbyMode"
          @update:selected="lobbyMode = $event"
        />
      </div>

      <!-- Player name -->
      <div v-if="!isConnecting && !isWaiting" class="mb-8">
        <label class="block mb-2 font-bold">{{ t("playerNames") }}</label>
        <div class="flex gap-2">
          <input
            v-model="playerName"
            type="text"
            :placeholder="t('enterName')"
            class="flex-1 p-2 rounded border input-field"
          />
          <button
            @click="generateRandomName"
            class="p-2 rounded-lg game-button-secondary"
            title="Random name"
          >
            🎲
          </button>
        </div>
      </div>

      <!-- Join: enter room code -->
      <div v-if="lobbyMode === 'join' && !isConnecting && !isWaiting" class="mb-8">
        <label class="block mb-2 font-bold">{{ t("enterGameCode") }}</label>
        <input
          v-model="joinCode"
          type="text"
          :placeholder="'ABCDEF'"
          class="w-full p-2 rounded border input-field uppercase"
          maxlength="6"
        />
      </div>

      <!-- Create: qualification score -->
      <div v-if="lobbyMode === 'create' && !isConnecting && !isWaiting" class="mb-8">
        <h2 class="text-xl font-bold mb-4">{{ t("qualificationScore") }}</h2>
        <SelectorButton
          :items="qualificationOptions.map((s) => ({ value: s, text: String(s) }))"
          :selected-value="qualificationScore"
          @update:selected="qualificationScore = $event"
        />
      </div>

      <!-- Action button -->
      <div v-if="!isConnecting && !isWaiting">
        <BaseButton
          @click="handleAction"
          size="lg"
          variant="primary"
          :disabled="!canProceed"
        >
          {{ lobbyMode === "create" ? t("createGame") : t("joinGame") }}
        </BaseButton>

        <BaseButton
          @click="router.push('/')"
          class="mt-4"
          size="lg"
          variant="secondary"
          :label="t('back')"
        />
      </div>

      <!-- Waiting for opponent (host) -->
      <div v-if="isWaiting" class="text-center">
        <h2 class="text-2xl font-bold mb-4 text-[var(--color-accent)]">
          {{ t("waitingForPlayer2") }}
        </h2>
        <div class="mb-6 p-4 rounded-lg bg-[rgba(0,0,0,0.15)] border border-[var(--color-border)]">
          <p class="text-sm mb-2">{{ t("gameCode") }}</p>
          <div class="flex items-center justify-center gap-2">
            <span class="text-3xl font-mono font-bold tracking-widest text-[var(--color-accent)]">
              {{ multiplayer.roomCode.value }}
            </span>
            <button
              @click="copyCode"
              class="p-2 rounded-lg game-button-secondary"
              :title="copied ? '✓' : 'Copy'"
            >
              {{ copied ? "✓" : "📋" }}
            </button>
          </div>
        </div>
        <div class="loader mx-auto mb-4" />
        <p class="text-[var(--color-accent-secondary)]">
          {{ t("shareCodeWithFriend") }}
        </p>
        <BaseButton
          @click="handleCancel"
          class="mt-6"
          variant="secondary"
          :label="t('cancel')"
        />
      </div>

      <!-- Connecting -->
      <div v-if="isConnecting" class="text-center">
        <div class="loader mx-auto mb-4" />
        <p class="text-lg">{{ t("connecting") }}...</p>
        <BaseButton
          @click="handleCancel"
          class="mt-6"
          variant="secondary"
          :label="t('cancel')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "../i18n"
import { useMultiplayer } from "../composables/useMultiplayer"
import { useGameStore } from "../stores/gameStore"
import SelectorButton from "../components/SelectorButton.vue"
import BaseButton from "../components/BaseButton.vue"

const router = useRouter()
const { t, isEnglish } = useI18n()
const multiplayer = useMultiplayer()
const store = useGameStore()

const lobbyMode = ref<"create" | "join">("create")
const playerName = ref("")
const joinCode = ref("")
const qualificationScore = ref(1000)
const qualificationOptions = [500, 750, 1000]
const copied = ref(false)

const isWaiting = computed(() =>
  multiplayer.role.value === "host" &&
  multiplayer.connectionState.value === "connected" &&
  !multiplayer.opponentName.value
)

const isConnecting = computed(() =>
  multiplayer.connectionState.value === "connecting" ||
  multiplayer.connectionState.value === "reconnecting"
)

const canProceed = computed(() => {
  if (!playerName.value.trim()) return false
  if (lobbyMode.value === "join" && joinCode.value.trim().length < 4) return false
  return true
})

// Random nicknames
const nicknames = {
  english: ["High Roller", "Dice Master", "Lucky Six", "Roll King", "Fortune Roller", "Dice Wizard", "Double Six", "Straight Shooter", "Dice Baron", "Risk Taker"],
  french: ["Grand Joueur", "Maître des Dés", "Chanceux", "Roi du Lancer", "Rouleur Fortuné", "Magicien des Dés", "Double Six", "Tireur Droit", "Baron des Dés", "Risqueur"],
}

function generateRandomName() {
  const list = isEnglish.value ? nicknames.english : nicknames.french
  playerName.value = list[Math.floor(Math.random() * list.length)]
}

async function handleAction() {
  const name = playerName.value.trim() || t("player")

  try {
    if (lobbyMode.value === "create") {
      await multiplayer.createRoom(name)
      // Wait for opponent to join, then init game and navigate
      multiplayer.onPlayerJoined((guestName: string) => {
        store.startGame(
          [
            { id: 0, name, isComputer: false },
            { id: 1, name: guestName, isComputer: false },
          ],
          { qualificationScore: qualificationScore.value, mode: "vs-player-online", role: "host" }
        )
        sessionStorage.setItem("mp_session", JSON.stringify({
          role: "host", name, code: multiplayer.roomCode.value,
          qualificationScore: qualificationScore.value, guestName,
        }))
        router.push(`/game/${multiplayer.roomCode.value}`)
      })
    } else {
      const code = joinCode.value.trim().toUpperCase()
      // Wait for room:joined to get the host's actual name
      multiplayer.onRoomJoined((hostName: string) => {
        store.startGame(
          [
            { id: 0, name: hostName, isComputer: false },
            { id: 1, name, isComputer: false },
          ],
          { mode: "vs-player-online", role: "guest" }
        )
        sessionStorage.setItem("mp_session", JSON.stringify({
          role: "guest", name, code, hostName,
        }))
        router.push(`/game/${code}`)
      })
      await multiplayer.joinRoom(code, name)
    }
  } catch {
    // Error is already set in multiplayer.error by the composable
  }
}

function handleCancel() {
  multiplayer.disconnect()
}

async function copyCode() {
  if (multiplayer.roomCode.value) {
    await navigator.clipboard.writeText(multiplayer.roomCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<style scoped>
.game-background {
  background-color: var(--color-bg);
  background-image: radial-gradient(
      circle at 10% 20%, rgba(90, 92, 152, 0.1) 0%, rgba(0, 0, 0, 0) 80%),
    radial-gradient(
      circle at 90% 80%, rgba(247, 86, 124, 0.1) 0%, rgba(0, 0, 0, 0) 80%);
}
.game-title {
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-secondary));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  font-weight: 800;
  letter-spacing: 1px;
}
.input-field {
  background-color: transparent;
  border-color: var(--color-border);
}
.input-field:focus {
  outline: none;
  border-color: var(--color-accent);
}
.loader {
  border: 6px solid #eee;
  border-top: 6px solid var(--color-accent);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
