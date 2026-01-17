import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Container from '../components/Container';
import { useTheme } from '../theme/ThemeProvider';
import { fetchWithAuth, API_BASE } from '../utils/api';
import { useProfile } from '../contexts/ProfileContext';
import { useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import OffDaysCalendarStrip from '../components/OffDaysCalendarStrip';

// Dashboard shows quick counts and navigation shortcuts

export default function DashboardScreen({ navigation }) {
  const { theme } = useTheme();
    const [counts, setCounts] = useState({ patients: 0, appointments: 0, doctors: 0, clinics: 0 });
    const { profile, refreshProfile, loading } = useProfile();

  let cards = [];
    if (profile && profile.role === 'doctor') {
      cards = [
        { key: 'clinics', label: 'Clinics', nav: 'Clinics', value: counts.clinics },
        { key: 'appointments', label: 'Appointments', nav: 'Appointments', value: counts.appointments },
        { key: 'patients', label: 'Patients', nav: 'Patients', value: counts.patients },
        { key: 'settings', label: 'Settings', nav: 'Settings' }
      ];
    } else if (profile && profile.role === 'admin') {
      // admin sees doctors card
      cards = [
        { key: 'patients', label: 'Patients', nav: 'Patients', value: counts.patients },
        { key: 'appointments', label: 'Appointments', nav: 'Appointments', value: counts.appointments },
        { key: 'doctors', label: 'Doctors', nav: 'Doctors', value: counts.doctors },
        { key: 'settings', label: 'Settings', nav: 'Settings' }
      ];
    } else {
      // regular users (patients) - no doctors card
      cards = [
        { key: 'patients', label: 'Patients', nav: 'Patients', value: counts.patients },
        { key: 'appointments', label: 'Appointments', nav: 'Appointments', value: counts.appointments },
        { key: 'settings', label: 'Settings', nav: 'Settings' }
      ];
    }

  const runningRef = useRef(false);
  async function loadCounts() {
    if (runningRef.current) return; // skip overlapping runs
    runningRef.current = true;
    try {
      let profJson = profile;
      // if ProfileContext is still loading, avoid issuing another request here
      if (!profJson && !loading) profJson = await refreshProfile();
      if (profJson && profJson.role === 'doctor') {
        // counts scoped to doctor
        const a = await fetchWithAuth(`${API_BASE}/appointments?page=1&limit=1`);
        const aa = await a.json();
        const p = await fetchWithAuth(`${API_BASE}/patients?page=1&limit=1`);
        const pa = await p.json();
          // fetch clinics for this doctor and use length as count
          let clinicsCount = 0;
          try {
            const c = await fetchWithAuth(`${API_BASE}/clinics`);
            const cj = await c.json();
            clinicsCount = Array.isArray(cj.data) ? cj.data.length : 0;
          } catch (err) {
            clinicsCount = 0;
          }
            setCounts({ patients: pa.meta?.total || 0, appointments: aa.meta?.total || 0, doctors: 1, clinics: clinicsCount });
            // load upcoming appointments once (avoid duplicate appointment calls)
            try { await loadUpcoming(); } catch (e) { /* ignore */ }
      } else {
        const p = await fetchWithAuth(`${API_BASE}/patients?page=1&limit=1`);
        const pa = await p.json();
        const a = await fetchWithAuth(`${API_BASE}/appointments?page=1&limit=1`);
        const aa = await a.json();
        const d = await fetchWithAuth(`${API_BASE}/doctors?page=1&limit=10`);
        const dd = await d.json();
        setCounts({ patients: pa.meta?.total || 0, appointments: aa.meta?.total || 0, doctors: dd.meta?.total || (Array.isArray(dd.data) ? dd.data.length : 0) });
        try { await loadUpcoming(); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Dashboard load error', text2: e.message });
    } finally {
      runningRef.current = false;
    }
  }

  const isFocused = useIsFocused();

  // polling + focus refresh
  const pollRef = useRef();
  useEffect(() => {
    // wait for profile context to settle to avoid duplicate /profile calls
    if (loading) return;
    (async () => {
      await loadCounts();
      try { await loadOffDays(); } catch (e) { /* ignore */ }
      // after loading profile, if doctor and profile incomplete, redirect to ClinicSetup
      try {
        let prof = profile;
        if (!prof) prof = await refreshProfile();
        if (prof && prof.role === 'doctor') {
          const doc = prof.doctor || {};
          const completed = doc && (doc.profile_completed === 1 || doc.profile_completed === '1' || doc.profile_completed === true);
          const hasClinic = completed || doc.clinic || prof.clinic_location || prof.clinic_address || prof.clinic_id;
          if (!hasClinic) {
            navigation.navigate('ClinicSetup');
            return;
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    // poll every 30s but only trigger when this screen is focused
    pollRef.current = setInterval(() => { if (!loading && isFocused) loadCounts(); }, 30000);
    const unsubscribe = navigation.addListener('focus', () => { if (!loading) loadCounts(); });
    return () => {
      clearInterval(pollRef.current);
      unsubscribe && unsubscribe();
    };
  }, [navigation, profile, loading, isFocused]);

  // upcoming appointments by day (7-day window)
  const [upcoming, setUpcoming] = useState([]);
  const [offDays, setOffDays] = useState([]);
  const [offDaysMap, setOffDaysMap] = useState({});
  const [offModalVisible, setOffModalVisible] = useState(false);
  const [actionTarget, setActionTarget] = useState(null); // { date, rows, type: 'set'|'unset' }
  const [actionInProgress, setActionInProgress] = useState(false);
  async function loadUpcoming() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/appointments?page=1&limit=50`);
      const json = await res.json();
      const items = json.data || [];
      const now = new Date();
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
        return { label, weekday, date: d.toISOString().slice(0,10), count: 0 };
      });
      items.forEach(it => {
        const sch = it.scheduled_at || it.scheduledAt;
        if (!sch) return;
        const sd = new Date(sch.replace(' ', 'T'));
        if (isNaN(sd.getTime())) return;
        const dayIso = sd.toISOString().slice(0,10);
        const idx = days.findIndex(d => d.date === dayIso);
        if (idx >= 0) days[idx].count += 1;
      });
      setUpcoming(days);
    } catch (e) {
      // ignore upcoming load errors
    }
  }
  // loadUpcoming is now invoked from loadCounts to avoid duplicate appointment calls

  // load doctor off-days for next 7 days
  async function loadOffDays() {
    try {
      const prof = profile || await refreshProfile();
      const doctorId = (prof && (prof.doctor?.id || prof.doctor_id || prof.doctorId)) || null;
      if (!doctorId) return;
      const now = new Date();
      const from = now.toISOString().slice(0,10);
      const toDate = new Date(now); toDate.setDate(now.getDate() + 6);
      const to = toDate.toISOString().slice(0,10);
      const res = await fetchWithAuth(`${API_BASE}/doctors/${doctorId}/offdays?from=${from}&to=${to}`);
      const json = await res.json();
      const rows = json.data || [];
      setOffDays(rows);
      // build map of date->rows including recurring weekly and honoring status
      const map = {};
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        return d;
      });
      // return local YYYY-MM-DD for a Date object (avoid UTC offset issues)
      const isoFor = d => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      // helper to add
      const addToDate = (iso, row) => { map[iso] = map[iso] || []; map[iso].push(row); };
      // process rows: add 'off' rows, and treat 'working' rows as explicit overrides (remove any off entries for that date)
      for (const r of rows) {
        const recurring = Number(r.is_recurring_weekly) === 1;
        if (recurring) {
          const dow = r.day_of_week != null ? Number(r.day_of_week) : null;
          for (const d of days) {
            if (dow != null && d.getDay() === dow) {
              const iso = isoFor(d);
              if (String(r.status) === 'off') addToDate(iso, r);
              else if (String(r.status) === 'working') map[iso] = [];
            }
          }
        } else {
          // compare by local date string to avoid timezone shifts
          const sDate = new Date(r.start_date);
          const eDate = r.end_date ? new Date(r.end_date) : sDate;
          const sIso = isoFor(sDate);
          const eIso = isoFor(eDate);
          for (const d of days) {
            const iso = isoFor(d);
            if (iso >= sIso && iso <= eIso) {
              if (String(r.status) === 'off') addToDate(iso, r);
              else if (String(r.status) === 'working') map[iso] = [];
            }
          }
        }
      }
      setOffDaysMap(map);
    } catch (e) {
      // ignore off-days load errors
    }
  }

  return (
    <Container>
      <View style={{ maxWidth: 900, alignSelf: 'center', width: '100%' }}>
        {profile && profile.role === 'doctor' ? (
          <>
            <OffDaysCalendarStrip days={upcoming} offDaysMap={offDaysMap} onDayPress={(d) => {
              // Toggle flow: if date has off-days -> ask to unset; else ask to set
              const rows = offDaysMap[d.date] || [];
              if (rows && rows.length) {
                setActionTarget({ date: d.date, rows, type: 'unset' });
              } else {
                setActionTarget({ date: d.date, rows: [], type: 'set' });
              }
            }} />

            {/* Inline overlay (set/unset confirmation) */}
            {actionTarget ? (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} pointerEvents="auto">
                <View style={{ width: 340, backgroundColor: theme.colors.surface, padding: 16, borderRadius: 8 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 8, color: theme.colors.text }}>{actionTarget.type === 'set' ? 'Set as off-day' : 'Set as Working Day'}</Text>
                  {actionTarget.type === 'set' ? (
                    <Text style={{ color: theme.colors.text, marginBottom: 16 }}>Set an off-day for {actionTarget.date}? This will mark you unavailable on that date.</Text>
                  ) : (
                    <Text style={{ color: theme.colors.text, marginBottom: 16 }}>There is off-day on {actionTarget.date}. Cancel it?</Text>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity onPress={() => { setActionTarget(null); }} style={{ marginRight: 12 }} disabled={actionInProgress}>
                      <Text style={{ color: theme.colors.text }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => {
                      try {
                        setActionInProgress(true);
                        const prof = profile || await refreshProfile();
                        const doctorId = (prof && (prof.doctor?.id || prof.doctor_id || prof.doctorId)) || null;
                        if (!doctorId) throw new Error('Doctor id not available');
                        if (actionTarget.type === 'set') {
                          await fetchWithAuth(`${API_BASE}/doctors/${doctorId}/offdays`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ start_date: actionTarget.date, end_date: actionTarget.date, type: 'emergency', reason: 'Set from calendar' })
                          });
                          Toast.show({ type: 'success', text1: 'Off day set', text2: `${actionTarget.date} marked as off` });
                        } else {
                          // unset: try date-based PATCH, and also PATCH each row id as a fallback
                          try {
                            await fetchWithAuth(`${API_BASE}/doctors/${doctorId}/offdays`, {
                              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ date: actionTarget.date, status: 'working' })
                            });
                          } catch (err) {
                            // ignore date-patch failure and try per-row updates
                          }
                          // also attempt to update any returned rows by id (covers backends that expect id-based updates)
                          if (actionTarget.rows && actionTarget.rows.length) {
                            for (const r of actionTarget.rows) {
                              try {
                                await fetchWithAuth(`${API_BASE}/doctors/offdays/${r.id}`, {
                                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'working' })
                                });
                              } catch (err) {
                                // ignore per-row failures
                              }
                            }
                          }
                          Toast.show({ type: 'success', text1: 'Off day removed', text2: `${actionTarget.date} marked as working day.` });
                        }
                        setActionTarget(null);
                        await loadOffDays();
                      } catch (e) {
                        Toast.show({ type: 'error', text1: 'Action failed', text2: e.message });
                      } finally {
                        setActionInProgress(false);
                      }
                    }} style={{ backgroundColor: actionInProgress ? '#ccc' : (theme.colors.primary), paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }} disabled={actionInProgress}>
                      <Text style={{ color: '#fff' }}>{actionInProgress ? 'Please wait' : (actionTarget.type === 'set' ? 'Yes' : 'Yes')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
        <View style={styles.grid}>
          {cards.map(c => (
            <TouchableOpacity key={c.key} style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={() => navigation.navigate(c.nav)}>
              <Text style={[styles.cardLabel, { color: theme.colors.text }]}>{c.label}</Text>
                {c.value !== undefined ? <Text style={[styles.cardValue, { color: theme.colors.primary }]}>{c.key === 'clinics' ? counts.clinics : c.value}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ marginTop: 12 }}>
          <Text style={[{ color: theme.colors.text, fontWeight: '600', marginBottom: 8 }]}>Upcoming (7 days)</Text>
          <View style={{ padding: 8, backgroundColor: theme.colors.surface, borderRadius: 8 }}>
            {upcoming.map((d, i) => {
              const max = Math.max(1, ...upcoming.map(x => x.count));
              const width = Math.round((d.count / max) * 200);
              return (
                <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ width: 48, color: theme.colors.text }}>{d.label}</Text>
                  <View style={{ height: 12, backgroundColor: '#eee', flex: 1, marginHorizontal: 8, borderRadius: 6 }}>
                    <View style={{ width: `${(d.count / (max || 1)) * 100}%`, height: 12, backgroundColor: theme.colors.primary, borderRadius: 6 }} />
                  </View>
                  <Text style={{ width: 28, textAlign: 'right', color: theme.colors.text }}>{d.count}</Text>
                </View>
              );
            })}
          </View>
          {/* modal removed - banner handles set-today action */}
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  cardLabel: { fontSize: 16, fontWeight: '600' }
});
