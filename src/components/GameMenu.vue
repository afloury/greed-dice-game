<template>
  <div
    class="min-h-screen p-4 game-background flex items-center justify-center"
  >
    <div class="game-panel p-8 max-w-lg w-full">
      <h1 class="text-4xl font-bold text-center mb-6 game-title">
        {{ isEnglish ? "10,000 Dice Game" : "Jeu de Dés 10,000" }}
      </h1>

      <!-- Game Mode Selection -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ isEnglish ? "Game Mode" : "Mode de Jeu" }}
        </h2>
        <div class="grid grid-cols-2 gap-4">
          <button
            @click="gameMode = 'vs-computer'"
            :class="[
              'p-4 rounded-lg transition-all duration-200 game-mode-btn',
              gameMode === 'vs-computer'
                ? 'game-button-primary font-bold border-2 border-accent shadow-lg transform -translate-y-1'
                : 'game-button-secondary border border-neutral-400',
            ]"
          >
            {{ isEnglish ? "vs Computer" : "vs Ordinateur" }}
          </button>
          <button
            @click="gameMode = 'vs-friend'"
            :class="[
              'p-4 rounded-lg transition-all duration-200 game-mode-btn',
              gameMode === 'vs-friend'
                ? 'game-button-primary font-bold border-2 border-accent shadow-lg transform -translate-y-1'
                : 'game-button-secondary border border-neutral-400',
            ]"
          >
            {{ isEnglish ? "vs Friend" : "vs Ami" }}
          </button>
        </div>
      </div>

      <!-- Player Names -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ isEnglish ? "Player Names" : "Noms des Joueurs" }}
        </h2>

        <!-- Player 1 -->
        <div class="mb-6">
          <label class="block mb-2">
            {{ isEnglish ? "Player 1" : "Joueur 1" }}
          </label>
          <div class="flex gap-2">
            <input
              v-model="player1Name"
              type="text"
              :placeholder="
                gameMode === 'vs-computer'
                  ? isEnglish
                    ? 'Player'
                    : 'Joueur'
                  : isEnglish
                  ? 'Player 1'
                  : 'Joueur 1'
              "
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

        <!-- Player 2 (shown only for vs-friend mode) -->
        <div v-if="gameMode === 'vs-friend'" class="mb-4">
          <label class="block mb-2">
            {{ isEnglish ? "Player 2" : "Joueur 2" }}
          </label>
          <div class="flex gap-2">
            <input
              v-model="player2Name"
              type="text"
              :placeholder="isEnglish ? 'Enter name' : 'Entrez un nom'"
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
            {{ isEnglish ? "Computer" : "Ordinateur" }}
          </label>
          <div class="flex gap-2">
            <input
              v-model="player2Name"
              type="text"
              :placeholder="isEnglish ? 'Computer' : 'Ordinateur'"
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
              @click="toggleDarkMode"
              class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button ml-2"
            >
              {{ isDarkMode ? "☀️" : "🌙" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Start Game Button -->
      <button
        @click="startGame"
        class="w-full p-4 rounded-lg font-bold text-xl game-button-primary transition-all duration-200"
      >
        {{ isEnglish ? "Start Game" : "Commencer la Partie" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

// Props
const props = defineProps<{
  isEnglish: boolean
  isDarkMode: boolean
  toggleLanguage: () => void
  toggleDarkMode: () => void
}>()

// Emits
const emit = defineEmits<{
  startGame: [players: Array<{ id: number; name: string; isComputer: boolean }>]
}>()

// Game mode (vs friend or vs computer)
const gameMode = ref<"vs-computer" | "vs-friend">("vs-computer")

// Player names
const player1Name = ref("")
const player2Name = ref("")

// Random nickname generator
const englishNicknames = [
  "Dice King",
  "Lucky Roller",
  "Score Master",
  "Fortune Teller",
  "Brave Gambler",
  "Risk Taker",
  "Dice Wizard",
  "Point Hunter",
  "Lucky Charm",
  "High Roller",
  "Dice Ninja",
  "Straight Shooter",
  "Point Machine",
  "Sharp Shooter",
  "Dice Baron",
  "Gold Digger",
  "Royal Flush",
  "Jackpot",
  "Wild Card",
  "Master Mind",
]

const frenchNicknames = [
  "Roi des Dés",
  "Lanceur Chanceux",
  "Maître du Score",
  "Devin",
  "Joueur Courageux",
  "Preneur de Risque",
  "Sorcier des Dés",
  "Chasseur de Points",
  "Porte-Bonheur",
  "Grand Joueur",
  "Ninja des Dés",
  "Tireur d'Élite",
  "Machine à Points",
  "Tireur Précis",
  "Baron des Dés",
  "Chercheur d'Or",
  "Quinte Flush",
  "Jackpot",
  "Joker",
  "Cerveau",
]

// Generate random nickname
function generateRandomName(playerNumber: number) {
  const nicknames = props.isEnglish ? englishNicknames : frenchNicknames
  const randomIndex = Math.floor(Math.random() * nicknames.length)

  // Make sure we don't choose the same nickname for both players
  let newNickname = nicknames[randomIndex]
  if (playerNumber === 2 && player1Name.value === newNickname) {
    // Choose a different nickname if it's the same as player 1
    const differentIndex = (randomIndex + 1) % nicknames.length
    newNickname = nicknames[differentIndex]
  }

  if (playerNumber === 1) {
    player1Name.value = newNickname
  } else if (playerNumber === 2) {
    player2Name.value = newNickname
  }
}

// Start the game
function startGame() {
  // Use the provided names or default values based on game mode
  let player1NameValue = player1Name.value.trim()
  let player2NameValue = player2Name.value.trim()

  // Set default names if empty
  if (gameMode.value === "vs-computer") {
    // vs Computer mode: Player and Computer
    if (!player1NameValue) {
      player1NameValue = props.isEnglish ? "Player" : "Joueur"
    }
    if (!player2NameValue) {
      player2NameValue = props.isEnglish ? "Computer" : "Ordinateur"
    }
  } else {
    // vs Friend mode: Player 1 and Player 2
    if (!player1NameValue) {
      player1NameValue = props.isEnglish ? "Player 1" : "Joueur 1"
    }
    if (!player2NameValue) {
      player2NameValue = props.isEnglish ? "Player 2" : "Joueur 2"
    }
  }

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

  console.log("Starting game with players:", players)
  emit("startGame", players)
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

.border-accent {
  border-color: var(--color-accent);
}

.game-button-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.game-mode-btn {
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.game-mode-btn:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.game-mode-btn.game-button-secondary {
  background-color: rgba(255, 255, 255, 0.05);
}

.game-mode-btn.game-button-secondary:hover {
  border-color: var(--color-accent);
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
