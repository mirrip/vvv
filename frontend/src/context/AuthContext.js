import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth', { username, password });
      if (response.data.user) {
        setUser(response.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        return { success: true };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Network error' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  const loadUser = async () => {
    const stored = await AsyncStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  };

  React.useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);