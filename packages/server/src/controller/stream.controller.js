// stream.controller.js
import streamService from '../services/stream.service.js';
import gameService from '../services/game.service.js';

const streamController = {
  // POST /api/streams/:streamId/start
  async start(req, res) {
    const { streamId } = req.params;

    try {
      await streamService.startStream(streamId, req);

      console.log(`📹 Stream ingest started: ${streamId}`);

      // אנחנו לא סוגרים את ה-res כאן במידה והוא משמש כ-Pipe,
      // אבל כדאי לשלוח סטטוס ראשוני אם ה-Client מצפה לתגובה
      if (!res.headersSent) {
        res.status(200).json({ message: 'Stream ingestion started' });
      }
    } catch (error) {
      console.error(`❌ Controller Error: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  },
  // POST /api/streams
  async createStream(req, res) {
    try {
      const userId = req.user.id;
      const { title } = req.body;

      if (!title) {
        return res
          .status(400)
          .json({ error: 'חובה לספק כותרת (title) לסטרים' });
      }

      const stream = await streamService.createStream(userId, { title });
      res.status(201).json({ message: 'הסטרים נוצר בהצלחה', stream });
    } catch (error) {
      console.error('Create Stream Error:', error);
      if (error.message.includes('already have an active stream')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'שגיאה ביצירת הסטרים' });
    }
  },

  // PATCH /api/games/:id/status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      let { status, videoTimestamp } = req.body;
      const userId = req.user.id;

      if (status) status = status.trim().toUpperCase();

      const validStatuses = ['WAITING', 'ACTIVE', 'FINISHED', 'LIVE', 'PAUSE'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `סטטוס לא תקין: ${status}` });
      }

      let result;
      const io = req.app.get('io');

      // פיצול לוגיקה בין סטרים למשחק
      if (status === 'LIVE' || status === 'PAUSE') {
        result = await streamService.updateStreamStatus(
          id,
          userId,
          status,
          videoTimestamp
        );

        if (io) {
          const eventName =
            status === 'PAUSE' ? 'stream_paused' : 'status_update';
          io.to(id).emit(eventName, {
            id,
            status,
            videoTimestamp: videoTimestamp || null,
          });
        }
      } else {
        result = await gameService.updateGameStatus(id, userId, status);
        if (io) io.to(id).emit('status_update', { id, status });
      }

      res.status(200).json({ message: 'הסטטוס עודכן בהצלחה', data: result });
    } catch (error) {
      console.error('Update Status Error:', error);
      if (error.message.includes('not found'))
        return res.status(404).json({ error: 'לא נמצא' });
      if (error.message.includes('Unauthorized'))
        return res.status(403).json({ error: 'אין הרשאה' });
      res.status(500).json({ error: error.message || 'שגיאה בעדכון הסטטוס' });
    }
  },

  // POST /api/streams/:id/pause
  async pauseStream(req, res) {
    try {
      const { id } = req.params;
      const { videoTimestamp } = req.body;

      const result = await streamService.pauseStream(id, videoTimestamp);

      const io = req.app.get('io');
      if (io) {
        io.to(id).emit('stream_paused', {
          streamId: id,
          videoTimestamp,
          status: 'PAUSE',
        });
      }

      res
        .status(200)
        .json({ message: 'הסטרים הושהה', videoTimestamp, data: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // POST /api/streams/:id/resume
  async resumeStream(req, res) {
    try {
      const { id } = req.params;
      const result = await streamService.resumeStream(id);

      const io = req.app.get('io');
      if (io) {
        io.to(id).emit('stream_resumed', { streamId: id, status: 'LIVE' });
      }

      res.status(200).json({ message: 'השידור חודש', data: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default streamController;
