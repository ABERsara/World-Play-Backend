import streamService from '../services/stream.service.js';

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

      const stream = await streamService.createStream(userId, {
        title,
      });

      res.status(201).json({ message: 'הסטרים נוצר בהצלחה', stream });
    } catch (error) {
      console.error('Create Stream Error:', error);
      res.status(500).json({ error: 'שגיאה ביצירת הסטרים' });
    }
  },

  // PUT /api/streams/:id/status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['WAITING', 'LIVE', 'PAUSE', 'FINISHED'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          error: `סטטוס לא תקין. ערכים מותרים: ${validStatuses.join(', ')}`,
        });
      }

      const updatedStream = await streamService.updateStreamStatus(id, status);

      res.status(200).json({
        message: 'סטטוס הסטרים עודכן בהצלחה',
        stream: updatedStream,
      });
    } catch (error) {
      console.error('Update Stream Status Error:', error);
      if (error.code === 'P2025') {
        // קוד שגיאה של פריזמה ל"לא נמצא"
        return res.status(404).json({ error: 'סטרים לא נמצא' });
      }
      res.status(500).json({ error: 'שגיאה בעדכון סטטוס הסטרים' });
    }
  },
};

export default streamController;
