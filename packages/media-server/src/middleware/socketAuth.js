import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const socketAuth = async (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.token;

  if (!token) {
    return next(new Error('Not authorized: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, isActive: true },
    });

    if (!user) return next(new Error('Not authorized: User not found'));
    if (!user.isActive) return next(new Error('Not authorized: User is banned'));

    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Not authorized: Invalid token'));
  }
};
