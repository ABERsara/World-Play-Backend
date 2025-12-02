// --- 1.(Scoring Rules) ---
export const BETTING_RULES = {
  WINNER_REFUND_RATIO: 1.0,

  LOSER_POT_DISTRIBUTION: {
    MODERATOR_SHARE: 0.4,
    PLAYERS_SHARE: 0.6,
  },
};

// --- 2. Question reward types ---
export const REWARD_TYPES = {
  STANDARD: 'STANDARD', // The players' share (60%) is divided equally between everyone
  WINNER_TAKES_ALL: 'WINNER_TAKES_ALL', // The players' share is accumulated and goes only to the winner at the end
};

// --- 3. Transaction types (compatible with Enum in DB) ---
export const TRANSACTION_TYPES = {
  GIFT: 'GIFT', // Drag & Drop coins
  REFUND: 'REFUND', // Refund for a correct answer
  EARN: 'EARN', // Earnings (e.g., part of the losers' pot)
  PURCHASE: 'PURCHASE', // Buying coins with real money
  SPEND: 'SPEND', // Spending coins on betting
  TRANSFER: 'TRANSFER', // General transfer
};

// --- 4. General game settings ---
export const GAME_SETTINGS = {
  DEFAULT_QUESTION_TIMER: 30, // Seconds per question (default)
  MIN_WAGER: 10, // Minimum wager per question
  MAX_GIFT_AMOUNT: 5000, // Maximum single gift amount (to prevent fraud)
};
