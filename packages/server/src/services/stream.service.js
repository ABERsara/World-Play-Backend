// packages/server/src/services/stream.service.js

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { PassThrough } from 'stream';

const prisma = new PrismaClient();
const MEDIA_SERVER_URL = 'http://media-server:8000';

const streamService = {
  async startStream(streamId, inputPipe) {
  // יצירת בקשת POST שהיא בעצמה Stream
  try {
    await axios({
      method: 'post',
      url: `${MEDIA_SERVER_URL}/live/start/${streamId}`,
      data: inputPipe, // הזרמה ישירה של ה-Request המקורי לשרת המדיה
      headers: { 'Content-Type': 'application/octet-stream' },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  } catch (err) {
    console.error("Stream pipe failed", err.message);
  }
},
  async updateStreamStatus(streamId, userId, newStatus) {
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');

    const dataToUpdate = { status: newStatus };
    const now = new Date();

    if (newStatus === 'PAUSE') {
      dataToUpdate.lastPausedAt = now;
    } else if (newStatus === 'LIVE' && stream.lastPausedAt) {
      const pauseDuration =
        now.getTime() - new Date(stream.lastPausedAt).getTime();
      dataToUpdate.accumulatedPauseMs =
        (stream.accumulatedPauseMs || 0) + pauseDuration;
      dataToUpdate.lastPausedAt = null;
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
