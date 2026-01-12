import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import * as gameRules from '../services/validation.service.js';

const prisma = new PrismaClient();
const activeStreams = new Map();

const streamService = {
  async startStream(streamId, inputPipe) {
    if (activeStreams.has(streamId)) {
      throw new Error('Stream already exists');
    }

    console.log(`📡 Ingesting stream ${streamId} and relaying to internal RTP`);

    const rtpPort = 5000 + Math.floor(Math.random() * 1000);
    const rtpUrl = `rtp://127.0.0.1:${rtpPort}`;

    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-c:a',
      'aac',
      '-f',
      'rtp',
      rtpUrl,
    ]);

    activeStreams.set(streamId, {
      ffmpeg,
      rtpUrl,
      rtpPort,
      startTime: Date.now(),
    });

    // שימי לב: notifyBackend צריכה להיות מוגדרת או מיובאת.
    // אם היא בתוך האובייקט הזה, השתמשי ב-this.
    await this.updateStreamStatus(streamId, null, 'LIVE');

    inputPipe.pipe(ffmpeg.stdin);

    ffmpeg.stderr.on('data', (data) => {
      if (data.toString().includes('error')) {
        console.error(`⚠️ FFmpeg [${streamId}]:`, data.toString());
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(`🛑 Stream relay ${streamId} stopped (code: ${code})`);
      activeStreams.delete(streamId);
    });
  },

  async createStream(hostId, { title }) {
    await gameRules.validateUserHasNoActiveStream(hostId);
    return await prisma.stream.create({
      data: {
        title,
        hostId,
        status: 'WAITING',
      },
    });
  },

  async updateStreamStatus(streamId, userId, newStatus) {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) throw new Error('Stream not found');

    // אם userId הוא null, אנחנו מדלגים על בדיקת המארח (עבור עדכונים פנימיים מהשרת)
    if (userId && stream.hostId !== userId) {
      throw new Error('Unauthorized: Only the host can update stream status');
    }

    const dataToUpdate = { status: newStatus };
    const now = new Date();

    if (newStatus === 'LIVE' && !stream.startTime) {
      dataToUpdate.startTime = now;
    } else if (newStatus === 'FINISHED') {
      dataToUpdate.endTime = now;
    } else if (newStatus === 'PAUSE') {
      dataToUpdate.lastPausedAt = now;
    }

    return await prisma.stream.update({
      where: { id: streamId },
      data: dataToUpdate,
    });
  },

  async pauseStream(streamId) {
    return await prisma.stream.update({
      where: { id: streamId },
      data: {
        status: 'PAUSE',
        lastPausedAt: new Date(),
      },
    });
  },

  async resumeStream(streamId) {
    return await prisma.stream.update({
      where: { id: streamId },
      data: { status: 'LIVE' },
    });
  },
};

export default streamService;
