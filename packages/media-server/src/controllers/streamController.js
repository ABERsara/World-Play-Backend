// Media Server - stream.controller.js
import { StreamService } from '../services/stream.service.js';

export const StreamController = {
  async start(req, res) {
    const { streamId } = req.params;

    console.log(`📹 Received stream request for: ${streamId}`);

    try {
      if (StreamService.getActiveStreams().has(streamId)) {
        console.log(`⚠️ Stream ${streamId} already exists`);
        return res.status(409).json({ error: 'Stream already running' });
      }

      console.log(`✅ Starting stream processing for ${streamId}`);

      // *** שחרר response מיד ***
      res.status(200).json({
        message: 'Stream ingestion started successfully',
        streamId,
        watchUrl: `http://localhost:8000/hls/${streamId}/index.m3u8`,
      });

      // *** עכשיו תן ל-Service לעבוד ברקע ***
      // החשוב: req הוא Stream שממשיך לקבל data גם אחרי שה-response נשלח
      await StreamService.startStream(streamId, req);
    } catch (error) {
      console.error(`❌ Controller Error [${streamId}]:`, error.message);

      // רק אם לא שלחנו response עדיין
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  },
};
