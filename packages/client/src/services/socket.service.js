// src/services/socket.service.js
import { io } from 'socket.io-client';
import { authService } from './auth.service';

const SOCKET_URL = 'http://10.0.2.2:8080'; // עבור Android Emulator
export let socket = null;

export const connectSocket = async () => {
  if (socket && socket.connected) return socket;

  const token = await authService.getToken();
  if (!token) {
    console.warn('No token found, cannot connect socket');
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });

  return socket;
};

export const emitPromise = (type, data) => {
  return new Promise((resolve, reject) => {
    // במקום async פנימי, אנחנו קוראים לחיבור ואז ממשיכים ב-then
    const getSocket = socket ? Promise.resolve(socket) : connectSocket();

    getSocket
      .then((activeSocket) => {
        if (!activeSocket) {
          return reject(new Error('סוקט לא מחובר - אין טוקן'));
        }

        if (!activeSocket.connected) {
          return reject(new Error('סוקט לא מחובר'));
        }

        activeSocket.emit(type, data, (response) => {
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      })
      .catch((err) => reject(err)); // תופס שגיאות חיבור
  });
};
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
