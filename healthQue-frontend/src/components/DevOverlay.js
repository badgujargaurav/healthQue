import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { subscribe, pushDebug } from '../utils/devDebug';
import { useTheme } from '../theme/ThemeProvider';

export default function DevOverlay() {
  const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production'));
  if (!isDev) return null;
  const [events, setEvents] = useState([]);
  useEffect(() => {
    const unsub = subscribe(e => setEvents(prev => [e, ...prev].slice(0, 30)));
    return unsub;
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev) => {
      try {
        const t = ev.target;
        const txt = (t && (t.innerText || t.textContent)) || ev.type || '';
        pushDebug({ source: 'DOM', text: txt, time: Date.now() });
      } catch (e) {}
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);
  const { theme } = useTheme();
  return (
    <View pointerEvents="none" style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
      <Text style={[styles.title, { color: theme.colors.primary }]}>DEV</Text>
      <ScrollView>
        {events.map((e, i) => (
          <Text key={i} style={styles.event}>{typeof e === 'string' ? e : JSON.stringify(e)}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 340,
    maxHeight: 300,
    zIndex: 9999,
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    opacity: 0.95
  },
  title: { fontWeight: '700', marginBottom: 6 },
  event: { fontSize: 11, marginBottom: 6 }
});
