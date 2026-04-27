/**
 * stream.service.js (server)
 *
 * שכבת השירות לניהול שידורים מהשרת הראשי.
 * אחראי על עדכון סטטוס שידורים ב-DB ועל פרוקסי בקשות לשרת המדיה.
 *
 * פונקציות:
 *   startStream(streamId, inputPipe)           — פרוקסי stream גולמי לשרת המדיה
 *   updateStreamStatus(streamId, userId, status) — עדכון סטטוס עם מעקב זמן pause
 *   pauseStream(streamId)                      — השהיית שידור
 *   resumeStream(streamId)                     — המשך שידור
 *
 * מתקשר עם: Prisma → Stream, axios → media-server
 * תלוי ב:   MEDIA_SERVER_URL (hardcoded — TODO: להעביר ל-ENV)
 * משמש את:  stream.controller.js, Socket.IO event handlers
 */
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const MEDIA_SERVER_URL = 'http://media-server:8000';

const streamService = {
  async startStream(streamId, inputPipe) {
    try {
      await axios({
        method: 'post',
        url: `${MEDIA_SERVER_URL}/live/start/${streamId}`,
        data: inputPipe,
        headers: { 'Content-Type': 'application/octet-stream' },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    } catch (err) {
      throw new Error(`Stream pipe failed: ${err.message}`);
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
