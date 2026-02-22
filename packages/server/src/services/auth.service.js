// src/services/auth.service.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.0.2.2:8080/api/users';

export const authService = {
  /**
   * התחברות למערכת
   */
  login: async (email, password) => {
    try {
      console.log('🔐 [AUTH] Login attempt for:', email);

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
        // שמירת הטוקן ב-AsyncStorage
        await AsyncStorage.setItem('userToken', data.token);
        console.log('✅ [AUTH] Token saved successfully');

        // החזרת כל המידע שהשרת שלח
        return {
          token: data.token,
          user: data.user, // { id, name, username, email, role }
        };
      }

      throw new Error('No token received from server');
    } catch (error) {
      console.error('❌ [AUTH] Login error:', error);
      throw error;
    }
  },

  /**
   * קבלת הטוקן מה-Storage
   */
  getToken: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        console.log('✅ [AUTH] Token retrieved');
      } else {
        console.log('⚠️ [AUTH] No token in storage');
      }
      return token;
    } catch (error) {
      console.error('❌ [AUTH] Error getting token:', error);
      return null;
    }
  },

  /**
   * יציאה מהמערכת
   */
  logout: async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      console.log('✅ [AUTH] Logged out successfully');
    } catch (error) {
      console.error('❌ [AUTH] Error during logout:', error);
    }
  },

  /**
   * רישום משתמש חדש (אופציונלי - אם יש לך דף רישום)
   */
  register: async (name, username, email, password) => {
    try {
      console.log('📝 [AUTH] Register attempt for:', email);

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      console.log('✅ [AUTH] Registration successful');
      return data;
    } catch (error) {
      console.error('❌ [AUTH] Registration error:', error);
      throw error;
    }
  },
};
