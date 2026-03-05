import { io } from 'socket.io-client';
import { authService } from './auth.service';
import { Platform } from 'react-native';

const SOCKET_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

// משתנה פנימי שניתן לשינוי
let socketInstance = null;

export const connectSocket = async () => {
  if (socketInstance && socketInstance.connected) return socketInstance;

  const token = await authService.getToken();
  if (!token) {
    console.warn('No token found, cannot connect socket');
    return null;
  }

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
  });

  socketInstance.on('connect', () => {
    console.log('✅ Socket connected:', socketInstance.id);
  });

  socketInstance.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });

  return socketInstance;
};

// אקספורט של ה-instance עצמו (Getter)
export const getSocket = () => socketInstance;

export const emitPromise = (type, data) => {
  return new Promise((resolve, reject) => {
    const initialize = async () => {
      try {
        const activeSocket = socketInstance || (await connectSocket());
        if (!activeSocket || !activeSocket.connected) {
          return reject(new Error('סוקט לא מחובר'));
        }

        activeSocket.emit(type, data, (response) => {
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    };
    initialize();
  });
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

// תאימות לאחור לקוד קיים שמשתמש ב-import { socket }
export { socketInstance as socket };
