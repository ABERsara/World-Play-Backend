import prisma from '../config/prisma.js';

const financeService = {
  // 1. שמירת כרטיס אשראי (רק טוקן ו-4 ספרות!)
  async saveCreditCard(userId, { token, last4Digits, expDate, cvv, tz }) {
    return await prisma.creditCard.create({
      data: {
        userId,
        token,
        last4Digits,
        expDate,
        isDeleted: false,
        cvv: cvv || null,
        tz: tz || null,
      },
    });
  },

  // 2. יצירת טרנזקציה חדשה (סטטוס PENDING)
  async createTransaction(
    userId,
    { type, amount, description, paymentMethod, last4Digits }
  ) {
    return await prisma.transaction.create({
      data: {
        userId,
        type, // ENUM: PURCHASE, GIFT, etc.
        amount,
        description,
        paymentMethod,
        last4Digits,
        status: 'PENDING', // תמיד מתחיל בהמתנה
      },
    });
  },

  // 3. הוספת נקודות ליוזר (פונקציה פנימית)
  // נקרא לזה כשהטרנזקציה תהפוך ל-SUCCESS
  // async addUserPoints(userId, amount, pointType, transactionId = null) {
  //   return await prisma.userPoint.create({
  //     data: {
  //       userId,
  //       amount,
  //       pointType, // ENUM: GAME, BONUS, PURCHASE...
  //       transactionId // אופציונלי: קישור לטרנזקציה
  //     }
  //   });
  // }
};

export default financeService;
