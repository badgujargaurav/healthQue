import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTheme } from '../theme/ThemeProvider';

const ThemedInput = (props, ref) => {
  const { theme } = useTheme();
  return (
    <TextInput
      ref={ref}
      mode="outlined"
      underlineColor="transparent"
      activeUnderlineColor={theme.colors.primary}
      placeholderTextColor={theme.colors.muted}
      textColor={theme.colors.text}
      style={[styles.input, { backgroundColor: theme.colors.surface, borderRadius: Math.min(12, theme.spacing.sm) }]}
      contentStyle={{ height: Math.min(48, Math.max(40, Math.round(theme.spacing.lg * 1.6))) }}
      {...props}
    />
  );
};

export default React.forwardRef(ThemedInput);

const styles = StyleSheet.create({ input: { marginBottom: 12 } });
