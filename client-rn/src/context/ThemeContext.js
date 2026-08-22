import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('settings').then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        setIsDark(!!parsed.darkMode);
        setNotifications(parsed.notifications !== false);
        if (parsed.fontSizeMultiplier) {
          setFontSizeMultiplier(parsed.fontSizeMultiplier);
        }
      }
    });
  }, []);

  const toggleTheme = async (val) => {
    setIsDark(val);
    const current = await AsyncStorage.getItem('settings');
    const parsed = current ? JSON.parse(current) : {};
    await AsyncStorage.setItem('settings', JSON.stringify({ ...parsed, darkMode: val }));
  };

  const toggleNotifications = async (val) => {
    setNotifications(val);
    const current = await AsyncStorage.getItem('settings');
    const parsed = current ? JSON.parse(current) : {};
    await AsyncStorage.setItem('settings', JSON.stringify({ ...parsed, notifications: val }));
  };

  const changeFontSize = async (multiplier) => {
    setFontSizeMultiplier(multiplier);
    const current = await AsyncStorage.getItem('settings');
    const parsed = current ? JSON.parse(current) : {};
    await AsyncStorage.setItem('settings', JSON.stringify({ ...parsed, fontSizeMultiplier: multiplier }));
  };

  // Helper styles based on theme
  const theme = {
    isDark,
    fontSizeMultiplier,
    notifications,
    toggleTheme,
    toggleNotifications,
    changeFontSize,
    colors: {
      background: isDark ? '#0f172a' : '#f8fafc',
      card: isDark ? '#1e293b' : '#ffffff',
      textPrimary: isDark ? '#f8fafc' : '#0f172a',
      textSecondary: isDark ? '#94a3b8' : '#64748b',
      border: isDark ? '#334155' : '#f1f5f9',
    },
    // Helper function for dynamic font sizing
    fs: (size) => size * fontSizeMultiplier
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
