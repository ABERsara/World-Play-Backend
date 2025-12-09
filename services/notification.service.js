import * as chatService from '../services/chat.service.js'; // ייבוא הפונקציות מהשירות
import { PrismaClient } from '@prisma/client';

/**
 * שליפת התראות למשתמש (עם אופציה לסינון)
 */
export const fetchUserNotifications = async (userId, filter) => {

    const whereCondition = {
        userId: userId
    };


    if (filter === 'unread') {
        whereCondition.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
        where: whereCondition,
        orderBy: { sendDate: 'desc' },
        take: 20
    });

    const unreadCount = await prisma.notification.count({
        where: { userId: userId, isRead: false }
    });

    return { notifications, unreadCount };
};

/**
 * סימון התראה כ"נקראה"
 */
export const updateNotificationReadStatus = async (notificationId) => {
    return await prisma.notification.update({
        where: { id: notificationId },
        data: {
            isRead: true,
            readDate: new Date()
        }
    });
};

/**
 * יצירת התראה חדשה (משמש גם למערכת וגם לטסטים)
 */
export const createNewNotification = async (userId, type, content) => {
    return await prisma.notification.create({
        data: {
            userId,
            type, // 'SYSTEM', 'GAME_INVITE', 'REWARD'
            content,
            isRead: false
        }
    });
};