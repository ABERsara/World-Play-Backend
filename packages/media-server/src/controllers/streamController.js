import { StreamService } from '../services/streamService.js';

import { streams } from '../sockets/stream.handler.js';

export const StreamController = {
  async start(req, res) {
    const { streamId } = req.params;

    try {
      // 1. בדיקה האם נוצר חדר (Router) עבור הסטרים הזה בסוקט
      const streamRoom = streams[streamId];
      if (!streamRoom || !streamRoom.router) {
        console.error(
          `❌ No router found for stream: ${streamId}. Did the host join via socket?`
        );
        return res.status(400).json({
          error:
            'Stream room (router) not initialized. Please create room via socket first.',
        });
      }

      // 2. בדיקה אם הסטרים כבר רץ
      if (StreamService.getActiveStreams().has(streamId)) {
        return res.status(409).json({ error: 'Stream is already active' });
      }

      // 3. הפעלת ה-Service עם ה-Router הנכון
      // כאן אנחנו מעבירים את streamRoom.router כפרמטר הרביעי
      const producerId = await StreamService.startStream(
        streamId,
        req,
        res,
        streamRoom.router
      );

      console.log(
        `📹 Stream ingest connected to WebRTC Producer: ${producerId}`
      );

      // אנחנו לא סוגרים את ה-res כאן, ה-Service יטפל בזה
    } catch (error) {
      console.error(`❌ Controller Error: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  },
};
