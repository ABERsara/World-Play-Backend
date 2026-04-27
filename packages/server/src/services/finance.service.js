/**
 * finance.service.js
 *
 * שכבת השירות לניהול תשלומים וכרטיסי אשראי.
 * מטפל בשמירת אמצעי תשלום ויצירת רשומות טרנזקציה.
 *
 * IMPORTANT: קובץ זה עובד אך ורק עם טוקנים מספק התשלומים (לא נתוני כרטיס גולמיים).
 * CVV לעולם אינו נשמר — מפר תקן PCI-DSS.
 *
 * מתקשר עם: Prisma → CreditCard, Transaction
 * תלוי ב:   ספק תשלומים חיצוני (מחזיר token + last4Digits)
 * משמש את:  payment.controller.js
 */
import prisma from '../config/prisma.js';

const financeService = {
  async saveCreditCard(userId, { token, last4Digits, expDate, tz }) {
    return await prisma.creditCard.create({
      data: {
        userId,
        token,
        last4Digits,
        expDate,
        isDeleted: false,
        tz: tz || null,
      },
    });
  },

  async createTransaction(
    userId,
    { type, amount, description, paymentMethod, last4Digits }
  ) {
    return await prisma.transaction.create({
      data: {
        userId,
        type,
        amount,
        description,
        paymentMethod,
        last4Digits,
        status: 'PENDING',
      },
    });
  },
};

export default financeService;
