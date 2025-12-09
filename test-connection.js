// test-connection.js
import { io } from 'socket.io-client';
import fetch from 'node-fetch'; // אם אין לך, ייתכן שתצטרך להריץ npm install node-fetch או להשתמש ב-fetch המובנה ב-Node 18+

const BASE_URL = 'http://localhost:8080'; // ודא שזה הפורט שלך
const SOCKET_URL = 'http://localhost:8080';

// משתמש זמני לבדיקה )
const TEST_USER = {
  username: 'TestPlayer',
  email: `test${Math.floor(Math.random() * 1000)}@example.com`,
  password: 'password123',
};

async function runTest() {
  console.log('🔵 Starting System Check...');

  let token;

  // 1. נסיון הרשמה/התחברות כדי להשיג טוקן
  try {
    console.log('1️⃣ Registering User...');
    const regRes = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    });

    const regData = await regRes.json();

    if (regRes.ok) {
      token = regData.token;
      console.log('✅ Registration Successful. Token received.');
    } else {
      console.log('⚠️ User might exist, trying login...');
      // Login fallback
      const loginRes = await fetch(`${BASE_URL}/users/auth/login`, {
        // ודא שהנתיב תואם
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password,
        }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.message);
      token = loginData.token;
      console.log('✅ Login Successful. Token received.');
    }
  } catch (error) {
    console.error(error);
    console.error('❌ Auth Failed:', error.message);
    return;
  }

  // 2. חיבור לסוקט עם הטוקן
  console.log('2️⃣ Connecting to Socket.io with Token...');

  const socket = io(SOCKET_URL, {
    auth: {
      token: token, // שליחת הטוקן בחיבור
    },
  });

  socket.on('connect', () => {
    console.log(`✅ Socket Connected! ID: ${socket.id}`);

    // 3. בדיקת שליחת אירוע
    console.log("3️⃣ Emitting 'join_room'...");
    socket.emit('join_room', { gameId: 'test-game-123' });
  });

  socket.on('connect_error', (err) => {
    console.error(err);
    console.error(`❌ Socket Connection Error: ${err.message}`);
    process.exit(1);
  });

  // אופציונלי: האזנה לאירועים מהשרת אם הוספת כאלו
  // socket.on("participant_joined", (data) => console.log("📩 Server says:", data));
  setTimeout(() => {
    console.log('🏁 Test Finished. Closing connection.');
    socket.disconnect();
  }, 3000);
}

runTest();
