// // packages/server/src/utils/balanceSync.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// /**
//  * פונקציה לשליחת יתרות מעודכנות למשתמש בזמן אמת.
//  * הפונקציה מעדכנת גם את הארנק הכללי וגם את הניקוד הספציפי למשחק.
//  */
// export const syncUserBalances = async (io, userId, gameId) => {
//   try {
//     // 1. שליפה של יתרת הארנק העדכנית
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: { walletBalance: true },
//     });

//     if (!user) {
//       console.error(`[Sync Error] User ${userId} not found`);
//       return;
//     }

//     // 2. שליפת הניקוד הספציפי למשחק שבו בוצעה הפעולה
//     const participant = await prisma.gameParticipant.findUnique({
//       where: {
//         gameId_userId: { gameId, userId },
//       },
//       select: { score: true },
//     });

//     // לוג לצרכי פיתוח - עוזר לראות שהסנכרון עובד בטרמינל
//     console.log(
//       `[Socket Sync] User: ${userId} | Game: ${gameId} | Coins: ${user.walletBalance} | Score: ${participant?.score || 0}`
//     );

//     // 3. שידור העדכון דרך Socket.io
//     // אנחנו שולחים את ה-gameId כדי שהקליינט ידע איזה ניקוד לעדכן ב-Map שלו
//     io.to(userId).emit('balance_update', {
//       walletCoins: Number(user.walletBalance),
//       pointsInGame: participant ? Number(participant.score) : 0,
//       gameId: gameId, // <--- זה השדה שהוספנו עכשיו והוא קריטי!
//     });
//   } catch (error) {
//     // מניעת קריסת השרת במקרה של שגיאה בשאילתה
//     console.error('[Sync Error] Failed to sync balances:', error);
//   }
// };
// packages/server/src/utils/balanceSync.js

export const syncUserBalances = async (io, userId, gameId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
      select: { score: true },
    });

    // שידור ישיר לחדר הפרטי של המשתמש (userId)
    // ודאי שהקליינט הצטרף לחדר הזה ב-connection
    io.to(userId).emit('balance_update', {
      walletCoins: Number(user.walletBalance),
      pointsInGame: participant ? Number(participant.score) : 0,
      gameId: gameId,
    });

    console.log(
      `📡 [SYNC SENT] To User ${userId} | Balance: ${user.walletBalance}`
    );
  } catch (error) {
    console.error('[Sync Error]', error);
  }
};
