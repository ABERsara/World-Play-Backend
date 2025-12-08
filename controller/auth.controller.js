import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_dont_use_in_prod';

// Named Export: export const register
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'כתובת האימייל כבר קיימת במערכת' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'VIEWER',
        isActive: true,
      },
    });

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.status(201).json({
      message: 'ההרשמה בוצעה בהצלחה',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'שגיאת שרת בעת ההרשמה' });
  }
};

// Named Export: export const login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'אימייל או סיסמה שגויים' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'החשבון שלך חסום או לא פעיל. אנא צור קשר עם התמיכה.',
      });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'אימייל או סיסמה שגויים' });
      }
    } else {
      return res
        .status(400)
        .json({ message: 'אנא התחבר באמצעות חשבון Google/Facebook' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.json({
      message: 'התחברות מוצלחת',
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'שגיאת שרת בעת ההתחברות' });
  }
};
