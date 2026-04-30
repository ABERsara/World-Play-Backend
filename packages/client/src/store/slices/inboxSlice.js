import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';

const BASE_URL = `${process.env.EXPO_PUBLIC_API_URL}/api`;

export const fetchInbox = createAsyncThunk(
  'inbox/fetchInbox',
  async ({ page, limit }, { rejectWithValue }) => {
    try {
      const token = await authService.getToken();
      const response = await fetch(
        `${BASE_URL}/inbox?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.message);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markAsRead = createAsyncThunk(
  'inbox/markAsRead',
  async ({ id, type }, { rejectWithValue }) => {
    try {
      const token = await authService.getToken();
      const response = await fetch(`${BASE_URL}/inbox/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) return rejectWithValue('Failed to mark');
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const inboxSlice = createSlice({
  name: 'inbox',
  initialState: {
    items: [],
    page: 1,
    hasMore: true,
    loading: false,
    error: null,
  },
  reducers: {
    resetInbox: (state) => {
      state.items = [];
      state.page = 1;
      state.hasMore = true;
      state.error = null;
    },
    addNewItem: (state, action) => {
      const exists = state.items.find((i) => i.id === action.payload.id);
      if (!exists) {
        state.items = [action.payload, ...state.items];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInbox.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInbox.fulfilled, (state, action) => {
        state.loading = false;
        state.items = [...state.items, ...action.payload.data];
        state.hasMore = action.payload.pagination.hasMore;
        state.page += 1;
      })
      .addCase(fetchInbox.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      });
  },
});

export const { resetInbox, addNewItem } = inboxSlice.actions;
export default inboxSlice.reducer;
