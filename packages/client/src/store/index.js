import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import inboxReducer from './slices/inboxSlice';
import historyReducer from './slices/historySlice';
import { socketMiddleware } from './middleware/socketMiddleware';
import { socket } from '../services/socket.service';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    inbox: inboxReducer,
    history: historyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(socketMiddleware(socket)),
});
