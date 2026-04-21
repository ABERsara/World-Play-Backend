import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { logger } from './src/utils/logger.js';
import { socketAuth } from './src/middleware/socketAuth.js';
import { createWorkers } from './src/services/mediasoup.service.js';
import { registerStreamHandlers } from './src/sockets/stream.handler.js';
import statusRoutes from './src/routes/status.routes.js';
import { StreamService } from './src/services/stream.service.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.MEDIA_PORT || 8000;

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.json());

// --- הראוטר לעצירת שידור ---
app.post('/live/stop/:streamId', async (req, res) => {
  const { streamId } = req.params;
  logger.info(`🛑 Received stop request for stream: ${streamId}`);

  try {
    // קריאה לפונקציה -StreamService
    await StreamService.stopRecording(streamId);
    res
      .status(200)
      .json({ success: true, message: 'Stream stopped and cleaned up' });
  } catch (err) {
    logger.error(`❌ Failed to stop stream ${streamId}`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// הגשת קבצי ה-HLS לצפייה
// עדכון נתיב הגשת הקבצים (HLS ופוסטרים)
// שינוי מ-'media_files' ל-'public/streams' כדי להתאים ל-FFmpegService
app.use('/streams', express.static(path.join(__dirname, 'public', 'streams')));

app.use('/', statusRoutes);

io.use(socketAuth);
io.on('connection', (socket) => {
  logger.socketConnect(socket.user, socket.id);
  registerStreamHandlers(io, socket);
  socket.on('disconnect', (reason) => {
    logger.socketDisconnect(socket.user, socket.id, reason);
  });
});

const startServer = async () => {
  try {
    await createWorkers();
    logger.success('Mediasoup Workers Initialized');
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.system(`Media Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start Media Server', err);
  }
};

startServer();
