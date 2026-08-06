// src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

function parseToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token,  setToken]  = useState(() => localStorage.getItem('rebook_token'));
  const [user,   setUser]   = useState(() => {
    const t = localStorage.getItem('rebook_token');
    return t ? parseToken(t) : null;
  });

  const login = useCallback((tokenStr, userData) => {
    localStorage.setItem('rebook_token', tokenStr);
    setToken(tokenStr);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rebook_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
