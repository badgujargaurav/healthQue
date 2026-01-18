import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { fetchWithAuth, API_BASE, parseResponse, softDelete } from '../utils/api';
import { pushDebug, subscribe } from '../utils/devDebug';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme as useAppTheme } from '../theme/ThemeProvider';
import Toast from 'react-native-toast-message';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Container from '../components/Container';
import Layout from '../components/Layout';
import ThemedButton from '../components/ThemedButton';
import ThemedInput from '../components/ThemedInput';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DataTable, useTheme, ActivityIndicator, Portal, Dialog, Button } from 'react-native-paper';
import { ActionCircle, tableStyles } from '../components/TableUI';

function toCSV(data) {
  const headers = ['id', 'name', 'specialty', 'location', 'email', 'phone'];
  const rows = data.map(d => headers.map(h => `"${(d[h] || '')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export default function DoctorsScreen({ navigation }) {
  const [profileRole, setProfileRole] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  // sorting removed: server default order will be used
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(meta.limit || 10);
  const [loading, setLoading] = useState(false);
  const paperTheme = useTheme();
  const { theme } = useAppTheme();
  const DEBUG_UI = false; // set true to re-enable on-screen debug and DOM hooks
  const filterTimer = React.useRef(null);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const inlineSearchRef = React.useRef(null);
  const clientSortRef = React.useRef({ by: null, dir: 'asc' });
  const toggleLockRef = React.useRef(false);
  const sortByRef = React.useRef(sortBy);
  const sortDirRef = React.useRef(sortDir);
  const lastToggleRef = React.useRef({ key: null, time: 0 });
  const fetchTimerRef = React.useRef(null);
  const [headerPressCount, setHeaderPressCount] = useState(0);
  const [lastHeaderPressed, setLastHeaderPressed] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const pageRef = React.useRef(page);
  const debouncedFilterRef = React.useRef(debouncedFilter);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { debouncedFilterRef.current = debouncedFilter; }, [debouncedFilter]);

  const fetchDoctors = async (page = 1, filterValue = debouncedFilter) => {
    if (DEBUG_UI) console.log('[Doctors] fetchDoctors called', { page, filterValue });
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: meta.limit });
      const fv = (filterValue || '').toString().trim();
      if (fv) params.set('filter', fv);
      const url = `${API_BASE}/doctors?${params.toString()}`;
      if (typeof console !== 'undefined') console.log('[Doctors] fetch URL', url);
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (typeof console !== 'undefined') console.log('[Doctors] fetch response', data && { meta: data.meta || null, dataCount: (data.data || []).length });
      const list = Array.isArray(data.data) ? data.data.slice() : (data.data || []);
      setDoctors(list || []);
      try { if (typeof console !== 'undefined') console.log('[Doctors] setDoctors sample', (list||[]).slice(0,5).map(d => ({ id: d.id, name: d.name, email: d.email || d.contact?.email || null }))); } catch (e) {}
      if (data.meta) {
  setMeta({ total: data.meta.total || 0, page: data.meta.page || page, limit: data.meta.limit || meta.limit });
  setItemsPerPage(data.meta.limit || itemsPerPage);
}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(() => {
      fetchDoctors(page + 1, debouncedFilter, sortBy, sortDir);
      fetchTimerRef.current = null;
    }, 60);
    return () => { if (fetchTimerRef.current) { clearTimeout(fetchTimerRef.current); fetchTimerRef.current = null; } };
  }, [page, debouncedFilter, sortBy, sortDir]);

  // keep refs in sync with state
  useEffect(() => { sortByRef.current = sortBy; sortDirRef.current = sortDir; }, [sortBy, sortDir]);

  // refresh list when screen is focused
  // refresh list when screen is focused — use refs so this listener isn't re-registered on every state change
  useEffect(() => {
    const handler = () => fetchDoctors(pageRef.current + 1, debouncedFilterRef.current, sortByRef.current, sortDirRef.current);
    const unsub = navigation.addListener('focus', handler);
    return unsub;
  }, [navigation]);
  // Use cached profile from context; refresh if not loaded yet
  const { profile, refreshProfile } = useProfile();
  const handleAddDoctor = async () => {
    try {
      let p = profile;
      if (!p) p = await refreshProfile();
      if (p && p.role === 'admin') {
        navigation.navigate('AddDoctor');
      } else {
        Toast.show({ type: 'error', text1: 'Permission denied' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed', text2: e.message });
    }
  };

  const onExportCSV = () => {
    const csv = toCSV(doctors);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'doctors.csv');
  };

  const onExportPDF = () => {
    try {
      const doc = new jsPDF();
      const columns = ['ID', 'Name', 'Specialty', 'Location', 'Email', 'Phone'];
      const rows = doctors.map(d => [d.id, d.name, d.specialty, d.location, d.email, d.phone]);
      doc.autoTable({ head: [columns], body: rows });
      doc.save('doctors.pdf');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'PDF export failed', text2: e.message });
    }
  };

  // selection removed: single-row delete remains via confirm dialog

  const deleteDoctor = async (id) => {
    try {
      const r = await softDelete(`${API_BASE}/doctors/${id}`);
      const parsed = await parseResponse(r);
      if (!parsed.ok) throw new Error((parsed.data && parsed.data.error) || parsed.text || 'Failed to delete');
      Toast.show({ type: 'success', text1: 'Deleted' });
      fetchDoctors(page + 1, debouncedFilter, sortBy, sortDir);
    } catch (e) { Toast.show({ type: 'error', text1: 'Delete failed', text2: e.message }); }
  };

  const handleFilterChange = (text) => {
    setFilter(text);
    if (filterTimer.current) clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => {
      setDebouncedFilter(text);
      filterTimer.current = null;
    }, 350);
  };

  

  // client-side sort toggle - sorts the loaded `doctors` array without re-fetching
  const toggleSort = (col) => {
    // short lock to prevent duplicate toggles from RN onPress + DOM click
    if (toggleLockRef.current) return;
    toggleLockRef.current = true;
    setTimeout(() => { toggleLockRef.current = false; }, 300);
    // debounce repeated toggles for the same header
    const now = Date.now();
    if (lastToggleRef.current.key === col && (now - lastToggleRef.current.time) < 500) return;
    lastToggleRef.current = { key: col, time: now };

    // compute nextDir from latest refs to avoid stale state
    let nextDir = 'asc';
    const currentBy = sortByRef.current;
    const currentDir = sortDirRef.current;
    if (currentBy === col) nextDir = (currentDir === 'asc' ? 'desc' : 'asc');
    console.log('[Doctors] toggleSort', { col, nextDir });
    try { pushDebug({ source: 'Doctors', stage: 'toggleSort', key: col, dir: nextDir, time: Date.now() }); } catch (e) {}
    setLastHeaderPressed(col);
    setHeaderPressCount(c => c + 1);
    // sorting disabled — no-op
    // update refs immediately
    sortByRef.current = col;
    sortDirRef.current = nextDir;
    setPage(0);
  };

  // dev: respond to DOM clicks captured by DevOverlay (maps header text -> toggleSort)
  useEffect(() => {
    if (!DEBUG_UI) return () => {};
    const unsub = subscribe(evt => {
      try {
        if (!evt || evt.source !== 'DOM' || !evt.text) return;
        const t = (evt.text || '').trim();
        if (t.indexOf('Name') === 0) toggleSort('name');
        else if (t.indexOf('Specialty') === 0) toggleSort('specialty');
        else if (t.indexOf('Location') === 0) toggleSort('location');
      } catch (e) {}
    });
    return unsub;
  }, []);

  // mount log and global click listener for extra visibility on web
  useEffect(() => {
    if (!DEBUG_UI) return () => {};
    console.log('[Doctors] mounted');
    const globalClick = (ev) => {
      try {
        const tag = ev && ev.target && ev.target.tagName;
        console.log('[Doctors] globalClick', { tag, x: ev.clientX, y: ev.clientY });
        try {
          if (typeof document !== 'undefined' && typeof ev.clientX === 'number') {
            try {
              // prefer explicit elements with data-sort-key and check their bounding boxes
              const elems = Array.from(document.querySelectorAll('[data-sort-key]'));
              for (const el of elems) {
                try {
                  const r = el.getBoundingClientRect();
                  if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                    const sk = el.getAttribute('data-sort-key');
                    if (sk) { console.log('[Doctors] globalClick bbox match', sk); toggleSort(sk); return; }
                  }
                } catch (e) {}
              }
              // fallback: inspect element at click point and walk up to find header text
              try {
                // find the deepest child element under the click point to avoid matching the whole header row
                let el = document.elementFromPoint(ev.clientX, ev.clientY);
                let climbed = true;
                while (el && climbed) {
                  climbed = false;
                  const children = el.children || [];
                  for (let i = 0; i < children.length; i++) {
                    const c = children[i];
                    try {
                      const r = c.getBoundingClientRect();
                      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                        el = c; climbed = true; break;
                      }
                    } catch (e) {}
                  }
                }
                // now inspect the most-specific element's text
                if (el) {
                  try {
                    const txt = (el.innerText || el.textContent || '').trim();
                    if (txt) {
                      if (txt.indexOf('Name') === 0) { console.log('[Doctors] globalClick text match', 'name'); toggleSort('name'); return; }
                      if (txt.indexOf('Specialty') === 0) { console.log('[Doctors] globalClick text match', 'specialty'); toggleSort('specialty'); return; }
                      if (txt.indexOf('Location') === 0) { console.log('[Doctors] globalClick text match', 'location'); toggleSort('location'); return; }
                      if (txt.indexOf('Email') === 0) { console.log('[Doctors] globalClick text match', 'email'); toggleSort('email'); return; }
                    }
                  } catch (e) {}
                }
              } catch (e) {}
            } catch (e) {}
          }
        } catch (e) {}
      } catch (e) {}
    };
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('click', globalClick);
    return () => { if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('click', globalClick); };
  }, []);

  function handleHeaderPress(key) {
    try {
      setHeaderPressCount(c => c + 1);
      setLastHeaderPressed(key);
      console.log('[Doctors] headerPress', key);
      try { if (DEBUG_UI) pushDebug({ source: 'Doctors', stage: 'headerPress', key, time: Date.now() }); } catch (e) {}
    } catch (e) {}
    toggleSort(key);
  }

  // Web fallback: detect clicks on header text and route to toggleSort (handles web DOM differences)
  // Removed redundant DOM fallback listener because we use a single global click scanner above

  const containerStyle = { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, flex: 1, minHeight: '60vh' };

  // prepared list for rendering (apply client-side sort if active)
  const getDoctorVal = (item, key) => {
    if (!item) return '';
    if (key === 'name') return (item.name || '');
    if (key === 'specialty') return (item.specialty || '');
    if (key === 'location') return (item.location || '');
    if (key === 'email') return (item.email || '');
    return (item[key] || '');
  };
  function compareDoctors(a, b) {
    const va = ('' + getDoctorVal(a, sortBy)).toLowerCase();
    const vb = ('' + getDoctorVal(b, sortBy)).toLowerCase();
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  }
  function getFilteredDoctors() {
    const term = (debouncedFilter || filter || '').toString().toLowerCase().trim();
    const list = doctors.slice();
    // If we have a debounced filter, the server already applied filtering —
    // prefer server results and avoid double client-side filtering.
    if (debouncedFilter) return list;
    if (!term) return list;
    return list.filter(d => {
      if (!d) return false;
      const parts = [];
      if (typeof d.id !== 'undefined' && d.id !== null) parts.push(String(d.id));
      ['name', 'specialty', 'location', 'address', 'email', 'phone'].forEach(k => { if (d[k]) parts.push(String(d[k])); });
      // include common nested location/address patterns
      try { if (d.address && typeof d.address === 'string') parts.push(d.address); } catch (e) {}
      try { if (d.location && typeof d.location === 'string') parts.push(d.location); } catch (e) {}
      try { if (d.clinic && d.clinic.address) parts.push(String(d.clinic.address)); } catch (e) {}
      try { if (d.practice && d.practice.location) parts.push(String(d.practice.location)); } catch (e) {}
      try { if (d.office && d.office.location) parts.push(String(d.office.location)); } catch (e) {}
      // common nested email/contact patterns
      try { if (d.contact && d.contact.email) parts.push(String(d.contact.email)); } catch (e) {}
      try { if (Array.isArray(d.emails)) parts.push(d.emails.join(' ')); } catch (e) {}
      // gather nested string values robustly
      const gathered = [];
      const gather = (v, depth = 0) => {
        if (depth > 5 || v == null) return;
        if (typeof v === 'string') { gathered.push(v); return; }
        if (typeof v === 'number' || typeof v === 'boolean') { gathered.push(String(v)); return; }
        if (Array.isArray(v)) { for (let i = 0; i < Math.min(v.length, 20); i++) gather(v[i], depth + 1); return; }
        if (typeof v === 'object') {
          let count = 0;
          for (const k in v) {
            if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
            try { gather(v[k], depth + 1); } catch (e) {}
            if (++count > 50) break;
          }
        }
      };
      try { gather(d, 0); } catch (e) {}
      try { if (gathered.length) parts.push(gathered.join(' ')); } catch (e) {}
      const hay = parts.join(' ').toLowerCase();
      const matched = hay.indexOf(term) !== -1;
      // debug when email search misses
      try {
        const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production'));
        if (isDev && term.indexOf('@') !== -1 && !matched) {
          try {
            console.log('[Doctors] email-miss', { id: d.id, keys: Object.keys(d || {}).slice(0,20), haySnippet: hay.slice(0,300) });
          } catch (e) {}
        }
      } catch (e) {}
      return matched;
    });
  }

  // get visible doctors (apply local filtering + server-driven sorting)
  function getVisibleDoctors() {
    const filtered = getFilteredDoctors();
    const f = filtered.slice().sort(compareDoctors);
    // If server provided pagination/meta, `doctors` already contains the page slice.
    // Detect server-driven mode by presence of server `meta.total` and return the fetched slice directly.
    if (meta && typeof meta.total === 'number' && meta.total > 0) return f;
    const start = page * itemsPerPage;
    return f.slice(start, start + itemsPerPage);
  }

  return (
    <Container>
      <Layout navigation={navigation}>
      <View style={containerStyle}>
        {/* Header / breadcrumb area */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

              <ThemedButton style={styles.iconBtn} icon={() => <MaterialCommunityIcons name="refresh" size={18} color="#0b1220" />} variant="outline" onPress={() => fetchDoctors(page + 1, debouncedFilter)} />
              <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="download" size={18} color="#0b1220" />} variant="outline" onPress={onExportCSV} />
              <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="file-pdf-box" size={16} color="#0b1220" />} variant="outline" onPress={onExportPDF} />
                      {!showInlineSearch ? (
                        <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="magnify" size={18} color="#0b1220" />} variant="outline" onPress={() => { setShowInlineSearch(true); setTimeout(() => { try { inlineSearchRef.current && inlineSearchRef.current.focus(); } catch (e) {} }, 50); }} />
                      ) : null}
                      {showInlineSearch ? (
                        <TextInput
                          ref={inlineSearchRef}
                          style={styles.inlineSearch}
                          value={filter}
                          onChangeText={handleFilterChange}
                          onBlur={() => setShowInlineSearch(false)}
                          placeholder="Search doctors..."
                          returnKeyType="search"
                        />
                      ) : null}
              <ThemedButton style={styles.createBtn} icon={() => <MaterialCommunityIcons name="plus" size={18} color="#ffffffff" />} mode="contained" onPress={handleAddDoctor}>Add</ThemedButton>
              
            </View>
          </View>
        </View>

        <View style={[tableStyles.tableContainer, { flex: 1 }]}>
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 140, paddingRight: 140 }} stickyHeaderIndices={[0]}>
              <View>
                <DataTable>
                  <DataTable.Header style={tableStyles.tableHeaderRow}>
                    <DataTable.Title style={{ flex: 2 }}>
                      <TouchableOpacity onPress={() => toggleSort('name')}>
                        <Text data-sort-key="name">Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
                      </TouchableOpacity>
                    </DataTable.Title>
                    <DataTable.Title style={{ flex: 1 }}>
                      <TouchableOpacity onPress={() => toggleSort('specialty')}>
                        <Text data-sort-key="specialty">Specialty {sortBy === 'specialty' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
                      </TouchableOpacity>
                    </DataTable.Title>
                    <DataTable.Title style={{ flex: 1.5 }}>
                      <TouchableOpacity onPress={() => toggleSort('location')}>
                        <Text data-sort-key="location">Location {sortBy === 'location' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
                      </TouchableOpacity>
                    </DataTable.Title>
                    <DataTable.Title style={{ flex: 1.5 }}>
                      <TouchableOpacity onPress={() => toggleSort('email')}>
                        <Text data-sort-key="email">Email {sortBy === 'email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
                      </TouchableOpacity>
                    </DataTable.Title>
                    <DataTable.Title style={{ width: 140, justifyContent: 'flex-end' }}>Actions</DataTable.Title>
                  </DataTable.Header>
                  </DataTable>
                </View>

                {/* control cluster (top-right inside table area) */}
                

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
                      const filtered = getFilteredDoctors();
                      const sorted = (sortBy ? filtered.slice().sort(compareDoctors) : filtered.slice());
                      let slice;
                      // If server returned paginated data (meta.total present), `doctors` already contains
                      // the current page slice — use the fetched slice directly.
                      if (meta && typeof meta.total === 'number' && meta.total > 0) {
                        slice = sorted;
                      } else {
                        const start = page * itemsPerPage;
                        slice = sorted.slice(start, start + itemsPerPage);
                      }
                      try { const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production')); if (isDev && typeof console !== 'undefined') console.log('[Doctors] render', { loading, doctorsLength: (doctors||[]).length, filteredLength: (filtered||[]).length, debouncedFilter, filter, page, itemsPerPage }); } catch (e) {}
                      return slice.map((d, i) => (
                        <DataTable.Row key={`${d.id}-${i}`} style={tableStyles.row}>
                          <DataTable.Cell style={{ flex: 2, fontWeight: '600' }}>
                            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{d.name}</Text>
                          </DataTable.Cell>
                          <DataTable.Cell style={{ flex: 1 }}>{d.specialty || '-'}</DataTable.Cell>
                          <DataTable.Cell style={{ flex: 1.5 }}>{d.location || '-'}</DataTable.Cell>
                          <DataTable.Cell style={{ flex: 1.5 }}>{d.email || '-'}</DataTable.Cell>
                          <DataTable.Cell style={{ width: 140 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <ActionCircle icon="eye" color="#eef6ff" iconColor="#0b5cff" onPress={() => navigation.push ? navigation.push('DoctorProfile', { id: d.id }) : navigation.navigate('DoctorProfile', { id: d.id })} />
                              <ActionCircle icon="pencil" color="#eef2ff" iconColor="#2365d6" onPress={() => navigation.navigate('AddDoctor', { doctor: d })} />
                              <ActionCircle icon="delete" color="#fff5f5" iconColor="#d9534f" onPress={() => { setConfirmTarget(d.id); setConfirmVisible(true); }} />
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
                {(() => {
                  const totalCount = (meta && typeof meta.total === 'number' && meta.total > 0) ? meta.total : getFilteredDoctors().length;
                  const numberOfPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
                  const labelText = `${Math.min(totalCount, (page+1)*itemsPerPage)} of ${totalCount}`;
                  return (
                    <DataTable.Pagination
                      page={page}
                      numberOfPages={numberOfPages}
                      onPageChange={(p) => { setPage(p); fetchDoctors(p + 1, debouncedFilter); }}
                      label={labelText}
                    />
                  );
                })()}
              </DataTable>
            </View>
          </View>
        </View>
        <Portal>
          <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
            <Dialog.Title>Confirm</Dialog.Title>
            <Dialog.Content>
              <Text>Delete this doctor?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
              <Button onPress={async () => {
                setConfirmVisible(false);
                if (confirmTarget) await deleteDoctor(confirmTarget);
                setConfirmTarget(null);
              }}>Delete</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
      </Layout>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  controls: { flexDirection: 'row', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, height: 44 },
  button: { backgroundColor: '#1E90FF', paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8, height: 44 },
  buttonText: { color: '#fff', fontWeight: '600' },
  exportRow: { flexDirection: 'row', marginBottom: 12 },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  cell: { flex: 1 }
  ,
  breadcrumb: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  headerTitle: { fontSize: 34, fontWeight: '700', color: '#0f1724' },
  createBtn: { backgroundColor: '#0b1220', borderRadius: 10, paddingHorizontal: 16, height: 44, justifyContent: 'center' },
  iconBtn: { marginRight: 8, borderRadius: 10, height: 40, width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tableControlsWrap: { position: 'absolute', right: 20, top: 18, zIndex: 20 },
  tableControls: { flexDirection: 'row', alignItems: 'center' },
  ctrlSmall: { marginLeft: 8, borderRadius: 10, height: 40, width: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  inlineSearch: { marginLeft: 8, height: 36, width: 220, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e6e9ef', backgroundColor: '#fff' }
  ,
  tableFooter: { borderTopWidth: 1, borderTopColor: '#eef2f7', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 6, zIndex: 30 }
});
