import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentSheet = async (userId, amount) => {
  // 1. מוצאים את המשתמש ובודקים אם הוא זכאי לבונוס
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
      isFirstPurchase: true,
    },
  });

  if (!user) throw new Error('User not found');

  // 2. ניהול לקוח (Customer Management)
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

  // 3. יצירת Ephemeral Key (מפתח זמני מאובטח)
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: '2022-11-15' } // ודאי שזו הגרסה שנתמכת אצלך
  );

  // 4. יצירת Payment Intent
  // ה-Metadata כאן קריטי! הוא עובר ל-Webhook כדי שנדע למי לתת את הבונוס
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // המרה לאגורות
    currency: 'ils',
    customer: customerId,
    metadata: {
      userId: userId, // חשוב מאוד עבור ה-Webhook
      isFirstPurchase: String(user.isFirstPurchase), // לצורך בדיקת הבונוס הכפול
    },
    automatic_payment_methods: { enabled: true },
  });

  // 5. מחזירים ל-Frontend את כל המפתחות הדרושים להפעלת ה-Sheet
  return {
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customerId,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  };
};
