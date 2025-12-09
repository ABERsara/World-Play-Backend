import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1. קבלת כל ההתראות של המשתמש (למשל: כדי להציג "פעמון" באפליקציה)
export const getMyNotifications = async (req, res) => {
  const userId = req.user?.id || req.query.userId;
  // אנחנו בודקים אם נשלח פרמטר סינון בכתובת
  const { filter } = req.query;

  if (!userId) return res.status(400).json({ message: 'User ID is required' });

  try {
    // בניית תנאי החיפוש בצורה דינמית
    const whereCondition = {
      userId: userId,
    };

    // רק אם ביקשת במפורש 'unread', נוסיף את הסינון
    if (filter === 'unread') {
      whereCondition.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereCondition, // משתמשים בתנאי שבנינו למעלה
      orderBy: { sendDate: 'desc' },
      take: 20,
    });

    // הספירה של "כמה לא נקראו" תמיד תישאר אותו דבר (כדי להציג את המספר האדום)
    const unreadCount = await prisma.notification.count({
      where: { userId: userId, isRead: false },
    });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// 2. סימון התראה כ"נקראה" (כשלוחצים עליה)
export const markAsRead = async (req, res) => {
  const { notificationId } = req.params;

  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });

    res
      .status(200)
      .json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to update notification' });
  }
};

// 3. (פנימי) פונקציית עזר ליצירת התראה - נשתמש בה כשמישהו שולח הודעה או מזמין למשחק
export const createSystemNotification = async (userId, type, content) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type, // 'SYSTEM', 'GAME_INVITE', 'REWARD'
        content,
      },
    });
    // כאן בעתיד תוסיפי socket.io כדי להקפיץ הודעה בזמן אמת
    console.log(`Notification created for user ${userId}: ${content}`);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// פונקציה זמנית לבדיקות - יצירת התראה ידנית
export const createTestNotification = async (req, res) => {
  const { userId, content, type } = req.body;

  try {
    const newNotification = await prisma.notification.create({
      data: {
        userId: userId,
        content: content,
        type: type || 'SYSTEM', // ברירת מחדל
        isRead: false,
      },
    });
    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
