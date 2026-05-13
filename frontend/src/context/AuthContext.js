import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from token on page load
  useEffect(() => {
    const token = localStorage.getItem('tf_token');
    if (!token) { setLoading(false); return; }
    authAPI.me()
      .then(r => setUser(r.data.user))
      .catch(() => localStorage.removeItem('tf_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await authAPI.login({ email, password });
    localStorage.setItem('tf_token', r.data.token);
    setUser(r.data.user);
  };

  const signup = async (name, email, password) => {
    const r = await authAPI.signup({ name, email, password });
    localStorage.setItem('tf_token', r.data.token);
    setUser(r.data.user);
  };

  const logout = () => {
    localStorage.removeItem('tf_token');
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);