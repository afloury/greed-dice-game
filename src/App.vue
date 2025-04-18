<script setup lang="ts">
import { useGameStore } from "./stores/gameStore"
import { watch } from "vue"

const store = useGameStore()
const { gameState } = store

// Watch for player changes for debugging
watch(
  () => gameState.players,
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
</script>

<template>
  <router-view />
</template>

<style>
@import "./style.css";
</style>
