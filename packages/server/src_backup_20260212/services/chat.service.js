// chat.service.js
import { PrismaClient } from '@prisma/client';
import * as gameRules from '../services/validation.service.js';
const prisma = new PrismaClient();

const chatService = {
  /**
   * שליפת היסטוריית צ'אט
   */
  async fetchChatHistory(myUserId, otherUserId) {
    await gameRules.ensureChatParticipantsExist(myUserId, otherUserId);

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
    gameRules.validateNonEmptyText(messageText, 'Message text');
    await gameRules.ensureChatParticipantsExist(senderId, receiverId);

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
