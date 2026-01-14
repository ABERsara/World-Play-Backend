import { StreamService } from '../services/stream.service.js';

export const StreamController = {
  async start(req, res) {
    const { streamId } = req.params;

    console.log(`📹 Received stream request for: ${streamId}`);
    console.log(`🔍 Headers:`, req.headers);

    try {
      // בדיקה אם השידור כבר קיים
      if (StreamService.getActiveStreams().has(streamId)) {
        console.log(`⚠️ Stream ${streamId} already exists`);
        return res.status(409).json({ error: 'Stream already running' });
      }

      // **חשוב מאוד**: אל תשלח response מיד!
      // req הוא Stream שממשיך לזרום, אז אנחנו מעבירים אותו ל-Service

      console.log(`✅ Starting stream processing for ${streamId}`);

      await StreamService.startStream(streamId, req, res);

      // הערה: res.end() יקרה ב-Service כשה-stream יסתיים
    } catch (error) {
      console.error(`❌ Controller Error [${streamId}]:`, error.message);

      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  },
};
