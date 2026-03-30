import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';

const BASE_URL = 'http://10.0.2.2:8080/api';

// שליפת היסטוריה
export const fetchHistory = createAsyncThunk(
  'history/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const token = await authService.getToken();
      const response = await fetch(`${BASE_URL}/games/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.message);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// נעיצת משחק
export const togglePin = createAsyncThunk(
  'history/togglePin',
  async (gameId, { rejectWithValue }) => {
    try {
      const token = await authService.getToken();
      const response = await fetch(`${BASE_URL}/games/${gameId}/pin`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.message);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const historySlice = createSlice({
  name: 'history',
  initialState: {
    all: [],
    asHost: [],
    asPlayer: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.all = action.payload.all;
        state.asHost = action.payload.asHost;
        state.asPlayer = action.payload.asPlayer;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(togglePin.fulfilled, (state, action) => {
        // עדכון ה-isPinned ברשימה
        const updated = action.payload;
        state.all = state.all.map((item) =>
          item.gameId === updated.gameId
            ? { ...item, isPinned: updated.isPinned }
            : item
        );
      });
  },
});

export default historySlice.reducer;
