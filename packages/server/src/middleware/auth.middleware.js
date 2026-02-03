import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'גישה נדחתה: לא סופק טוקן' });
  }

  // חילוץ הטוקן (הסרת המילה Bearer)
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'מבנה טוקן לא תקין' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 🔥 התוספת החשובה: תמיכה בשני פורמטים של JWT
    const userId = decoded.id || decoded.userId;

    req.user = {
      ...decoded,
      id: userId, // וידוא שיש תמיד שדה id
    };

    console.log('✅ Token verified for user:', userId);
    next();
  } catch (error) {
    console.error('❌ Authentication Error:', error.message);

    // זיהוי מיוחד אם הטוקן פג תוקף
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'טוקן פג תוקף',
        expired: true,
      });
    }

    return res.status(403).json({ message: 'טוקן לא תקף או פג תוקף' });
  }
};
