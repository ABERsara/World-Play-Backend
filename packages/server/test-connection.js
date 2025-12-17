// test-connection.js
import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';
const SOCKET_URL = 'http://localhost:8080';

const REAL_USER = {
  email: 'UserB@example.com', // האימייל האמיתי שב-DB
  password: 'UserB', // הסיסמה האמיתית
};

const REAL_GAME_ID = '0316d6d8-17e0-4354-905b-5c0f47e6d532';

async function runTest() {
  console.log('🔵 Starting Real-Data Check...');
  let token;

  try {
    // שלב 1: התחברות (Login) במקום הרשמה
    console.log('1️ Logging in...');
    const loginRes = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(REAL_USER),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.message || 'Login failed');

    token = loginData.token;
    console.log(' Login Successful. Token received.');
  } catch (error) {
    console.error(' Auth Failed:', error.message);
    return;
  }

  // שלב 2: סוקט
  console.log('2️ Connecting to Socket...');
  const socket = io(SOCKET_URL, { auth: { token } });

  socket.on('connect', () => {
    console.log(` Socket Connected! ID: ${socket.id}`);

    // שלב 3: שליחת ID אמיתי
    console.log(`3️ Joining Real Game: ${REAL_GAME_ID}...`);
    // שינוי תפקיד למארח (HOST) כדי שהשרת יזהה אותך נכון
    socket.emit('join_room', {
      gameId: REAL_GAME_ID,
      role: 'HOST',
    });
  });

  // האזנה להודעות הצלחה
  socket.on('system_message', (data) => console.log(`📩 System: ${data.msg}`));

  // האזנה לעדכוני חדר (החלק המעניין!)
  socket.on('room_update', (data) => {
    console.log(` LIVE UPDATE: User ${data.username} joined as ${data.role}`);
  });
  socket.on('game_status_update', (data) => {
    console.log(` GAME STATUS CHANGED!!! `);
    console.log(`New Status: ${data.status}`);
    console.log(`Timestamp: ${data.timestamp}`);
  });
  socket.on('error', (data) =>
    console.error(` Error from server: ${data.msg}`)
  );
}

runTest();
