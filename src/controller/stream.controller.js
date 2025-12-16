import streamService from '../services/stream.service.js';
import gameService from '../services/game.service.js'; // חובה להוסיף את הייבוא הזה!

const streamController = {
  // POST /api/streams
  async createStream(req, res) {
    try {
      // הנחה: יש Middleware של Auth ששם את המשתמש ב-req.user
      const userId = req.user.id;
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({
          error: 'חובה לספק כותרת (title) לסטרים',
        });
      }

      const stream = await streamService.createStream(userId, { title });
      res.status(201).json({ message: 'הסטרים נוצר בהצלחה', stream });
    } catch (error) {
      console.error('Create Stream Error:', error);

      // טיפול בשגיאת "יש לך כבר סטרים פעיל"
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
      let { status } = req.body;
      const userId = req.user.id;

      if (status) status = status.trim().toUpperCase();

      const validStatuses = ['WAITING', 'ACTIVE', 'FINISHED', 'LIVE', 'PAUSE'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          error: `סטטוס לא תקין. קיבלתי: "${status}".`,
        });
      }

      let result;

      // לוגיקה חכמה: אם זה סטטוס של סטרים, פנה ל-streamService. אם של משחק, ל-gameService.
      if (status === 'LIVE' || status === 'PAUSE') {
        result = await streamService.updateStreamStatus(id, userId, status);
      } else {
        result = await gameService.updateGameStatus(id, userId, status);
      }

      // Socket.io (לפי ה-ID שקיבלנו)
      const io = req.app.get('io');
      if (io) {
        io.to(id).emit('status_update', {
          status: result.status,
          id: result.id,
        });
      }

      res.status(200).json({
        message: 'הסטטוס עודכן בהצלחה',
        data: result,
      });
    } catch (error) {
      console.error('Update Status Error:', error);

      // זה ימנע את השגיאה הכללית ויראה לך מה הבעיה האמיתית בטרמינל
      if (error.message.includes('not found'))
        return res.status(404).json({ error: 'לא נמצא' });
      if (error.message.includes('Unauthorized'))
        return res.status(403).json({ error: 'אין הרשאה' });

      res
        .status(500)
        .json({ error: error.message || 'שגיאה פנימית בעדכון הסטטוס' });
    }
  },
};

export default streamController;
