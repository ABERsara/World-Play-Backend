import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

import dotenv from 'dotenv';
import streamRoutes from './src/routes/streamRoutes.js';
import { StreamService } from './src/services/streamService.js';
import { logger } from './src/utils/logger.js';
import { socketAuth } from './src/middleware/socketAuth.js';
import { createWorkers } from './src/services/mediasoup.service.js';
import { registerStreamHandlers } from './src/sockets/stream.handler.js';
import { spawn } from 'child_process';

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.MEDIA_PORT || 8000;

// אתחול Socket.io עם ה-Logger וה-Auth שלך
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.use(socketAuth); // שימוש במנגנון האימות הקיים שלך

io.on('connection', (socket) => {
    // שימוש בלוגר המקורי שלך
    logger.socketConnect(socket.user, socket.id);

    // רישום ה-Handlers של המדיה בלבד
    registerStreamHandlers(io, socket);

    socket.on('disconnect', (reason) => {
        logger.socketDisconnect(socket.user, socket.id, reason);
    });
});

// חשוב: לאפשר JSON לפני הראוטים
app.use(express.json());

// תיעוד בקשות נכנסות (Logging Middleware)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 🔍 Request: ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// הגשת קבצים סטטיים של HLS
app.use('/hls', express.static(StreamService.getTempDir()));

// חיבור הראוטר (שימי לב לנתיב /live)
app.use('/live', streamRoutes);

// הודעת הברכה בנתיב הראשי
app.get('/', (req, res) => {
  res.json({
    status: "online",
    message: "🚀 World-Play Media Server is Live and Running!",
    timestamp: new Date().toISOString(),
    service: "media-server"
  });
});

// פונקציית אתחול השרת
const startServer = async () => {
    try {
        await createWorkers();
        logger.success('Mediasoup Workers Initialized');
        
        httpServer.listen(PORT, '0.0.0.0', () => {
            logger.system(`Media Server is running on http://0.0.0.0:${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start Media Server', err);
    }
};

startServer();