import { PrismaClient } from '@prisma/client';
import validationService from './validation.service.js'; // ייבוא ה-Validation

const prisma = new PrismaClient();

const notificationService = {
  /**
   * שליפת התראות למשתמש (עם אופציה לסינון)
   */
  async fetchUserNotifications(userId, filter) {
    // 1. ולידציה: האם המשתמש קיים?
    await validationService.ensureUserExists(userId);

    const whereCondition = {
      userId: userId,
    };

    if (filter === 'unread') {
      whereCondition.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereCondition,
      orderBy: { sendDate: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: userId, isRead: false },
    });

    return { notifications, unreadCount };
  },

  /**
   * סימון התראה כ"נקראה"
   */
  async updateNotificationReadStatus(notificationId) {
    // 1. ולידציה: האם ההתראה קיימת?
    await validationService.ensureNotificationExists(notificationId);

    return await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });
  },

  /**
   * יצירת התראה חדשה
   */
  async createNewNotification(userId, type, content) {
    // 1. ולידציה: האם המשתמש קיים?
    await validationService.ensureUserExists(userId);

    // 2. ולידציה: האם התוכן תקין? (שימוש בפונקציה הקיימת)
    validationService.validateNonEmptyText(content, 'Notification content');

    return await prisma.notification.create({
      data: {
        userId,
        type, // 'SYSTEM', 'GAME_INVITE', 'REWARD'
        content,
        isRead: false,
      },
    });
  },
};

export default notificationService;
