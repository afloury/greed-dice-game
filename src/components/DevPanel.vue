<!-- DevPanel.vue -->
<template>
  <div
    class="dev-panel"
    :style="{
      top: `${position.y}px`,
      left: `${position.x}px`,
      bottom: 'auto',
      right: 'auto',
    }"
    ref="devPanelRef"
  >
    <div
      class="dev-panel-header"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      <h3>Dev Panel</h3>
      <div class="header-controls">
        <button
          @click="resetPosition"
          class="dev-icon-button"
          title="Reset position"
        >
          📍
        </button>
        <button @click="toggleCollapsed" class="dev-toggle">
          {{ collapsed ? "+" : "-" }}
        </button>
      </div>
    </div>
    <div v-if="!collapsed" class="dev-panel-content">
      <div class="panel-section">
        <h4>Player Scores</h4>
        <div
          v-for="(player, index) in store.gameState.players"
          :key="index"
          class="score-control"
        >
          <label>{{ player.name }}:</label>
          <input
            type="number"
            :value="player.totalScore"
            @change="updatePlayerScore(index, $event)"
            min="0"
            max="10000"
          />
          <button @click="setPlayerScore(index, 0)">Reset</button>
          <button @click="setPlayerScore(index, 9500)">Near Win</button>
          <button @click="qualifyPlayer(index)">Qualify</button>
        </div>
      </div>

      <div class="panel-section">
        <h4>Turn Controls</h4>
        <div class="control-row">
          <button @click="togglePause" :class="{ 'active-button': isPaused }">
            {{ isPaused ? "Resume Game" : "Pause Game" }}
          </button>
          <button @click="forceEndTurn">End Current Turn</button>
          <button @click="makeComputerWin">Make Computer Win</button>
        </div>
      </div>

      <div class="panel-section">
        <h4>Game State</h4>
        <div class="control-row">
          <button
            @click="toggleGameOver"
            :class="{ 'active-button': store.gameState.isGameOver }"
          >
            {{ store.gameState.isGameOver ? "Resume Game" : "Force Game Over" }}
          </button>
          <button
            @click="toggleLogEnabled"
            :class="{ 'active-button': logEnabled }"
          >
            {{ logEnabled ? "Disable Logs" : "Enable Logs" }}
          </button>
        </div>
      </div>

      <!-- Add Dice Control section -->
      <div class="panel-section">
        <h4>Dice Control</h4>
        <div class="dice-control">
          <div
            v-for="(die, index) in store.gameState.dice"
            :key="index"
            class="die-input"
          >
            <label>Die {{ index + 1 }}:</label>
            <input
              type="number"
              :value="die.value"
              @change="updateDieValue(index, $event)"
              min="1"
              max="6"
            />
          </div>
          <div class="control-row mt-2">
            <button @click="setAllDiceToStraight">Set 1-5 Straight</button>
            <button @click="setAllDiceToOne">Set All 1's</button>
            <button @click="makeScoringRoll">Make Scoring Roll</button>
            <button @click="randomizeDice">Random Dice</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useGameStore } from "../stores/gameStore"

// Get the game store with all required functions
const store = useGameStore()

// Local state
const collapsed = ref(false)
const isPaused = ref(false)
const logEnabled = ref(true)
const devPanelRef = ref<HTMLElement | null>(null)

// Position state for drag and drop
const DEFAULT_POSITION = { x: 10, y: 10 }
const position = ref(DEFAULT_POSITION)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// Original setTimeout function
let originalSetTimeout: typeof window.setTimeout

// Setup and event handling
onMounted(() => {
  console.log("Dev Panel initialized")

  // Store the original setTimeout
  originalSetTimeout = window.setTimeout

  // Add window event listeners for dragging
  window.addEventListener("mousemove", onDrag)
  window.addEventListener("mouseup", stopDrag)
  window.addEventListener("touchmove", onDrag)
  window.addEventListener("touchend", stopDrag)
})

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  window.removeEventListener("mousemove", onDrag)
  window.removeEventListener("mouseup", stopDrag)
  window.removeEventListener("touchmove", onDrag)
  window.removeEventListener("touchend", stopDrag)
})

// Start dragging the panel
const startDrag = (event: MouseEvent | TouchEvent) => {
  if (!devPanelRef.value) return

  isDragging.value = true

  // Get mouse or touch position
  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX
  const clientY = "touches" in event ? event.touches[0].clientY : event.clientY

  // Calculate the offset from the mouse to the top-left corner of the panel
  const rect = devPanelRef.value.getBoundingClientRect()
  dragOffset.value = {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }

  // Prevent default to avoid text selection during drag
  event.preventDefault()
}

// Handle dragging
const onDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return

  // Get mouse or touch position
  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX
  const clientY = "touches" in event ? event.touches[0].clientY : event.clientY

  // Calculate new position
  position.value = {
    x: clientX - dragOffset.value.x,
    y: clientY - dragOffset.value.y,
  }

  // Keep panel within viewport bounds
  const maxX = window.innerWidth - (devPanelRef.value?.offsetWidth || 380)
  const maxY = window.innerHeight - (collapsed.value ? 40 : 400)

  if (position.value.x < 0) position.value.x = 0
  if (position.value.y < 0) position.value.y = 0
  if (position.value.x > maxX) position.value.x = maxX
  if (position.value.y > maxY) position.value.y = maxY
}

// Stop dragging
const stopDrag = () => {
  isDragging.value = false
}

// Toggle collapsed state
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}

// Update player score
const updatePlayerScore = (playerIndex: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const newScore = parseInt(input.value, 10)

  if (!isNaN(newScore) && newScore >= 0 && newScore <= 10000) {
    // Use the store's method to update the player score
    store.updatePlayerScore(playerIndex, newScore)

    // Log the change
    if (logEnabled.value) {
      console.log(
        `Dev Panel: Set ${store.gameState.players[playerIndex].name}'s score to ${newScore}`
      )
    }
  }
}

// Set player score to specific value
const setPlayerScore = (playerIndex: number, score: number) => {
  // Use the store's method to update the player score
  store.updatePlayerScore(playerIndex, score)

  // Log the change
  if (logEnabled.value) {
    console.log(
      `Dev Panel: Set ${store.gameState.players[playerIndex].name}'s score to ${score}`
    )
  }
}

// Qualify a player
const qualifyPlayer = (playerIndex: number) => {
  // Use the store's method to qualify the player
  store.qualifyPlayer(playerIndex)

  // Log the change
  if (logEnabled.value) {
    console.log(
      `Dev Panel: Qualified ${store.gameState.players[playerIndex].name}`
    )
  }
}

// Toggle pause state
const togglePause = () => {
  isPaused.value = !isPaused.value

  if (isPaused.value) {
    // Save original setTimeout
    originalSetTimeout = window.setTimeout

    // Override setTimeout to block all timeouts while paused
    window.setTimeout = function setTimeout() {
      console.log("Timeout blocked by dev panel pause")
      return 0 // Return a timeout ID that will never be used
    }

    if (logEnabled.value) {
      console.log("Dev Panel: Game paused")
    }
  } else {
    // Restore original setTimeout
    if (originalSetTimeout) {
      window.setTimeout = originalSetTimeout
    }

    if (logEnabled.value) {
      console.log("Dev Panel: Game resumed")
    }
  }
}

// Force end current turn
const forceEndTurn = () => {
  // End the current turn
  store.endTurn()

  if (logEnabled.value) {
    console.log("Dev Panel: Forced end of current turn")
  }
}

// Toggle game over state
const toggleGameOver = () => {
  // Toggle game over state using the store method
  store.setGameOver(!store.gameState.isGameOver)

  if (logEnabled.value) {
    console.log(
      `Dev Panel: ${
        store.gameState.isGameOver ? "Forced game over" : "Resumed game"
      }`
    )
  }
}

// Make computer win
const makeComputerWin = () => {
  // Find the computer player
  const computerPlayerIndex = store.gameState.players.findIndex(
    (player: any) => player.isComputer
  )

  if (computerPlayerIndex !== -1) {
    // Set the computer's score to just below the winning score
    store.updatePlayerScore(computerPlayerIndex, 9900)

    // Make sure the computer is qualified
    store.qualifyPlayer(computerPlayerIndex)

    // Make it the computer's turn
    // We'll need to update the current player through the store
    // State should update automatically

    if (logEnabled.value) {
      console.log(
        `Dev Panel: Set ${store.gameState.players[computerPlayerIndex].name}'s score to 9900`
      )
    }
  }
}

// Toggle log enabled state
const toggleLogEnabled = () => {
  logEnabled.value = !logEnabled.value
  console.log(`Dev Panel: Logs ${logEnabled.value ? "enabled" : "disabled"}`)
}

// Update die value
const updateDieValue = (dieIndex: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const newValue = parseInt(input.value, 10)

  if (!isNaN(newValue) && newValue >= 1 && newValue <= 6) {
    // Use the store's method to update the die value
    store.updateDieValue(dieIndex, newValue)

    // Log the change
    if (logEnabled.value) {
      console.log(`Dev Panel: Set die ${dieIndex + 1} to ${newValue}`)
    }
  }
}

// Set all dice to a straight (1-5)
const setAllDiceToStraight = () => {
  // Set dice to values 1-5
  for (let i = 0; i < store.gameState.dice.length; i++) {
    store.updateDieValue(i, i + 1) // 1, 2, 3, 4, 5
  }

  if (logEnabled.value) {
    console.log("Dev Panel: Set dice to straight (1-5)")
  }
}

// Set all dice to ones (valuable dice)
const setAllDiceToOne = () => {
  // Set all dice to ones
  for (let i = 0; i < store.gameState.dice.length; i++) {
    store.updateDieValue(i, 1)
  }

  if (logEnabled.value) {
    console.log("Dev Panel: Set all dice to ones")
  }
}

// Make a roll with scoring dice (three of a kind + two ones)
const makeScoringRoll = () => {
  // Set dice to have three 3's and two 1's
  for (let i = 0; i < store.gameState.dice.length; i++) {
    const value = i < 3 ? 3 : 1 // First three are 3's, rest are 1's
    store.updateDieValue(i, value)
  }

  if (logEnabled.value) {
    console.log("Dev Panel: Created scoring roll with three 3's and two 1's")
  }
}

// Generate random dice values for unlocked dice
const randomizeDice = () => {
  store.gameState.dice.forEach((die: any, index: number) => {
    if (!die.isLocked) {
      const randomValue = Math.floor(Math.random() * 6) + 1
      store.updateDieValue(index, randomValue)
    }
  })

  if (logEnabled.value) {
    console.log("Dev Panel: Generated random dice values for unlocked dice")
  }
}

// Reset panel position
const resetPosition = () => {
  position.value = { ...DEFAULT_POSITION }
  if (logEnabled.value) {
    console.log("Dev Panel: Position reset")
  }
}
</script>

<style scoped>
.dev-panel {
  position: fixed;
  background-color: rgba(30, 30, 30, 0.9);
  color: #eee;
  border: 1px solid #666;
  border-radius: 6px;
  font-family: monospace;
  z-index: 9999;
  width: 380px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  font-size: 12px;
}

.dev-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #444;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  cursor: move;
  user-select: none; /* Prevent text selection during drag */
}

.header-controls {
  display: flex;
  gap: 6px;
  align-items: center;
}

.dev-panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.dev-toggle,
.dev-icon-button {
  background: none;
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #555;
  border-radius: 4px;
}

.dev-toggle:hover,
.dev-icon-button:hover {
  background-color: #666;
}

.dev-panel-content {
  max-height: 70vh;
  overflow-y: auto;
  padding: 12px;
}

.panel-section {
  margin-bottom: 16px;
  border-bottom: 1px solid #555;
  padding-bottom: 16px;
}

.panel-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.panel-section h4 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #aaa;
  font-size: 13px;
}

.score-control {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 6px;
}

.score-control label {
  width: 80px;
  color: #ccc;
  font-size: 11px;
}

.score-control input {
  width: 70px;
  background-color: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 4px 6px;
  border-radius: 3px;
}

button {
  background-color: #444;
  border: 1px solid #666;
  color: #eee;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #555;
}

button.active-button {
  background-color: #775566;
  border-color: #aa7788;
}

.control-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.die-input {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.die-input label {
  width: 50px;
  font-size: 11px;
}

.die-input input {
  width: 40px;
  background-color: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 2px 4px;
  border-radius: 3px;
  text-align: center;
}

.mt-2 {
  margin-top: 8px;
}

.dice-control {
  display: flex;
  flex-direction: column;
}
</style>
