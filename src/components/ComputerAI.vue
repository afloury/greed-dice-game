<template>
  <div
    v-if="isComputerTurn || showWaitingMessage"
    class="border p-3 rounded-lg text-center mb-4"
    :class="{
      'bg-yellow-50 border-yellow-200': !isDarkMode,
      'bg-yellow-900 border-yellow-800': isDarkMode,
    }"
  >
    <p class="text-lg font-semibold">{{ computerActionText }}</p>
    <p class="text-sm mt-1">{{ statusMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { watch, computed, ref } from "vue"
import { useGameStore } from "../stores/gameStore"

const statusMessage = ref("Computer is thinking...")
const { isDarkMode, gameState, playComputerTurn } = useGameStore()

// Simplified computed properties
const isComputerTurn = computed(
  () =>
    gameState.players[gameState.currentPlayer].isComputer &&
    !gameState.isGameOver
)

const showWaitingMessage = computed(() => {
  // Show when a player bust happens and next player is computer
  if (gameState.isBust) {
    const nextPlayerIndex =
      (gameState.currentPlayer + 1) % gameState.players.length
    return gameState.players[nextPlayerIndex].isComputer
  }
  return false
})

const computerActionText = computed(() => {
  if (gameState.isBust && showWaitingMessage.value) {
    return "Player busted! Computer's turn..."
  }
  return "Computer is thinking..."
})

// Simplified computer action that just calls the store function
const computerActions = {
  makeDecision: () => {
    console.log("ComputerAI component: makeDecision called")
    if (isComputerTurn.value) {
      statusMessage.value = "Making move..."
      playComputerTurn()
    } else {
      console.log("Not computer's turn")
    }
  },
}

// Export computerActions for external use
defineExpose({
  computerActions,
})

// Just one simple watcher for computer turns
watch(isComputerTurn, (newValue) => {
  if (newValue) {
    console.log("Computer turn detected in watcher")
    statusMessage.value = "Computer's turn starting..."
  }
})
</script>
