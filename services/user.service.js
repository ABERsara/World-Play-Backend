import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const userService = {
  async createUser(name, username, email, plainPassword) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('משתמש עם אימייל זה כבר קיים.');
    }

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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('אימייל או סיסמה שגויים.');
    }

    const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('אימייל או סיסמה שגויים.');
    }

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
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new Error('משתמש לא נמצא.');
    }
    return user;
  },
};

export default userService;
