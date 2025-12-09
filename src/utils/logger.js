// src/utils/logger.js

// קבועי צבעים לטרמינל
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// קבלת שעה נוכחית בפורמט קריא
const getTimestamp = () => new Date().toLocaleTimeString();

export const logger = {
  system: (msg) => {
    console.log(
      `${COLORS.cyan}[SYSTEM ${getTimestamp()}]${COLORS.reset} ${msg}`
    );
  },

  info: (msg) => {
    console.log(`${COLORS.blue}[INFO]${COLORS.reset} ${msg}`);
  },

  success: (msg) => {
    console.log(`${COLORS.green}[SUCCESS]${COLORS.reset} ✅ ${msg}`);
  },

  error: (msg, error = '') => {
    console.error(
      `${COLORS.red}[ERROR ${getTimestamp()}]${COLORS.reset} ❌ ${msg}`,
      error
    );
  },

  // --- לוגים ספציפיים לסוקט ---

  socketConnect: (user, socketId) => {
    console.log(
      `${COLORS.green}[SOCKET CONNECT]${COLORS.reset} User: ${COLORS.yellow}${user.username}${COLORS.reset} (Role: ${user.role}) | ID: ${socketId}`
    );
  },

  socketDisconnect: (user, reason) => {
    const username = user ? user.username : 'Unknown';
    console.log(
      `${COLORS.red}[SOCKET DISCONNECT]${COLORS.reset} User: ${username} | Reason: ${reason}`
    );
  },

  socketAction: (user, action, details = '') => {
    console.log(
      `${COLORS.blue}[SOCKET ACTION]${COLORS.reset} 👤 ${user.username} ➡ ${COLORS.cyan}${action}${COLORS.reset} ${details}`
    );
  },

  socketJoin: (user, roomId) => {
    console.log(
      `${COLORS.blue}[ROOM JOIN]${COLORS.reset} 🏠 User ${COLORS.yellow}${user.username}${COLORS.reset} joined room: ${COLORS.cyan}${roomId}${COLORS.reset}`
    );
  },
};
