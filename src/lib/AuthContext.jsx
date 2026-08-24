import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { db } from '@/api/alphaClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('alpha_auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const userData = await db.auth.me();
      setUser(userData);
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('alpha_auth_token');
      localStorage.removeItem('alpha_auth_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    const data = await db.auth.login(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const register = async (email, password) => {
    const data = await db.auth.register(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const logout = () => {
    db.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
