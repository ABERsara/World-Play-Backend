import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  gameId: null,
  streamId: null,
  role: 'VIEWER', // 'HOST', 'PLAYER', 'VIEWER'
  status: 'WAITING', // 'WAITING', 'ACTIVE', 'PAUSE', 'FINISHED'
  viewMode: 'HLS', // 'WebRTC' (low latency) or 'HLS' (buffered)
  hlsUrl: null,
  isPaused: false,
  isFrozen: false, // האם הנגן צריך לעצור עכשיו בגלל שאלה?
  activeProducers: [], // IDs of video streams (Host + up to 4 players)
};

const gameStreamSlice = createSlice({
  name: 'gameStream',
  initialState,
  reducers: {
    // מופעל כשמצטרפים למשחק (מ-Controller joinGame)
    initGameSession: (state, action) => {
      const { gameId, streamId, role } = action.payload;
      state.gameId = gameId;
      state.streamId = streamId;
      state.role = role;

      // מנחה (MODERATOR) תמיד ב-WebRTC. שחקנים ומארח ב-WebRTC לצורך שידור.
      // צופים (VIEWER) ב-HLS.
      state.viewMode = role === 'VIEWER' ? 'HLS' : 'WebRTC';

      if (state.viewMode === 'HLS') {
        state.hlsUrl = `http://localhost:8000/streams/${streamId}/index.m3u8`;
      }
    },

    // עדכון סטטוס מהסוקט (stream_paused / status_update)
    setStreamStatus: (state, action) => {
      state.status = action.payload;
      state.isPaused = action.payload === 'PAUSE';
    },

    // ניהול המשתתפים שמשדרים וידאו (ה-4 המורשים + מנחה)
    updateActiveStreams: (state, action) => {
      state.activeProducers = action.payload;
    },

    resetSession: () => initialState,
  },
});

export const {
  initGameSession,
  setStreamStatus,
  updateActiveStreams,
  resetSession,
} = gameStreamSlice.actions;
export default gameStreamSlice.reducer;
