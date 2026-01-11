import { io } from 'socket.io-client';
import { authService } from './auth.service';

const SOCKET_URL = "http://192.168.56.1:8000"; 
export let socket = null;

export const connectSocket = () => {
  if (socket && socket.connected) return socket;

  const token = authService.getToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket']
  });

  return socket;
};

// וודאי שהשורה הזו נראית בדיוק ככה:
export const emitPromise = (type, data) => {
  return new Promise((resolve, reject) => {
    // אם הסוקט לא קיים, ננסה לחבר אותו
    const activeSocket = socket || connectSocket();
    
    if (!activeSocket) {
      return reject(new Error('סוקט לא מחובר'));
    }

    activeSocket.emit(type, data, (response) => {
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};