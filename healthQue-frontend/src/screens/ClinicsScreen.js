import React, { useEffect, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Platform, ScrollView, Switch, Dimensions } from 'react-native';
import { DataTable, Portal, Dialog, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionCircle, tableStyles } from '../components/TableUI';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useTheme } from '../theme/ThemeProvider';
import Container from '../components/Container';
import ThemedInput from '../components/ThemedInput';
import Layout from '../components/Layout';
import ThemedButton from '../components/ThemedButton';
import { fetchWithAuth, API_BASE } from '../utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pushDebug, subscribe } from '../utils/devDebug';
import Toast from 'react-native-toast-message';

export default function ClinicsScreen({ navigation }) {
  try { if (typeof console !== 'undefined') console.log('[Clinics] component init'); } catch (e) {}
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: itemsPerPage });
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;
  const { theme } = useTheme();
  const containerStyle = { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: theme.spacing?.md || 16, paddingVertical: theme.spacing?.sm || 12, flex: 1, minHeight: '60vh' };
  
  

  const getClinicVal = (item, key) => {
    if (!item) return '';
    if (key === 'name') return item.name || item.address || item.location || '';
    if (key === 'location') return item.address || item.location || '';
    if (key === 'schedule') return item.schedule ? '1' : '0';
    return item[key] || '';
  };

  

  function getFilteredClinics() {
    const term = (search || '').toString().toLowerCase().trim();
    const list = clinics.slice();
    if (!term) return list;
    // server-side search applied when `search` is set — show server results as-is to avoid double-filtering
    return list;
  }

  function getVisibleClinics() {
                      const filtered = getFilteredClinics();
                      try { const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production')); if (isDev && typeof console !== 'undefined') console.log('[Clinics] render', { loading, clinicsLength: (clinics||[]).length, filteredLength: (filtered||[]).length, search, page }); } catch (e) {}
    // If server returned paginated data (meta.total present), `clinics` already contains
    // the current page slice — use the fetched slice directly.
    if (meta && typeof meta.total === 'number' && meta.total > 0) return filtered;
    const start = page * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }
  function renderSchedule(schedule) {
    if (!schedule) return <Text style={{ color: '#666' }}>No schedule</Text>;
    let s = schedule;
    try {
      if (typeof s === 'string') s = JSON.parse(s);
    } catch (e) {
      // leave as-is
    }
    const hours = s?.hours || s || {};
    const days = [
      ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']
    ];
    return (
      <View style={styles.scheduleContainer}>
        {days.map(([key, label]) => {
          const day = hours[key] || hours[label.toLowerCase()] || [];
          const ranges = Array.isArray(day) ? day.map(r => {
            if (typeof r === 'string') return r;
            const start = r.start || r.from || r.s || '';
            const end = r.end || r.to || r.e || '';
            return start && end ? `${start}–${end}` : start || end || '-';
          }) : ['-'];
          const text = ranges.length ? ranges.join(', ') : '-';
          return (
            <View key={key} style={styles.dayRow}>
              <Text style={styles.dayName}>{label}</Text>
              <Text style={styles.dayTimes}>{text}</Text>
            </View>
          );
        })}
      </View>
    );
  }
  const filterTimer = React.useRef(null);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const inlineSearchRef = React.useRef(null);
  // Schedule modal state
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [scheduleClinicId, setScheduleClinicId] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('configure'); // 'configure' | 'view'
  const [scheduleObj, setScheduleObj] = useState({ hours: {} });
  const [scheduleDay, setScheduleDay] = useState('mon');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState('start');
  const [timePickerValue, setTimePickerValue] = useState(new Date());
  const [editingRangeIndex, setEditingRangeIndex] = useState(null);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatDays, setRepeatDays] = useState({});
  const [repeatConfirmVisible, setRepeatConfirmVisible] = useState(false);
  const [repeatConflicts, setRepeatConflicts] = useState([]);
  const [inputError, setInputError] = useState('');
  const [errorConflictingIndex, setErrorConflictingIndex] = useState(null);
  const [errorConflictingDay, setErrorConflictingDay] = useState(null);
  const [showPills, setShowPills] = useState(false);
  // track which day has add inputs visible (e.g. 'mon') or null
  const [showAddInputs, setShowAddInputs] = useState(null);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const [windowHeight, setWindowHeight] = useState(Dimensions.get('window').height);

  const deleteClinic = async (id) => {
    try {
      const r = await fetchWithAuth(`${API_BASE}/clinics/${id}`, { method: 'DELETE' });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to delete clinic');
      }
      Toast.show({ type: 'success', text1: 'Clinic deleted' });
      // refresh list
      const res = await fetchWithAuth(`${API_BASE}/clinics`);
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : (json || []);
      setClinics(list);
      try { pushDebug({ source: 'Clinics', stage: 'afterDeleteRefresh', count: list.length, sample: list.slice(0,3).map(c=>({id:c.id,name:c.name||c.address||c.location})) }); } catch (e) {}
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Delete failed', text2: e.message });
    }
  };

  // load clinics from server (called on mount and when page/search changes)
  async function loadClinics(p = page) {
    try { if (typeof console !== 'undefined') console.log('[Clinics] loadClinics', { page: p, search }); } catch (e) {}
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p + 1), limit: String(itemsPerPage) });
      const fv = (search || '').toString().trim();
      if (fv) params.set('filter', fv);
      const res = await fetchWithAuth(`${API_BASE}/clinics?${params.toString()}`);
      try { if (typeof console !== 'undefined') console.log('[Clinics] fetchWithAuth called'); } catch (e) {}
      const json = await res.json();
      try { if (typeof console !== 'undefined') console.log('[Clinics] fetch result', json && (json.meta || { length: (json.data||[]).length })); } catch (e) {}
      const list = Array.isArray(json.data) ? json.data : (json.data || []);
      setClinics(list || []);
      // if server returns meta, store it and adjust page/itemsPerPage as needed
      try {
        if (json.meta) {
          setMeta({ total: json.meta.total || 0, page: json.meta.page || 1, limit: json.meta.limit || itemsPerPage });
          // Preserve client `page` state; update meta but do not override client page
          if (json.meta) setMeta({ total: json.meta.total || 0, page: json.meta.page || 1, limit: json.meta.limit || itemsPerPage });
        }
      } catch (e) {}
    } catch (e) {
      console.warn('loadClinics error', e);
      Toast.show({ type: 'error', text1: 'Clinics load error', text2: e.message });
    } finally {
      setLoading(false);
    }
  }

  // Schedule modal helpers
  const openScheduleModal = async (clinic, mode = 'configure') => {
    try {
      setScheduleClinicId(clinic?.id || null);
      setScheduleMode(mode);
      // parse existing schedule if present
      let s = { hours: {} };
      if (clinic && clinic.schedule) {
        try { s = typeof clinic.schedule === 'string' ? JSON.parse(clinic.schedule) : clinic.schedule; } catch (e) { s = clinic.schedule || { hours: {} }; }
      }
      // if viewing, fetch fresh
      if (mode === 'view' && clinic && clinic.id) {
        const res = await fetchWithAuth(`${API_BASE}/clinics/${clinic.id}`);
        const json = await res.json().catch(() => ({}));
        const data = json && json.data ? json.data : json;
        if (data && data.schedule) {
          try { s = typeof data.schedule === 'string' ? JSON.parse(data.schedule) : data.schedule; } catch (e) { s = data.schedule || s; }
        }
      }
      setScheduleObj(s || { hours: {} });
      // show pills automatically when viewing an existing schedule with ranges
      try {
        const hasAny = s && s.hours && Object.keys(s.hours).some(d => Array.isArray(s.hours[d]) && s.hours[d].length > 0);
        setShowPills(mode === 'view' && !!hasAny);
      } catch (e) { setShowPills(false); }
      // default selected day
      setScheduleDay('mon');
      setRangeStart('');
      setRangeEnd('');
      setScheduleVisible(true);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Schedule load failed', text2: e.message });
    }
  };

  const addRange = () => {
    const day = scheduleDay || 'mon';
    const cur = { ...(scheduleObj || {}) };
    if (!cur.hours) cur.hours = {};
    if (!Array.isArray(cur.hours[day])) cur.hours[day] = [];
    // normalize inputs to HH:MM and numeric minutes
    const normalize = (s) => ('' + (s || '')).trim().slice(0,5);
    const toMinutes = (hhmm) => {
      const parts = (hhmm || '').split(':');
      const hh = Number(parts[0] || 0);
      const mm = Number(parts[1] || 0);
      return hh * 60 + mm;
    };
    const s = normalize(rangeStart);
    const e = normalize(rangeEnd);
    const sMin = toMinutes(s);
    const eMin = toMinutes(e);
    if (!s || !e || isNaN(sMin) || isNaN(eMin) || sMin >= eMin) {
      setInputError('Start must be before end (HH:MM)');
      setErrorConflictingIndex(null);
      setErrorConflictingDay(null);
      return Toast.show({ type: 'error', text1: 'Invalid time', text2: 'Start must be before end (HH:MM)'});
    }

    // check overlap against existing ranges for the day
    const overlaps = (aStart, aEnd, bStart, bEnd) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
    const existing = cur.hours[day] || [];

    // When editing, exclude the editing index from overlap checks
    for (let i = 0; i < existing.length; i++) {
      if (editingRangeIndex !== null && i === editingRangeIndex) continue;
      const r = existing[i];
      const rs = toMinutes((r.start || r.from || r.s || '').slice(0,5));
      const re = toMinutes((r.end || r.to || r.e || '').slice(0,5));
      if (overlaps(sMin, eMin, rs, re)) {
        setInputError('New slot overlaps existing slot');
        setErrorConflictingIndex(i);
        setErrorConflictingDay(day);
        return Toast.show({ type: 'error', text1: 'Overlap', text2: 'New slot overlaps existing slot' });
      }
    }

    // dedupe identical ranges
    const key = `${s}|${e}`;
    const existsSame = existing.some(r => `${(r.start||r.from||r.s||'').slice(0,5)}|${(r.end||r.to||r.e||'').slice(0,5)}` === key);
    if (existsSame && editingRangeIndex === null) { setInputError('This slot already exists'); return Toast.show({ type: 'info', text1: 'Duplicate', text2: 'This slot already exists' }); }

    if (editingRangeIndex !== null && typeof editingRangeIndex === 'number') {
      cur.hours[day][editingRangeIndex] = { start: s, end: e };
      setEditingRangeIndex(null);
    } else {
      cur.hours[day].push({ start: s, end: e });
    }
    setScheduleObj(cur);
    // show the compact pills area under the day tabs after adding
    setShowPills(true);
    // hide the add inputs after a successful add
    setShowAddInputs(null);
    // clear errors on successful add
    setInputError('');
    setErrorConflictingIndex(null);
    setErrorConflictingDay(null);
  };

  const removeRange = (day, idx) => {
    const cur = { ...(scheduleObj || {}) };
    if (!cur.hours || !Array.isArray(cur.hours[day])) return;
    cur.hours[day] = cur.hours[day].filter((_, i) => i !== idx);
    setScheduleObj(cur);
  };

  const editRange = (day, idx) => {
    const r = scheduleObj?.hours?.[day]?.[idx];
    if (!r) return;
    setScheduleDay(day);
    setRangeStart(r.start || r.from || r.s || '');
    setRangeEnd(r.end || r.to || r.e || '');
    setEditingRangeIndex(idx);
    // ensure inputs are visible when editing for that specific day
    setShowAddInputs(day);
  };

  const formatAMPM = (hhmm) => {
    if (!hhmm) return '';
    const [hh, mm] = hhmm.split(':').map(n => Number(n));
    if (isNaN(hh) || isNaN(mm)) return hhmm;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h = ((hh + 11) % 12) + 1;
    return `${h}:${String(mm).padStart(2, '0')} ${ampm}`;
  };

  const openTimePicker = (target) => {
    try { if (typeof console !== 'undefined') console.log('[Clinics] openTimePicker', { target }); } catch (e) {}
    setTimePickerTarget(target);
    const cur = (target === 'start' ? rangeStart : rangeEnd) || '09:00';
    const [hh, mm] = cur.split(':');
    const d = new Date();
    d.setHours(Number(hh || 0), Number(mm || 0), 0, 0);
    setTimePickerValue(d);
    setShowTimePicker(true);
  };

  const onTimeChange = (event, selected) => {
    if (!selected) {
      setShowTimePicker(Platform.OS === 'ios');
      return;
    }
    const dt = selected || timePickerValue;
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    const formatted = `${hh}:${mm}`;
    if (timePickerTarget === 'start') setRangeStart(formatted);
    else setRangeEnd(formatted);
    setTimePickerValue(dt);
    if (Platform.OS !== 'ios') setShowTimePicker(false);
  };

  const saveSchedule = async () => {
    if (!scheduleClinicId) return Toast.show({ type: 'error', text1: 'No clinic selected' });
    try {
      // If repeatWeekly and user selected days, prepare to copy current day's ranges
      const selRepeatDays = Object.keys(repeatDays || {}).filter(d => repeatDays[d]);
      if (repeatWeekly && selRepeatDays.length > 0) {
        const src = (scheduleObj && scheduleObj.hours && Array.isArray(scheduleObj.hours[scheduleDay]) ? scheduleObj.hours[scheduleDay] : []);
        if (!src || src.length === 0) return Toast.show({ type: 'info', text1: 'Nothing to replicate', text2: 'No ranges on the selected day to replicate' });
        // detect conflicts
        const conflicts = selRepeatDays.filter(d => (scheduleObj.hours && Array.isArray(scheduleObj.hours[d]) && scheduleObj.hours[d].length > 0));
        if (conflicts.length > 0) {
          setRepeatConflicts(conflicts);
          setRepeatConfirmVisible(true);
          return;
        }
        // no conflicts -> copy into a local copy of scheduleObj and continue
        const sObj = JSON.parse(JSON.stringify(scheduleObj || { hours: {} }));
        selRepeatDays.forEach(d => { sObj.hours[d] = (sObj.hours[scheduleDay] || []).map(x => ({ start: (x.start||'').slice(0,5), end: (x.end||'').slice(0,5) })); });
        // use sObj for normalization below
        const normalizeDay = (arr) => {
          if (!Array.isArray(arr) || arr.length === 0) return [];
          const seen = new Map();
          arr.forEach(r => {
            const sVal = (r.start||r.from||r.s||'').slice(0,5).trim();
            const eVal = (r.end||r.to||r.e||'').slice(0,5).trim();
            const k = `${sVal}|${eVal}`;
            if (!seen.has(k)) seen.set(k, { start: sVal, end: eVal });
          });
          const vals = Array.from(seen.values());
          vals.sort((a,b) => {
            const ta = a.start.split(':').map(Number); const tb = b.start.split(':').map(Number);
            return (ta[0]*60+ (ta[1]||0)) - (tb[0]*60 + (tb[1]||0));
          });
          return vals;
        };
        const normalized = { hours: {} };
        if (sObj && sObj.hours) {
          Object.keys(sObj.hours).forEach(d => {
            const arr = sObj.hours[d] || [];
            const out = normalizeDay(arr);
            if (out.length) normalized.hours[d] = out;
          });
        }
        const payload = { schedule: normalized };
        const res = await fetchWithAuth(`${API_BASE}/clinics/${scheduleClinicId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || 'Save failed');
        }
        Toast.show({ type: 'success', text1: 'Schedule saved' });
        setScheduleVisible(false);
        loadClinics(page);
        return;
      }
      // Normalize schedule: dedupe identical ranges per day and sort ascending by start
      const normalizeDay = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return [];
        const seen = new Map();
        arr.forEach(r => {
          const sVal = (r.start||r.from||r.s||'').slice(0,5).trim();
          const eVal = (r.end||r.to||r.e||'').slice(0,5).trim();
          const k = `${sVal}|${eVal}`;
          if (!seen.has(k)) seen.set(k, { start: sVal, end: eVal });
        });
        const vals = Array.from(seen.values());
        // sort by start time
        vals.sort((a,b) => {
          const ta = a.start.split(':').map(Number); const tb = b.start.split(':').map(Number);
          return (ta[0]*60+ (ta[1]||0)) - (tb[0]*60 + (tb[1]||0));
        });
        return vals;
      };
      const normalized = { hours: {} };
      if (scheduleObj && scheduleObj.hours) {
        Object.keys(scheduleObj.hours).forEach(d => {
          const arr = scheduleObj.hours[d] || [];
          const out = normalizeDay(arr);
          if (out.length) normalized.hours[d] = out;
        });
      }
      const payload = { schedule: normalized };
      const res = await fetchWithAuth(`${API_BASE}/clinics/${scheduleClinicId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Save failed');
      }
      Toast.show({ type: 'success', text1: 'Schedule saved' });
      setScheduleVisible(false);
      // refresh list
      loadClinics(page);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: e.message });
    }
  };

  useEffect(() => {
    const handler = ({ window }) => {
      setWindowWidth(window.width);
      setWindowHeight(window.height);
    };
    Dimensions.addEventListener && Dimensions.addEventListener('change', handler);
    return () => { Dimensions.removeEventListener && Dimensions.removeEventListener('change', handler); };
  }, []);

  useEffect(() => {
    // clear inline errors when switching day
    setInputError('');
    setErrorConflictingIndex(null);
    setErrorConflictingDay(null);
  }, [scheduleDay]);

  // live-validate the currently edited/being-added range and keep overlap error until fixed
  useEffect(() => {
    if (!showAddInputs || showAddInputs !== scheduleDay) return;
    const day = scheduleDay || 'mon';
    const normalize = (s) => ('' + (s || '')).trim().slice(0,5);
    const toMinutes = (hhmm) => {
      const parts = (hhmm || '').split(':');
      const hh = Number(parts[0] || 0);
      const mm = Number(parts[1] || 0);
      if (isNaN(hh) || isNaN(mm)) return NaN;
      return hh * 60 + mm;
    };
    const s = normalize(rangeStart);
    const e = normalize(rangeEnd);
    const sMin = toMinutes(s);
    const eMin = toMinutes(e);
    if (!s || !e || isNaN(sMin) || isNaN(eMin) || sMin >= eMin) {
      // keep the format error visible so user knows why it's invalid
      setInputError('Start must be before end (HH:MM)');
      setErrorConflictingIndex(null);
      setErrorConflictingDay(null);
      return;
    }
    const overlaps = (aStart, aEnd, bStart, bEnd) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
    const existing = (scheduleObj && scheduleObj.hours && Array.isArray(scheduleObj.hours[day]) ? scheduleObj.hours[day] : []);
    for (let i = 0; i < existing.length; i++) {
      if (editingRangeIndex !== null && i === editingRangeIndex) continue;
      const r = existing[i];
      const rs = toMinutes((r.start || r.from || r.s || '').slice(0,5));
      const re = toMinutes((r.end || r.to || r.e || '').slice(0,5));
      if (isNaN(rs) || isNaN(re)) continue;
      if (overlaps(sMin, eMin, rs, re)) {
        setInputError('New slot overlaps existing slot');
        setErrorConflictingIndex(i);
        setErrorConflictingDay(day);
        return;
      }
    }
    // no overlaps
    setInputError('');
    setErrorConflictingIndex(null);
    setErrorConflictingDay(null);
  }, [rangeStart, rangeEnd, scheduleObj, scheduleDay, editingRangeIndex, showAddInputs]);

  useEffect(() => { loadClinics(page); }, [page, search]);

  // Stronger focus handler: reload and reset to first page when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      try { if (typeof console !== 'undefined') console.log('[Clinics] useFocusEffect -> reload'); } catch (e) {}
      setPage(0);
      loadClinics(0);
      return () => {};
    }, [search])
  );

  if (loading) return (
    <Container><Layout navigation={navigation}><View style={styles.center}><Text>Loading...</Text></View></Layout></Container>
  );

  const doc = profile?.doctor;

  

  

  

  function exportCsv() {
    try {
      const rows = getFilteredClinics().map(c => ({ id: c.id, name: c.name || '', location: c.address || c.location || '', schedule: c.schedule ? 'configured' : 'none' }));
      const header = ['id','name','location','schedule'];
      const csv = [header.join(',')].concat(rows.map(r => header.map(h => `"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))).join('\n');
      if (typeof window !== 'undefined' && window.navigator && window.URL && window.Blob) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clinics_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        // fallback: show CSV in new window
        console.warn('Export CSV: fallback');
        alert('CSV export is available on web only.');
      }
    } catch (e) {
      console.warn('export fail', e);
    }
  }

  const onExportPDF = () => {
    try {
      const doc = new jsPDF();
      const columns = ['ID', 'Name', 'Location', 'Schedule'];
      const rows = (clinics || []).map(c => [c.id || '', (c.name || ''), (c.address || c.location || ''), c.schedule ? 'Configured' : 'None']);
      doc.autoTable({ head: [columns], body: rows });
      doc.save('clinics.pdf');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'PDF export failed', text2: e.message });
    }
  };

  return (
    <Container>
      <Layout navigation={navigation}>
        <View style={containerStyle}>
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedButton style={styles.iconBtn} icon={() => <MaterialCommunityIcons name="refresh" size={18} color="#0b1220" />} variant="outline" onPress={() => loadClinics(0)} />
                <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="download" size={18} color="#0b1220" />} variant="outline" onPress={exportCsv} />
                <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="file-pdf-box" size={16} color="#0b1220" />} variant="outline" onPress={onExportPDF} />
                {!showInlineSearch ? (
                  <ThemedButton style={styles.ctrlSmall} icon={() => <MaterialCommunityIcons name="magnify" size={18} color="#0b1220" />} variant="outline" onPress={() => { setShowInlineSearch(true); setTimeout(() => { try { inlineSearchRef.current && inlineSearchRef.current.focus(); } catch (e) {} }, 50); }} />
                ) : null}
                {showInlineSearch ? (
                  <TextInput ref={inlineSearchRef} style={styles.inlineSearch} value={search} onChangeText={(t) => { setSearch(t); if (filterTimer.current) clearTimeout(filterTimer.current); filterTimer.current = setTimeout(() => { setPage(0); filterTimer.current = null; }, 350); }} onBlur={() => setShowInlineSearch(false)} placeholder="Search clinics..." />
                ) : null}
                <ThemedButton style={styles.createBtn} icon={() => <MaterialCommunityIcons name="plus" size={18} color="#fff" />} mode="contained" onPress={() => navigation.navigate('ClinicEdit')}>Add</ThemedButton>
              </View>
            </View>
          </View>
          {clinics.length === 0 ? (
            <View style={{ padding: 12 }}><Text>No clinics found.</Text></View>
          ) : (
            <View style={[styles.tableContainer, { flex: 1 }] }>
              

              <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} stickyHeaderIndices={[0]}>
                  <View>
                    <DataTable>
                      <DataTable.Header style={tableStyles.tableHeaderRow}>
                        <DataTable.Title style={tableStyles.colName}>
                          <Text style={{ fontWeight: '700' }}>Name</Text>
                        </DataTable.Title>
                        <DataTable.Title style={tableStyles.colLocation}>
                          <Text style={{ fontWeight: '700' }}>Location</Text>
                        </DataTable.Title>
                        <DataTable.Title style={tableStyles.colDescription}>
                          <Text style={{ fontWeight: '700' }}>Description</Text>
                        </DataTable.Title>
                        <DataTable.Title style={tableStyles.colSchedule}>
                          <Text style={{ fontWeight: '700' }}>Schedule</Text>
                        </DataTable.Title>
                        <DataTable.Title style={{ width: 140, justifyContent: 'flex-end' }} numeric>Actions</DataTable.Title>
                      </DataTable.Header>
                    </DataTable>
                  </View>

                  <View>
                    <DataTable>
                      {getVisibleClinics().map((item, i) => {
                        const name = item.name || item.address || item.location || `Clinic ${item.id}`;
                        const location = item.address || item.location || '-';
                        return (
                          <DataTable.Row key={`${item.id}-${i}`} style={[styles.row, tableStyles.row] }>
                            <DataTable.Cell style={tableStyles.colName}>{name}</DataTable.Cell>
                            <DataTable.Cell style={tableStyles.colLocation}>{location}</DataTable.Cell>
                            <DataTable.Cell style={tableStyles.colDescription}>{item.description ? (item.description.length > 80 ? item.description.slice(0,77) + '...' : item.description) : '-'}</DataTable.Cell>
                            <DataTable.Cell style={tableStyles.colSchedule}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {item.schedule ? (
                                  <ThemedButton style={styles.smallBtn} variant="outline" onPress={() => openScheduleModal(item, 'view')} icon={() => <MaterialCommunityIcons name="refresh" size={18} color="#0b1220" />}>Configured</ThemedButton>
                                ) : (
                                  <ThemedButton style={styles.smallBtn} variant="outline" onPress={() => openScheduleModal(item, 'configure')} icon={() => <MaterialCommunityIcons name="magnify" size={18} color="#0b1220" />}>Configure</ThemedButton>
                                )}
                              </View>
                            </DataTable.Cell>
                            <DataTable.Cell style={{ width: 140 }} numeric>
                              <View style={styles.actionRow}>
                                <ActionCircle icon="eye" color="#eef2ff" iconColor="#2365d6" onPress={() => navigation.navigate('ClinicDetails', { clinicId: item.id })} />
                                <ActionCircle icon="pencil" color="#eefcf0" iconColor="#2e8b57" onPress={() => navigation.navigate('ClinicEdit', { clinicId: item.id })} />
                                <ActionCircle icon="delete" color="#fff5f5" iconColor="#d9534f" onPress={() => { setConfirmTarget(item.id); setConfirmVisible(true); }} />
                              </View>
                            </DataTable.Cell>
                          </DataTable.Row>
                        );
                      })}
                    </DataTable>
                  </View>

                  <View>
                    <DataTable>
                      {(() => {
                        const totalCount = (typeof meta === 'object' && typeof meta.total === 'number' && meta.total > 0) ? meta.total : getFilteredClinics().length;
                        const numberOfPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
                        const label = `${Math.min(totalCount, (page+1)*itemsPerPage)} of ${totalCount}`;
                        return (
                          <DataTable.Pagination
                            page={page}
                            numberOfPages={numberOfPages}
                            onPageChange={p => { setPage(p); loadClinics(p); }}
                            label={label}
                          />
                        );
                      })()}
                    </DataTable>
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </Layout>
      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Confirm</Dialog.Title>
          <Dialog.Content>
            <Text>Delete this clinic?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
            <Button onPress={async () => { setConfirmVisible(false); if (confirmTarget) await deleteClinic(confirmTarget); setConfirmTarget(null); }}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={scheduleVisible} onDismiss={() => setScheduleVisible(false)} style={{ maxWidth: 960, width: '95%', alignSelf: 'center' }}>
          <Dialog.Content style={{ maxHeight: Math.max(400, windowHeight * 0.85) }}>
            <View style={styles.scheduleHeader}>
              <View>
                <Text style={styles.headerSub}>Set your day wise availability and timings</Text>
              </View>
              <Pressable onPress={() => setScheduleVisible(false)} style={{ padding: 8, borderRadius: 20 }}>
                <MaterialCommunityIcons name="close" size={20} color="#333" />
              </Pressable>
            </View>

            <ScrollView horizontal contentContainerStyle={styles.tabsRow} showsHorizontalScrollIndicator={false}>
              {[['mon','Mon'], ['tue','Tue'], ['wed','Wed'], ['thu','Thu'], ['fri','Fri'], ['sat','Sat'], ['sun','Sun']].map(([k,label]) => (
                <Pressable key={k} onPress={() => setScheduleDay(k)} style={[styles.tabItem, scheduleDay===k ? styles.tabActive : null]}>
                  <Text style={[{ fontWeight: scheduleDay===k ? '700' : '600' }]}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {(() => {
              const twoCol = windowWidth >= 900;
              return (
                <View style={{ flexDirection: twoCol ? 'row' : 'column', gap: 16, marginTop: 12 }}>
                  <View style={[styles.availabilityCard, !twoCol ? { marginBottom: 12 } : null]}>
                

                {/* pills moved to the right column (under day selector) to avoid duplication */}

                {/* left-side add link removed; add controls live in the right column */}

                <View style={{ marginTop: 16 }}>
                  <View style={styles.dayTableRowHeader}><Text style={{ fontWeight: '700' }}>Day</Text><Text style={{ fontWeight: '700' }}>Availability</Text></View>
                  {['mon','tue','wed','thu','fri','sat','sun'].map(d => {
                    const dayArr = scheduleObj?.hours?.[d] || [];
                    return (
                      <View key={d} style={styles.dayTableRow}>
                        <Text style={{ width: 80 }}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                        <View style={{ flex: 1 }}>
                          {Array.isArray(dayArr) && dayArr.length ? (
                            <View style={styles.pillContainer}>
                              {dayArr.map((r, i) => {
                                const start = (r.start || r.from || r.s || '').slice(0,5);
                                const end = (r.end || r.to || r.e || '').slice(0,5);
                                const label = (start && end) ? `${formatAMPM(start)} – ${formatAMPM(end)}` : (start || end || '-');
                                return (
                                  <View key={i} style={styles.smallTimePill}>
                                    <Text style={styles.smallTimeText}>{label}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          ) : (
                            <Text>Not Available</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

                  <View style={[styles.formCard, !twoCol ? { width: '100%' } : null]}>
                <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Add Availability</Text>
                <View style={{ marginBottom: 12 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[['mon','Monday'],['tue','Tuesday'],['wed','Wednesday'],['thu','Thursday'],['fri','Friday'],['sat','Saturday'],['sun','Sunday']].map(([k,label]) => (
                      <Pressable key={k} onPress={() => setScheduleDay(k)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: scheduleDay===k ? '#2b6ef6' : '#eee', borderRadius: 8, marginRight: 8 }}><Text>{label}</Text></Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* message under the days */}
                <Text style={{ color: '#6b7280', marginBottom: 8 }}>Setting up schedule for {scheduleDay === 'mon' ? 'Monday' : scheduleDay === 'tue' ? 'Tuesday' : scheduleDay === 'wed' ? 'Wednesday' : scheduleDay === 'thu' ? 'Thursday' : scheduleDay === 'fri' ? 'Friday' : scheduleDay === 'sat' ? 'Saturday' : 'Sunday'}.</Text>

                {/* show compact pills under the day selector after an Add occurs */}
                {showPills && (scheduleObj?.hours?.[scheduleDay] || []).length > 0 ? (
                        <View style={{ marginBottom: 12 }}>
                    <ScrollView style={{ maxHeight: ((scheduleObj?.hours?.[scheduleDay] || []).length > 3 ? 160 : undefined) }} showsVerticalScrollIndicator={true}>
                      {(scheduleObj?.hours?.[scheduleDay] || []).map((r, idx) => {
                        const isConflict = (errorConflictingDay === scheduleDay && errorConflictingIndex === idx);
                        const label = `${formatAMPM(r.start)} – ${formatAMPM(r.end)}`;
                        return (
                          <View key={idx} style={styles.timeRow}>
                            <View style={[styles.timePill, isConflict ? { borderColor: '#d9534f', borderWidth: 1, backgroundColor: '#fff5f5' } : null]}>
                              <Text style={{ fontWeight: '600', color: isConflict ? '#b0303a' : '#000' }}>{label}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <Pressable onPress={() => { editRange(scheduleDay, idx); }} style={styles.iconBtnSmall}><MaterialCommunityIcons name="pencil" size={16} color="#333" /></Pressable>
                              <Pressable onPress={() => removeRange(scheduleDay, idx)} style={styles.iconBtnSmall}><MaterialCommunityIcons name="delete" size={16} color="#d9534f" /></Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {/* show plus button to reveal inputs, hide inputs again after adding */}
                {!(showAddInputs === scheduleDay) ? (
                    <Pressable onPress={() => { setShowAddInputs(scheduleDay); setRangeStart(''); setRangeEnd(''); setEditingRangeIndex(null); setInputError(''); setErrorConflictingIndex(null); setErrorConflictingDay(null); }} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2b6ef6', alignSelf: 'flex-start', marginBottom: 12 }}>
                    <Text style={{ color: '#2b6ef6', fontWeight: '700' }}>+ Add Time</Text>
                  </Pressable>
                ) : (
                  <View style={{ flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Pressable onPress={() => openTimePicker('start')} style={[{ flex: 1, borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 8 }, inputError ? { borderColor: '#d9534f' } : null]}>
                        <Text style={{ color: inputError ? '#b0303a' : '#000' }}>{formatAMPM(rangeStart)}</Text>
                      </Pressable>
                      <Pressable onPress={() => openTimePicker('end')} style={[{ flex: 1, borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 8 }, inputError ? { borderColor: '#d9534f' } : null]}>
                        <Text style={{ color: inputError ? '#b0303a' : '#000' }}>{formatAMPM(rangeEnd)}</Text>
                      </Pressable>
                      <Pressable onPress={() => { setShowAddInputs(null); setRangeStart(''); setRangeEnd(''); setEditingRangeIndex(null); setInputError(''); setErrorConflictingIndex(null); setErrorConflictingDay(null); }} style={styles.iconBtnSmall}>
                        <MaterialCommunityIcons name="close" size={16} color="#666" />
                      </Pressable>
                    </View>
                    {inputError ? <Text style={{ color: '#d9534f', marginTop: 6 }}>{inputError}</Text> : null}
                  </View>
                )}

                <Pressable onPress={() => setRepeatWeekly(!repeatWeekly)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' }}>{repeatWeekly ? <MaterialCommunityIcons name="check" size={14} color="#2b6ef6" /> : null}</View>
                  <Text>Repeat weekly</Text>
                </Pressable>
                {repeatWeekly ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ marginBottom: 6, color: '#374151' }}>Apply same availability to:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {[['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat'],['sun','Sun']].map(([k,label]) => (
                        <Pressable key={k} onPress={() => setRepeatDays(prev => ({ ...(prev||{}), [k]: !prev?.[k] }))} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: repeatDays[k] ? '#2b6ef6' : '#eee', marginRight: 8 }}>
                          <Text style={{ color: repeatDays[k] ? '#2b6ef6' : '#111', fontWeight: repeatDays[k] ? '700' : '600' }}>{label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>Select days to copy this day's availability to when saving.</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <ThemedButton variant="outline" onPress={addRange} style={{ flex: 1, borderColor: '#2b6ef6' }}>Add</ThemedButton>
                  <ThemedButton mode="contained" onPress={saveSchedule} style={[styles.saveBtn, { flex: 2 }]}>Save</ThemedButton>
                </View>
              </View>
                </View>
              );
            })()}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setScheduleVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
            <Dialog visible={repeatConfirmVisible} onDismiss={() => setRepeatConfirmVisible(false)}>
              <Dialog.Title>Confirm overwrite</Dialog.Title>
              <Dialog.Content>
                <Text>The following days already have availability and will be overwritten:</Text>
                <View style={{ marginTop: 8 }}>
                  {(repeatConflicts || []).map(d => <Text key={d}>• {d.charAt(0).toUpperCase() + d.slice(1)}</Text>)}
                </View>
                <Text style={{ marginTop: 12 }}>Do you want to overwrite them with the schedule from the selected day?</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setRepeatConfirmVisible(false)}>Cancel</Button>
                <Button onPress={async () => {
                  try {
                    // apply overwrite and save
                    const selRepeatDays = Object.keys(repeatDays || {}).filter(d => repeatDays[d]);
                    const sObj = JSON.parse(JSON.stringify(scheduleObj || { hours: {} }));
                    selRepeatDays.forEach(d => { sObj.hours[d] = (sObj.hours[scheduleDay] || []).map(x => ({ start: (x.start||'').slice(0,5), end: (x.end||'').slice(0,5) })); });
                    // normalize and send
                    const normalizeDay = (arr) => {
                      if (!Array.isArray(arr) || arr.length === 0) return [];
                      const seen = new Map();
                      arr.forEach(r => {
                        const sVal = (r.start||r.from||r.s||'').slice(0,5).trim();
                        const eVal = (r.end||r.to||r.e||'').slice(0,5).trim();
                        const k = `${sVal}|${eVal}`;
                        if (!seen.has(k)) seen.set(k, { start: sVal, end: eVal });
                      });
                      const vals = Array.from(seen.values());
                      vals.sort((a,b) => {
                        const ta = a.start.split(':').map(Number); const tb = b.start.split(':').map(Number);
                        return (ta[0]*60+ (ta[1]||0)) - (tb[0]*60 + (tb[1]||0));
                      });
                      return vals;
                    };
                    const normalized = { hours: {} };
                    if (sObj && sObj.hours) {
                      Object.keys(sObj.hours).forEach(d => {
                        const arr = sObj.hours[d] || [];
                        const out = normalizeDay(arr);
                        if (out.length) normalized.hours[d] = out;
                      });
                    }
                    const payload = { schedule: normalized };
                    const res = await fetchWithAuth(`${API_BASE}/clinics/${scheduleClinicId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error || err.message || 'Save failed');
                    }
                    Toast.show({ type: 'success', text1: 'Schedule saved' });
                    setRepeatConfirmVisible(false);
                    setScheduleVisible(false);
                    loadClinics(page);
                  } catch (e) {
                    Toast.show({ type: 'error', text1: 'Save failed', text2: e.message });
                  }
                }}>Overwrite</Button>
              </Dialog.Actions>
            </Dialog>
        {/* time picker: native on mobile, dialog fallback on web */}
        {showTimePicker && Platform.OS === 'web' ? (
          <Dialog visible={showTimePicker} onDismiss={() => setShowTimePicker(false)}>
            <Dialog.Title>Select time</Dialog.Title>
            <Dialog.Content>
              <ThemedInput value={timePickerTarget === 'start' ? rangeStart : rangeEnd} onChangeText={t => { if (timePickerTarget === 'start') setRangeStart(t); else setRangeEnd(t); }} placeholder="HH:MM" />
              <Text style={{ color: '#666', marginTop: 8, fontSize: 12 }}>Enter time as HH:MM (24h)</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowTimePicker(false)}>Cancel</Button>
              <Button onPress={() => { setShowTimePicker(false); try { if (typeof console !== 'undefined') console.log('[Clinics] web time selected', { target: timePickerTarget, value: timePickerTarget === 'start' ? rangeStart : rangeEnd }); } catch (e) {} }}>OK</Button>
            </Dialog.Actions>
          </Dialog>
        ) : (showTimePicker ? (
          <DateTimePicker
            value={timePickerValue}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        ) : null)}
      </Portal>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  tableContainer: { borderRadius: 8, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', overflow: 'hidden' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  tableHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  searchInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, width: 240 },
  tableHeader: { backgroundColor: '#fafafa' },
  colName: { flex: 2 },
  colLocation: { flex: 2 },
  colSchedule: { flex: 1 },
  colActions: { flex: 1 },
  row: { height: 56 },
  badge: { backgroundColor: '#e6f7ff', color: '#007acc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  badgeMuted: { backgroundColor: '#f5f5f5', color: '#777', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }
  ,
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#6b7280', marginTop: 4 },
  headerAdd: { backgroundColor: '#2b6ef6', borderRadius: 8, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  tabsRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  tabItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginRight: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2b6ef6' },
  availabilityCard: { flex: 1, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  formCard: { width: 340, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timePill: { backgroundColor: '#f5f7fb', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  iconBtnSmall: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0' },
  addTimeLink: { marginTop: 6 },
  dayTableRowHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f4f6f9' },
  dayTableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#fafafa' },
  saveBtn: { marginTop: 6, backgroundColor: '#2b6ef6' },
  breadcrumb: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  headerTitle: { fontSize: 34, fontWeight: '700', color: '#0f1724' },
  createBtn: { backgroundColor: '#0b1220', borderRadius: 10, paddingHorizontal: 16, height: 44, justifyContent: 'center' },
  iconBtn: { marginRight: 8, borderRadius: 10, height: 40, width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  ctrlSmall: { marginLeft: 8, borderRadius: 10, height: 40, width: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  inlineSearch: { marginLeft: 8, height: 36, width: 220, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e6e9ef', backgroundColor: '#fff' },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, height: 36, minWidth: 120, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tableFooter: { borderTopWidth: 1, borderTopColor: '#eef2f7', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 6, zIndex: 30 },
  scheduleContainer: { flexDirection: 'column' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  dayName: { fontWeight: '600', color: '#333' },
  dayTimes: { color: '#666' }
  ,
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  smallTimePill: { backgroundColor: '#eef6ff', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 6 },
  smallTimeText: { fontSize: 12, color: '#0b1220', fontWeight: '600' }
});
