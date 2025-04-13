<script setup lang="ts">
import GameBoard from "./components/GameBoard.vue"
import GameMenu from "./components/GameMenu.vue"
import { useGameStore } from "./composables/useGameStore"

const {
  isDarkMode,
  isEnglish,
  toggleDarkMode,
  toggleLanguage,
  showMenu,
  setPlayers,
} = useGameStore()
</script>

<template>
  <GameMenu
    v-if="showMenu"
    :isEnglish="isEnglish"
    :isDarkMode="isDarkMode"
    :toggleLanguage="toggleLanguage"
    :toggleDarkMode="toggleDarkMode"
    @startGame="setPlayers"
  />
  <GameBoard v-else />
</template>

<style>
@import "./style.css";
</style>
