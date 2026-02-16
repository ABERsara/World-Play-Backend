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
    console.error('❌ Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;

    const userId = intent.metadata?.userId;
    const baseCoins = Number(intent.metadata?.coins);

    console.log('🔍 WEBHOOK RECEIVED:');
    console.log('userId:', userId);
    console.log('coins:', baseCoins);

    if (!userId || isNaN(baseCoins)) {
      console.error('❌ Missing or invalid metadata');
      return res.status(400).json({ error: 'Missing required metadata' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new Error(`User ${userId} not found`);
        }

        const isFirst = user.isFirstPurchase;

        const coinsToAdd = isFirst ? baseCoins * 2 : baseCoins;

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            walletBalance: { increment: coinsToAdd },
            isFirstPurchase: false,
          },
        });

        await tx.transaction.create({
          data: {
            userId,
            type: 'PURCHASE',
            status: 'SUCCESS',
            amount: coinsToAdd,
            currency: 'COIN',
            description: isFirst ? 'בונוס רכישה ראשונה (פי 2)' : 'רכישת מטבעות',
            metadata: {
              stripePaymentIntentId: intent.id,
              isFirstPurchase: isFirst,
              baseCoins,
              amountPaid: intent.amount / 100,
            },
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: 'הטעינה הצליחה! 💰',
            message: `נוספו לחשבונך ${coinsToAdd} מטבעות.${
              isFirst ? ' כולל בונוס רכישה ראשונה!' : ''
            }`,
          },
        });

        return updatedUser;
      });

      console.log(
        `✅ SUCCESS: User ${userId} now has ${result.walletBalance} coins`
      );

      // handleWebhook.js

      const io = req.app.get('io');
      if (io) {
        io.to(userId).emit('balance_update', {
          walletBalance: Number(result.walletBalance),
          scoresByGame: {},
        });
      }
    } catch (error) {
      console.error('❌ WEBHOOK ERROR:', error.message);
      return res.status(500).json({ error: 'Internal processing error' });
    }
  }

  res.json({ received: true });
};
