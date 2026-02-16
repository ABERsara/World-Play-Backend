import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import { socketMiddleware } from './middleware/socketMiddleware';
import { socket } from '../services/socket.service';

export const store = configureStore({
  reducer: {
    wallet: walletReducer, // השם כאן קובע את הגישה ב-useSelector
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(socketMiddleware(socket)),
});
