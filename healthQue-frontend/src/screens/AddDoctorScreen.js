import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedInput from '../components/ThemedInput';
import ThemedButton from '../components/ThemedButton';
import { fetchWithAuth, API_BASE } from '../utils/api';
import Toast from 'react-native-toast-message';

export default function AddDoctorScreen({ navigation, route }) {
  const doc = route?.params?.doctor || {};
  const [name, setName] = useState(doc.name || '');
  const [specialty, setSpecialty] = useState(doc.specialty || '');
  const [location, setLocation] = useState(doc.location || '');
  const [email, setEmail] = useState(doc.email || '');
  const [phone, setPhone] = useState(doc.phone || '');

  const onSave = async () => {
    try {
      const payload = { name, specialty, location, email, phone };
      const res = await fetchWithAuth(`${API_BASE}/doctors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      Toast.show({ type: 'success', text1: 'Doctor saved' });
      navigation.navigate('Doctors');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    }
  };

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={{ maxWidth: 520, alignSelf: 'center', width: '100%' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>{doc.id ? 'Edit Doctor' : 'New Doctor'}</Text>
        <ThemedInput placeholder="Full name" value={name} onChangeText={setName} />
        <ThemedInput placeholder="Specialty" value={specialty} onChangeText={setSpecialty} />
        <ThemedInput placeholder="Location" value={location} onChangeText={setLocation} />
        <ThemedInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <ThemedInput placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <View style={{ marginTop: 12 }}>
          <ThemedButton onPress={onSave}>{doc.id ? 'Save' : 'Create'}</ThemedButton>
        </View>
      </View>
      </Layout>
    </Container>
  );
}
