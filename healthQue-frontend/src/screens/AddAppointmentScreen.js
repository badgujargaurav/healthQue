import React, { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedInput from '../components/ThemedInput';
import ThemedButton from '../components/ThemedButton';
import { fetchWithAuth, API_BASE } from '../utils/api';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddAppointmentScreen({ navigation, route }) {
  const editing = route?.params?.appointment;
  const [patientId, setPatientId] = useState(editing ? String(editing.patient_id || editing.patientId || '') : '');
  const [doctorId, setDoctorId] = useState(editing ? String(editing.doctor_id || editing.doctorId || '') : '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [pickerValue, setPickerValue] = useState(new Date());

  // parse existing scheduled_at into date and time fields
  useEffect(() => {
    if (editing && (editing.scheduled_at || editing.scheduledAt)) {
      const val = editing.scheduled_at || editing.scheduledAt;
      // handle ISO or 'YYYY-MM-DD HH:MM:SS'
      let dt = null;
      if (/^\d{4}-\d{2}-\d{2}T/.test(val)) dt = new Date(val);
      else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?/.test(val)) dt = new Date(val.replace(' ', 'T'));
      if (dt && !isNaN(dt.getTime())) {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        const hh = String(dt.getHours()).padStart(2, '0');
        const min = String(dt.getMinutes()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
        setTime(`${hh}:${min}`);
        setPickerValue(dt);
      }
    }
  }, [editing]);

  const onCreate = async () => {
    try {
      // combine date and time into scheduled_at
      let scheduled_at = '';
      if (date && time) scheduled_at = `${date} ${time}:00`;
      else if (date) scheduled_at = `${date} 00:00:00`;

      let res;
      if (editing && editing.id) {
        res = await fetchWithAuth(`${API_BASE}/appointments/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: Number(patientId), doctor_id: Number(doctorId), scheduled_at })
        });
      } else {
        res = await fetchWithAuth(`${API_BASE}/appointments`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: Number(patientId), doctor_id: Number(doctorId), scheduled_at })
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save appointment');
      Toast.show({ type: 'success', text1: editing ? 'Appointment updated' : 'Appointment created' });
      navigation.navigate('Appointments');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    }
  };

  function showDateTimePicker(mode) {
    setPickerMode(mode);
    setShowPicker(true);
    // initialize pickerValue from date/time if available
    if (date) {
      const parts = date.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (time) {
        const [hh, mm] = time.split(':');
        d.setHours(Number(hh || 0), Number(mm || 0));
      }
      setPickerValue(d);
    }
  }

  function onPickerChange(event, selected) {
    setShowPicker(Platform.OS === 'ios');
    if (!selected) return;
    const dt = selected || pickerValue;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:${min}`);
    setPickerValue(dt);
  }

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={{ maxWidth: 520, alignSelf: 'center', width: '100%' }}>
        <View />
        <ThemedInput placeholder="Patient ID" value={patientId} onChangeText={setPatientId} keyboardType="numeric" />
        <ThemedInput placeholder="Doctor ID" value={doctorId} onChangeText={setDoctorId} keyboardType="numeric" />
        <ThemedInput placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />
        <ThemedInput placeholder="HH:MM" value={time} onChangeText={setTime} />
        <View style={{ marginTop: 12 }}>
          <ThemedButton onPress={onCreate}>{editing ? 'Save' : 'Create'}</ThemedButton>
        </View>
      </View>
      </Layout>
    </Container>
  );
}
