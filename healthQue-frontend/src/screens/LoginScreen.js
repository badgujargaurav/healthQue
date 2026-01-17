import React, { useState, useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { AuthContext } from '../../App';
import { useProfile } from '../contexts/ProfileContext';
import Toast from 'react-native-toast-message';
import Container from '../components/Container';
import { Surface, TextInput, Button, Title, Paragraph, Avatar, useTheme, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BACKEND = 'http://localhost:4000/api/v1';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useContext(AuthContext);
  const { refreshProfile } = useProfile();
  const paperTheme = useTheme();
  const [remember, setRemember] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Toast.show({ type: 'info', text1: 'Validation', text2: 'Please enter both email and password' });
      return;
    }

    try {
      const res = await fetch(`${BACKEND}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const { parseResponse } = require('../utils/api');
      const parsed = await parseResponse(res);
      if (!parsed.ok) throw new Error((parsed.data && parsed.data.error) || parsed.text || 'Login failed');
      const data = parsed.data;
      // backend returns access token and refreshToken
      await auth.signIn(data.token || data.token, data.refreshToken || data.refreshToken);
      // refresh cached profile so role-based UI updates immediately
      try { await refreshProfile(); } catch (e) { /* ignore */ }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Login Error', text2: e.message });
    }
  };

  return (
    <Container>
      <View style={styles.outer}>
        <Surface style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}>
          <View style={styles.logoRow}>
            <Avatar.Icon size={64} icon={() => <MaterialCommunityIcons name="lock" size={36} color="#fff" />} style={{ backgroundColor: paperTheme.colors.primary }} />
          </View>
          <Title style={styles.title}>Sign in</Title>
          <Paragraph style={styles.subtitle}>Sign in to continue to healthQue</Paragraph>
          <Paragraph style={styles.secondary}>Enter your account credentials to access appointments, patients and doctors.</Paragraph>

          <TextInput
            label="Email Address"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Password"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            mode="outlined"
          />

          <View style={styles.rowBetween}>
            <View style={styles.rowAligned}>
              <Checkbox
                status={remember ? 'checked' : 'unchecked'}
                onPress={() => setRemember(!remember)}
              />
              <Text style={styles.rememberText}>Remember me</Text>
            </View>
            <TouchableOpacity onPress={() => { /* TODO: implement forgot */ }}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <Button mode="contained" onPress={onSubmit} style={styles.button} contentStyle={{ height: 48 }}>
            Sign In
          </Button>

          <View style={styles.footerRow}>
            <TouchableOpacity onPress={() => navigation?.navigate?.('Register') }>
              <Paragraph style={{ color: paperTheme.colors.primary }}>Create an account</Paragraph>
            </TouchableOpacity>
          </View>

          <View style={styles.copyrightRow}>
            <Text style={styles.copyright}>© {new Date().getFullYear()} healthQue</Text>
          </View>
        </Surface>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    width: '92%',
    maxWidth: 560,
    padding: 24,
    borderRadius: 8,
    elevation: 3
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666'
  },
  secondary: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#777'
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  rowAligned: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rememberText: {
    marginLeft: 6,
    color: '#333'
  },
  forgot: {
    color: '#007AFF'
  },
  input: {
    marginBottom: 12
  },
  button: {
    marginTop: 8
  },
  footerRow: {
    marginTop: 12,
    alignItems: 'center'
  }
  ,copyrightRow: { alignItems: 'center', marginTop: 14 },
  copyright: { color: '#999', fontSize: 12 }
});
