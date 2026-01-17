import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import { fetchWithAuth, API_BASE } from '../utils/api';

export default function PatientDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/patients/${id}`);
        const data = await res.json();
        if (mounted) setPatient(data.data);
      } catch (e) {
        console.warn(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <Container><Layout navigation={navigation}><View style={{padding:20}}><ActivityIndicator /></View></Layout></Container>;
  if (!patient) return <Container><Layout navigation={navigation}><View style={{padding:20}}><Text>Not found</Text></View></Layout></Container>;

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>{patient.name}</Text>
        <Text>DOB: {patient.dob}</Text>
        <Text>Contact: {patient.contact ? JSON.stringify(patient.contact) : ''}</Text>
        <Text>Medical history: {patient.medical_history ? JSON.stringify(patient.medical_history) : ''}</Text>
      </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({ title: { fontSize: 20, fontWeight: '700', marginBottom: 8 } });
