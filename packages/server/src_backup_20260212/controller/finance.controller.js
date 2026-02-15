import financeService from '../services/finance.service.js';

const financeController = {
  // POST /api/finance/card
  async addCreditCard(req, res) {
    try {
      const userId = req.user.id; // מגיע מה-Auth Middleware
      const { token, last4Digits, expDate, cvv, tz } = req.body;

      if (!token || !last4Digits || !expDate) {
        return res.status(400).json({
          error: 'חסרים פרטי כרטיס חובה (token, last4Digits, expDate)',
        });
      }

      const card = await financeService.saveCreditCard(userId, {
        token,
        last4Digits,
        expDate,
        cvv,
        tz,
      });

      res.status(201).json({ message: 'הכרטיס נשמר בהצלחה', card });
    } catch (error) {
      console.error('Save Card Error:', error);
      res.status(500).json({ error: 'שגיאה בשמירת הכרטיס' });
    }
  },

  // POST /api/finance/transaction
  async startTransaction(req, res) {
    try {
      const userId = req.user.id;
      const { type, amount, description, paymentMethod, last4Digits } =
        req.body;
      if (!amount || !type) {
        return res.status(400).json({ error: 'סכום וסוג פעולה הם חובה' });
      }

      const transaction = await financeService.createTransaction(userId, {
        type,
        amount,
        description,
        paymentMethod,
        last4Digits,
      });

      res.status(201).json({ message: 'הטרנזקציה נוצרה', transaction });
    } catch (error) {
      console.error('Transaction Error:', error);
      res.status(500).json({ error: 'שגיאה ביצירת הטרנזקציה' });
    }
  },
};

export default financeController;
