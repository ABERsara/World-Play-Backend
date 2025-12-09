import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const socketAuth = async (socket, next) => {
  // 1. קבלת הטוקן
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Not authorized: No token provided'));
  }

  try {
    // 2. פענוח ראשוני (בדיקה שהטוקן חתום ע"י השרת שלנו)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3.  בדיקה מול ה-DB: האם המשתמש באמת קיים? 🛑
    // אנו שולפים רק את השדות הנחוצים לביצועים מהירים
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        isActive: true,
      },
    });

    // אם המשתמש נמחק מה-DB או לא נמצא
    if (!user) {
      return next(new Error('Not authorized: User not found'));
    }

    // אם המשתמש חסום
    if (!user.isActive) {
      return next(new Error('Not authorized: User is banned'));
    }

    // 4. הכל תקין! מצמידים את המשתמש ה"אמיתי" מה-DB לסוקט
    socket.user = user;
    next();
  } catch (err) {
    // שגיאה יכולה לנבוע מטוקן פג תוקף או בעיה ב-DB
    console.error('Socket Auth Error:', err.message);
    return next(new Error('Not authorized: Invalid token'));
  }
};
