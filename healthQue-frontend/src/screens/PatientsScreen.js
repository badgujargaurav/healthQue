import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { fetchWithAuth, API_BASE } from '../utils/api';
import { pushDebug, subscribe } from '../utils/devDebug';
import Toast from 'react-native-toast-message';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedButton from '../components/ThemedButton';
import ThemedInput from '../components/ThemedInput';
import { DataTable, useTheme, ActivityIndicator, Portal, Dialog, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionCircle, tableStyles } from '../components/TableUI';
import { useTheme as useAppTheme } from '../theme/ThemeProvider';

export default function PatientsScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  // client-side sort state (none = server order)
  const [clientSortBy, setClientSortBy] = useState(null);
  const [clientSortDir, setClientSortDir] = useState('asc');
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const paperTheme = useTheme();
  const { theme } = useAppTheme();
  const filterTimer = React.useRef(null);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const inlineSearchRef = React.useRef(null);

  const load = async (page = meta.page, filterValue = debouncedFilter) => {
    setLoading(true);
    try { const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production')); if (isDev && typeof console !== 'undefined') console.log('[Patients] load', { page, filterValue }); } catch (e) {}
    try {
      // ask server for default descending order; client sorting will be applied after load
      const params = new URLSearchParams({ page, limit: meta.limit });
      const fv = (filterValue || '').toString().trim();
      if (fv) params.set('filter', fv);
      const res = await fetchWithAuth(`${API_BASE}/patients?${params.toString()}`);
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data.slice() : (data.data || []);
      setPatients(list || []);
      if (data.meta) setMeta({ total: data.meta.total || 0, page: data.meta.page || page, limit: data.meta.limit || meta.limit });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (col) => {
    const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production'));
    let nextSortBy = col;
    let nextSortDir = 'asc';
    if (clientSortBy === col) nextSortDir = (clientSortDir === 'asc' ? 'desc' : 'asc');
    setClientSortBy(nextSortBy);
    setClientSortDir(nextSortDir);
    setMeta(prev => ({ ...prev, page: 1 }));
    try { pushDebug({ source: 'Patients', col: nextSortBy, dir: nextSortDir, time: Date.now() }); } catch (e) {}
    if (isDev && typeof console !== 'undefined') console.log('[Patients] toggleSort', { col, nextSortBy, nextSortDir });
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

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const deletePatient = async (id) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/patients/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Delete failed');
      }
      // refresh
      await load(1);
    } catch (e) {
      console.warn('delete patient failed', e);
    }
  };

  useEffect(() => { load(meta.page, debouncedFilter); }, [meta.page, debouncedFilter]);

  function getFilteredPatients() {
    const term = (debouncedFilter || filter || '').toString().toLowerCase().trim();
    const list = (patients || []).slice();
    if (!term) return list;
    // If server-side filtering was used (debouncedFilter), show server results as-is
    if (debouncedFilter) return list;
    return list.filter(p => {
      if (!p) return false;
      const parts = [];
      if (typeof p.id !== 'undefined' && p.id !== null) parts.push(String(p.id));
      ['name', 'dob', 'email', 'phone', 'city', 'address'].forEach(k => { if (p[k]) parts.push(String(p[k])); });
      const hay = parts.join(' ').toLowerCase();
      return hay.indexOf(term) !== -1;
    });
  }

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
                <Text style={styles.breadcrumb}>Patients</Text>
                <Text style={styles.headerTitle}>Patients</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="download" size={16} color="#0b1220" />} variant="outline" onPress={() => {}} />
                <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="file-pdf-box" size={16} color="#0b1220" />} variant="outline" onPress={() => {}} />
              <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="refresh" size={18} color="#0b1220" />} variant="outline" onPress={() => load(1)} />
              {!showInlineSearch ? (
                <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="magnify" size={18} color="#0b1220" />} variant="outline" onPress={() => { setShowInlineSearch(true); setTimeout(() => { try { inlineSearchRef.current && inlineSearchRef.current.focus(); } catch (e) {} }, 50); }} />
              ) : null}
              {showInlineSearch ? (
                <TextInput ref={inlineSearchRef} style={styles.inlineSearch} value={filter} onChangeText={(v) => { setFilter(v); if (filterTimer.current) clearTimeout(filterTimer.current); filterTimer.current = setTimeout(() => { setDebouncedFilter(v); setMeta(prev => ({ ...prev, page: 1 })); filterTimer.current = null; }, 350); }} onBlur={() => setShowInlineSearch(false)} placeholder="Search patients..." />
              ) : null}
              <ThemedButton onPress={() => navigation.navigate('AddPatient')}>Add</ThemedButton>
            </View>
          </View>
        </View>

        <View style={[tableStyles.tableContainer, { flex: 1 }]}>
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 140, paddingRight: 140 }} stickyHeaderIndices={[0]}>
              <View>
                <DataTable>
                  <DataTable.Header style={tableStyles.tableHeaderRow}>
                    <DataTable.Title style={tableStyles.colName}><Text>Name</Text></DataTable.Title>
                    <DataTable.Title style={tableStyles.colLocation}><Text>DOB</Text></DataTable.Title>
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
                      const getPatientVal = (it, key) => {
                        if (!it) return '';
                        if (key === 'name') return it.name || '';
                        if (key === 'dob') return it.dob || it.date_of_birth || '';
                        return it[key] || '';
                      };
                      const filtered = getFilteredPatients();
                      try { const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production')); if (isDev && typeof console !== 'undefined') console.log('[Patients] render', { loading, patientsLength: (patients||[]).length, filteredLength: (filtered||[]).length, debouncedFilter, filter }); } catch (e) {}
                      const displayedPatients = (clientSortBy ? filtered.slice().sort((a, b) => {
                        const aVal = ('' + getPatientVal(a, clientSortBy)).toLowerCase();
                        const bVal = ('' + getPatientVal(b, clientSortBy)).toLowerCase();
                        if (aVal < bVal) return clientSortDir === 'desc' ? 1 : -1;
                        if (aVal > bVal) return clientSortDir === 'desc' ? -1 : 1;
                        return 0;
                      }) : filtered);
                      return displayedPatients.map((p, i) => (
                        <DataTable.Row key={`${p.id}-${i}`} onPress={() => navigation.navigate('PatientDetail', { id: p.id })} style={tableStyles.row}>
                          <DataTable.Cell style={tableStyles.colName}>{p.name}</DataTable.Cell>
                          <DataTable.Cell style={tableStyles.colLocation}>{p.dob || '-'}</DataTable.Cell>
                          <DataTable.Cell style={{ width: 140 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                              <ActionCircle icon="eye" color="#eef2ff" iconColor="#2365d6" onPress={() => navigation.navigate('PatientDetail', { id: p.id })} />
                              <ActionCircle icon="pencil" color="#eefcf0" iconColor="#2e8b57" onPress={() => navigation.navigate('AddPatient', { patient: p })} />
                              <ActionCircle icon="delete" color="#fff5f5" iconColor="#d9534f" onPress={() => { setConfirmTarget(p.id); setConfirmVisible(true); }} />
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
                  onPageChange={(p) => { setMeta(prev => ({ ...prev, page: p + 1 })); load(p + 1, debouncedFilter); }}
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
                <Text>Delete this patient?</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
                <Button onPress={async () => { setConfirmVisible(false); if (confirmTarget) await deletePatient(confirmTarget); setConfirmTarget(null); }}>Delete</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({ title: { fontSize: 22, fontWeight: '700' },
  breadcrumb: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  headerTitle: { fontSize: 34, fontWeight: '700', color: '#0f1724' },
  createBtn: { backgroundColor: '#0b1220', borderRadius: 10, paddingHorizontal: 16, height: 44, justifyContent: 'center' },
  iconBtn: { marginRight: 8, borderRadius: 10, height: 40, width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  ctrlSmall: { marginLeft: 8, borderRadius: 10, height: 40, width: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  inlineSearch: { marginLeft: 8, height: 36, width: 220, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e6e9ef', backgroundColor: '#fff' },
  tableFooter: { borderTopWidth: 1, borderTopColor: '#eef2f7', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 6, zIndex: 30 }
});
