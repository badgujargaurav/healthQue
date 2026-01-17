import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Container from '../components/Container';
import Layout from '../components/Layout';
import { fetchWithAuth, API_BASE } from '../utils/api';
import { ActivityIndicator, Card, Title, Paragraph } from 'react-native-paper';
import Toast from 'react-native-toast-message';

export default function DoctorProfileScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`${API_BASE}/doctors/${id}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Failed to load');
        }
        const d = await res.json();
        if (mounted) setDoctor(d);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Load failed', text2: e.message });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  return (
    <Container>
      <Layout navigation={navigation}>
        <ScrollView style={{ padding: 16 }}>
          {loading ? <ActivityIndicator animating={true} /> : (
            doctor ? (
              <View>
                <Title>{doctor.name}</Title>
                <Paragraph>{doctor.email}</Paragraph>
                <Paragraph>{doctor.specialty || ''}</Paragraph>
                <Card style={{ marginTop: 12 }}>
                  <Card.Title title="Clinics" />
                  <Card.Content>
                    {doctor.clinic || doctor.clinic_schedule || doctor.clinic_location || doctor.clinic_address ? (
                      <View>
                        {doctor.clinic ? (
                          <>
                            {doctor.clinic.address ? <Text>{doctor.clinic.address}</Text> : null}
                            {doctor.clinic.location ? <Text>{doctor.clinic.location}</Text> : null}
                            {doctor.clinic.name ? <Text>{doctor.clinic.name}</Text> : null}
                            {doctor.clinic.schedule ? (
                              (() => {
                                try {
                                  const sched = typeof doctor.clinic.schedule === 'string' ? JSON.parse(doctor.clinic.schedule) : doctor.clinic.schedule;
                                  return (
                                    <View style={{ marginTop: 8 }}>
                                      {sched.slotMinutes ? <Text>Slot: {sched.slotMinutes} minutes</Text> : null}
                                      {sched.patientsPerSlot ? <Text>Patients per slot: {sched.patientsPerSlot}</Text> : null}
                                      {sched.hours ? Object.keys(sched.hours).map(day => (
                                        <View key={day} style={{ marginTop: 6 }}>
                                          <Text style={{ fontWeight: '600' }}>{day}</Text>
                                          {(sched.hours[day] || []).map((r, idx) => (
                                            <Text key={idx}>{r.from} - {r.to}</Text>
                                          ))}
                                        </View>
                                      )) : null}
                                    </View>
                                  );
                                } catch (e) {
                                  return <Text>Schedule: {String(doctor.clinic.schedule)}</Text>;
                                }
                              })()
                            ) : null}
                          </>
                        ) : (
                          <>
                            {doctor.clinic_location ? <Text>{doctor.clinic_location}</Text> : null}
                            {doctor.clinic_address ? <Text>{doctor.clinic_address}</Text> : null}
                            {doctor.clinic_schedule ? (
                              (() => {
                                try {
                                  const sched = typeof doctor.clinic_schedule === 'string' ? JSON.parse(doctor.clinic_schedule) : doctor.clinic_schedule;
                                  return (
                                    <View style={{ marginTop: 8 }}>
                                      {sched.slotMinutes ? <Text>Slot: {sched.slotMinutes} minutes</Text> : null}
                                      {sched.patientsPerSlot ? <Text>Patients per slot: {sched.patientsPerSlot}</Text> : null}
                                      {sched.hours ? Object.keys(sched.hours).map(day => (
                                        <View key={day} style={{ marginTop: 6 }}>
                                          <Text style={{ fontWeight: '600' }}>{day}</Text>
                                          {(sched.hours[day] || []).map((r, idx) => (
                                            <Text key={idx}>{r.from} - {r.to}</Text>
                                          ))}
                                        </View>
                                      )) : null}
                                    </View>
                                  );
                                } catch (e) {
                                  return <Text>Schedule: {String(doctor.clinic_schedule)}</Text>;
                                }
                              })()
                            ) : null}
                          </>
                        )}
                      </View>
                    ) : (
                      <Text>No clinic info found. Doctor should complete profile.</Text>
                    )}
                  </Card.Content>
                </Card>
              </View>
            ) : <Text>Doctor not found</Text>
          )}
        </ScrollView>
      </Layout>
    </Container>
  );
}
