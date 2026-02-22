import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentSheet = async (userId, coins) => {
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

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });

    customerId = customer.id;

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const pricePerCoin = 1;
  const totalPrice = coins * pricePerCoin;

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: '2022-11-15' }
  );

  const idempotencyKey = `purchase-${userId}-${coins}-${Date.now()}`;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: totalPrice * 100,
      currency: 'ils',
      customer: customerId,
      metadata: {
        userId,
        coins: String(coins),
      },
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey }
  );

  return {
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customerId,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  };
};
