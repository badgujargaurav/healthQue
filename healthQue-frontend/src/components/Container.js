import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { Surface } from 'react-native-paper';
import { useTheme } from '../theme/ThemeProvider';

export default function Container({ children, padded = false, style, maxWidth }) {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}> 
      <Surface style={[styles.surface, padded ? { padding: theme.spacing.md } : { padding: 0 }, style, { backgroundColor: theme.colors.background }]}> 
        <SafeAreaView style={[styles.inner, maxWidth ? { maxWidth } : null]}>{children}</SafeAreaView>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, surface: { flex: 1 }, inner: { flex: 1, width: '100%', alignSelf: 'stretch' } });
