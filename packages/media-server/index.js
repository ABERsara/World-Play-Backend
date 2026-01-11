import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './src/utils/logger.js';
import { socketAuth } from './src/middleware/socketAuth.js';
import { createWorkers } from './src/services/mediasoup.service.js';
import { registerStreamHandlers } from './src/sockets/stream.handler.js';
import { spawn } from 'child_process';
import path from 'path';

dotenv.config();
const prisma = new PrismaClient();
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

// Endpoint ל-FFmpeg (הפרדה ל-Process נפרד)
app.post('/live/:streamId', (req, res) => {
    const { streamId } = req.params;
    logger.system(`FFMPEG: Starting process for stream ${streamId}`);
    
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0', '-c:v', 'libx264', '-preset', 'veryfast',
        '-f', 'hls', '-hls_time', '2', '-hls_list_size', '5',
        '-hls_flags', 'delete_segments', `public/temp/${streamId}/index.m3u8`
    ]);

    req.pipe(ffmpeg.stdin);
    ffmpeg.on('close', () => logger.info(`FFMPEG: Process closed for ${streamId}`));
});

const startServer = async () => {
    try {
        await createWorkers();
        logger.success('Mediasoup Workers Initialized');
        
        httpServer.listen(PORT, () => {
            logger.system(`Media Server is running on http://127.0.0.1:${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start Media Server', err);
    }
};
// לוגר פשוט - כל בקשה שתגיע תודפס בטרמינל
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 🔍 Request: ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// הודעת הברכה בנתיב הראשי
app.get('/', (req, res) => {
  res.json({
    status: "online",
    message: "🚀 World-Play Media Server is Live and Running!",
    timestamp: new Date().toISOString(),
    service: "media-server"
  });
});
startServer();