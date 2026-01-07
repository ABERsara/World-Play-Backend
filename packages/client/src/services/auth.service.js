// src/services/auth.service.js

// שנה לכתובת ה-IP של השרת שלך אם את בודקת ממכשיר פיזי (למשל: 192.168.1.10)
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('userToken', data.token);
        }
        
        // פענוח הטוקן כדי לקבל את פרטי המשתמש (Role, ID וכו')
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        return { ...data, user: payload }; 
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userToken');
    }
    return null;
  },

  // פונקציה שמפענחת את הטוקן הקיים
  getUser: () => {
    const token = authService.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userToken');
    }
  },
};