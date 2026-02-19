import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import { socketMiddleware } from './middleware/socketMiddleware';
import { socket } from '../services/socket.service';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(socketMiddleware(socket)),
});
