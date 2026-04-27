/**
 * auth.service.js
 *
 * שכבת השירות לניהול אימות משתמשים.
 * מטפל בהתחברות, התנתקות ושמירת טוקן ב-AsyncStorage.
 *
 * מתקשר עם: /api/users  (login)
 * תלוי ב:   AsyncStorage (שמירת טוקן), fetch (בקשות HTTP)
 * משמש את:  AuthContext ומסך ההתחברות
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:8080/api/users';

export const authService = {
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.token) {
      await AsyncStorage.setItem('userToken', data.token);
      return {
        token: data.token,
        user: data.user, // { id, name, username, email, role }
      };
    }

    throw new Error('No token received from server');
  },

  getToken: async () => {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch {
      return null;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('userToken');
    } catch {
      // אין מה לעשות אם הסרת הטוקן נכשלה
    }
  },
};
