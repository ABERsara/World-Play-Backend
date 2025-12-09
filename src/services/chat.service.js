// chat.service.js
import { PrismaClient } from '@prisma/client';
import validationService from './validation.service.js'; // הייבוא של השירות
const prisma = new PrismaClient();

const chatService = {
  /**
   * שליפת היסטוריית צ'אט
   */
  async fetchChatHistory(myUserId, otherUserId) {
    await validationService.ensureChatParticipantsExist(myUserId, otherUserId);

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: myUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myUserId },
        ],
      },
      select: {
        id: true,
        messageText: true,
        createdAt: true,
        senderId: true,
        sender: {
          select: { username: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return messages.reverse();
  },

  /**
   * יצירת הודעה חדשה
   */
  async createChatMessage(senderId, receiverId, messageText) {
    validationService.validateNonEmptyText(messageText, 'Message text');
    await validationService.ensureChatParticipantsExist(senderId, receiverId);

    return await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        messageText,
        messageType: 'TEXT',
      },
    });
  },
};

export default chatService;
