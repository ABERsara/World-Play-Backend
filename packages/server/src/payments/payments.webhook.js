import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleWebhook = async (req, res) => {
  // קבלת החתימה של Stripe כדי לוודא שהבקשה אכן הגיעה מהם
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // בניית האירוע בצורה מאובטחת
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`❌ Webhook Signature failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // טיפול במקרה של תשלום שהצליח
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const userId = intent.metadata.userId; // ה-ID ששתלנו ב-createPaymentSheet

    console.log(`💰 [WEBHOOK] Payment Intent Succeeded for user: ${userId}`);

    try {
      // ביצוע עדכון היתרה בתוך טרנזקציה ב-Database
      const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }

        // חישוב המטבעות להוספה: ₪1 = 10 מטבעות. בונוס כפול (20) ברכישה ראשונה
        const multiplier = user.isFirstPurchase ? 20 : 10;
        const coinsToAdd = (intent.amount / 100) * multiplier;

        console.log(
          `🪙 [WEBHOOK] Adding ${coinsToAdd} coins (Multiplier: ${multiplier}x)`
        );

        // עדכון המשתמש: הוספת מטבעות וביטול סטטוס "רכישה ראשונה"
        return await tx.user.update({
          where: { id: userId },
          data: {
            walletCoins: { increment: coinsToAdd },
            isFirstPurchase: false,
          },
        });
      });

      // --- שליחת העדכון בזמן אמת לאפליקציה (Real-time Socket) ---
      const io = req.app.get('io'); // שליפת אובייקט ה-Socket.io ששמרנו ב-app.js

      if (io) {
        console.log(`🔌 [WEBHOOK] Sending real-time update to room: ${userId}`);
        // שליחת היתרה החדשה לחדר הפרטי של המשתמש
        io.to(userId).emit('wallet:updated', {
          newBalance: updatedUser.walletCoins,
        });
      } else {
        console.warn(
          '⚠️ [WEBHOOK] Socket.io instance (io) not found on req.app'
        );
      }
    } catch (error) {
      console.error('❌ [WEBHOOK] Database Update failed:', error.message);
    }
  }

  // החזרת תשובה חיובית ל-Stripe כדי שיפסיקו לשלוח את האירוע
  res.json({ received: true });
};
