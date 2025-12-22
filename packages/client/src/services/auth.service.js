// src/services/auth.service.js

const API_URL = 'http://localhost:8080/api/users';

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
        // בדיקה שאנחנו בדפדפן לפני שמירה
        if (typeof window !== 'undefined') {
          localStorage.setItem('userToken', data.token);
        }
        return data;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  getToken: () => {
    // הגנה מפני קריסה בשרת (SSR)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userToken');
    }
    return null;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userToken');
    }
  },
};