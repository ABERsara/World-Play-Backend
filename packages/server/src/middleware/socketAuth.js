import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const socketAuth = async (socket, next) => {
  console.log('🔒 AUTH: New socket connection attempt...'); // בדיקה 1

  // 1. קבלת הטוקן
  const token = socket.handshake.auth.token || socket.handshake.headers.token;

  if (!token) {
    console.log('❌ AUTH FAIL: No token provided');
    return next(new Error('Not authorized: No token provided'));
  }

  try {
    // 2. פענוח
    console.log('🔒 AUTH: Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔒 AUTH: Token valid, User ID:', decoded.id);

    // 3. שליפה מה-DB (כאן כנראה הבעיה!)
    console.log('🔒 AUTH: Searching user in DB...');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, isActive: true },
    });

    if (!user) {
      console.log('❌ AUTH FAIL: User not found in DB');
      return next(new Error('Not authorized: User not found'));
    }

    if (!user.isActive) {
      console.log('❌ AUTH FAIL: User is banned');
      return next(new Error('Not authorized: User is banned'));
    }

    console.log('✅ AUTH SUCCESS! Passing to connection handler.');
    socket.user = user;
    next();
  } catch (err) {
    console.log('❌ AUTH ERROR:', err.message); // זה ידפיס אם ה-DB לא זמין
    return next(new Error('Not authorized: Invalid token'));
  }
};
