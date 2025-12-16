import { PrismaClient } from '@prisma/client';
// וודא שבקובץ validation.service יש פונקציות עם export לפני השם שלהן
import * as gameRules from '../services/validation.service.js';

const prisma = new PrismaClient();

const streamService = {
  async createStream(hostId, { title }) {
    // השגיאה קרתה כאן כי gameRules.validateUserHasNoActiveStream היה undefined
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
    // בדיקה שהסטרים קיים
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) throw new Error('Stream not found');

    // בדיקה שרק המארח יכול לעדכן
    if (stream.hostId !== userId) {
      throw new Error('Unauthorized: Only the host can update stream status');
    }

    const dataToUpdate = { status: newStatus };
    const now = new Date();

    // עדכון זמנים לפי הסטטוס
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
};

export default streamService;
