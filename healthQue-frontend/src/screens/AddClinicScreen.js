import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedInput from '../components/ThemedInput';
import ThemedButton from '../components/ThemedButton';
import { Checkbox, Portal, Dialog, Button } from 'react-native-paper';
import { fetchWithAuth, API_BASE } from '../utils/api';
import { useProfile } from '../contexts/ProfileContext';
import Toast from 'react-native-toast-message';

export default function AddClinicScreen({ navigation }) {
  // password removed from clinic setup; password change is handled in Settings
  const [clinicLocation, setClinicLocation] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicDescription, setClinicDescription] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [slotMinutes, setSlotMinutes] = useState(15);
  const [patientsPerSlot, setPatientsPerSlot] = useState(1);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [days, setDays] = useState({ Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] });
  const [selectedDays, setSelectedDays] = useState({ Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false });
  const [addDialogDay, setAddDialogDay] = useState(null);
  const fromRef = useRef('09:00');
  const toRef = useRef('17:00');
  const debounceRef = useRef(null);

  // if profile already completed, redirect away immediately
  // Use cached profile to redirect if clinic profile already completed
  const { profile, refreshProfile } = useProfile();
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let p = profile;
        if (!p) p = await refreshProfile();
        if (!mounted) return;
        const doc = p && p.doctor;
        if (doc && (doc.profile_completed === 1 || doc.profile_completed === '1' || doc.profile_completed === true)) {
          navigation.replace('Settings');
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [navigation, profile, refreshProfile]);

  const [errors, setErrors] = useState({});

  const onSave = async () => {
    setSaving(true);
    try {
      // validation
      const errs = {};
      if (!clinicName || clinicName.trim().length === 0) errs.name = 'Clinic name is required';
      setErrors(errs);
      if (Object.keys(errs).length) { setSaving(false); return; }
      // build schedule structure
      const hours = {};
      Object.keys(days).forEach(d => { if (days[d] && days[d].length) hours[d] = days[d]; });
      const clinicSchedule = { slotMinutes: Number(slotMinutes), patientsPerSlot: Number(patientsPerSlot), hours };
      const body = { clinic_name: clinicName.trim(), clinic_location: clinicLocation, clinic_schedule: clinicSchedule, clinic_description: clinicDescription };
      const r1 = await fetchWithAuth(`${API_BASE}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r1.ok) throw new Error('Failed to save clinic');
      // give DB a short moment to persist and poll profile until backend marks it completed
      setFinalizing(true);
      const maxAttempts = 6;
      const delayMs = 700;
      let confirmed = false;
      for (let i = 0; i < maxAttempts; i++) {
        // small delay between polls
        await new Promise(r => setTimeout(r, delayMs));
        try {
          const pdata = await refreshProfile();
          if (pdata && pdata.doctor) {
            const pc = pdata.doctor.profile_completed;
            if (pc === 1 || pc === '1' || pc === true) { confirmed = true; break; }
          }
        } catch (err) {
          // ignore and retry
        }
      }
      Toast.show({ type: 'success', text1: 'Saved' });
      if (!confirmed) {
        Toast.show({ type: 'info', text1: 'Finalizing may take a moment; header will update shortly' });
      }
      setFinalizing(false);
      navigation.navigate('Settings');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  // suggestions via Google Places Autocomplete API (requires API key in env)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!clinicLocation || clinicLocation.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const key = process.env.EXPO_GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '';
        if (!key) return setSuggestions([]);
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(clinicLocation)}&types=geocode&key=${key}`;
        const res = await fetch(url);
        const json = await res.json();
        const preds = (json.predictions || []).map(p => ({ id: p.place_id, text: p.description }));
        setSuggestions(preds);
      } catch (e) { console.warn('places err', e); setSuggestions([]); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [clinicLocation]);

  const pickSuggestion = (s) => { setClinicLocation(s.text); setSuggestions([]); };

  const addTimingForDay = (day, from = '09:00', to = '17:00') => {
    setDays(prev => ({ ...prev, [day]: [...(prev[day]||[]), { from, to }] }));
  };

  const copyTimingsFrom = (sourceDay) => {
    const source = days[sourceDay] || [];
    if (!source.length) { Toast.show({ type: 'info', text1: 'No timings to copy' }); return; }
    setDays(prev => {
      const next = { ...prev };
      Object.keys(selectedDays).forEach(d => {
        if (selectedDays[d] && d !== sourceDay) next[d] = source.slice();
      });
      return next;
    });
    Toast.show({ type: 'success', text1: 'Timings copied to selected days' });
  };

  const removeTiming = (day, idx) => { setDays(prev => ({ ...prev, [day]: prev[day].filter((_,i) => i !== idx) })); };

  return (
    <Container>
      <Layout navigation={navigation}>
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <View style={{ maxWidth: 720, alignSelf: 'center', width: '100%' }}>
            <View />

            <ThemedInput placeholder="Clinic location (city/address)" value={clinicLocation} onChangeText={setClinicLocation} />
            <ThemedInput placeholder="Clinic name (required)" value={clinicName} onChangeText={setClinicName} style={errors.name ? { borderColor: '#d9534f' } : {}} />
            {errors.name ? <Text style={{ color: '#d9534f', marginTop: 6 }}>{errors.name}</Text> : null}
            <ThemedInput placeholder="Short description" value={clinicDescription} onChangeText={setClinicDescription} multiline numberOfLines={3} />
            {suggestions.length > 0 ? (
              <View style={styles.suggestions}>
                <FlatList data={suggestions} keyExtractor={i => i.id} renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => pickSuggestion(item)} style={styles.suggestionItem}>
                    <Text>{item.text}</Text>
                  </TouchableOpacity>
                )} />
              </View>
            ) : null}

            <View style={{ marginTop: 12 }}>
              <Text style={{ marginBottom: 6 }}>Slot duration</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {[15,30,45,60].map(n => (
                  <TouchableOpacity key={n} onPress={() => setSlotMinutes(n)} style={[styles.optionBtn, slotMinutes===n && styles.optionSelected]}>
                    <Text style={slotMinutes===n ? styles.optionTextSelected : styles.optionText}>{n===60? '1 hour': `${n} min`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ marginBottom: 6 }}>Patients per slot</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: 10 }).map((_,i) => {
                  const v = i+1;
                  return (
                    <TouchableOpacity key={v} onPress={() => setPatientsPerSlot(v)} style={[styles.optionBtn, patientsPerSlot===v && styles.optionSelected]}>
                      <Text style={patientsPerSlot===v ? styles.optionTextSelected : styles.optionText}>{v}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ marginBottom: 6 }}>Operating days & timings</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Object.keys(selectedDays).map(d => (
                  <TouchableOpacity key={d} onPress={() => setSelectedDays(prev => ({ ...prev, [d]: !prev[d] }))} style={{ width: '33%', flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox status={selectedDays[d] ? 'checked' : 'unchecked'} color="#007AFF" accessibilityLabel={`Select ${d}`} />
                    <Text>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {Object.keys(selectedDays).map(d => selectedDays[d] ? (
                <View key={`day-${d}`} style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: '600' }}>{d}</Text>
                  {(days[d] || []).map((t, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <Text>{t.from} - {t.to}</Text>
                      <Button onPress={() => removeTiming(d, idx)}>Remove</Button>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <Button onPress={() => setAddDialogDay(d)}>Add timing</Button>
                    <View style={{ width: 12 }} />
                    <Button onPress={() => copyTimingsFrom(d)}>Copy to selected days</Button>
                  </View>
                </View>
              ) : null)}
            </View>

            {/* Password removed from this flow; use Settings to change password */}
            <View style={{ marginTop: 12 }}>
              <ThemedButton onPress={onSave} loading={saving}>Save and Continue</ThemedButton>
            </View>
          </View>
        </ScrollView>

        {finalizing ? (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)' }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12 }}>Finalizing profile...</Text>
          </View>
        ) : null}

        <Portal>
          <Dialog visible={!!addDialogDay} onDismiss={() => setAddDialogDay(null)}>
            <Dialog.Title>Add timing</Dialog.Title>
            <Dialog.Content>
              <ThemedInput placeholder="From (HH:MM)" value={fromRef.current} onChangeText={(v) => { fromRef.current = v; }} />
              <ThemedInput placeholder="To (HH:MM)" value={toRef.current} onChangeText={(v) => { toRef.current = v; }} />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setAddDialogDay(null)}>Cancel</Button>
              <Button onPress={() => { if (addDialogDay) addTimingForDay(addDialogDay, fromRef.current, toRef.current); setAddDialogDay(null); }}>Add</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({
  suggestions: { backgroundColor: '#fff', borderColor: '#ddd', borderWidth: 1, maxHeight: 200, marginTop: 6 },
  suggestionItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  optionBtn: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
  optionSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  optionText: { color: '#000' },
  optionTextSelected: { color: '#fff' }
});
