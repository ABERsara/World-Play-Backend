import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
/**
 * @desc טוען היסטוריית הודעות פרטיות בין שני משתמשים
 * @route GET /api/chat/history/:otherUserId
 */
export const getChatHistory = async (req, res) => {
  // 1. במקום gameId, אנחנו מקבלים את ה-ID של מי שאנחנו מדברים איתו
  const { otherUserId } = req.params;

  // 2. אנחנו צריכים לדעת מי "אני" (המשתמש שמבקש את ההודעות)
  // כרגע ניקח את זה מה-Query, בפרודקשן זה יבוא מה-Token
  const myUserId = req.query.myUserId;

  if (!myUserId || !otherUserId) {
    return res
      .status(400)
      .json({ success: false, message: 'Missing user IDs' });
  }

  try {
    // 3. שליפת ההודעות - השינוי הגדול כאן
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          // אופציה א': אני שלחתי והוא קיבל
          { senderId: myUserId, receiverId: otherUserId },
          // אופציה ב': הוא שלח ואני קיבלתי
          { senderId: otherUserId, receiverId: myUserId },
        ],
      },
      select: {
        id: true,
        messageText: true,
        createdAt: true,
        senderId: true, // חשוב כדי לדעת בצד לקוח אם ההודעה שלי או שלו
        sender: {
          select: { username: true }, // רק השם, לא צריך את כל הפרטים
        },
      },
      orderBy: {
        createdAt: 'desc', // מהחדש לישן
      },
      take: 50, // מגבלת הודעות
    });

    // הופכים חזרה כדי להציג בסדר הגיוני בצ'אט (ישן למעלה, חדש למטה)
    const reversedMessages = messages.reverse();

    res.status(200).json({
      success: true,
      data: reversedMessages,
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to retrieve chat history.' });
  }
};

// פונקציה חדשה: שליחת הודעה (כדי שנוכל לבדוק ב-Postman)
export const sendMessageAPI = async (req, res) => {
  const { senderId, receiverId, messageText } = req.body;

  try {
    const newMessage = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        messageText,
        messageType: 'TEXT',
      },
    });
    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
