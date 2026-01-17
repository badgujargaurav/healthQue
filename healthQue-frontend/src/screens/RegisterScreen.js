import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedInput from '../components/ThemedInput';
import ThemedButton from '../components/ThemedButton';
import { AuthContext } from '../../App';
import { API_BASE } from '../utils/api';

export default function RegisterScreen({ navigation }) {
  const [tenantName, setTenantName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const auth = useContext(AuthContext);

  const onSubmit = async () => {
    if (!tenantName || !doctorName || !email || !password) {
      Toast.show({ type: 'info', text1: 'Validation', text2: 'Please fill required fields' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantName, doctorName, email, password, specialty })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      // backend returns access token as `token` and `refreshToken`
      await auth.signIn(data.token, data.refreshToken);
      // direct to onboarding after registration
      navigation?.navigate?.('Onboarding');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Registration Error', text2: e.message });
    }
  };

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={{ maxWidth: 520, alignSelf: 'center', width: '100%' }}>
        <Text style={styles.title}>Register Clinic</Text>

        <Text style={styles.label}>Clinic / Tenant Name</Text>
        <ThemedInput placeholder="Acme Clinic" value={tenantName} onChangeText={setTenantName} />

        <Text style={styles.label}>Your Name</Text>
        <ThemedInput placeholder="Dr. Alice" value={doctorName} onChangeText={setDoctorName} />

        <Text style={styles.label}>Email</Text>
        <ThemedInput placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

        <Text style={styles.label}>Password</Text>
        <ThemedInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

        <Text style={styles.label}>Specialty (optional)</Text>
        <ThemedInput placeholder="Cardiology" value={specialty} onChangeText={setSpecialty} />

        <View style={{ marginTop: 12 }}>
          <ThemedButton onPress={onSubmit}>Create Clinic & Account</ThemedButton>
        </View>

      </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, marginBottom: 6, color: '#333' }
});
