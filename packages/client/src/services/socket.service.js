/**
 * socket.service.js (client)
 *
 * ניהול חיבורי Socket.IO מהצד הלקוח — שני חיבורים נפרדים:
 *   appSocket   — לשרת הראשי (משחק, התראות, צ'אט)
 *   mediaSocket — לשרת המדיה (סטרימינג וידאו/אודיו)
 *
 * connectMediaSocket משתמש ב-promise dedup כדי למנוע חיבורים כפולים במקביל.
 * emitPromise / emitMediaPromise עוטפים emit ב-Promise לשימוש async/await נוח.
 *
 * תלוי ב:   auth.service.js (טוקן לאימות), EXPO_PUBLIC_MEDIA_SERVER_URL (ENV)
 * משמש את:  כל מסך שצריך לשלוח/לקבל אירועי realtime
 */
import { io } from 'socket.io-client';
import { authService } from './auth.service';
import { Platform } from 'react-native';

const APP_SERVER_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080');

let appSocketInstance = null;
let mediaSocketInstance = null;
let mediaSocketConnectPromise = null;

const getMediaServerUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_MEDIA_SERVER_URL;

  if (Platform.OS === 'android') {
    return envUrl || 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

export const connectAppSocket = async () => {
  if (appSocketInstance && appSocketInstance.connected)
    return appSocketInstance;
  const token = await authService.getToken();
  if (!token) return null;

  appSocketInstance = io(APP_SERVER_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
  });
  return appSocketInstance;
};

export const connectMediaSocket = async () => {
  if (mediaSocketInstance && mediaSocketInstance.connected)
    return mediaSocketInstance;
  if (mediaSocketConnectPromise) return mediaSocketConnectPromise;

  mediaSocketConnectPromise = new Promise((resolve, reject) => {
    authService
      .getToken()
      .then((token) => {
        if (!token) {
          mediaSocketConnectPromise = null;
          return reject(new Error('No token found'));
        }

        const mediaUrl = getMediaServerUrl();
        mediaSocketInstance = io(mediaUrl, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          forceNew: true,
        });

        mediaSocketInstance.on('connect', () => {
          mediaSocketConnectPromise = null;
          resolve(mediaSocketInstance);
        });

        mediaSocketInstance.on('connect_error', (error) => {
          mediaSocketConnectPromise = null;
          reject(error);
        });
      })
      .catch(reject);
  });

  return mediaSocketConnectPromise;
};

export const emitPromise = (type, data) => {
  return new Promise((resolve, reject) => {
    connectAppSocket()
      .then((activeSocket) => {
        if (!activeSocket || !activeSocket.connected)
          return reject(new Error('סוקט לא מחובר'));
        activeSocket.emit(type, data, (response) => {
          if (response && response.error) reject(new Error(response.error));
          else resolve(response);
        });
      })
      .catch(reject);
  });
};

export const emitMediaPromise = (type, data) => {
  return new Promise((resolve, reject) => {
    connectMediaSocket()
      .then((activeSocket) => {
        if (!activeSocket || !activeSocket.connected)
          return reject(new Error('מדיה סוקט לא מחובר'));
        activeSocket.emit(type, data, (response) => {
          if (response && response.error) reject(new Error(response.error));
          else resolve(response);
        });
      })
      .catch(reject);
  });
};

export const disconnectSocket = () => {
  if (appSocketInstance) appSocketInstance.disconnect();
  if (mediaSocketInstance) mediaSocketInstance.disconnect();
};

export const connectSocket = connectAppSocket;
export const getSocket = () => appSocketInstance;

export { appSocketInstance as socket };
