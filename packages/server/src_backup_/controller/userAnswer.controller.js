import userAnswerService from '../services/userAnswer.service.js';

const userAnswerController = {
  async submit(req, res) {
    try {
      const userId = req.user.id;
      const { questionId, selectedOptionId, wager } = req.body;

      if (!questionId || !selectedOptionId) {
        return res
          .status(400)
          .json({ error: 'חסרים שדות: questionId, selectedOptionId' });
      }

      const answer = await userAnswerService.submitAnswer(userId, {
        questionId,
        selectedOptionId,
        wager: wager || 0,
      });

      res.status(201).json({ message: 'התשובה התקבלה', answer });
    } catch (error) {
      console.error('Submit Answer Error:', error);
      res.status(400).json({ error: error.message });
    }
  },
};

export default userAnswerController;
