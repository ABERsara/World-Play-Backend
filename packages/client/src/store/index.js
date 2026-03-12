import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import inboxReducer from './slices/inboxSlice'; // 1. ייבוא ה-Reducer החדש
import { socketMiddleware } from './middleware/socketMiddleware';
import { socket } from '../services/socket.service';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    inbox: inboxReducer, // 2. הוספת ה-Inbox למערכת הסטייט
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(socketMiddleware(socket)),
});
