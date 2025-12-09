import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const fetchChatHistory = async (myUserId, otherUserId) => {
    const messages = await prisma.chatMessage.findMany({
        where: {
            OR: [
                { senderId: myUserId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: myUserId }
            ]
        },
        select: {
            id: true,
            messageText: true,
            createdAt: true,
            senderId: true,
            sender: {
                select: { username: true }
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 50
    });

    return messages.reverse();
};


export const createChatMessage = async (senderId, receiverId, messageText) => {
    return await prisma.chatMessage.create({
        data: {
            senderId,
            receiverId,
            messageText,
            messageType: 'TEXT'
        }
    });
};