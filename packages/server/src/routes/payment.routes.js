import express from 'express';
import { createPaymentSheet } from '../payments/payments.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.post('/create-sheet', async (req, res) => {
  try {
    const { userId, coins } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!coins || coins <= 0) {
      return res.status(400).json({ error: 'Valid coins amount is required' });
    }

    const result = await createPaymentSheet(userId, coins);
    res.json(result);
  } catch (error) {
    console.error('Payment sheet creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
