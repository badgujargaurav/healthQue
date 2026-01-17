import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fetchWithAuth, API_BASE } from '../utils/api';

export default function OffDayModal({ visible, onClose, doctorId, onSaved }) {
  const { theme } = useTheme();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(null);
  const [type, setType] = useState('scheduled');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!startDate) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/doctors/${doctorId}/offdays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate || null, is_recurring_weekly: isRecurring, day_of_week: dayOfWeek, type, reason })
      });
      if (!res.ok) throw new Error('Save failed');
      await onSaved?.();
      onClose();
    } catch (e) {
      console.warn('save offday err', e);
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Add Off Day</Text>
          <TextInput placeholder="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} style={styles.input} />
          <TextInput placeholder="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} style={styles.input} />
          <TextInput placeholder="Reason (optional)" value={reason} onChangeText={setReason} style={styles.input} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: 8 }}>
              <Text style={{ color: theme.colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} disabled={saving} style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}> 
              <Text style={{ color: '#fff' }}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 8, padding: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginTop: 8 },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 }
});
