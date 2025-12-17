module.exports = {
  // --- 1.(Scoring Rules) ---

  BETTING_RULES: {
    WINNER_REFUND_RATIO: 1.0,

    LOSER_POT_DISTRIBUTION: {
      MODERATOR_SHARE: 0.4,
      PLAYERS_SHARE: 0.6,
    },
  },
  // --- 2. General game settings ---
  GAME_SETTINGS: {
    DEFAULT_QUESTION_TIMER: 30, // Seconds per question (default)
    MIN_WAGER: 10, // Minimum wager per question
    MAX_GIFT_AMOUNT: 5000, // Maximum single gift amount (to prevent fraud)
  },
};
