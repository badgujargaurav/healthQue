import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTheme } from './theme';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const ThemeContext = createContext({
  theme: createTheme('light'),
  toggleTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('themeMode');
        if (saved === 'dark' || saved === 'light') setMode(saved);
      } catch (e) {
        // ignore
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('themeMode', mode).catch(() => {});
  }, [mode]);

  const toggleTheme = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));

  const theme = createTheme(mode);

  // map our theme to react-native-paper MD3 theme
  const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const paperTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      secondary: theme.colors.accent,
      background: theme.colors.background,
      surface: theme.colors.surface,
      text: theme.colors.text,
      error: theme.colors.danger,
      onPrimary: '#ffffff'
    }
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider;
