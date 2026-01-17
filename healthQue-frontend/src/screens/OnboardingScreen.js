import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedInput from '../components/ThemedInput';
import ThemedButton from '../components/ThemedButton';
import Toast from 'react-native-toast-message';
import { fetchWithAuth, API_BASE } from '../utils/api';
import { AuthContext } from '../../App';

export default function OnboardingScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const auth = useContext(AuthContext);

  const onSave = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, website })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save profile');
      }
      Toast.show({ type: 'success', text1: 'Profile saved' });
      navigation?.navigate?.('Home');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Save Error', text2: e.message });
    }
  };

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={{ maxWidth: 520, alignSelf: 'center', width: '100%' }}>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.label}>Display name</Text>
        <ThemedInput value={name} onChangeText={setName} placeholder="Dr. Alice Smith" />
        <Text style={styles.label}>Phone</Text>
        <ThemedInput value={phone} onChangeText={setPhone} placeholder="555-0100" />
        <Text style={styles.label}>Website</Text>
        <ThemedInput value={website} onChangeText={setWebsite} placeholder="example.com" />
        <View style={{ marginTop: 16 }}>
          <ThemedButton onPress={onSave}>Save & Continue</ThemedButton>
        </View>
      </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({ title: { fontSize: 22, fontWeight: '700', marginBottom: 12 }, label: { marginTop: 8, marginBottom: 6 } });
