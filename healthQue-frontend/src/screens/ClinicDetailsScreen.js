import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedButton from '../components/ThemedButton';
import { fetchWithAuth, API_BASE } from '../utils/api';
import Toast from 'react-native-toast-message';

export default function ClinicDetailsScreen({ navigation, route }) {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const clinicId = route.params?.clinicId;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      if (!clinicId) return setLoading(false);
      try {
        const res = await fetchWithAuth(`${API_BASE}/clinics/${clinicId}`);
        if (!res.ok) throw new Error('Failed to load clinic');
        const json = await res.json();
        if (!mounted) return;
        setClinic(json);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Failed to load clinic' });
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [clinicId]);

  return (
    <Container>
      <Layout navigation={navigation}>
        <ScrollView style={styles.container}>
          {loading ? <Text>Loading...</Text> : null}
          {!loading && !clinic ? <Text>Clinic not found.</Text> : null}
          {clinic ? (
            <View>
              <View />
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: '700' }}>Schedule</Text>
                {renderSchedule(clinic.schedule)}
              </View>
              <View style={{ marginTop: 16 }}>
                <ThemedButton onPress={() => navigation.navigate('ClinicEdit', { clinicId: clinic.id })}>Edit Clinic</ThemedButton>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </Layout>
    </Container>
  );
}

function renderSchedule(schedule) {
  if (!schedule) return <Text style={{ color: '#666' }}>No schedule configured</Text>;
  let s = schedule;
  try {
    if (typeof s === 'string') s = JSON.parse(s);
  } catch (e) {
    // ignore parse errors
  }
  const hours = s?.hours || s || {};
  const days = [
    ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']
  ];
  return (
    <View style={styles.scheduleContainer}>
      {days.map(([key, label]) => {
        const day = hours[key] || hours[label.toLowerCase()] || [];
        const ranges = Array.isArray(day) ? day.map(r => {
          if (typeof r === 'string') return r;
          const start = r.start || r.from || r.s || '';
          const end = r.end || r.to || r.e || '';
          return start && end ? `${start}–${end}` : start || end || '-';
        }) : ['-'];
        const text = ranges.length ? ranges.join(', ') : '-';
        return (
          <View key={key} style={styles.dayRow}>
            <Text style={styles.dayName}>{label}</Text>
            <Text style={styles.dayTimes}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { marginTop: 6, color: '#666' }
});

Object.assign(styles, {
  scheduleContainer: { marginTop: 8, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, backgroundColor: '#fff' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#fafafa' },
  dayName: { width: 56, fontWeight: '600' },
  dayTimes: { flex: 1, color: '#444' }
});
