// Webhook של Stripe — מאזין לאישור תשלום, מעדכן ארנק ושולח התראה בזמן אמת
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleWebhook = async (req, res) => {
  console.log('Webhook hit! Event type:', req.body.type);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log(
    '📬 Full Event Data:',
    JSON.stringify(event.data.object.metadata)
  );
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;

    const userId = intent.metadata?.userId;
    const baseCoins = Number(intent.metadata?.coins);

    console.log('WEBHOOK RECEIVED:');
    console.log('userId:', userId);
    console.log('coins:', baseCoins);

    if (!userId || isNaN(baseCoins)) {
      console.error('Missing or invalid metadata');
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
        `SUCCESS: User ${userId} now has ${result.walletBalance} coins`
      );
      const io = req.app.get('io');
      if (io) {
        // המרת Decimal של Prisma ל-Number
        const balanceToSend =
          typeof result.walletBalance === 'object'
            ? parseFloat(result.walletBalance)
            : result.walletBalance;

        console.log(`Emitting wallet update to user ${userId}:`, balanceToSend);

        io.to(userId).emit('wallet:updated', {
          newBalance: balanceToSend,
          timestamp: new Date().toISOString(),
          source: 'payment_webhook',
        });

        console.log('✅ Socket event emitted successfully');
      } else {
        console.warn('Socket.IO instance not found - real-time update skipped');
      }

      res.status(200).json({
        received: true,
        userId,
        newBalance: result.walletBalance,
      });
    } catch (error) {
      console.error('WEBHOOK ERROR:', error.message);
      return res.status(500).json({ error: 'Internal processing error' });
    }
  } else {
    console.log(`ℹUnhandled event type: ${event.type}`);
    res.json({ received: true });
  }
};
