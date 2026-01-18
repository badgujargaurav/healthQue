import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useTheme as useAppTheme } from '../theme/ThemeProvider';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedButton from '../components/ThemedButton';
import ThemedInput from '../components/ThemedInput';
import { fetchWithAuth, API_BASE, softDelete } from '../utils/api';
import { pushDebug, subscribe } from '../utils/devDebug';
import Toast from 'react-native-toast-message';
import { DataTable, useTheme, ActivityIndicator, Portal, Dialog, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionCircle, tableStyles } from '../components/TableUI';

export default function AppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  // client-side sort state (none = server order)
  const [clientSortBy, setClientSortBy] = useState(null);
  const [clientSortDir, setClientSortDir] = useState('asc');
  const filterTimer = React.useRef(null);
  const paperTheme = useTheme();
  const { theme } = useAppTheme();
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const inlineSearchRef = React.useRef(null);

  const load = async (page = meta.page) => {
    setLoading(true);
    try { const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production')); if (isDev && typeof console !== 'undefined') console.log('[Appointments] load', { page, filter: debouncedFilter }); } catch (e) {}
    try {
      // request server default order (no client-requested sort)
      const params = new URLSearchParams({ page, limit: meta.limit });
      const fv = (debouncedFilter || '').toString().trim();
      if (fv) params.set('filter', fv);
      const res = await fetchWithAuth(`${API_BASE}/appointments?${params.toString()}`);
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data.slice() : (data.data || []);
      setAppointments(list || []);
      if (data.meta) setMeta({ total: data.meta.total || 0, page: data.meta.page || page, limit: data.meta.limit || meta.limit });
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  const toggleSort = (col) => {
    const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production'));
    let nextSortBy = col;
    let nextSortDir = 'asc';
    if (clientSortBy === col) nextSortDir = (clientSortDir === 'asc' ? 'desc' : 'asc');
    setClientSortBy(nextSortBy);
    setClientSortDir(nextSortDir);
    setMeta(prev => ({ ...prev, page: 1 }));
    try { pushDebug({ source: 'Appointments', col: nextSortBy, dir: nextSortDir, time: Date.now() }); } catch (e) {}
    if (isDev && typeof console !== 'undefined') console.log('[Appointments] toggleSort', { col, nextSortBy, nextSortDir });
    // debug toast removed
  };

  // dev: ignore global DOM events (prevent unintended cross-screen triggers)
  useEffect(() => {
    const unsub = subscribe(evt => {
      try {
        if (!evt) return;
        if (evt.source === 'DOM') return; // ignore DevOverlay DOM broadcasts
      } catch (e) {}
    });
    return unsub;
  }, [clientSortBy, clientSortDir]);

  useEffect(() => { load(meta.page); }, [meta.page, debouncedFilter]);

  function getFilteredAppointments() {
    const term = (debouncedFilter || filter || '').toString().toLowerCase().trim();
    const list = (appointments || []).slice();
    if (!term) return list;
    // If server filtering was used (debouncedFilter present), show server results directly
    if (debouncedFilter) return list;
    return list.filter(it => {
      if (!it) return false;
      const parts = [];
      if (typeof it.id !== 'undefined' && it.id !== null) parts.push(String(it.id));
      if (it.patient_name) parts.push(String(it.patient_name));
      if (it.doctor_name) parts.push(String(it.doctor_name));
      if (it.patient && it.patient.name) parts.push(String(it.patient.name));
      if (it.doctor && it.doctor.name) parts.push(String(it.doctor.name));
      ['scheduled_at', 'scheduledAt', 'status', 'notes'].forEach(k => { if (it[k]) parts.push(String(it[k])); });
      const hay = parts.join(' ').toLowerCase();
      return hay.indexOf(term) !== -1;
    });
  }

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const deleteAppointment = async (id) => {
    try {
      const r = await softDelete(`${API_BASE}/appointments/${id}`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to delete');
      }
      Toast.show({ type: 'success', text1: 'Appointment deleted' });
      await load(1);
    } catch (e) { Toast.show({ type: 'error', text1: 'Delete failed', text2: e.message }); }
  };

  const numberOfPages = Math.max(1, Math.ceil((meta.total || 0) / meta.limit));
  const containerStyle = { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, flex: 1, minHeight: '60vh' };

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={containerStyle}>
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ marginRight: 12 }}>
                <Text style={styles.breadcrumb}>Appointments</Text>
                <Text style={styles.headerTitle}>Appointments</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="download" size={16} color="#0b1220" />} variant="outline" onPress={() => {}} />
                <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="file-pdf-box" size={16} color="#0b1220" />} variant="outline" onPress={() => {}} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedButton style={styles.iconBtn} icon={() => <MaterialCommunityIcons name="refresh" size={18} color="#0b1220" />} variant="outline" onPress={() => load(1)} />
              {!showInlineSearch ? (
                <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="magnify" size={18} color="#0b1220" />} variant="outline" onPress={() => { setShowInlineSearch(true); setTimeout(() => { try { inlineSearchRef.current && inlineSearchRef.current.focus(); } catch (e) {} }, 50); }} />
              ) : null}
              {showInlineSearch ? (
                <TextInput ref={inlineSearchRef} style={styles.inlineSearch} value={filter} onChangeText={(v) => { setFilter(v); if (filterTimer.current) clearTimeout(filterTimer.current); filterTimer.current = setTimeout(() => { setDebouncedFilter(v); setMeta(prev => ({ ...prev, page: 1 })); filterTimer.current = null; }, 350); }} onBlur={() => setShowInlineSearch(false)} placeholder="Search appointments..." />
              ) : null}
              <ThemedButton onPress={() => navigation.navigate('AddAppointment')}>New</ThemedButton>
            </View>
          </View>
        </View>

        <View style={[tableStyles.tableContainer, { flex: 1 }]}>
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 140, paddingRight: 140 }} stickyHeaderIndices={[0]}>
              <View>
                <DataTable>
                  <DataTable.Header style={tableStyles.tableHeaderRow}>
                    <DataTable.Title style={tableStyles.colName}><Text>ID</Text></DataTable.Title>
                    <DataTable.Title style={tableStyles.colName}><Text>Patient</Text></DataTable.Title>
                    <DataTable.Title style={tableStyles.colName}><Text>Doctor</Text></DataTable.Title>
                    <DataTable.Title style={tableStyles.colLocation}><Text>Scheduled</Text></DataTable.Title>
                    <DataTable.Title style={tableStyles.colSchedule}><Text>Status</Text></DataTable.Title>
                    <DataTable.Title style={{ width: 140, justifyContent: 'flex-end' }}>Actions</DataTable.Title>
                  </DataTable.Header>
                </DataTable>
              </View>

              <View>
                <DataTable>
                  {loading ? (
                    <DataTable.Row>
                      <DataTable.Cell style={{ justifyContent: 'center', flex: 1 }}>
                        <ActivityIndicator animating={true} />
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    (() => {
                      const getAppointmentVal = (it, key) => {
                        if (!it) return '';
                        if (key === 'id') return String(it.id || it.appointmentId || '');
                        if (key === 'patient_name') return it.patient_name || it.patient?.name || it.patientId || '';
                        if (key === 'doctor_name') return it.doctor_name || it.doctor?.name || it.doctorId || '';
                        if (key === 'scheduled_at') return it.scheduled_at || it.scheduledAt || '';
                        if (key === 'status') return it.status || '';
                        return it[key] || '';
                      };
                      const filtered = getFilteredAppointments();
                      try { const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production')); if (isDev && typeof console !== 'undefined') console.log('[Appointments] render', { loading, appointmentsLength: (appointments||[]).length, filteredLength: (filtered||[]).length, debouncedFilter, filter }); } catch (e) {}
                      const displayedAppointments = (clientSortBy ? filtered.slice().sort((a, b) => {
                        const aVal = ('' + getAppointmentVal(a, clientSortBy)).toLowerCase();
                        const bVal = ('' + getAppointmentVal(b, clientSortBy)).toLowerCase();
                        if (aVal < bVal) return clientSortDir === 'desc' ? 1 : -1;
                        if (aVal > bVal) return clientSortDir === 'desc' ? -1 : 1;
                        return 0;
                      }) : filtered);
                      return displayedAppointments.map((item, i) => (
                        <DataTable.Row key={`${item.id}-${i}`} style={[styles.row, tableStyles.row]}>
                          <DataTable.Cell style={tableStyles.colName}>{item.id}</DataTable.Cell>
                          <DataTable.Cell style={tableStyles.colName}>{item.patient_name || item.patientId || item.patient?.name || '-'}</DataTable.Cell>
                          <DataTable.Cell style={tableStyles.colName}>{item.doctor_name || item.doctorId || item.doctor?.name || '-'}</DataTable.Cell>
                          <DataTable.Cell style={tableStyles.colLocation}>{item.scheduled_at || item.scheduledAt || '-'}</DataTable.Cell>
                          <DataTable.Cell style={tableStyles.colSchedule}>{item.status || '-'}</DataTable.Cell>
                          <DataTable.Cell style={{ width: 140 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                              <ActionCircle icon="eye" color="#eef2ff" iconColor="#2365d6" onPress={() => navigation.navigate('AddAppointment', { appointment: item })} />
                              <ActionCircle icon="pencil" color="#eefcf0" iconColor="#2e8b57" onPress={() => navigation.navigate('AddAppointment', { appointment: item })} />
                              <ActionCircle icon="delete" color="#fff5f5" iconColor="#d9534f" onPress={() => { setConfirmTarget(item.id); setConfirmVisible(true); }} />
                            </View>
                          </DataTable.Cell>
                        </DataTable.Row>
                      ))
                    })()
                  )}
                </DataTable>
              </View>

            </ScrollView>
            <View style={styles.tableFooter}>
              <DataTable>
                <DataTable.Pagination
                  page={Math.max(0, (meta.page || 1) - 1)}
                  numberOfPages={numberOfPages}
                  onPageChange={(p) => { setMeta(prev => ({ ...prev, page: p + 1 })); load(p + 1); }}
                  label={`${meta.page} of ${numberOfPages}`}
                />
              </DataTable>
            </View>
          </View>
        </View>
          <Portal>
            <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
              <Dialog.Title>Confirm</Dialog.Title>
              <Dialog.Content>
                <Text>Delete this appointment?</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
                <Button onPress={async () => { setConfirmVisible(false); if (confirmTarget) await deleteAppointment(confirmTarget); setConfirmTarget(null); }}>Delete</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({
  breadcrumb: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  headerTitle: { fontSize: 34, fontWeight: '700', color: '#0f1724' },
  createBtn: { backgroundColor: '#0b1220', borderRadius: 10, paddingHorizontal: 16, height: 44, justifyContent: 'center' },
  iconBtn: { marginRight: 8, borderRadius: 10, height: 40, width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  ctrlSmall: { marginLeft: 8, borderRadius: 10, height: 40, width: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  inlineSearch: { marginLeft: 8, height: 36, width: 220, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e6e9ef', backgroundColor: '#fff' },
  tableFooter: { borderTopWidth: 1, borderTopColor: '#eef2f7', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 6, zIndex: 30 },
  row: { height: 56 }
});
