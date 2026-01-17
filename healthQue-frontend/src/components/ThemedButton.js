import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme } from '../theme/ThemeProvider';

export default function ThemedButton({ children, variant = 'primary', style, ...props }) {
  const { theme } = useTheme();
  const color = variant === 'primary' ? theme.colors.primary : variant === 'accent' ? theme.colors.accent : theme.colors.danger;
  // pick a reasonable button height with an upper cap to avoid oversized buttons on wide screens
  const computedHeight = Math.round(theme.spacing.lg * 2);
  const height = Math.min(48, Math.max(40, computedHeight));
  return (
    <Button
      mode="contained"
      buttonColor={color}
      textColor={theme.colors.onPrimary}
      style={[styles.button, { height, borderRadius: Math.min(12, theme.spacing.sm) }, style]}
      labelStyle={{ fontSize: Math.max(14, Math.round(theme.typography.body * 0.95)), fontWeight: '600' }}
      {...props}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({ button: { justifyContent: 'center' } });
