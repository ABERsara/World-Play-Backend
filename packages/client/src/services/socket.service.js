import { io } from 'socket.io-client';

const SOCKET_URL = "http://localhost:8080";

// יצירת משתנה ריק לסוקט
export let socket = null;

// רק אם אנחנו בדפדפן, נאתחל את אובייקט הסוקט
if (typeof window !== 'undefined') {
  socket = io(SOCKET_URL, {
    autoConnect: false, // מונע חיבור אוטומטי לפני שיש טוקן
    auth: {
      token: localStorage.getItem('userToken')
    }
  });
}

export const connectSocket = () => {
  // הגנה מפני הרצה בשרת (SSR)
  if (typeof window === 'undefined' || !socket) return;

  const token = localStorage.getItem('userToken');
  if (token) {
    socket.auth = { token };
    socket.connect();
    console.log('✅ Socket connecting with token...');
  }
};