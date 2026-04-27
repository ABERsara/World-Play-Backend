// ניהול פרופיל המשתמש — שליפת יתרה וניקוד, עדכון פרטים אישיים
import userService from '../services/user.service.js';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletBalance: true,
        participations: {
          where: { game: { status: 'ACTIVE' } },
          select: { gameId: true, score: true },
        },
      },
    });

    if (!userProfile) return res.status(404).json({ message: 'משתמש לא נמצא' });

    const scoresByGame = {};
    userProfile.participations.forEach((p) => {
      scoresByGame[p.gameId] = Number(p.score);
    });

    res.json({
      walletCoins: Number(userProfile.walletBalance),
      scoresByGame: scoresByGame,
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ message: 'שגיאה בשרת: ' + error.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await userService.updateUserProfile(userId, req.body);

    res.json({ message: 'הפרטים עודכנו בהצלחה', user: updatedUser });
  } catch (error) {
    if (error.message === 'PHONE_EXISTS') {
      return res
        .status(400)
        .json({ message: 'מספר הטלפון כבר קיים במערכת למשתמש אחר' });
    }

    console.error(error);
    res.status(500).json({ message: 'שגיאה בעדכון פרטים' });
  }
};
