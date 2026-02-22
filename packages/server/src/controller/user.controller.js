import userService from '../services/user.service.js'; // ייבוא הסרביס

// packages/server/src/controllers/user.controller.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// packages/server/src/controllers/user.controller.js

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletBalance: true, // זה השם הנכון ב-Schema שלך!
        participations: {
          // שימי לב: ב-Schema זה נקרא participations ולא participants
          where: { game: { status: 'ACTIVE' } },
          select: { gameId: true, score: true },
        },
      },
    });

    if (!userProfile) return res.status(404).json({ message: 'משתמש לא נמצא' });

    const scoresByGame = {};
    // המרת רשימת ההשתתפויות למפת ניקוד
    userProfile.participations.forEach((p) => {
      scoresByGame[p.gameId] = Number(p.score);
    });

    // החזרת הנתונים לקליינט במבנה שהוא מכיר
    res.json({
      walletCoins: Number(userProfile.walletBalance),
      scoresByGame: scoresByGame,
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ message: 'שגיאה בשרת: ' + error.message });
  }
};
// --- עדכון פרטים (PUT /me) ---
export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // שימוש בסרביס לעדכון
    const updatedUser = await userService.updateUserProfile(userId, req.body);

    res.json({ message: 'הפרטים עודכנו בהצלחה', user: updatedUser });
  } catch (error) {
    // טיפול בשגיאה הספציפית שהגדרנו בסרביס
    if (error.message === 'PHONE_EXISTS') {
      return res
        .status(400)
        .json({ message: 'מספר הטלפון כבר קיים במערכת למשתמש אחר' });
    }

    console.error(error);
    res.status(500).json({ message: 'שגיאה בעדכון פרטים' });
  }
};
