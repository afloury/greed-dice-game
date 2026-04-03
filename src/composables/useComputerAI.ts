import type { Ref } from "vue"
import type { GameState } from "../types/game"
import { scoreSelectedDice } from "./useScoringEngine"

const WINNING_SCORE = 10000

interface ComputerAIDeps {
  gameState: Ref<GameState>
  currentPlayerIndex: () => number
  rollDice: () => void
  keepScore: () => void
  calculatePotentialScore: () => number
  minQualifyingScore: () => number
}

export function useComputerAI(deps: ComputerAIDeps) {
  const {
    gameState,
    currentPlayerIndex,
    rollDice,
    keepScore,
    calculatePotentialScore,
    minQualifyingScore,
  } = deps

  function currentPlayer() {
    return gameState.value.players[currentPlayerIndex()]
  }

  function playComputerTurn() {
    if (!currentPlayer().isComputer || gameState.value.isGameOver) {
      console.log("Computer turn canceled - no longer computer's turn or game over")
      return
    }

    console.log("Computer is rolling dice...")
    rollDice()

    setTimeout(() => {
      if (!currentPlayer().isComputer || gameState.value.isGameOver) return

      const isEndgame = currentPlayer().totalScore > 9000
      if (isEndgame) {
        selectComputerDiceEndgame()
      } else {
        selectComputerDice()
      }

      setTimeout(() => {
        if (!currentPlayer().isComputer || gameState.value.isGameOver) return
        decideKeepOrRoll()
      }, 1500)
    }, 1500)
  }

  /**
   * Hot dice: all 5 dice are used (locked + selected), so the next roll
   * is a fresh 5-dice hand. Bust probability ~2.3%, so it's almost always
   * worth re-rolling — but the more points at stake, the more conservative.
   */
  function isHotDice(): boolean {
    return gameState.value.dice.every((die) => die.isLocked || die.isSelected)
  }

  function shouldRerollHotDice(totalAvailable: number): boolean {
    if (totalAvailable < 1000) return true
    if (totalAvailable < 2000) return Math.random() < 0.75
    if (totalAvailable < 3000) return Math.random() < 0.50
    return Math.random() < 0.25
  }

  function decideKeepOrRoll() {
    const totalAvailable =
      gameState.value.currentTurnScore + gameState.value.potentialScore
    const potentialTotalScore = currentPlayer().totalScore + totalAvailable
    const targetPoints = WINNING_SCORE - currentPlayer().totalScore
    const isComputerQualified = currentPlayer().isQualified

    if (!isComputerQualified) {
      if (totalAvailable >= minQualifyingScore()) {
        console.log(`Computer keeping score: ${totalAvailable} (meets qualification)`)
        keepScore()
      } else {
        console.log(`Computer rolling again: ${totalAvailable} not enough to qualify`)
        playComputerTurn()
      }
      return
    }

    // Hot dice: all 5 dice used — fresh roll is very favorable
    if (isHotDice()) {
      // In endgame, still respect the 10,000 ceiling
      if (potentialTotalScore > WINNING_SCORE) {
        console.log(`Hot dice but would exceed 10,000 — forced re-roll`)
        playComputerTurn()
        return
      }
      if (potentialTotalScore === WINNING_SCORE) {
        console.log(`Hot dice but exact 10,000 — taking the win!`)
        keepScore()
        return
      }
      if (shouldRerollHotDice(totalAvailable)) {
        console.log(`Hot dice! Re-rolling all 5 with ${totalAvailable} points at stake`)
        playComputerTurn()
        return
      }
      console.log(`Hot dice but ${totalAvailable} points is too much to risk — banking`)
      keepScore()
      return
    }

    if (currentPlayer().totalScore > 9000) {
      decideEndgame(totalAvailable, potentialTotalScore, targetPoints)
    } else {
      decideRegular(totalAvailable, potentialTotalScore)
    }
  }

  function decideEndgame(
    totalAvailable: number,
    potentialTotalScore: number,
    targetPoints: number
  ) {
    if (potentialTotalScore === WINNING_SCORE) {
      console.log(`Computer keeping score: ${totalAvailable} (reaches exactly 10,000!)`)
      keepScore()
      return
    }

    if (potentialTotalScore > WINNING_SCORE) {
      console.log(`Computer cannot keep: ${potentialTotalScore} would exceed 10,000`)
      playComputerTurn()
      return
    }

    const unlockedDiceCount = gameState.value.dice.filter(
      (die) => !die.isLocked && !die.isSelected
    ).length
    const remainingPoints = targetPoints - totalAvailable

    if (remainingPoints <= 150) {
      let shouldReroll = false
      const randomFactor = Math.random()

      if (unlockedDiceCount === 1 && randomFactor > 0.75) shouldReroll = true
      else if (unlockedDiceCount === 2 && randomFactor > 0.5) shouldReroll = true
      else if (unlockedDiceCount === 3 && randomFactor > 0.7) shouldReroll = true
      else if (unlockedDiceCount === 4 && randomFactor > 0.9) shouldReroll = true
      else if (unlockedDiceCount === 5 && randomFactor > 0.9) shouldReroll = true

      if (shouldReroll) {
        console.log(`Computer rolling again (endgame): needs ${remainingPoints} more`)
        playComputerTurn()
      } else {
        console.log(`Computer keeping (endgame): ${totalAvailable} points`)
        keepScore()
      }
    } else {
      if (totalAvailable >= 300 || (remainingPoints < 300 && totalAvailable > 0)) {
        console.log(`Computer keeping: ${totalAvailable} points`)
        keepScore()
      } else {
        console.log("Computer rolling again: needs more points")
        playComputerTurn()
      }
    }
  }

  function decideRegular(totalAvailable: number, potentialTotalScore: number) {
    if (potentialTotalScore > WINNING_SCORE) {
      console.log(`Computer rolling again: ${potentialTotalScore} would exceed 10,000`)
      playComputerTurn()
    } else if (potentialTotalScore === WINNING_SCORE) {
      console.log(`Computer keeping: ${totalAvailable} (reaches exactly 10,000!)`)
      keepScore()
    } else if (totalAvailable >= 300) {
      console.log(`Computer keeping: ${totalAvailable} (already qualified)`)
      keepScore()
    } else {
      console.log("Computer rolling again for more points")
      playComputerTurn()
    }
  }

  function selectComputerDice() {
    if (gameState.value.diceHidden) return

    const unlockedDice = gameState.value.dice
      .map((die, index) => ({ index, value: die.value, isLocked: die.isLocked, isSelected: die.isSelected }))
      .filter((die) => !die.isLocked && !die.isSelected)

    if (unlockedDice.length === 0) return

    const diceByValue: Record<number, { index: number; value: number }[]> = {}
    unlockedDice.forEach((die) => {
      if (!diceByValue[die.value]) diceByValue[die.value] = []
      diceByValue[die.value].push(die)
    })

    // Check for straights
    if (unlockedDice.length === 5) {
      const values = unlockedDice.map((d) => d.value).sort()
      const isStraight =
        [1, 2, 3, 4, 5].every((n) => values.includes(n)) ||
        [2, 3, 4, 5, 6].every((n) => values.includes(n))

      if (isStraight) {
        unlockedDice.forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
        })
        calculatePotentialScore()
        return
      }
    }

    let selectionMade = false

    // Five of a kind
    for (let value = 1; value <= 6; value++) {
      if (diceByValue[value] && diceByValue[value].length >= 5) {
        diceByValue[value].slice(0, 5).forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
          selectionMade = true
        })
        if (selectionMade) {
          calculatePotentialScore()
          return
        }
      }
    }

    // Four of a kind
    for (let value = 1; value <= 6; value++) {
      if (diceByValue[value] && diceByValue[value].length >= 4) {
        diceByValue[value].slice(0, 4).forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
          selectionMade = true
        })
        diceByValue[value] = diceByValue[value].slice(4)
      }
    }

    // Three of a kind
    for (let value = 1; value <= 6; value++) {
      if (diceByValue[value] && diceByValue[value].length >= 3) {
        diceByValue[value].slice(0, 3).forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
          selectionMade = true
        })
        diceByValue[value] = diceByValue[value].slice(3)
      }
    }

    // Individual 1s and 5s
    if (diceByValue[1]) {
      diceByValue[1].forEach((die) => {
        gameState.value.dice[die.index].isSelected = true
        selectionMade = true
      })
    }
    if (diceByValue[5]) {
      diceByValue[5].forEach((die) => {
        gameState.value.dice[die.index].isSelected = true
        selectionMade = true
      })
    }

    if (selectionMade) calculatePotentialScore()
  }

  function selectComputerDiceEndgame() {
    if (gameState.value.diceHidden) return

    const targetPoints =
      WINNING_SCORE - currentPlayer().totalScore - gameState.value.currentTurnScore

    const unlockedDice = gameState.value.dice
      .map((die, index) => ({
        index,
        value: die.value,
        isLocked: die.isLocked,
        isSelected: die.isSelected,
        isValidSelection: die.isValidSelection,
      }))
      .filter((die) => !die.isLocked && !die.isSelected)

    if (unlockedDice.length === 0) return

    const diceByValue: Record<number, { index: number; value: number }[]> = {}
    unlockedDice.forEach((die) => {
      if (!diceByValue[die.value]) diceByValue[die.value] = []
      diceByValue[die.value].push(die)
    })

    // Check for straights
    if (unlockedDice.length === 5) {
      const values = unlockedDice.map((d) => d.value).sort()
      const isStraight =
        [1, 2, 3, 4, 5].every((n) => values.includes(n)) ||
        [2, 3, 4, 5, 6].every((n) => values.includes(n))

      if (isStraight && 1500 <= targetPoints) {
        unlockedDice.forEach((die) => {
          gameState.value.dice[die.index].isSelected = true
        })
        calculatePotentialScore()
        return
      }
    }

    // Try all combinations to find the one closest to target without exceeding
    let bestIndices: number[] = []
    let bestScore = 0

    // Check individual 1s
    if (diceByValue[1]) {
      for (let i = 1; i <= diceByValue[1].length; i++) {
        const score = scoreSelectedDice(Array(i).fill(1))
        if (score <= targetPoints && score > bestScore) {
          bestScore = score
          bestIndices = diceByValue[1].slice(0, i).map((d) => d.index)
          if (score === targetPoints) break
        }
      }
    }

    // Check individual 5s
    if (diceByValue[5]) {
      for (let i = 1; i <= diceByValue[5].length; i++) {
        const score = scoreSelectedDice(Array(i).fill(5))
        if (score <= targetPoints && score > bestScore) {
          bestScore = score
          bestIndices = diceByValue[5].slice(0, i).map((d) => d.index)
          if (score === targetPoints) break
        }
      }
    }

    // Check combinations of 1s and 5s
    if (diceByValue[1] && diceByValue[5]) {
      for (let i1 = 1; i1 <= diceByValue[1].length; i1++) {
        for (let i5 = 1; i5 <= diceByValue[5].length; i5++) {
          const score = scoreSelectedDice([...Array(i1).fill(1), ...Array(i5).fill(5)])
          if (score <= targetPoints && score > bestScore) {
            bestScore = score
            bestIndices = [
              ...diceByValue[1].slice(0, i1).map((d) => d.index),
              ...diceByValue[5].slice(0, i5).map((d) => d.index),
            ]
            if (score === targetPoints) break
          }
        }
      }
    }

    // Check sets of three
    if (bestScore < targetPoints) {
      for (let value = 1; value <= 6; value++) {
        if (diceByValue[value] && diceByValue[value].length >= 3) {
          const score = value === 1 ? 1000 : value * 100
          if (score <= targetPoints && score > bestScore) {
            bestScore = score
            bestIndices = diceByValue[value].slice(0, 3).map((d) => d.index)
            if (score === targetPoints) break
          }
        }
      }
    }

    if (bestIndices.length > 0) {
      bestIndices.forEach((index) => {
        if (gameState.value.dice[index].isValidSelection) {
          gameState.value.dice[index].isSelected = true
        }
      })
      console.log(`Endgame: selected ${bestIndices.length} dice for ${bestScore} points`)
      calculatePotentialScore()
    } else {
      console.log("No optimal endgame selection, using standard")
      selectComputerDice()
    }
  }

  return {
    playComputerTurn,
    selectComputerDice,
    selectComputerDiceEndgame,
  }
}
