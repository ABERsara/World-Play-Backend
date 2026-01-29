// src/services/auth.service.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

const API_URL = 'http://10.0.2.2:8080/api/users';

export const authService = {
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // שמירת הטוקן
        await AsyncStorage.setItem('userToken', data.token);

        // פענוח ה-JWT
        const payloadBase64 = data.token.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
        
        return { ...data, user: payload };
      }
      throw new Error(data.message || 'Login failed');
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  getToken: async () => {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('userToken');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },
};