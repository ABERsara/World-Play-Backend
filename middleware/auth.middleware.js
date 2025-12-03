import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  // תיקון קריטי: שליפת הסוד בתוך הפונקציה
  // זה מבטיח שהמשתנה נטען נכון גם אם קובץ ה-env נטען באיחור
  const JWT_SECRET = process.env.JWT_SECRET;

  const authHeader = req.headers['authorization'];

  console.log('------------------------------------------------');
  console.log('🔍 Debug Auth:');
  console.log(
    '🔑 Secret active:',
    JWT_SECRET ? 'Yes (Exists)' : 'No (Undefined)'
  );
  console.log('1. Header:', authHeader);

  if (!authHeader) {
    console.log('❌ No Header');
    return res.status(401).json({ message: 'גישה נדחתה: לא סופק טוקן' });
  }

  // חילוץ הטוקן (הסרת המילה Bearer)
  const token = authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ Token Format Wrong');
    return res.status(401).json({ message: 'מבנה טוקן לא תקין' });
  }

  try {
    // האימות בפועל
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Verify Success!');

    // הוספת פרטי המשתמש לבקשה
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Verify Failed:', error.message);
    return res.status(403).json({ message: 'טוקן לא תקף או פג תוקף' });
  }
};
