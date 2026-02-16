import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validationService from './validation.service.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

const userService = {
  async createUser(name, username, email, plainPassword) {
    // ולידציות
    validationService.validateNonEmptyText(name, 'Name');
    validationService.validateNonEmptyText(username, 'Username');
    validationService.validateNonEmptyText(plainPassword, 'Password');
    await validationService.validateEmailIsUnique(email);

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        role: 'PLAYER',
      },
      select: { id: true, name: true, username: true, email: true, role: true },
    });

    return newUser;
  },

  async authenticateUser(email, plainPassword) {
    // בדיקת קיום משתמש
    const user = await validationService.ensureUserExistsByEmail(email);

    const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('אימייל או סיסמה שגויים.');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, // ⬅️ שים לב ששיניתי ל-id (לא userId)
      JWT_SECRET,
      { expiresIn: '30m' } // ⬅️ שים לב לזמן
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email, // ⬅️ הוספתי email
        role: user.role,
      },
    };
  },

  async getUserById(id) {
    return await validationService.ensureUserExists(id);
  },

  // ---------------------------------------------------------
  // 2. פונקציות פרופיל (החדשות)
  // ---------------------------------------------------------

  /**
   * שליפת פרופיל מלא למשתמש (עבור getMe)
   * 🔥 תוקן: כעת כולל walletCoins ו-isFirstPurchase
   */
  async getUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        walletBalance: true, // שימוש בשם השדה הנכון
        isFirstPurchase: true,
        isActive: true,
      },
    });
    if (!user) throw new Error('User not found');
    return user;
  },

  /**
   * עדכון פרטי משתמש
   */
  async updateUserProfile(userId, updateData) {
    await validationService.ensureUserExists(userId);

    const { phoneNumber, firebaseId } = updateData;

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          phoneNumber: phoneNumber || undefined,
          firebaseId: firebaseId || undefined,
        },
        select: {
          id: true,
          username: true,
          phoneNumber: true,
          firebaseId: true,
          walletCoins: true, // ⬅️ גם כאן כדאי להחזיר
        },
      });

      return updatedUser;
    } catch (error) {
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('phoneNumber')
      ) {
        throw new Error('PHONE_EXISTS');
      }
      throw error;
    }
  },
};

export default userService;
