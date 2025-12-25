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
      // כאן הטעות בדרך כלל - ודאי שהשורה הזו קיימת:
      lastTimestamp: parseFloat(videoTimestamp) || 0 
    },
  });
},

async resumeStream(streamId) {
  return await prisma.stream.update({
    where: { id: streamId },
    data: { 
      status: 'LIVE',
      lastPausedAt: null // איפוס זמן ההשהיה כי חזרנו לשידור חי
    },
    // אופציונלי: להוסיף select כדי לוודא ששדה ה-timestamp חוזר
    select: {
      id: true,
      status: true,
      lastTimestamp: true, // זה השדה הקריטי שהנגן צריך!
      title: true
    }
  });resumeStream
},


  async captureStreamSnapshot(streamId, currentTimestamp) {
  return await prisma.stream.update({
    where: { id: streamId },
    data: {
      lastTimestamp: currentTimestamp,
      lastPausedAt: new Date(),
      status: 'PAUSE'
    }
  });
}


};




export default streamService;


