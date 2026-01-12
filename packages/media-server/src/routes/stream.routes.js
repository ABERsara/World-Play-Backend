import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { logger } from './src/utils/logger.js';
import { socketAuth } from './src/middleware/socketAuth.js';
import { createWorkers } from './src/services/mediasoup.service.js';
import { registerStreamHandlers } from './src/sockets/stream.handler.js';

// ייבוא הראוטרים
import statusRoutes from './src/routes/status.routes.js';
import streamRoutes from './src/routes/stream.routes.js';

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.MEDIA_PORT || 8000;

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// --- Middleware & Routes ---
app.use(express.json());

// הראוטרים שלנו
app.use('/', statusRoutes); // ה-Status והברכה
app.use('/', streamRoutes); // ה-FFmpeg Endpoint (/live/:streamId)

// --- Socket.io ---
io.use(socketAuth);
io.on('connection', (socket) => {
  logger.socketConnect(socket.user, socket.id);
  registerStreamHandlers(io, socket);
  socket.on('disconnect', (reason) => {
    logger.socketDisconnect(socket.user, socket.id, reason);
  });
});

// --- Startup ---
const startServer = async () => {
  try {
    await createWorkers();
    logger.success('Mediasoup Workers Initialized');
    httpServer.listen(PORT, () => {
      logger.system(`Media Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start Media Server', err);
  }
};

startServer();
