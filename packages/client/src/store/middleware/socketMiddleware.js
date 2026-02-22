import { updateBalances } from '../slices/walletSlice';
import * as socketService from '../../services/socket.service';

export const socketMiddleware = () => (store) => {
  const setupListener = () => {
    // ניסיון לגשת לאובייקט הסוקט מתוך השירות
    const currentSocket = socketService.socket;

    if (currentSocket) {
      // הסרת מאזינים קודמים כדי למנוע כפילויות
      currentSocket.off('balance_update');

      currentSocket.on('balance_update', (data) => {
        console.log('🚀 [Socket Middleware] Received live update:', data);
        store.dispatch(updateBalances(data));
      });
      console.log('📡 [Middleware] Started listening to balance_update');
    } else {
      setTimeout(setupListener, 1000);
    }
  };

  setupListener();

  return (next) => (action) => next(action);
};
