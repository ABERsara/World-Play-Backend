import questionService from '../services/question.service.js';

const questionController = {
  // POST /api/questions
  async addQuestion(req, res) {
    try {
      const userId = req.user.id;
      const { gameId, questionText, rewardType, options } = req.body;

      if (!gameId || !questionText) {
        return res
          .status(400)
          .json({ error: 'חסרים שדות חובה: gameId, questionText' });
      }

      if (!options || !Array.isArray(options) || options.length < 2) {
        return res
          .status(400)
          .json({ error: 'חובה לספק לפחות 2 אופציות לתשובה' });
      }

      const newQuestion = await questionService.createQuestion(gameId, userId, {
        questionText,
        rewardType,
        options,
      });

      res.status(201).json({
        message: 'השאלה נוספה בהצלחה',
        question: newQuestion,
      });
    } catch (error) {
      console.error('Add Question Error:', error);

      // טיפול בשגיאות שחוזרות מהסרוויס
      if (error.message === 'Game not found') {
        return res.status(404).json({ error: 'המשחק לא נמצא' });
      }
      // שגיאת הרשאות (מ-PermissionsService)
      if (
        error.message.includes('Permission denied') ||
        error.message.includes('Unauthorized')
      ) {
        return res.status(403).json({ error: error.message });
      }
      // שגיאת לוגיקה (משחק לא פעיל)
      if (error.message.includes('Action not allowed')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'שגיאה ביצירת השאלה' });
    }
  },
  // PATCH /api/questions/:id/resolve
  async resolveQuestion(req, res) {
    try {
      const { id } = req.params;
      const { optionId } = req.body;

      if (!optionId) {
        return res.status(400).json({ error: 'חובה לשלוח optionId' });
      }

      const updatedQuestion = await questionService.resolveQuestion(
        id,
        optionId
      );

      res.json({
        message: 'התשובה עודכנה והשאלה נסגרה',
        question: updatedQuestion,
      });
    } catch (error) {
      console.error('Resolve Question Error:', error);
      res.status(500).json({ error: 'שגיאה בעדכון התשובה' });
    }
  },
};

export default questionController;
