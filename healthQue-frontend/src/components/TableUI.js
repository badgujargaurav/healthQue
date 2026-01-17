import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export function ActionCircle({ icon, color = '#e6f0ff', iconColor = '#2b6cb0', onPress }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => { if (typeof onPress === 'function') onPress(); }}
      onPressIn={(e) => { try { if (e && e.stopPropagation) e.stopPropagation(); } catch(_){} }}
      onMouseDown={(e) => { try { if (e && e.stopPropagation) e.stopPropagation(); } catch(_){} }}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      accessibilityRole="button"
      style={[styles.circle, { backgroundColor: color, borderColor: theme.colors.border, zIndex: 20, pointerEvents: 'auto' }]}
    >
      <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
    </TouchableOpacity>
  );
}

export const tableStyles = StyleSheet.create({
  tableContainer: { borderRadius: 6, borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent', overflow: 'visible', padding: 0 },
  tableHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fbfbfc', borderBottomWidth: 1, borderBottomColor: '#f1f4f7' },
  searchInput: { borderWidth: 1, borderColor: '#e6eaf0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 320, backgroundColor: '#fff' },
  colName: { flex: 2, paddingLeft: 12 },
  colLocation: { flex: 2 },
  colDescription: { flex: 2 },
  colSchedule: { flex: 1 },
  colActions: { flex: 1.2, paddingRight: 12 },
  row: { height: 64, borderBottomWidth: 1, borderBottomColor: '#f6f8fa' },
  badge: { backgroundColor: '#eef6ff', color: '#1e66d6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
  badgeMuted: { backgroundColor: '#fbfbfb', color: '#777', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }
});

const styles = StyleSheet.create({
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 6, borderWidth: 1 }
});

export default null;
