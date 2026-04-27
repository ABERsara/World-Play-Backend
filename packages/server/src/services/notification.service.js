/**
 * notification.service.js
 *
 * שכבת השירות לניהול התראות מערכת למשתמשים.
 * מטפל ביצירה, שליפה וסימון קריאה של התראות.
 *
 * פונקציות:
 *   fetchUserNotifications(userId, filter)          — שליפת התראות + ספירת לא-נקראות (filter: 'unread' | undefined)
 *   updateNotificationReadStatus(notificationId)    — סימון התראה כנקראה
 *   createNewNotification(userId, type, content)    — יצירת התראה חדשה ('SYSTEM' | 'GAME_INVITE' | 'REWARD')
 *
 * מתקשר עם: Prisma → Notification
 * תלוי ב:   validation.service.js (קיום משתמש, קיום התראה, ולידציית טקסט)
 * משמש את:  notification.controller.js
 *
 * TODO: updateNotificationReadStatus צריך לקבל userId ולוודא בעלות לפני עדכון
 */
import { PrismaClient } from '@prisma/client';
import * as gameRules from '../services/validation.service.js';

const prisma = new PrismaClient();

const notificationService = {
  async fetchUserNotifications(userId, filter) {
    await gameRules.ensureUserExists(userId);

    const whereCondition = { userId };
    if (filter === 'unread') {
      whereCondition.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereCondition,
        orderBy: { sendDate: 'desc' },
        take: 20,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  },

  async updateNotificationReadStatus(notificationId) {
    await gameRules.ensureNotificationExists(notificationId);

    return await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readDate: new Date(),
      },
    });
  },

  async createNewNotification(userId, type, content) {
    await gameRules.ensureUserExists(userId);
    gameRules.validateNonEmptyText(content, 'Notification content');

    return await prisma.notification.create({
      data: {
        userId,
        type,
        content,
        isRead: false,
      },
    });
  },
};

export default notificationService;
