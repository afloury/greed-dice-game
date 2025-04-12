<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-4xl mx-auto">
      <!-- Game Header -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-4">
        <h1 class="text-3xl font-bold text-center mb-4">10,000 Dice Game</h1>
        <div class="flex justify-between items-center">
          <div class="text-lg">
            Current Phase:
            <span class="font-semibold">{{ gameState.gamePhase }}</span>
          </div>
          <button
            @click="handleResetGame"
            class="px-4 py-2 rounded-lg font-semibold bg-gray-500 text-white hover:bg-gray-600 transition-all duration-200"
          >
            New Game
          </button>
        </div>
      </div>

      <!-- Player Scores -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div
          v-for="player in gameState.players"
          :key="player.id"
          :class="[
            'bg-white rounded-lg shadow-lg p-4',
            currentPlayer.id === player.id ? 'ring-2 ring-blue-500' : '',
          ]"
        >
          <h2 class="text-xl font-bold mb-2">{{ player.name }}</h2>
          <div class="text-lg">
            Total Score:
            <span class="font-semibold">{{ player.totalScore }}</span>
          </div>
          <div v-if="!player.isQualified" class="text-sm text-red-500">
            Needs {{ MIN_QUALIFYING_SCORE }} points to qualify
          </div>
          <div v-else class="text-sm text-green-500">Qualified</div>
        </div>
      </div>

      <!-- Computer AI Status -->
      <ComputerAI ref="computerAIRef" />

      <!-- Game Board -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-4">
        <!-- Scoring -->
        <div class="text-center mb-4">
          <h2 class="text-xl font-bold">Scoring</h2>
          <div class="grid grid-cols-2 gap-2 text-left max-w-md mx-auto mt-2">
            <div>
              <span class="font-medium">Banked Points:</span>
              <span class="ml-2">{{ gameState.currentTurnScore }}</span>
            </div>
            <div
              v-if="gameState.lastRollScore > 0 && !gameState.isFirstRoll"
              class="text-green-500"
            >
              <span class="font-medium">Last Roll:</span>
              <span class="ml-2">{{ gameState.lastRollScore }}</span>
            </div>
            <div v-if="gameState.potentialScore > 0" class="text-blue-500">
              <span class="font-medium">Selected:</span>
              <span class="ml-2">{{ gameState.potentialScore }}</span>
            </div>
            <div
              v-if="
                gameState.potentialScore > 0 || gameState.currentTurnScore > 0
              "
              class="text-indigo-600 font-medium"
            >
              <span class="font-medium">Total Available:</span>
              <span class="ml-2">{{
                gameState.currentTurnScore + gameState.potentialScore
              }}</span>
            </div>
          </div>
        </div>

        <!-- Bust Message -->
        <div v-if="gameState.isBust" class="text-center mb-4">
          <div
            class="bg-red-100 border border-red-400 text-red-700 p-3 rounded relative"
            role="alert"
          >
            <span class="block sm:inline text-lg font-bold">{{
              gameState.bustMessage
            }}</span>
            <p class="text-sm">Transitioning to next player...</p>
          </div>
        </div>

        <!-- Qualification Warning Message -->
        <div v-if="showQualificationWarning" class="text-center mb-4">
          <div
            class="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded relative"
            role="alert"
          >
            <span class="block sm:inline text-lg font-bold">
              Qualification Required!
            </span>
            <p class="text-sm">
              You need at least {{ MIN_QUALIFYING_SCORE }} points in one turn to
              qualify. Current turn total:
              {{ gameState.currentTurnScore + gameState.potentialScore }}
            </p>
          </div>
        </div>

        <!-- Dice Area -->
        <div class="flex justify-center gap-4 mb-4">
          <div
            v-for="(die, index) in gameState.dice"
            :key="index"
            :class="[
              'w-12 h-12 md:w-16 md:h-16 rounded-lg bg-white shadow-lg flex items-center justify-center text-2xl font-bold cursor-pointer transition-all duration-200',
              die.isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : '',
              die.isLocked ? 'bg-gray-200 cursor-not-allowed' : '',
              gameState.diceHidden
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : '',
            ]"
            @click="toggleDieSelection(index)"
          >
            {{ gameState.diceHidden ? "X" : die.value }}
          </div>
        </div>

        <!-- Hidden Dice Message -->
        <div
          v-if="gameState.diceHidden"
          class="text-center text-gray-500 text-sm mb-4"
        >
          Roll dice to start your turn
        </div>

        <!-- Game Controls -->
        <div class="flex justify-center gap-4">
          <button
            @click="rollDice"
            :disabled="!canRoll || !isPlayerTurn"
            :class="[
              'px-4 py-2 rounded-lg font-semibold transition-all duration-200',
              canRoll && isPlayerTurn
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            ]"
          >
            Roll Dice
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
            Keep Score{{
              !currentPlayer.isQualified
                ? ` (Need ${MIN_QUALIFYING_SCORE})`
                : ""
            }}
          </button>
        </div>
      </div>

      <!-- Game Rules -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-4">
        <h2 class="text-xl font-bold mb-2 text-center">Scoring Rules</h2>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <ul class="list-disc pl-5">
              <li>Single 1: 100 points</li>
              <li>Single 5: 50 points</li>
              <li>Three 1s: 1,000 points</li>
              <li>Three of a kind: number × 100</li>
            </ul>
          </div>
          <div>
            <ul class="list-disc pl-5">
              <li>Four of a kind: 2× three of a kind</li>
              <li>Five of a kind: 3× three of a kind</li>
              <li>Straight (1-5 or 2-6): 1,500 points</li>
              <li class="text-red-600 font-semibold">
                No scoring dice: Bust (lose all turn points!)
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Game Status -->
      <div
        v-if="gameState.isGameOver"
        class="bg-white rounded-lg shadow-lg p-4 text-center"
      >
        <h2 class="text-2xl font-bold text-green-500 mb-2">Game Over!</h2>
        <p class="text-lg">
          {{
            gameState.players.find((p) => p.totalScore >= 10000)?.name ||
            currentPlayer.name
          }}
          wins with
          {{
            gameState.players.find((p) => p.totalScore >= 10000)?.totalScore ||
            currentPlayer.totalScore
          }}
          points!
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from "../composables/useGameStore"
import ComputerAI from "./ComputerAI.vue"
import { ref, watch, computed } from "vue"

// Define the interface for the exposed methods from ComputerAI
interface ComputerAIExpose {
  computerActions: {
    makeDecision: () => void
  }
}

const computerAIRef = ref<ComputerAIExpose | null>(null)

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
} = useGameStore()

const MIN_QUALIFYING_SCORE = 1000

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
    return `You need at least ${MIN_QUALIFYING_SCORE} points in one turn to qualify. Current: ${turnTotal}`
  }

  if (!canKeepScore.value) {
    return "No points to keep"
  }

  if (!isPlayerTurn.value) {
    return "Not your turn"
  }

  return "Bank your points and end your turn"
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
</script>
