import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const userService = {

  // 1. לוגיקה ליצירת משתמש (רישום)
  // *** תיקון: הפונקציה מקבלת כעת 4 ארגומנטים: name, username, email, plainPassword ***
  async createUser(name, username, email, plainPassword) {
    
    // בדיקה ראשונית: האם המשתמש כבר קיים?
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('משתמש עם אימייל זה כבר קיים.');
    }

    // הצפנת הסיסמה
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // שמירה ב-DB באמצעות Prisma - הוספת השדה name ל-data
    const newUser = await prisma.user.create({
     data: {
        name, // *** הוספת name ל-Prisma Create ***
        username, // זה השדה ש-Prisma לא זיהה, ויזהה לאחר generate
        email,
        password: hashedPassword,
        role: 'PLAYER',
      },
      // הוספת name ל-select כדי שיוחזר ל-Controller
      select: { id: true, name: true, username: true, email: true, role: true } 
    });
    
    return newUser;
  },

  // 2. לוגיקה לאימות משתמש (התחברות)
  async authenticateUser(email, plainPassword) {
    
    // איתור משתמש
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('אימייל או סיסמה שגויים.');
    }

    // אימות הסיסמה
    const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('אימייל או סיסמה שגויים.');
    }

    // יצירת טוקן JWT
    const token = jwt.sign(
      { userId: user.id, userRole: user.role }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );

    // החזרת name גם כאן
    return { token, user: { id: user.id, name: user.name, username: user.username, role: user.role } };
  },

  // 3. שליפת משתמש לפי ID
  async getUserById(id) {
    const user = await prisma.user.findUnique({ 
        where: { id },
        // הוספת name ל-select
        select: { id: true, name: true, username: true, email: true, role: true, created_at: true }
    });
    
    if (!user) {
         throw new Error('משתמש לא נמצא.');
    }
    return user;
  }
};

export default userService;