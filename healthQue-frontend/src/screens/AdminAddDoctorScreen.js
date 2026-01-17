import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedInput from '../components/ThemedInput';
import ThemedButton from '../components/ThemedButton';
import { Portal, Dialog, Button, ActivityIndicator } from 'react-native-paper';
import { fetchWithAuth, API_BASE } from '../utils/api';
import Toast from 'react-native-toast-message';

export default function AdminAddDoctorScreen({ navigation }) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const onSave = async () => {
    try {
      const payload = { name, specialty, location, email, phone, password };
      const res = await fetchWithAuth(`${API_BASE}/admin/doctors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      Toast.show({ type: 'success', text1: 'Doctor created' });
      setCreatedDoctor(data.data || data);
      // navigate to doctors list so admin sees the updated list
      navigation.navigate('Doctors');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    }
  };

  const [createdDoctor, setCreatedDoctor] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // profile check deferred to action to avoid extra API calls on mount

  return (
    <Container>
      <Layout navigation={navigation}>
        <View style={{ maxWidth: 520, alignSelf: 'center', width: '100%' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Create Doctor (Admin)</Text>
          <ThemedInput placeholder="Full name" value={name} onChangeText={setName} />
          <ThemedInput placeholder="Specialty" value={specialty} onChangeText={setSpecialty} />
          <ThemedInput placeholder="Location" value={location} onChangeText={setLocation} />
          <ThemedInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <ThemedInput placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <ThemedInput placeholder="Temporary password (optional)" value={password} onChangeText={setPassword} secureTextEntry />
          <View style={{ marginTop: 12 }}>
            <ThemedButton onPress={onSave} loading={saving}>Create Doctor</ThemedButton>
          </View>
          <Portal>
            <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
              <Dialog.Title>Doctor Created</Dialog.Title>
              <Dialog.Content>
                {createdDoctor ? (
                  <View>
                    <Text style={{ fontWeight: '700' }}>{createdDoctor.name}</Text>
                    <Text>{createdDoctor.email}</Text>
                    <Text>{createdDoctor.specialty || ''} {createdDoctor.location ? `· ${createdDoctor.location}` : ''}</Text>
                  </View>
                ) : (
                  <ActivityIndicator />
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => { setDialogVisible(false); navigation.navigate('Doctors'); }}>View Doctors</Button>
                <Button onPress={() => { setDialogVisible(false); setCreatedDoctor(null); setName(''); setEmail(''); setSpecialty(''); setLocation(''); setPhone(''); setPassword(''); }}>Create Another</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      </Layout>
    </Container>
  );
}
