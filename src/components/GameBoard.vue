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
            @click="resetGame"
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
      <ComputerAI />

      <!-- Game Board -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-4">
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

        <!-- Dice Area -->
        <div class="flex justify-center gap-4 mb-4">
          <div
            v-for="(die, index) in gameState.dice"
            :key="index"
            :class="[
              'w-12 h-12 md:w-16 md:h-16 rounded-lg bg-white shadow-lg flex items-center justify-center text-2xl font-bold cursor-pointer transition-all duration-200',
              die.isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : '',
              die.isLocked ? 'bg-gray-200 cursor-not-allowed' : '',
            ]"
            @click="toggleDieSelection(index)"
          >
            {{ die.value }}
          </div>
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
          >
            Keep Score
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
              <li>No scoring dice: Bust (lose turn)</li>
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
</script>
