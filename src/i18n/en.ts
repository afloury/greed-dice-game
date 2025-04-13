export default {
  // Game title and phases
  gameTitle: "10,000 Dice Game",
  currentPhase: "Current Phase:",
  phases: {
    QUALIFICATION: "QUALIFICATION",
    NORMAL: "NORMAL",
    END_GAME: "END GAME",
    Rolling: "Rolling",
    Selecting: "Selecting",
    "End Turn": "End Turn",
    "Game Over": "Game Over",
  },

  // UI Controls
  newGame: "New Game",
  settings: "Settings",
  close: "Close",
  playAgain: "Play Again",
  wonTheGame: "won the game",
  finalScore: "Final Score",
  devPanel: "Developer Panel",

  // Settings
  display: "Display",
  darkMode: "Dark Mode",
  language: "Language",
  sound: "Sound",
  soundEffectsVolume: "Sound Effects Volume:",
  testSound: "Test Sound",

  // Player labels
  player: "Player",
  player1: "Player 1",
  player2: "Player 2",
  computer: "Computer",
  totalScore: "Total Score:",
  qualified: "Qualified",
  needsQualification: "Needs {0} points to qualify",

  // Scoring
  scoring: "Scoring",
  bankedPoints: "Banked Points:",
  rollScore: "Roll score:",
  selected: "Selected:",
  totalAvailable: "Total Available:",
  qualificationScore: "Qualification Score",

  // Game controls
  rollDice: "Roll Dice",
  keepScore: "Keep Score",
  needPoints: "(Need {0})",
  rollToStart: "Roll dice to start your turn",
  transitioningToNextPlayer: "Transitioning to next player...",

  // Bust messages
  bustExceededMax: "BUST! Exceeded 10,000 points",
  bustGeneric: "BUST! No scoring combinations possible!",
  bustLostPoints: "Bust! {0} lost {1} points from this turn!",

  // Qualification warning
  qualificationRequired: "Qualification Required!",
  qualificationMessage:
    "You need at least {0} points in one turn to qualify. Current turn total:",

  // Dice legend
  selectable: "Selectable (scores points)",
  selectedDie: "Selected",
  locked: "Locked (banked points)",
  notScorable: "Not scorable",

  // Game rules
  scoringRules: "Scoring Rules",
  singleOne: "Single 1: 100 points",
  singleFive: "Single 5: 50 points",
  threeOnes: "Three 1s: 1,000 points",
  threeOfAKind: "Three of a kind: number × 100",
  fourOfAKind: "Four of a kind: 2× three of a kind",
  fiveOfAKind: "Five of a kind: 3× three of a kind",
  straight: "Straight (1-5 or 2-6): 1,500 points",
  noScoringDice: "No scoring dice: Bust (lose all turn points!)",

  // Roll button tooltips
  notYourTurn: "It's not your turn to roll",
  cantRollBust: "Cannot roll after busting",
  allDiceLocked: "All dice are locked",
  mustSelectDie: "You must select at least one die before rerolling",
  rollToStartTurn: "Roll the dice to start your turn",
  rollDiceTooltip: "Roll the dice",

  // Keep score tooltips
  qualificationNeeded:
    "You need at least {0} points in one turn to qualify. Current: {1}",
  noPointsToKeep: "No points to keep",
  notYourTurnKeep: "Not your turn",
  bankPoints: "Bank your points and end your turn",

  // Menu
  gameModes: "Game Mode",
  vsComputer: "vs Computer",
  vsFriend: "vs Friend",
  playerNames: "Player Names",
  enterName: "Enter name",
}
