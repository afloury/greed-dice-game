import { ref, watch } from "vue"

export function useGameSound() {
  let diceSound: HTMLAudioElement | null = null
  const soundVolume = ref(50)
  const spinningDice = ref<boolean[]>([false, false, false, false, false])

  watch(
    () => soundVolume.value,
    (newVolume) => {
      if (diceSound) diceSound.volume = newVolume / 100
    }
  )

  function playDiceSound() {
    try {
      if (!diceSound) {
        diceSound = new Audio("/dice-roll.mp3")
        diceSound.addEventListener("error", () => {
          diceSound = null
        })
      }
      if (diceSound) {
        diceSound.volume = soundVolume.value / 100
        diceSound.currentTime = 0
        diceSound.play().catch(() => {})
      }
    } catch {
      // Audio not available
    }
  }

  function startSpinAnimation() {
    setTimeout(() => {
      spinningDice.value = Array(5).fill(false)
    }, 1000)
  }

  /** Wire this to store.setRollCallback to sync sound + animation with dice rolls */
  function onDiceRolled(rollingDiceIndices: number[]) {
    spinningDice.value = Array(5).fill(false)
    rollingDiceIndices.forEach((i) => {
      spinningDice.value[i] = true
    })
    playDiceSound()
    startSpinAnimation()
  }

  return { soundVolume, spinningDice, playDiceSound, startSpinAnimation, onDiceRolled }
}
