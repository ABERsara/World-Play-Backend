import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentSheet = async (userId, amount) => {
  // 1. מוצאים את המשתמש
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // 2. ניהול לקוח (Customer Management)
  // בודקים אם כבר יש למשתמש מזהה לקוח בסטריפ, אם לא - יוצרים אחד ושומרים ב-DB
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  // 3. יצירת Ephemeral Key (מפתח זמני)
  // זה מאפשר לאפליקציה (Frontend) לגשת לפרטי הלקוח בצורה מאובטחת
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: '2025-12-15.clover' } // השתמשי בגרסה שמופיעה לך בטרמינל
  );

  // 4. יצירת Payment Intent עם Idempotency Key
  // ה-Idempotency Key מונע חיוב כפול אם המשתמש לחץ פעמיים בטעות
  const idempotencyKey = `pay_${userId}_${Date.now()}`;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amount * 100,
      currency: 'ils',
      customer: customerId, // מקשרים את התשלום ללקוח שיצרנו
      metadata: {
        userId: userId,
        isFirstPurchase: String(user.isFirstPurchase),
      },
      // מאפשר לסטריפ לשמור את הכרטיס לעתיד במידה ותרצי
      automatic_payment_methods: { enabled: true },
    },
    {
      idempotencyKey, // הגנה נגד כפילויות
    }
  );

  // 5. מחזירים את כל הנתונים שה-Payment Sheet צריך
  return {
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customerId,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  };
};
