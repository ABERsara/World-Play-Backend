import gameService from '../services/game.service.js';

const gameController = {
  // POST /api/games
  async createGame(req, res) {
    try {
      // הנחה: המשתמש מזוהה דרך ה-Token
      const userId = req.user.id;
      const { title, description, streamId, moderatorId } = req.body;

      // ולידציה: חייבים כותרת ו-streamId כדי ליצור משחק
      if (!title || !streamId) {
        return res.status(400).json({
          error: 'חסרים שדות חובה: title, streamId',
        });
      }

      const game = await gameService.createGame(userId, {
        title,
        description,
        streamId,
        moderatorId,
      });
      res.status(201).json({ message: 'המשחק נוצר בהצלחה', game });
    } catch (error) {
      console.error('Create Game Error:', error);
      // טיפול חכם בשגיאות מפתח זר (P2003)
      if (error.code === 'P2003') {
        const fieldName = error.meta?.field_name || '';

        if (fieldName.includes('moderator_id')) {
          return res
            .status(404)
            .json({ error: 'המשתמש שצוין כמנחה (moderatorId) לא נמצא במערכת' });
        }
        if (fieldName.includes('stream_id')) {
          return res
            .status(404)
            .json({ error: 'הסטרים (streamId) שצוין לא קיים' });
        }
      }
      res.status(500).json({ error: 'שגיאה ביצירת המשחק' });
    }
  },

  // PATCH /api/games/:id/status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // ולידציה לסטטוסים המותרים למשחק
      const validStatuses = ['WAITING', 'ACTIVE', 'FINISHED'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          error: `סטטוס לא תקין. ערכים מותרים: ${validStatuses.join(', ')}`,
        });
      }

      const updatedGame = await gameService.updateGameStatus(id, status);

      res.status(200).json({ message: 'סטטוס המשחק עודכן', game: updatedGame });
    } catch (error) {
      console.error('Update Game Status Error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'משחק לא נמצא' });
      }
      res.status(500).json({ error: 'שגיאה בעדכון סטטוס המשחק' });
    }
  },
  // POST /api/games/:id/join
  async joinGame(req, res) {
    try {
      const { id } = req.params; // Game ID
      const userId = req.user.id;

      const { role } = req.body;
      // יש לוודא שה-role שנשלח הוא אחד מהערכים ב-Enum UserRole
      const validRoles = ['PLAYER', 'VIEWER', 'MODERATOR', 'HOST'];
      const assignedRole = role && validRoles.includes(role) ? role : 'PLAYER';

      const result = await gameService.joinGame(id, userId, assignedRole);

      if (result.alreadyJoined) {
        return res.status(200).json({
          message: 'המשתמש כבר רשום למשחק זה',
          participant: result.participant,
        });
      }

      res.status(201).json({
        message: 'הצטרפת למשחק בהצלחה!',
        participant: result.participant,
      });
    } catch (error) {
      console.error('Join Game Error:', error);

      if (error.message === 'Game not found') {
        return res.status(404).json({ error: 'המשחק לא נמצא' });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('Cannot join game')) {
        return res
          .status(409)
          .json({ error: 'המשחק כבר פעיל או הסתיים ולא ניתן להצטרף' });
      }

      res.status(500).json({ error: 'שגיאה בהצטרפות למשחק' });
    }
  },
};

export default gameController;
