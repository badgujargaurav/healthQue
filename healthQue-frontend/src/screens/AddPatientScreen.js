import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedInput from '../components/ThemedInput';
import ThemedButton from '../components/ThemedButton';
import { fetchWithAuth, API_BASE } from '../utils/api';
import Toast from 'react-native-toast-message';

export default function AddPatientScreen({ navigation }) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  const onCreate = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, dob }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      Toast.show({ type: 'success', text1: 'Patient created' });
      navigation.navigate('Patients');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    }
  };

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={{ maxWidth: 520, alignSelf: 'center', width: '100%' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>New Patient</Text>
        <ThemedInput placeholder="Full name" value={name} onChangeText={setName} />
        <ThemedInput placeholder="YYYY-MM-DD" value={dob} onChangeText={setDob} />
        <View style={{ marginTop: 12 }}>
          <ThemedButton onPress={onCreate}>Create</ThemedButton>
        </View>
      </View>
      </Layout>
    </Container>
  );
}
