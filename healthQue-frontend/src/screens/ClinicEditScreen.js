import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedButton from '../components/ThemedButton';
import { fetchWithAuth, API_BASE } from '../utils/api';
import Toast from 'react-native-toast-message';

export default function ClinicEditScreen({ navigation, route }) {
  const clinicId = route.params?.clinicId;
  const [clinic, setClinic] = useState({ name: '', address: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!clinicId) return setLoading(false);
      try {
        const res = await fetchWithAuth(`${API_BASE}/clinics/${clinicId}`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!mounted) return;
        setClinic({ name: json.name || '', address: json.address || json.location || '', description: json.description || '' });
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Failed to load clinic' });
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [clinicId]);

  const save = async () => {
    // validate
    const errs = {};
    if (!clinic.name || !clinic.name.trim()) errs.name = 'Name is required';
    if (!clinic.address || !clinic.address.trim()) errs.address = 'Address is required';
    // schedule is managed via Clinics screen modal; do not accept here
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = { name: clinic.name.trim(), address: clinic.address.trim(), description: clinic.description };
      const res = await fetchWithAuth(`${API_BASE}/clinics/${clinicId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || 'Save failed');
      }
      Toast.show({ type: 'success', text1: 'Clinic updated' });
      navigation.navigate('ClinicDetails', { clinicId: clinicId });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to save clinic', text2: e.message });
    } finally { setSaving(false); }
  };

  return (
    <Container>
      <Layout navigation={navigation}>
        <View style={styles.container}>
          <Text style={styles.label}>Name</Text>
          <TextInput placeholder="Name" value={clinic.name} onChangeText={(t) => setClinic(prev => ({ ...prev, name: t }))} style={[styles.input, errors.name && styles.inputError]} />
          {errors.name ? <Text style={styles.errText}>{errors.name}</Text> : null}

          <Text style={styles.label}>Address</Text>
          <TextInput placeholder="Address" value={clinic.address} onChangeText={(t) => setClinic(prev => ({ ...prev, address: t }))} style={[styles.input, errors.address && styles.inputError]} />
          {errors.address ? <Text style={styles.errText}>{errors.address}</Text> : null}

          <Text style={styles.label}>Description</Text>
          <TextInput placeholder="Short description" value={clinic.description} onChangeText={(t) => setClinic(prev => ({ ...prev, description: t }))} style={[styles.input]} multiline numberOfLines={3} />

          {/* Schedule is edited from Clinics list modal; removed from this form */}

          <View style={{ marginTop: 8 }}>
            <ThemedButton onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : 'Save'}</ThemedButton>
          </View>
        </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 10, marginBottom: 12 },
  inputError: { borderColor: '#d9534f' },
  errText: { color: '#d9534f', marginBottom: 8 }
});
