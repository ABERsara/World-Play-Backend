import React, { useState, useEffect } from 'react';
import BroadcastScreen from '../src/screens/BroadcastScreen';
import LoginScreen from '../src/screens/LoginScreen';
import { authService } from '../src/services/auth.service';
import { connectSocket } from '../src/services/socket.service';

export default function Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // בדיקה ראשונית: האם המשתמש כבר מחובר (יש טוקן בדפדפן)?
    const token = authService.getToken();
    if (token) {
      setIsLoggedIn(true);
      connectSocket(); // חיבור הסוקט עם הטוקן הקיים
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    connectSocket(); // חיבור הסוקט מיד לאחר התחברות מוצלחת
  };

  if (loading) return null; // אפשר להוסיף כאן מסך טעינה בסיסי

  // ניהול המעבר בין המסכים
  return isLoggedIn ? (
    <BroadcastScreen />
  ) : (
    <LoginScreen onLoginSuccess={handleLoginSuccess} />
  );
}