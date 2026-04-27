/**
 * user.service.js
 *
 * שכבת השירות לניהול משתמשים — רישום, אימות, ופרופיל.
 *
 * פונקציות:
 *   createUser(name, username, email, password) — רישום משתמש חדש עם hash לסיסמה
 *   authenticateUser(email, password)           — התחברות + הנפקת JWT
 *   getUserById(id)                             — שליפת משתמש לפי ID
 *   getUserProfile(userId)                      — פרופיל מלא (ארנק, נקודות, סטטוס)
 *   updateUserProfile(userId, updateData)       — עדכון phoneNumber / firebaseId
 *
 * מתקשר עם: Prisma → User
 * תלוי ב:   bcryptjs (hash סיסמה), jsonwebtoken (JWT), validation.service.js
 * משמש את:  user.controller.js, auth middleware
 *
 * TODO: JWT_SECRET — יש לוודא שמוגדר ב-ENV לפני הפעלה (אחרת הטוקן נחתם עם undefined)
 * TODO: expiresIn '30m' — קצר מאוד, כדאי לשקול refresh token mechanism
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validationService from './validation.service.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

const userService = {
  async createUser(name, username, email, plainPassword) {
    validationService.validateNonEmptyText(name, 'Name');
    validationService.validateNonEmptyText(username, 'Username');
    validationService.validateNonEmptyText(plainPassword, 'Password');
    await validationService.validateEmailIsUnique(email);

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    return await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        role: 'PLAYER',
      },
      select: { id: true, name: true, username: true, email: true, role: true },
    });
  },

  async authenticateUser(email, plainPassword) {
    const user = await validationService.ensureUserExistsByEmail(email);

    const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('אימייל או סיסמה שגויים.');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  },

  async getUserById(id) {
    return await validationService.ensureUserExists(id);
  },

  async getUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        walletBalance: true,
        isFirstPurchase: true,
        isActive: true,
        createdAt: true,
        points: true,
      },
    });
    if (!user) throw new Error('User not found');
    return user;
  },

  async updateUserProfile(userId, updateData) {
    await validationService.ensureUserExists(userId);

    const { phoneNumber, firebaseId } = updateData;

    try {
      return await prisma.user.update({
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
          walletBalance: true,
        },
      });
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
