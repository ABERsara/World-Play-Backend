import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validationService from './validation.service.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

const userService = {
  // ---------------------------------------------------------
  // 1. פונקציות הרשמה והתחברות (משתמשות ב-bcrypt, jwt)
  // ---------------------------------------------------------

  async createUser(name, username, email, plainPassword) {
    // ולידציות
    validationService.validateNonEmptyText(name, 'Name');
    validationService.validateNonEmptyText(username, 'Username');
    validationService.validateNonEmptyText(plainPassword, 'Password');
    await validationService.validateEmailIsUnique(email);

    // הצפנת סיסמה (שימוש ב-bcrypt)
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

    // בדיקת סיסמה (שימוש ב-bcrypt)
    const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('אימייל או סיסמה שגויים.');
    }

    // יצירת טוקן (שימוש ב-jwt וב-JWT_SECRET)
    const token = jwt.sign(
      { userId: user.id, userRole: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
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
   */
  async getUserProfile(userId) {
    await validationService.ensureUserExists(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        phoneNumber: true,
        firebaseId: true,
        isActive: true,
        createdAt: true,
        points: true,
      },
    });

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
