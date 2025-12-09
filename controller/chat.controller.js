import * as chatService from '../services/chat.service.js'; // ייבוא הפונקציות מהשירות
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()

export const getChatHistory = async (req, res) => {
    const { otherUserId } = req.params; 
    const myUserId = req.query.myUserId; 

    if (!myUserId || !otherUserId) {
        return res.status(400).json({ success: false, message: "Missing user IDs" });
    }

    try {
        const history = await chatService.fetchChatHistory(myUserId, otherUserId);

        res.status(200).json({
            success: true,
            data: history,
        });

    } catch (error) {
        console.error('Error in getChatHistory:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve chat history.' });
    }
};



export const sendMessageAPI = async (req, res) => {
    const { senderId, receiverId, messageText } = req.body;

    if (!senderId || !receiverId || !messageText) {
         return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const newMessage = await chatService.createChatMessage(senderId, receiverId, messageText);
        
        res.status(201).json({ success: true, data: newMessage });

    } catch (error) {
        console.error('Error in sendMessageAPI:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};