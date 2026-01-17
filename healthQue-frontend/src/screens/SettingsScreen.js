import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Alert, Image, Platform } from 'react-native';
import { AuthContext } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithAuth, API_BASE } from '../utils/api';
import ThemedInput from '../components/ThemedInput';
import { Animated } from 'react-native';
import Toast from 'react-native-toast-message';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedButton from '../components/ThemedButton';
import * as ImagePicker from 'expo-image-picker';

// Backend profile endpoint (use API_BASE)
const PROFILE_API = `${API_BASE}/profile`;

export default function SettingsScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState(null);
  const currentInputRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const auth = useContext(AuthContext);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(PROFILE_API);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to fetch profile');
        }
        const data = await res.json();
        if (mounted) setProfile(data);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, []);

  const [uploading, setUploading] = useState(false);

  async function pickAndUploadLogo() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') return Alert.alert('Permission required', 'Please allow access to media to upload a logo.');
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1,1] });
      if (res.cancelled) return;
      const uri = res.uri;
      setUploading(true);
      const form = new FormData();
      const filename = uri.split('/').pop();
      const match = filename.match(/\.([0-9a-z]+)(?:\?|$)/i);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      form.append('logo', { uri: Platform.OS === 'web' ? uri : uri, name: filename, type });
      const r = await fetchWithAuth(`${API_BASE}/profile/logo`, { method: 'POST', body: form });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      Toast.show({ type: 'success', text1: 'Logo uploaded' });
      const updated = await r.json();
      setProfile(updated);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Logo upload failed', text2: e.message });
    } finally {
      setUploading(false);
    }
  }

  const onLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const onChangePassword = async () => {
    if (!oldPassword) return Toast.show({ type: 'error', text1: 'Enter current password' });
    if (!newPassword || newPassword.length < 6) return Toast.show({ type: 'error', text1: 'New password must be >= 6 chars' });
    if (newPassword !== confirmPassword) return Toast.show({ type: 'error', text1: 'Passwords do not match' });
    setChanging(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/profile/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // show specific backend error (e.g., current password incorrect)
        const msg = err.error || 'Failed to change password';
        // show inline if it's current-password related
        if (msg.toLowerCase().includes('current password') || msg.toLowerCase().includes('incorrect')) {
          setCurrentPasswordError(msg);
          // focus and shake the input
          try { currentInputRef.current?.focus(); } catch (e) { /* ignore */ }
          shakeAnim.setValue(0);
          Animated.timing(shakeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        } else {
          Toast.show({ type: 'error', text1: msg });
        }
        setChanging(false);
        return;
      }
      Toast.show({ type: 'success', text1: 'Password changed' });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setCurrentPasswordError(null);
    } catch (e) {
      // handle session expiry thrown by fetchWithAuth
      if (e && e.message && e.message.toLowerCase().includes('session expired')) {
        Toast.show({ type: 'error', text1: 'Session expired', text2: 'Please sign in again' });
      } else {
        Toast.show({ type: 'error', text1: 'Change failed', text2: e.message });
      }
    } finally {
      setChanging(false);
    }
  };

  // animated style for shake
  const shakeStyle = {
    transform: [{
      translateX: shakeAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, -8, 8, -6, 0]
      })
    }]
  };

  if (loading) {
    return (
      <Container>
        <Layout navigation={navigation}><View style={styles.center}><ActivityIndicator size="large" /></View></Layout>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Layout navigation={navigation}><View style={styles.container}><Text style={styles.error}>Error: {error}</Text>
          <ThemedButton onPress={() => { setLoading(true); setError(null); setProfile(null); (async () => { try { const token = await AsyncStorage.getItem('userToken'); const res = await fetch(PROFILE_API, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); setProfile(data); } catch (e) { setError(e.message); } finally { setLoading(false); } })(); }}>Retry</ThemedButton>
        </View></Layout>
      </Container>
    );
  }

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={styles.container}>
        <View />
        <Text style={styles.field}><Text style={styles.fieldLabel}>Name: </Text>{profile.name}</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Email: </Text>{profile.email}</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Phone: </Text>{profile.phone}</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Website: </Text>{profile.website}</Text>
        <Text style={styles.field}><Text style={styles.fieldLabel}>Company: </Text>{profile.company?.name}</Text>
        {profile && profile.role === 'doctor' ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Clinic / Logo</Text>
            {profile.logo_url ? (
              <Image source={{ uri: profile.logo_url }} style={{ width: 88, height: 88, borderRadius: 8, marginBottom: 8 }} />
            ) : (
              <View style={{ width: 88, height: 88, borderRadius: 8, backgroundColor: '#f5f5f5', marginBottom: 8, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#999' }}>No logo</Text></View>
            )}
            <ThemedButton onPress={pickAndUploadLogo} loading={uploading}>Upload Logo</ThemedButton>
          </View>
        ) : null}
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Change password</Text>
          <Animated.View style={shakeStyle}>
            <ThemedInput ref={currentInputRef} placeholder="Current password" value={oldPassword} onChangeText={(v) => { setOldPassword(v); setCurrentPasswordError(null); }} secureTextEntry />
            {currentPasswordError ? <Text style={{ color: '#b00020', marginTop: 6 }}>{currentPasswordError}</Text> : null}
          </Animated.View>
          <ThemedInput placeholder="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <ThemedInput placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          <View style={{ marginTop: 8 }}>
            <ThemedButton onPress={onChangePassword} loading={changing}>Change password</ThemedButton>
          </View>

          <View style={{ marginTop: 16 }}>
            <ThemedButton variant="danger" onPress={onLogout}>Logout</ThemedButton>
          </View>
        </View>
      </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  field: { fontSize: 16, marginBottom: 8 },
  fieldLabel: { fontWeight: '600' },
  button: { backgroundColor: '#1E90FF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b00020', marginBottom: 12 }
});
