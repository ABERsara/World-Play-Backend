// src/store/slices/walletSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  walletBalance: 0,
  scoresByGame: {}, // מבנה: { "game-id-1": 100, "game-id-2": 50 }
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    updateBalances: (state, action) => {
      // הגנה: אם action.payload הוא null או undefined
      const payload = action.payload || {};
      const { walletCoins, pointsInGame, gameId, scoresByGame } = payload;

      // 1. עדכון יתרת הארנק
      if (walletCoins !== undefined) {
        state.walletBalance = walletCoins;
      }

      // 2. עדכון ניקוד - תרחיש א': טעינה מרוכזת (getMe)
      if (scoresByGame && typeof scoresByGame === 'object') {
        state.scoresByGame = scoresByGame;
      }
      // 3. עדכון ניקוד - תרחיש ב': עדכון בודד מהסוקט (Live Update)
      else if (gameId && pointsInGame !== undefined) {
        // אנחנו מוודאים שהאובייקט קיים לפני ההשמה
        if (!state.scoresByGame) state.scoresByGame = {};
        state.scoresByGame[gameId] = pointsInGame;
      }
    },
    // פונקציה לאיפוס למקרה של התנתקות
    resetWallet: () => initialState,
  },
});

export const { updateBalances, resetWallet } = walletSlice.actions;
export default walletSlice.reducer;
