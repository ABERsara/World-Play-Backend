// הגשת תשובות לשאלות — ולידציה עם Zod, טרנזקציה כלכלית וסנכרון ארנק
import userAnswerService from '../services/userAnswer.service.js';
import { SubmitAnswerSchema } from '../../../shared/src/index.js';

const userAnswerController = {
  async submit(req, res) {
    try {
      const validatedData = SubmitAnswerSchema.parse(req.body);

      const userId = req.user.id;

      const io = req.app.get('io');

      const answer = await userAnswerService.submitAnswer(
        io,
        userId,
        validatedData
      );

      return res.status(201).json({
        message: 'התשובה נשמרה והיתרה עודכנה בהצלחה',
        answer,
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'נתונים לא תקינים',
          details: error.errors,
        });
      }

      // 402 לשגיאות תשלום (אין מספיק כסף)
      console.error(`[Answer Controller Error]: ${error.message}`);
      return res.status(402).json({ error: error.message });
    }
  },
};

export default userAnswerController;
