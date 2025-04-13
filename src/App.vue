<script setup lang="ts">
import GameBoard from "./components/GameBoard.vue"
import GameMenu from "./components/GameMenu.vue"
import { useGameStore } from "./composables/useGameStore"
import { useI18n } from "./i18n"
import { watch } from "vue"

const store = useGameStore()
const { gameState, showMenu, setPlayers, refreshGameState } = store

// Initialize i18n
const { t } = useI18n()

// Watch for player changes for debugging
watch(
  () => gameState.value.players,
  (newPlayers) => {
    console.log(
      "App.vue detected player change:",
      newPlayers.map(
        (p) => `${p.name} (${p.isComputer ? "Computer" : "Human"})`
      )
    )
  },
  { deep: true }
)

// Function to handle starting a game with custom player names
const handleStartGame = (players) => {
  console.log("App.vue: Starting game with players:", players)
  setPlayers(players)

  // Force a refresh of the game state when switching to GameBoard
  refreshGameState()
}
</script>

<template>
  <GameMenu v-if="showMenu" @startGame="handleStartGame" />
  <GameBoard v-else :store="store" />
</template>

<style>
@import "./style.css";
</style>
