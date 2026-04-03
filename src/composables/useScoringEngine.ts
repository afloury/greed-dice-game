/**
 * Pure scoring engine for the Greed dice game.
 * All functions are stateless — they take dice values and return scores.
 */

export interface RollScoreResult {
  score: number
  validIndices: number[]
}

/**
 * Calculate the score for a set of rolled dice values.
 * Returns the score and which dice indices are valid for selection.
 *
 * @param diceValues - Array of dice face values (1-6) for unlocked/unselected dice
 * @param diceIndices - Corresponding indices in the full dice array
 */
export function scoreDiceRoll(
  diceValues: number[],
  diceIndices: number[]
): RollScoreResult {
  const sorted = [...diceValues].sort()
  const validIndices: number[] = []

  let score = 0
  let remainingDice = [...sorted]

  // Build index lookup: value -> list of indices
  const valueIndices: Record<number, number[]> = {}
  diceValues.forEach((value, i) => {
    if (!valueIndices[value]) valueIndices[value] = []
    valueIndices[value].push(diceIndices[i])
  })

  // Check for straights (only with exactly 5 dice)
  if (sorted.length === 5) {
    const isStraight1 = [1, 2, 3, 4, 5].every((n) => sorted.includes(n))
    const isStraight2 = [2, 3, 4, 5, 6].every((n) => sorted.includes(n))

    if (isStraight1 || isStraight2) {
      return { score: 1500, validIndices: [...diceIndices] }
    }
  }

  // Track which indices in valueIndices have been used
  const usedIndexCount: Record<number, number> = {}

  // Check for sets (5-of-a-kind, 4-of-a-kind, 3-of-a-kind)
  const valueCounts: Record<number, number> = {}
  remainingDice.forEach((v) => {
    valueCounts[v] = (valueCounts[v] || 0) + 1
  })

  for (let value = 1; value <= 6; value++) {
    if (!valueCounts[value]) continue
    const count = valueCounts[value]
    let countToRemove = 0
    let pointsForSet = 0

    if (count >= 5) {
      pointsForSet = value === 1 ? 3000 : value * 300
      countToRemove = 5
    } else if (count >= 4) {
      pointsForSet = value === 1 ? 2000 : value * 200
      countToRemove = 4
    } else if (count >= 3) {
      pointsForSet = value === 1 ? 1000 : value * 100
      countToRemove = 3
    }

    if (countToRemove > 0) {
      score += pointsForSet

      // Mark dice indices as valid
      if (valueIndices[value]) {
        valueIndices[value].slice(0, countToRemove).forEach((idx) => {
          validIndices.push(idx)
        })
        usedIndexCount[value] = countToRemove
      }

      // Remove from remaining
      remainingDice = remainingDice.filter((v) => {
        if (v === value && countToRemove > 0) {
          countToRemove--
          return false
        }
        return true
      })
    }
  }

  // Individual 1s and 5s
  remainingDice.forEach((value) => {
    if (value === 1 || value === 5) {
      score += value === 1 ? 100 : 50

      if (valueIndices[value]) {
        const idx = valueIndices[value].find(
          (i) => !validIndices.includes(i)
        )
        if (idx !== undefined) {
          validIndices.push(idx)
        }
      }
    }
  })

  return { score, validIndices }
}

/**
 * Calculate the score for a selection of dice values.
 * Pure function — used for potential score and AI calculations.
 */
export function scoreSelectedDice(selectedValues: number[]): number {
  if (selectedValues.length === 0) return 0

  let score = 0
  let remainingDice = [...selectedValues].sort()

  // Check for straights
  if (selectedValues.length === 5) {
    const isStraight1 = [1, 2, 3, 4, 5].every((n) =>
      selectedValues.includes(n)
    )
    const isStraight2 = [2, 3, 4, 5, 6].every((n) =>
      selectedValues.includes(n)
    )
    if (isStraight1 || isStraight2) return 1500
  }

  // Sets
  const valueCounts: Record<number, number> = {}
  remainingDice.forEach((v) => {
    valueCounts[v] = (valueCounts[v] || 0) + 1
  })

  for (let value = 1; value <= 6; value++) {
    if (!valueCounts[value]) continue
    const count = valueCounts[value]
    let countToRemove = 0
    let pointsForSet = 0

    if (count >= 5) {
      pointsForSet = value === 1 ? 3000 : value * 300
      countToRemove = 5
    } else if (count >= 4) {
      pointsForSet = value === 1 ? 2000 : value * 200
      countToRemove = 4
    } else if (count >= 3) {
      pointsForSet = value === 1 ? 1000 : value * 100
      countToRemove = 3
    }

    if (countToRemove > 0) {
      score += pointsForSet
      for (let i = 0; i < countToRemove; i++) {
        const idx = remainingDice.indexOf(value)
        if (idx >= 0) remainingDice.splice(idx, 1)
      }
    }
  }

  // Individual 1s and 5s
  remainingDice.forEach((value) => {
    if (value === 1) score += 100
    else if (value === 5) score += 50
  })

  return score
}
