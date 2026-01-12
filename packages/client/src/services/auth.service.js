// src/services/auth.service.js
// כתובת ה-IP לחיבור ממכשיר פיזי או localhost לאמולטור
const API_URL = 'http://192.168.56.1:8080/api/users';

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
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('userToken', data.token);
        }

        // פענוח ה-JWT לקבלת המידע (payload)
        const payload = JSON.parse(window.atob(data.token.split('.')[1]));
        return { ...data, user: payload };
      }
      throw new Error(data.message || 'Login failed');
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('userToken');
    }
    return null;
  },

  getUser: () => {
    const token = authService.getToken();
    if (!token) return null;
    try {
      return JSON.parse(window.atob(token.split('.')[1]));
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('userToken');
    }
  },
};
