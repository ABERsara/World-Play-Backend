module.exports = {
  // --- 1. חוקי הימורים ---

  BETTING_RULES: {
    WINNER_REFUND_RATIO: 1.0,

    LOSER_POT_DISTRIBUTION: {
      MODERATOR_SHARE: 0.4,
      PLAYERS_SHARE: 0.6,
    },
  },
  // --- 2. הגדרות משחק כלליות ---
  GAME_SETTINGS: {
    DEFAULT_QUESTION_TIMER: 30, // שניות לכל שאלה (ברירת מחדל)
    MIN_WAGER: 10, // הימור מינימלי לשאלה
    MAX_GIFT_AMOUNT: 5000, // סכום מתנה מקסימלי (למניעת הונאה)
  },
};
