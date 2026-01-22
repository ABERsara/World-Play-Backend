import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const userId = intent.metadata.userId;
    const amountPaid = intent.amount / 100;

    // ביצוע עדכון מאובטח בתוך טרנזקציה
    await prisma.$transaction(async (tx) => {
      // שליפת מצב המשתמש הנוכחי מה-DB
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { isFirstPurchase: true },
      });

      if (!user) throw new Error('User not found');

      // חישוב המטבעות: יחס בסיסי של 10, ופי 2 אם זו רכישה ראשונה
      const baseRate = 10;
      const bonusMultiplier = user.isFirstPurchase ? 2 : 1;
      const coinsToAdd = amountPaid * baseRate * bonusMultiplier;

      // עדכון היתרה וביטול זכאות לבונוס עתידי
      await tx.user.update({
        where: { id: userId },
        data: {
          walletCoins: { increment: coinsToAdd },
          isFirstPurchase: false,
        },
      });

      // תיעוד הפעולה בטבלת טרנזקציות
      //   await tx.transaction.create({
      //     data: {
      //       userId: userId,
      //       type: 'PURCHASE',
      //       status: 'SUCCESS',
      //       amount: coinsToAdd,
      //       currency: 'COIN',
      //       stripePaymentId: intent.id
      //     },
      //   });
      // });

      await tx.transaction.create({
        data: {
          userId: userId,
          type: 'PURCHASE',
          status: 'SUCCESS',
          amount: coinsToAdd,
          currency: 'COIN',
          // הסירי או הגיבי את השורה הזו:
          // stripePaymentId: intent.id
        },
      });
    });
  }
  res.json({ received: true });
};
