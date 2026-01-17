import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// Minimal banner: only renders the Today/date button.
export default function OffDaysBanner({ todayCount = 0, onSetToday }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}> 
      <View style={{ alignItems: 'center', marginLeft: 12 }}>
        <Text style={{ color: theme.colors.text, marginBottom: 6 }}>Today</Text>
        <TouchableOpacity onPress={() => { console.log('banner date pressed'); onSetToday && onSetToday(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.dateBtn}>
          <Text style={{ color: theme.colors.text }}>{todayCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontWeight: '700', fontSize: 16 },
  text: { fontWeight: '600' },
  sub: { fontSize: 12, opacity: 0.9 }
  ,dateBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }
  ,smallBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }
});
