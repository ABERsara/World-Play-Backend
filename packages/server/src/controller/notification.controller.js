// ניהול התראות מערכת — שליפה, סימון כנקרא ויצירה פנימית מ-services
import notificationService from '../services/notification.service.js';

export const getMyNotifications = async (req, res) => {
  const userId = req.user?.id || req.query.userId;
  const { filter } = req.query;

  if (!userId) return res.status(400).json({ message: 'User ID is required' });

  try {
    const { notifications, unreadCount } =
      await notificationService.fetchUserNotifications(userId, filter);

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req, res) => {
  const { notificationId } = req.params;

  try {
    await notificationService.updateNotificationReadStatus(notificationId);
    res
      .status(200)
      .json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking as read:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to update notification' });
  }
};

export const createTestNotification = async (req, res) => {
  const { userId, content, type } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const newNotification = await notificationService.createNewNotification(
      userId,
      type || 'SYSTEM',
      content
    );
    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSystemNotification = async (userId, type, content) => {
  try {
    await notificationService.createNewNotification(userId, type, content);
    console.log(`Notification created for user ${userId}: ${content}`);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
