import React from 'react';
import { Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export default function OffDaysCalendarStrip({ days = [], offDaysMap = {}, onDayPress }) {
  const { theme } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
      {days.map(d => {
        const off = offDaysMap[d.date] || [];
        const isOff = (off && off.length > 0);
        const bg = isOff ? (theme.colors.error || '#f44336') : (theme.colors.success || '#4caf50');
        const textColor = '#fff';
        return (
          <TouchableOpacity
            key={d.date}
            onPress={() => onDayPress && onDayPress(d)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.day, { backgroundColor: bg, borderColor: isOff ? '#d32f2f' : '#388e3c' }]}
          >
            <Text style={{ color: textColor, fontSize: 12 }}>{d.weekday || ''}</Text>
            <Text style={{ color: textColor, fontWeight: '700', fontSize: 16 }}>{d.label}</Text>
            <Text style={{ color: textColor, fontSize: 12 }}>{isOff ? 'Off' : 'Working'}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  day: { width: 88, padding: 8, marginRight: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1 }
});
