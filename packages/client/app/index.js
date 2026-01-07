import React, { useState, useEffect } from 'react';
import { authService } from '../src/services/auth.service';
import { connectSocket } from '../src/services/socket.service';
import BroadcastScreen from '../src/screens/BroadcastScreen';
import ViewerScreen from '../src/screens/ViewerScreen'; // השורה הזו תעבוד רק אם הקובץ קיים ב-src/screens/
import LoginScreen from '../src/screens/LoginScreen';

export default function App() {
  const [user, setUser] = useState(null); // ישמור { role: 'HOST'/'VIEWER' }

  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser(payload);
      connectSocket();
    }
  }, []);

  if (!user) return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;

  return user.role === 'HOST' ? <BroadcastScreen /> : <ViewerScreen />;
}