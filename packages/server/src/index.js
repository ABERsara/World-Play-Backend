import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';

// ייבוא נתיבי REST
import userRoutes from './routes/user.routes.js';
import financeRoutes from './routes/finance.routes.js';
import streamRoutes from './routes/stream.routes.js';
import gameRoutes from './routes/games.routes.js';
import questionRoutes from './routes/question.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import chatRoutes from './routes/chat.router.js';
import notificationRoutes from './routes/notification.routes.js';

import corsOptions from './config/corsOptions.js';

// ייבוא שירות הסוקט
import { initializeSocketIO } from './services/socket.service.js';

dotenv.config();

const app = express();
// מוגדר כ-server
const server = http.createServer(app);

// הגדרת פורט
const PORT = process.env.PORT || 8080;

// --- Middleware ---
app.use(express.json());
// שימוש ב-corsOptions המיובא
app.use(cors(corsOptions));

// --- Routes (REST API) ---
app.use('/api/users', userRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.send('Live Game Streaming Backend is Running!');
});
console.log('👉 STEP 1: About to init socket'); // בדיקה 1

// אתחול הסוקט
const io = initializeSocketIO(server);

console.log('👉 STEP 2: Socket init passed'); // בדיקה 2

app.set('io', io);

server.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
