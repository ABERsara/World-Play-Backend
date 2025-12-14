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
    // console.log('✅ Verify Success!'); // אפשר להשאיר או למחוק, לשיקולך

    req.user = decoded;
    next();
  } catch (error) {
    // התיקון: שימוש במשתנה error כדי שה-Linter לא יצעק
    console.error('Authentication Error:', error.message);

    return res.status(403).json({ message: 'טוקן לא תקף או פג תוקף' });
  }
};
