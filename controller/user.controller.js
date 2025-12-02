import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// --- שליפת פרטי המשתמש הנוכחי (GET /me) ---
// שימוש ב-export const
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

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
        points: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    res.json(user);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'שגיאה בשליפת פרטי משתמש' });
  }
};

// --- עדכון פרטים (PUT /me) ---
// שימוש ב-export const
export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phoneNumber, firebaseId } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber: phoneNumber || undefined,
        firebaseId: firebaseId || undefined
      },
      select: {
        id: true,
        username: true,
        phoneNumber: true,
        firebaseId: true
      }
    });

    res.json({ message: 'הפרטים עודכנו בהצלחה', user: updatedUser });

  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('phoneNumber')) {
      return res.status(400).json({ message: 'מספר הטלפון כבר קיים במערכת למשתמש אחר' });
    }
    console.error(error);
    res.status(500).json({ message: 'שגיאה בעדכון פרטים' });
  }
};