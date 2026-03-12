import inboxService from '../services/inbox.service.js';

const inboxController = {
  /**
   * שליפת כל פריטי ה-Inbox עבור המשתמש המחובר
   */
  getInbox: async (req, res) => {
    try {
      const userId = req.user.id;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;

      const result = await inboxService.getMyInbox(userId, page, limit);

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page,
          limit,
          hasMore: result.hasMore,
          total: result.totalCount,
        },
      });
    } catch (error) {
      // כאן הוספתי את השימוש ב-error כדי לעבור את ה-Husky
      console.error('[INBOX_CONTROLLER_GET_ERROR]', error.message);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת ה-Inbox',
      });
    }
  },

  /**
   * סימון פריט ספציפי כ"נקרא"
   */
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const { type } = req.body;
      const userId = req.user.id;

      if (!id || !type) {
        return res.status(400).json({
          success: false,
          message: 'חסרים פרמטרים לביצוע הפעולה (id או type)',
        });
      }

      await inboxService.markItemAsRead(id, type, userId);

      return res.status(200).json({
        success: true,
        message: 'הפריט סומן כנקרא בהצלחה',
      });
    } catch (error) {
      console.error('[INBOX_CONTROLLER_MARK_ERROR]', error.message);

      if (error.message.includes('Record to update not found')) {
        return res.status(404).json({
          success: false,
          message: 'הפריט לא נמצא במערכת',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'שגיאה בסימון הפריט כנקרא',
      });
    }
  },
};

export default inboxController;
