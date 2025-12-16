import userService from '../services/user.service.js'; // ייבוא הסרביס

// --- שליפת פרטי המשתמש הנוכחי (GET /me) ---
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // שימוש בסרביס לשליפת הנתונים
    const user = await userService.getUserProfile(userId);

    res.json(user);
  } catch (error) {
    console.error(error);
    // אם המשתמש לא נמצא (למרות שה-Auth עבר), הסרביס יזרוק שגיאה
    res
      .status(500)
      .json({ message: error.message || 'שגיאה בשליפת פרטי משתמש' });
  }
};

// --- עדכון פרטים (PUT /me) ---
export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // שימוש בסרביס לעדכון
    const updatedUser = await userService.updateUserProfile(userId, req.body);

    res.json({ message: 'הפרטים עודכנו בהצלחה', user: updatedUser });
  } catch (error) {
    // טיפול בשגיאה הספציפית שהגדרנו בסרביס
    if (error.message === 'PHONE_EXISTS') {
      return res
        .status(400)
        .json({ message: 'מספר הטלפון כבר קיים במערכת למשתמש אחר' });
    }

    console.error(error);
    res.status(500).json({ message: 'שגיאה בעדכון פרטים' });
  }
};
