import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../../App';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedButton from '../components/ThemedButton';

export default function HomeScreen({ navigation }) {
  const auth = useContext(AuthContext);

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={styles.containerInner}>
        <Text style={styles.title}>Welcome to healthQue</Text>

        <ThemedButton style={{ width: '100%' }} onPress={() => navigation.navigate('Doctors')}>Doctors</ThemedButton>
        <ThemedButton style={{ width: '100%', marginTop: 12 }} onPress={() => navigation.navigate('Patients')}>Patients</ThemedButton>
        <ThemedButton style={{ width: '100%', marginTop: 12 }} onPress={() => navigation.navigate('Appointments')}>Appointments</ThemedButton>
        <ThemedButton variant="accent" style={{ width: '100%', marginTop: 12 }} onPress={() => navigation.navigate('Settings')}>Settings</ThemedButton>
        <ThemedButton variant="danger" style={{ width: '100%', marginTop: 12 }} onPress={() => auth.signOut()}>Sign Out</ThemedButton>
      </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({
  containerInner: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingTop: 40 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16, textAlign: 'center' }
});
