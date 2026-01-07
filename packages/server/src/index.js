
// app.get('/', (req, res) => {
//   res.send('Live Game Streaming Backend is Running!');
// });
import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import axios from 'axios';

import userRoutes from './routes/user.routes.js';
import financeRoutes from './routes/finance.routes.js';
import streamRoutes from './routes/stream.routes.js';
import gameRoutes from './routes/games.routes.js';
import questionRoutes from './routes/question.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import chatRoutes from './routes/chat.router.js';
import notificationRoutes from './routes/notification.routes.js';
import configRoutes from './routes/config.routes.js';
import statusRoutes from './routes/status.routes.js'; // הראוטר שמחזיר הודעת "Running"
import corsOptions from './config/corsOptions.js';
import { initializeSocketIO } from './services/socket.service.js';

dotenv.config();
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 2081;

// --- Middleware ---
app.use(express.json());
app.use(cors(corsOptions));

// --- Routes ---
app.use('/', statusRoutes); // דף הבית של ה-API
app.use('/api/config', configRoutes); // קונפיגורציית המדיה
app.use('/api/users', userRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// --- Functions ---
async function checkMediaServer() {
  try {
    const response = await axios.get('http://media-server:8000/'); 
    console.log('🔗 [BACKEND-TO-MEDIA] Connection successful:', response.data.status);
  } catch (error) {
    console.log('⚠️ [BACKEND-TO-MEDIA] Warning: Media server unreachable');
  }
}

// --- Startup ---
const io = initializeSocketIO(server);
app.set('io', io);

server.listen(PORT, async () => {
    console.log(`✅ Main Server running on port ${PORT}`);
    await checkMediaServer();
});