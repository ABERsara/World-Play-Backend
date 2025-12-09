import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// נניח שיש לנו שירות לאימות אסימונים (למשל, JWT)
// const getUserIdFromToken = (token) => { /* לוגיקת פיענוח JWT */ return 'mock-user-id'; };

export const initializeSocketIO = (httpServer) => {
  // הגדרת CORS כדי לאפשר חיבורים מה-Client
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // **שלב 1: אימות (בפרויקט אמיתי)**
    // כאן יש לבצע אימות באמצעות טוקן שנשלח ב-Headers או ב-Query
    // לדוגמה: const userId = getUserIdFromToken(socket.handshake.query.token);
    // אם האימות נכשל, ניתן לנתק: socket.disconnect();

    // --- 1. הצטרפות לחדר משחק (Room) ---
    // קליינט שולח: socket.emit('join_game', { gameId: 'uuid-123' })
    socket.on('join_game', ({ gameId }) => {
      if (gameId) {
        socket.join(gameId);
        console.log(`User ${socket.id} joined room: ${gameId}`);
        // TODO: לשלוח בחזרה היסטוריית צ'אט והודעת 'ברוך הבא'
      }
    });

    // --- 2. שליחת הודעה בצ'אט ---
    // קליינט שולח: socket.emit('send_message', { gameId: 'uuid', messageText: 'שלום' })
    socket.on('send_message', async (data) => {
      // ה-senderId צריך להגיע מהאימות בחיבור, לא מהקליינט!
      const { gameId, messageText } = data;
      const senderId = data.senderId || 'mock-sender-id'; // זמני, עד שתטמיע אימות אמיתי

      // 1. שמירה ב-DB (אסינכרוני)
      try {
        const newMessage = await prisma.chatMessage.create({
          data: {
            senderId: senderId,
            messageText: messageText,
            messageType: 'TEXT',
            // receiverId: null, // אם זה צ'אט קבוצתי, אפשר לשים null
          },
          select: {
            id: true,
            messageText: true,
            createdAt: true,
            sender: { select: { id: true, username: true } },
          },
        });

        // 2. שידור בזמן אמת לכל החדר (Room)
        if (gameId) {
          io.to(gameId).emit('new_message', newMessage);
        }
      } catch (error) {
        console.error('Error sending and saving message:', error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    // --- 3. ניתוק ---
    socket.on('disconnect', () => {
      console.log(`User Disconnected: ${socket.id}`);
    });
  });

  return io;
};
