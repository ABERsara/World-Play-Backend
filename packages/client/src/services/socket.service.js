import { io } from 'socket.io-client';
import { authService } from './auth.service';
import { Platform } from 'react-native';

const APP_SERVER_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

// משתנה פנימי שניתן לשינוי
let appSocketInstance = null;
let mediaSocketInstance = null;
let mediaSocketConnectPromise = null;

// פונקציה לקבלת כתובת שרת המדיה
const getMediaServerUrl = async () => {
  try {
    // תמיד משתמש בכתובת הרשת המקומית עבור מובייל
    return Platform.OS === 'android' ? 'http://192.168.33.17:8000' : 'http://localhost:8000';
  } catch (error) {
    console.warn('Failed to get media server URL, using default');
    return Platform.OS === 'android' ? 'http://192.168.33.17:8000' : 'http://localhost:8000';
  }
};

export const connectAppSocket = async () => {
  if (appSocketInstance && appSocketInstance.connected) return appSocketInstance;

  const token = await authService.getToken();
  if (!token) {
    console.warn('No token found, cannot connect socket');
    return null;
  }

  appSocketInstance = io(APP_SERVER_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
  });

  appSocketInstance.on('connect', () => {
    console.log('✅ App Socket connected:', appSocketInstance.id);
  });

  appSocketInstance.on('connect_error', (error) => {
    console.error('❌ App Socket connection error:', error.message);
  });

  return appSocketInstance;
};

export const connectMediaSocket = async () => {
  // אם יש חיבור פעיל, החזר אותו
  if (mediaSocketInstance && mediaSocketInstance.connected) {
    return mediaSocketInstance;
  }

  // אם כבר בתהליך התחברות, המתן ולא תוצור חיבור חדש
  if (mediaSocketConnectPromise) {
    return mediaSocketConnectPromise;
  }

  // יצור promise שיסתיים ברגע שהחיבור בוצע
  mediaSocketConnectPromise = new Promise(async (resolve, reject) => {
    try {
      const token = await authService.getToken();
      if (!token) {
        console.warn('No token found, cannot connect media socket');
        mediaSocketConnectPromise = null;
        return reject(new Error('No token found'));
      }

      const mediaUrl = await getMediaServerUrl();
      // בתוך connectMediaSocket
mediaSocketInstance = io(mediaUrl, {
  auth: { token },
  transports: ['websocket'], 
  reconnection: true,
  forceNew: true // מומלץ כדי למנוע זליגות של חיבורים ישנים
});

      mediaSocketInstance.on('connect', () => {
        console.log('✅ Media Socket connected:', mediaSocketInstance.id);
        mediaSocketConnectPromise = null;
        resolve(mediaSocketInstance);
      });

      mediaSocketInstance.on('connect_error', (error) => {
        console.error('❌ Media Socket connection error:', error.message);
        mediaSocketConnectPromise = null;
        reject(error);
      });

      mediaSocketInstance.on('disconnect', () => {
        console.log('🔌 Media Socket disconnected');
        mediaSocketConnectPromise = null;
      });

      // Timeout בעוד 10 שניות אם לא התחבר
      setTimeout(() => {
        if (mediaSocketConnectPromise) {
          mediaSocketConnectPromise = null;
          reject(new Error('Media socket connection timeout'));
        }
      }, 10000);
    } catch (error) {
      console.error('Error creating media socket:', error);
      mediaSocketConnectPromise = null;
      reject(error);
    }
  });

  return mediaSocketConnectPromise;
};

// שמירה לאחוריות - הפונקציה הישנה עכשיו מחזירה את app socket
export const connectSocket = connectAppSocket;

// getter ל-app socket
export const getAppSocket = () => appSocketInstance;

// getter ל-media socket
export const getMediaSocket = () => mediaSocketInstance;

export const getSocket = () => appSocketInstance; // שמירה לאחוריות

export const emitPromise = (type, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      // חכה עד שהסוקט מתחבר
      const activeSocket = await connectAppSocket();

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
    } catch (err) {
      console.error('Error in emitPromise:', err);
      reject(err);
    }
  });
};

export const emitMediaPromise = (type, data) => {
  // בתוך הפונקציה שמאתחלת את ה-media socket
console.log("🚀 Attempting to connect to Media Server at:", process.env.EXPO_PUBLIC_MEDIA_SERVER_URL);
  return new Promise(async (resolve, reject) => {
    try {
      // חכה עד שהסוקט מתחבר
      const activeSocket = await connectMediaSocket();

      if (!activeSocket || !activeSocket.connected) {
        return reject(new Error('מדיה סוקט לא מחובר'));
      }

      activeSocket.emit(type, data, (response) => {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      console.error('Error in emitMediaPromise:', err);
      reject(err);
    }
  });
};

export const disconnectSocket = () => {
  if (appSocketInstance) {
    appSocketInstance.disconnect();
    appSocketInstance = null;
  }
  if (mediaSocketInstance) {
    mediaSocketInstance.disconnect();
    mediaSocketInstance = null;
  }
};

// תאימות לאחור לקוד קיים שמשתמש ב-import { socket }
export { appSocketInstance as socket };
