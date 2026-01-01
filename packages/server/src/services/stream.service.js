// stream.service.js
import { PrismaClient } from '@prisma/client';
import * as gameRules from '../services/validation.service.js';

const prisma = new PrismaClient();

const streamService = {
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

    if (stream.hostId !== userId) {
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

  // תיקון תחביר: בתוך אובייקט משתמשים ב-async שםהפונקציה() ולא ב-const
  async pauseStream(streamId, videoTimestamp) {
    return await prisma.stream.update({
      where: { id: streamId },
      data: {
        status: 'PAUSE',
        lastPausedAt: new Date(),
        // אם הוספת שדה videoTimestamp בפריזמה, עדכני אותו כאן:
        // videoTimestamp: videoTimestamp 
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


