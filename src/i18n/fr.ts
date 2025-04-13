export default {
  // Game title and phases
  gameTitle: "Jeu de Dés 10,000",
  currentPhase: "Phase Actuelle:",
  phases: {
    QUALIFICATION: "QUALIFICATION",
    NORMAL: "NORMAL",
    END_GAME: "FIN DE PARTIE",
    Rolling: "Lancer",
    Selecting: "Sélection",
    "End Turn": "Fin du Tour",
    "Game Over": "Partie Terminée",
  },

  // UI Controls
  newGame: "Nouvelle Partie",
  settings: "Paramètres",
  close: "Fermer",
  playAgain: "Jouer à Nouveau",
  wonTheGame: "a gagné la partie",
  finalScore: "Score Final",
  devPanel: "Panneau Développeur",

  // Settings
  display: "Affichage",
  darkMode: "Mode Sombre",
  language: "Langue",
  sound: "Son",
  soundEffectsVolume: "Volume des Effets Sonores:",
  testSound: "Tester le Son",

  // Player labels
  player: "Joueur",
  player1: "Joueur 1",
  player2: "Joueur 2",
  computer: "Ordinateur",
  totalScore: "Score Total:",
  qualified: "Qualifié",
  needsQualification: "Besoin de {0} points pour se qualifier",

  // Scoring
  scoring: "Points",
  bankedPoints: "Points en Banque:",
  rollScore: "Score du Lancer:",
  selected: "Sélectionné:",
  totalAvailable: "Total Disponible:",
  qualificationScore: "Score de Qualification",

  // Game controls
  rollDice: "Lancer les Dés",
  keepScore: "Garder les Points",
  needPoints: "(Besoin de {0})",
  rollToStart: "Lancez les dés pour commencer votre tour",
  transitioningToNextPlayer: "Passage au joueur suivant...",

  // Bust messages
  bustExceededMax: "ÉCHEC! Dépassement de 10,000 points",
  bustGeneric: "ÉCHEC! Aucun dé comptabilisable",
  bustLostPoints: "Échec! {0} a perdu {1} points de ce tour!",

  // Qualification warning
  qualificationRequired: "Qualification Requise!",
  qualificationMessage:
    "Vous avez besoin d'au moins {0} points en un tour pour vous qualifier. Total du tour actuel:",

  // Dice legend
  selectable: "Sélectionnable (donne des points)",
  selectedDie: "Sélectionné",
  locked: "Verrouillé (points en banque)",
  notScorable: "Non comptabilisable",

  // Game rules
  scoringRules: "Règles de Scoring",
  singleOne: "Un seul 1: 100 points",
  singleFive: "Un seul 5: 50 points",
  threeOnes: "Trois 1: 1,000 points",
  threeOfAKind: "Brelan: chiffre × 100",
  fourOfAKind: "Carré: 2× brelan",
  fiveOfAKind: "Cinq identiques: 3× brelan",
  straight: "Suite (1-5 ou 2-6): 1,500 points",
  noScoringDice:
    "Aucun dé comptabilisable: Échec (perte de tous les points du tour!)",

  // Roll button tooltips
  notYourTurn: "Ce n'est pas votre tour de lancer",
  cantRollBust: "Impossible de lancer après un échec",
  allDiceLocked: "Tous les dés sont verrouillés",
  mustSelectDie: "Vous devez sélectionner au moins un dé avant de relancer",
  rollToStartTurn: "Lancez les dés pour commencer votre tour",
  rollDiceTooltip: "Lancer les dés",

  // Keep score tooltips
  qualificationNeeded:
    "Vous avez besoin d'au moins {0} points en un tour pour vous qualifier. Actuel: {1}",
  noPointsToKeep: "Aucun point à garder",
  notYourTurnKeep: "Ce n'est pas votre tour",
  bankPoints: "Mettez vos points en banque et terminez votre tour",

  // Menu
  gameModes: "Mode de Jeu",
  vsComputer: "vs Ordinateur",
  vsFriend: "vs Ami",
  playerNames: "Noms des Joueurs",
  enterName: "Entrez un nom",
}
