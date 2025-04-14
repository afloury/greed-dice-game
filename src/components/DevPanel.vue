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
          v-for="(player, index) in store.gameState.value.players"
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
            :class="{ 'active-button': store.gameState.value.isGameOver }"
          >
            {{
              store.gameState.value.isGameOver
                ? "Resume Game"
                : "Force Game Over"
            }}
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
            v-for="(die, index) in store.gameState.value.dice"
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
import { useGameStore } from "../composables/useGameStore"

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
    // Update player score directly and trigger reactivity
    store.gameState.value.players[playerIndex].totalScore = newScore

    // Automatically set qualified if score is high enough
    if (newScore >= store.MIN_QUALIFYING_SCORE.value) {
      store.gameState.value.players[playerIndex].isQualified = true
    }

    // Log the change
    if (logEnabled.value) {
      console.log(
        `Dev Panel: Set ${store.gameState.value.players[playerIndex].name}'s score to ${newScore}`
      )
    }
  }
}

// Set player score to specific value
const setPlayerScore = (playerIndex: number, score: number) => {
  // Update player score directly
  store.gameState.value.players[playerIndex].totalScore = score

  // Automatically set qualified if score is high enough
  if (score >= store.MIN_QUALIFYING_SCORE.value) {
    store.gameState.value.players[playerIndex].isQualified = true
  }

  // Log the change
  if (logEnabled.value) {
    console.log(
      `Dev Panel: Set ${store.gameState.value.players[playerIndex].name}'s score to ${score}`
    )
  }
}

// Qualify a player
const qualifyPlayer = (playerIndex: number) => {
  // Access directly through store
  store.gameState.value.players[playerIndex].isQualified = true

  // Log the change
  if (logEnabled.value) {
    console.log(
      `Dev Panel: Qualified ${store.gameState.value.players[playerIndex].name}`
    )
  }
}

// Toggle pause state
const togglePause = () => {
  isPaused.value = !isPaused.value

  if (isPaused.value) {
    // Store original timing functions
    originalSetTimeout = window.setTimeout

    // Override setTimeout to block all timeouts while paused
    window.setTimeout = function (handler: TimerHandler, timeout?: number) {
      if (isPaused.value) {
        // Return a dummy timeout ID when paused
        return 0
      }
      return originalSetTimeout(handler, timeout)
    }

    if (logEnabled.value) {
      console.log("Dev Panel: Game paused - all timeouts are now blocked")
    }
  } else {
    // Restore original setTimeout when unpausing
    window.setTimeout = originalSetTimeout

    if (logEnabled.value) {
      console.log("Dev Panel: Game resumed - timing functions restored")
    }

    // If it's the computer's turn, we need to re-trigger it
    const currentPlayerIndex = store.gameState.value.currentPlayer
    if (
      store.gameState.value.players[currentPlayerIndex].isComputer &&
      !store.gameState.value.isGameOver
    ) {
      if (logEnabled.value) {
        console.log("Dev Panel: Resuming computer turn...")
      }

      // Wait a moment before restarting the computer turn
      originalSetTimeout(() => {
        store.playComputerTurn()
      }, 500)
    }
  }
}

// Force end current turn
const forceEndTurn = () => {
  store.endTurn()

  if (logEnabled.value) {
    console.log("Dev Panel: Forced end of turn")
  }
}

// Toggle game over state
const toggleGameOver = () => {
  store.gameState.value.isGameOver = !store.gameState.value.isGameOver

  if (store.gameState.value.isGameOver) {
    store.gameState.value.gamePhase = "END_GAME"
  } else {
    store.gameState.value.gamePhase = store.gameState.value.players.some(
      (p) => p.isQualified
    )
      ? "NORMAL"
      : "QUALIFICATION"
  }

  if (logEnabled.value) {
    console.log(
      `Dev Panel: Set game over to ${store.gameState.value.isGameOver}`
    )
  }
}

// Make computer win
const makeComputerWin = () => {
  const computerIndex = store.gameState.value.players.findIndex(
    (p) => p.isComputer
  )

  if (computerIndex !== -1) {
    // Update player scores first
    store.gameState.value.players.forEach((player, idx) => {
      if (idx === computerIndex) {
        // Set computer score to 10000 (exact winning score)
        player.totalScore = 10000
        player.isQualified = true
      } else {
        // Set other players to a lower score
        player.totalScore = 9000 + Math.floor(Math.random() * 900)
        player.isQualified = true
      }
    })

    // Set game over state
    store.gameState.value.isGameOver = true
    store.gameState.value.gamePhase = "END_GAME"

    // Set current player to computer for correct winner display
    store.gameState.value.currentPlayer = computerIndex

    if (logEnabled.value) {
      console.log(
        `Dev Panel: Computer win forced - ${store.gameState.value.players[computerIndex].name} has won with 10000 points`
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
    // Set the new die value
    store.gameState.value.dice[dieIndex].value = newValue

    // Make sure the die is visible
    store.gameState.value.diceHidden = false

    // Reset die state
    store.gameState.value.dice[dieIndex].isLocked = false
    store.gameState.value.dice[dieIndex].isSelected = false

    // Recalculate dice to update valid selections
    store.calculateRollScore()

    // Update potential score
    store.calculatePotentialScore()

    // Log the change
    if (logEnabled.value) {
      console.log(`Dev Panel: Set Die ${dieIndex + 1} to ${newValue}`)
    }
  }
}

// Set all dice to a straight (1-5)
const setAllDiceToStraight = () => {
  store.gameState.value.dice.forEach((die, index) => {
    // Set to values 1, 2, 3, 4, 5 for a straight
    die.value = index + 1
    die.isLocked = false
    die.isSelected = false
  })

  // Make sure dice are visible
  store.gameState.value.diceHidden = false

  // Calculate valid dice
  store.calculateRollScore()

  // Also calculate potential score to update the UI
  store.calculatePotentialScore()

  if (logEnabled.value) {
    console.log("Dev Panel: Set dice to 1-5 straight")
  }
}

// Set all dice to ones (valuable dice)
const setAllDiceToOne = () => {
  store.gameState.value.dice.forEach((die) => {
    die.value = 1
    die.isLocked = false
    die.isSelected = false
  })

  // Make sure dice are visible
  store.gameState.value.diceHidden = false

  // Calculate valid dice
  store.calculateRollScore()

  // Also calculate potential score to update the UI
  store.calculatePotentialScore()

  if (logEnabled.value) {
    console.log("Dev Panel: Set all dice to ones")
  }
}

// Make a roll with scoring dice (three of a kind + two ones)
const makeScoringRoll = () => {
  // Set dice to have three 3's and two 1's
  for (let i = 0; i < store.gameState.value.dice.length; i++) {
    const die = store.gameState.value.dice[i]
    die.value = i < 3 ? 3 : 1 // First three are 3's, rest are 1's
    die.isLocked = false
    die.isSelected = false
  }

  // Make sure dice are visible
  store.gameState.value.diceHidden = false

  // Calculate valid dice
  store.calculateRollScore()

  // Also calculate potential score to update the UI
  store.calculatePotentialScore()

  if (logEnabled.value) {
    console.log("Dev Panel: Created scoring roll with three 3's and two 1's")
  }
}

// Generate random dice values for unlocked dice
const randomizeDice = () => {
  store.gameState.value.dice.forEach((die) => {
    if (!die.isLocked) {
      die.value = Math.floor(Math.random() * 6) + 1
      die.isSelected = false
    }
  })

  // Make sure dice are visible
  store.gameState.value.diceHidden = false

  // Recalculate valid dice
  store.calculateRollScore()

  // Update potential score
  store.calculatePotentialScore()

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
