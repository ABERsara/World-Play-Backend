// src/store/actions/gameActions.js
import axios from 'axios';
import { initGameSession, setStreamStatus } from '../slices/gameStreamSlice';

export const createAndStartGame = (gameData) => async (dispatch) => {
  try {
    // 1. קריאה לשרת ליצירת משחק (שמייצר גם סטרים בטרנזקציה)
    const response = await axios.post('/api/games', gameData);
    const { id, streamId } = response.data.game;

    // 2. עדכון ה-Store שלנו בפרטי הסשן
    dispatch(
      initGameSession({
        gameId: id,
        streamId: streamId,
        role: 'HOST',
      })
    );

    // 3. עדכון סטטוס המשחק ל-ACTIVE בשרת (דרך הסוקט או ה-API)
    dispatch(setStreamStatus('ACTIVE'));

    return { gameId: id, streamId };
  } catch (error) {
    console.error('Failed to create game:', error);
  }
};
