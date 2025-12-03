import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const streamService = {
  // יצירת סטרים חדש
  async createStream(hostId, { title }) {
    return await prisma.stream.create({
      data: {
        title,
        hostId,
        status: 'WAITING',
      },
    });
  },

  async updateStreamStatus(streamId, status) {
    const dataToUpdate = { status };
    const now = new Date();

    // 1. התחלת שידור (LIVE)
    if (status === 'LIVE') {
      const currentStream = await prisma.stream.findUnique({
        where: { id: streamId },
        select: { startTime: true },
      });

      // מעדכנים זמן התחלה רק אם זה השידור הראשון (ולא חזרה מהפסקה)
      if (!currentStream.startTime) {
        dataToUpdate.startTime = now;
      }

      // אופציונלי: כשחוזרים ל-LIVE, אפשר לאפס את lastPausedAt כדי למנוע בלבול,
      // או להשאיר אותו להיסטוריה. כרגע לא נגע בו כדי לא לאבד מידע.
    }

    // 2. עצירת שידור (PAUSED)
    else if (status === 'PAUSE') {
      // שמירת נקודת העצירה המדויקת
      dataToUpdate.lastPausedAt = now;
    }

    // 3. סיום שידור (ENDED)
    else if (status === 'FINISHED') {
      dataToUpdate.endTime = now;
    }

    return await prisma.stream.update({
      where: { id: streamId },
      data: dataToUpdate,
    });
  },
};

export default streamService;
