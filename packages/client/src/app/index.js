import React, { useState } from 'react';
import LoginScreen from '../screens/LoginScreen';
import BroadcastScreen from '../screens/BroadcastScreen';
import ViewerScreen from '../screens/ViewerScreen';

export default function Page() {
  const [user, setUser] = useState(null);

  // פונקציה שתופעל לאחר התחברות מוצלחת
  const handleLoginSuccess = (userData) => {
    setUser(userData); // userData מכיל את ה-role
  };

  // 1. אם המשתמש עדיין לא התחבר - הצג מסך התחברות
  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. אם המשתמש הוא HOST - הצג מסך שידור
  if (user.role === 'HOST') {
    return <BroadcastScreen />;
  }

  // 3. אם המשתמש הוא VIEWER - הצג מסך צפייה
  if (user.role === 'VIEWER') {
    return <ViewerScreen />;
  }

  // מקרה קצה (אם הרול לא מזוהה)
  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
}