// packages/server/src/services/stream.service.js

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { PassThrough } from 'stream';

const prisma = new PrismaClient();
const MEDIA_SERVER_URL = 'http://media-server:8000';

const streamService = {
  async startStream(streamId, inputPipe) {
    console.log(`📡 Redirecting stream ${streamId} to Media Server...`);

    // *** יצירת buffer stream כדי לשמור את המידע ***
    const bufferStream = new PassThrough();

    let totalBytes = 0;
    let chunks = [];

    // אוסף את כל המידע לפני שליחה
    inputPipe.on('data', (chunk) => {
      totalBytes += chunk.length;
      chunks.push(chunk);
      bufferStream.write(chunk);

      if (
        Math.floor(totalBytes / 1000000) >
        Math.floor((totalBytes - chunk.length) / 1000000)
      ) {
        console.log(
          `📥 App Server Progress: ${(totalBytes / 1024 / 1024).toFixed(2)} MB received`
        );
      }
    });

    // כשהקלט נגמר - שלח הכל ל-Media Server
    inputPipe.on('end', async () => {
      console.log(
        `✅ Full video received: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`
      );
      bufferStream.end();

      // עכשיו שלח ל-Media Server
      try {
        const finalBuffer = Buffer.concat(chunks);
        console.log(
          `🚀 Sending ${finalBuffer.length} bytes to Media Server...`
        );

        const response = await axios({
          method: 'post',
          url: `${MEDIA_SERVER_URL}/live/start/${streamId}`,
          data: finalBuffer,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': finalBuffer.length,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000, // 60 שניות timeout
        });

        console.log(`✅ Media Server response:`, response.data);
      } catch (error) {
        console.error(`❌ Failed to send to Media Server:`, error.message);
        throw error;
      }
    });

    inputPipe.on('error', (err) => {
      console.error(`❌ Input pipe error:`, err.message);
      bufferStream.destroy(err);
    });
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
