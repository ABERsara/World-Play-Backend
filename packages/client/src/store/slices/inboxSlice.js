// store/slices/inboxSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';

const BASE_URL = 'http://10.0.2.2:8080/api';

// פעולה לשליפת האינבוקס (עם תמיכה בדפדוף)
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
      return data; // מחזיר את ה-items ואת ה-pagination info
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// פעולה לסימון פריט כנקרא
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
      if (!response.ok) return rejectWithValue('Failed to mark as read');
      return id; // מחזירים את ה-id כדי להסיר אותו מהסטייט
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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInbox.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInbox.fulfilled, (state, action) => {
        state.loading = false;
        // איחוד נתונים: מוסיפים את הפריטים החדשים לסוף הרשימה הקיימת
        state.items = [...state.items, ...action.payload.data];
        state.hasMore = action.payload.pagination.hasMore;
        state.page += 1;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        // הסרה מיידית של הפריט מהרשימה ב-UI
        state.items = state.items.filter((item) => item.id !== action.payload);
      });
  },
});

export const { resetInbox } = inboxSlice.actions;
export default inboxSlice.reducer;
