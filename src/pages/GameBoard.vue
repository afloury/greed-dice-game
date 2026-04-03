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
            <span class="font-semibold text-[var(--color-accent)]">{{
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
        @test-sound="playDiceSound"
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
              class="text-sm text-[var(--color-accent-secondary)]"
            >
              ({{ t("computer") }})
            </span>
            <span v-else-if="isOnline" class="text-sm text-[var(--color-accent-secondary)]">
              <template v-if="(store.multiplayerRole === 'host' && player.id === 0) || (store.multiplayerRole === 'guest' && player.id === 1)">(me)</template>
              <template v-else-if="player.id === 0">(host)</template>
            </span>
            <span v-else class="text-sm text-[var(--color-accent-secondary)]">
              ({{ t(player.id === 0 ? "player1" : "player2") }})
            </span>
          </h2>
          <div class="text-lg">
            {{ t("totalScore") }}
            <span class="font-semibold text-[var(--color-accent)]">{{
              player.totalScore
            }}</span>
          </div>
          <div v-if="!player.isQualified" class="text-sm text-[var(--color-danger)]">
            {{ t("needsQualification", [store.MIN_QUALIFYING_SCORE]) }}
          </div>
          <div v-else class="text-sm text-[var(--color-success)]">
            {{ t("qualified") }}
          </div>
        </div>
      </div>

      <!-- Computer AI Status -->
      <ComputerAI ref="computerAIRef" />

      <!-- Opponent disconnected overlay (online) -->
      <div v-if="isOnline && opponentDisconnected" class="game-over-screen">
        <div class="game-over-content">
          <h2 class="text-2xl font-bold mb-4">{{ t("opponentDisconnected") }}</h2>
          <p class="mb-6">{{ t("waitingForReconnect") }}</p>
          <div class="loader mx-auto mb-6" />
          <BaseButton @click="handleResetGame" variant="secondary" :label="t('backToMenu')" />
        </div>
      </div>

      <!-- Connection status indicator (online) -->
      <div v-if="isOnline" class="mb-2 flex items-center gap-2 text-sm">
        <span
          class="w-2.5 h-2.5 rounded-full inline-block"
          :class="{
            'bg-[var(--color-success)]': multiplayer.connectionState.value === 'connected',
            'bg-[var(--color-warning)]': multiplayer.connectionState.value === 'reconnecting',
            'bg-[var(--color-danger)]': multiplayer.connectionState.value === 'disconnected',
            'bg-[var(--color-accent-secondary)]': multiplayer.connectionState.value === 'connecting',
          }"
        />
        <span class="text-[var(--color-accent-secondary)]">
          {{ t("onlineGame") }} — {{ multiplayer.opponentName.value || "..." }}
        </span>
      </div>

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

      <!-- Game Board -->
      <div class="game-panel p-6 mb-6">
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
          @toggle-die-selection="handleToggleDie"
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
          <p class="mt-4 text-[var(--color-accent-secondary)]">{{ t("rollToStart") }}</p>
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
          <div class="p-3 rounded relative bg-[rgba(255,90,90,0.15)] border border-[var(--color-danger)] text-[var(--color-danger)]" role="alert">
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
          <div class="p-3 rounded relative bg-[rgba(255,182,39,0.15)] border border-[var(--color-warning)] text-[var(--color-warning)]" role="alert">
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

      </div>

      <!-- Game Rules -->
      <div class="game-panel p-6 mb-6">
        <h2 class="text-xl font-bold mb-4 text-center">
          {{ t("scoringRules") }}
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-[rgba(0,0,0,0.15)] border border-[var(--color-border)] p-3 rounded-lg">
            <ul class="list-disc pl-5">
              <li>{{ t("singleOne") }}</li>
              <li>{{ t("singleFive") }}</li>
              <li>{{ t("threeOnes") }}</li>
              <li>{{ t("threeOfAKind") }}</li>
            </ul>
          </div>
          <div class="bg-[rgba(0,0,0,0.15)] border border-[var(--color-border)] p-3 rounded-lg">
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
import { useGameSound } from "../composables/useGameSound"
import { useMultiplayer } from "../composables/useMultiplayer"
import ComputerAI from "../components/ComputerAI.vue"
import GameSettings from "../components/GameSettings.vue"
import GameScoring from "../components/GameScoring.vue"
import DiceDisplay from "../components/DiceDisplay.vue"
import DiceControls from "../components/DiceControls.vue"
import DevPanel from "../components/DevPanel.vue"
import BaseButton from "../components/BaseButton.vue"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

const store = useGameStore()
const router = useRouter()
const isDev = import.meta.env.DEV
const { t, isEnglish, toggleLanguage } = useI18n()
const { soundVolume, spinningDice, playDiceSound, startSpinAnimation, onDiceRolled } = useGameSound()

// --- Multiplayer ---
const multiplayer = useMultiplayer()
const isOnline = computed(() => store.gameMode === "vs-player-online")
const opponentDisconnected = ref(false)

const showSettings = ref(false)

const toggleSettings = () => {
  showSettings.value = !showSettings.value
  document.body.classList.toggle("modal-open", showSettings.value)
}

onMounted(() => {
  store.setRollCallback(onDiceRolled)

  // Wire multiplayer events
  if (isOnline.value) {
    if (store.multiplayerRole === "host") {
      // Host: process guest actions and sync state after mutations
      multiplayer.onGuestAction((action) => {
        store.handleRemoteAction(action)
      })
    } else {
      // Guest: apply remote state from host
      multiplayer.onStateSync((state) => {
        store.applyRemoteState(state)
      })
    }

    // Host: send initial state so guest can catch up
    if (store.multiplayerRole === "host") {
      multiplayer.sendGameState(store.gameState)
    }

    multiplayer.onPlayerLeft(() => { opponentDisconnected.value = true })
    multiplayer.onPlayerReconnected(() => {
      opponentDisconnected.value = false
      // Host re-sends state on reconnect
      if (store.multiplayerRole === "host") {
        multiplayer.sendGameState(store.gameState)
      }
    })
  }
})

// Host: sync state to guest after every gameState change
let syncDebounce: ReturnType<typeof setTimeout> | null = null
if (store.gameMode === "vs-player-online" && store.multiplayerRole === "host") {
  watch(
    () => store.gameState,
    (state) => {
      if (syncDebounce) clearTimeout(syncDebounce)
      syncDebounce = setTimeout(() => {
        multiplayer.sendGameState(state)
      }, 50)
    },
    { deep: true }
  )
}

onUnmounted(() => {
  if (isOnline.value) {
    multiplayer.disconnect()
  }
})

// --- Computed ---
const showQualificationWarning = computed(() => {
  if (!store.isPlayerTurn || store.gameState.isBust) return false
  if (store.currentPlayer.isQualified) return false
  return (
    store.gameState.gamePhase === "QUALIFICATION" &&
    store.gameState.potentialScore < store.MIN_QUALIFYING_SCORE &&
    store.currentPlayer.totalScore + store.gameState.potentialScore < store.MIN_QUALIFYING_SCORE
  )
})

const keepScoreButtonTooltip = computed(() => {
  const turnTotal = store.gameState.currentTurnScore + store.gameState.potentialScore
  if (!store.currentPlayer.isQualified && turnTotal < store.MIN_QUALIFYING_SCORE) {
    return t("qualificationNeeded", [store.MIN_QUALIFYING_SCORE, turnTotal])
  }
  if (!store.canKeepScore) return t("noPointsToKeep")
  if (!store.isPlayerTurn) return t("notYourTurnKeep")
  return t("bankPoints")
})

const rollDiceButtonTooltip = computed(() => {
  if (!store.isPlayerTurn) return t("notYourTurn")
  if (store.gameState.isBust) return t("cantRollBust")
  if (!store.gameState.dice.some((die: any) => !die.isLocked)) return t("allDiceLocked")
  if (!store.gameState.isFirstRoll && !store.gameState.dice.some((die: any) => die.isSelected)) {
    return t("mustSelectDie")
  }
  if (store.gameState.isFirstRoll) return t("rollToStartTurn")
  return t("rollDiceTooltip")
})

// --- Actions ---
const isGuest = computed(() => isOnline.value && store.multiplayerRole === "guest")

function handleResetGame() {
  if (isOnline.value) multiplayer.disconnect()
  store.resetGame()
  router.push("/")
}

function handleKeepScore() {
  if (!store.canKeepScore || !store.isPlayerTurn) return
  if (isGuest.value) {
    multiplayer.sendAction({ kind: "bank" })
  } else {
    store.keepScore()
  }
}

function handleRollDice() {
  if (!store.canRoll || !store.isPlayerTurn) return
  if (isGuest.value) {
    multiplayer.sendAction({ kind: "roll" })
  } else {
    playDiceSound()
    store.rollDice()
    spinningDice.value = store.gameState.dice.map(() => true)
    startSpinAnimation()
  }
}

function handleToggleDie(index: number) {
  if (isGuest.value) {
    const die = store.gameState.dice[index]
    multiplayer.sendAction({ kind: die.isSelected ? "deselect-die" : "select-die", index })
  } else {
    store.toggleDieSelection(index)
  }
}

const getWinnerName = () => {
  const winner = store.gameState.players.find((p) => p.totalScore === 10000)
  return winner ? winner.name : ""
}

const getWinnerScore = () => {
  const winner = store.gameState.players.find((p) => p.totalScore === 10000)
  return winner ? winner.totalScore : 0
}
</script>

<style scoped>
/* Dual radial gradient background — not expressible in Tailwind */
.game-background {
  background-color: var(--color-bg);
  background-image: radial-gradient(
      circle at 10% 20%, rgba(90, 92, 152, 0.1) 0%, rgba(0, 0, 0, 0) 80%),
    radial-gradient(
      circle at 90% 80%, rgba(247, 86, 124, 0.1) 0%, rgba(0, 0, 0, 0) 80%);
}

/* Gradient text effect */
.game-title {
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-secondary));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  font-weight: 800;
  letter-spacing: 1px;
}

/* Active player glow */
.current-player {
  border: 2px solid var(--color-accent);
  box-shadow: 0 0 15px rgba(247, 86, 124, 0.5);
  position: relative;
  overflow: hidden;
}

/* Circular icon button with hover lift */
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

/* Game over fullscreen overlay */
.game-over-screen {
  position: fixed;
  inset: 0;
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
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
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
