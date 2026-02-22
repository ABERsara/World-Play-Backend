// packages/server/src/controllers/userAnswer.controller.js
import userAnswerService from '../services/userAnswer.service.js';
import { SubmitAnswerSchema } from '../../../shared/src/index.js';

const userAnswerController = {
  async submit(req, res) {
    try {
      // 1. ולידציה של גוף הבקשה באמצעות Zod
      // זה מוודא ש-questionId ו-selectedOptionId הם UUID ושה-wager חיובי
      const validatedData = SubmitAnswerSchema.parse(req.body);

      const userId = req.user.id;

      // 2. קבלת ה-io (Socket Server) מתוך ה-app
      // זה קריטי כדי שנוכל לשלוח את ה-balance_update למשתמש
      const io = req.app.get('io');

      // 3. קריאה ל-Service לביצוע הטרנזקציה והסנכרון
      const answer = await userAnswerService.submitAnswer(
        io,
        userId,
        validatedData
      );

      // 4. החזרת תשובה חיובית
      return res.status(201).json({
        message: 'התשובה נשמרה והיתרה עודכנה בהצלחה',
        answer,
      });
    } catch (error) {
      // 5. טיפול בשגיאות
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'נתונים לא תקינים',
          details: error.errors,
        });
      }

      // שגיאות לוגיקה (כמו "אין מספיק כסף") יקבלו קוד 402 (Payment Required) או 400
      console.error(`[Answer Controller Error]: ${error.message}`);
      return res.status(402).json({ error: error.message });
    }
  },
};

export default userAnswerController;
