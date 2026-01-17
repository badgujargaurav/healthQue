import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Image } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import DevOverlay from './DevOverlay';
import { fetchWithAuth, API_BASE } from '../utils/api';
import { useProfile } from '../contexts/ProfileContext';

export default function Layout({ children, navigation }) {
  const { theme } = useTheme();
  const width = Dimensions.get('window').width;
  const showSidebar = width >= 900;

  

  const [navItems, setNavItems] = useState([
    { key: 'Dashboard', label: 'Dashboard' },
    { key: 'Patients', label: 'Patients' },
    { key: 'Appointments', label: 'Appointments' },
    // Doctors will be conditionally added for admin
    { key: 'Settings', label: 'Settings' }
  ]);

  const [logoUrl, setLogoUrl] = useState(null);
  const { profile } = useProfile();

  useEffect(() => {
    if (!profile) return;
    if (profile.logo_url) setLogoUrl(profile.logo_url);
    if (profile.role === 'admin') {
      setNavItems(prev => {
        if (prev.find(p => p.key === 'Doctors')) return prev;
        const copy = prev.slice();
        copy.splice(1, 0, { key: 'Doctors', label: 'Doctors' });
        return copy;
      });
    }
    if (profile.role === 'doctor') {
      setNavItems(prev => {
        if (prev.find(p => p.key === 'Clinics')) return prev;
        const copy = prev.slice();
        copy.splice(1, 0, { key: 'Clinics', label: 'Clinics' });
        return copy;
      });
    }
  }, [profile]);

  // map child/detail routes to their top-level parent (used by breadcrumb and sidebar highlighting)
  const parentMap = {
    ClinicEdit: 'Clinics',
    ClinicDetails: 'Clinics',
    ClinicSetup: 'Clinics',
    ClinicSchedule: 'Clinics',
    DoctorProfile: 'Doctors',
    AdminAddDoctor: 'Doctors',
    AddDoctor: 'Doctors',
    PatientDetail: 'Patients',
    AddPatient: 'Patients',
    AddAppointment: 'Appointments'
  };

  const handleBreadcrumbPress = (targetName) => {
    try {
      const state = navigation?.getState?.();
      const current = state?.routes?.[state.index || 0]?.name;
      const reloadParam = { _reload: Date.now() };
      if (current === targetName) {
        navigation?.replace?.(targetName, reloadParam);
      } else {
        navigation?.navigate?.(targetName, reloadParam);
      }
    } catch (e) {
      // fallback
      navigation?.navigate?.(targetName);
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.background }]}> 
      {showSidebar ? (
        (() => {
          const state = navigation?.getState?.();
          const current = state?.routes?.[state.index]?.name;
          const mappedCurrent = parentMap[current] || current;
          return (
            <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border }]}> 
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={{ width: 120, height: 40, resizeMode: 'contain', marginBottom: 8 }} />
              ) : null}
              {navItems.map(n => {
                const active = mappedCurrent === n.key;
                return (
                  <TouchableOpacity
                    key={n.key}
                    style={[
                      styles.navItem,
                      active && { backgroundColor: theme.colors.primary, borderRadius: 6 }
                    ]}
                    onPress={() => navigation?.navigate?.(n.key)}
                  >
                    <Text style={[{ color: active ? theme.colors.surface : theme.colors.text, paddingHorizontal: 4 }]}>{n.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()
      ) : null}
      
      <View style={styles.content}>
        {(() => {
          const state = navigation?.getState?.();
          const current = state?.routes?.[state.index || 0]?.name;
          // map child/detail routes to their top-level parent
          const parentMap = {
            ClinicEdit: 'Clinics',
            ClinicDetails: 'Clinics',
            ClinicSetup: 'Clinics',
            ClinicSchedule: 'Clinics',
            DoctorProfile: 'Doctors',
            AdminAddDoctor: 'Doctors',
            AddDoctor: 'Doctors',
            PatientDetail: 'Patients',
            AddPatient: 'Patients',
            AddAppointment: 'Appointments'
          };
          const labelMap = {
            ClinicEdit: 'Edit Clinic',
            ClinicDetails: 'Clinic',
            ClinicSetup: 'Complete profile',
            DoctorProfile: 'Doctor',
            AdminAddDoctor: 'Add Doctor',
            AddDoctor: 'Add Doctor',
            PatientDetail: 'Patient',
            AddPatient: 'New Patient',
            AddAppointment: 'New Appointment'
          };

          if (!current || current === 'Dashboard') return null;

          const parent = parentMap[current] || current;
          const parts = ['Dashboard'];
          if (parent && parent !== 'Dashboard') parts.push(parent);
          if (current && current !== parent) parts.push(current);

          // determine current route object to inspect params for contextual labels
          const currentRouteObj = state?.routes?.[state.index || 0] || {};
          return (
            <View style={[styles.breadcrumb, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}> 
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                {parts.map((n, i) => {
                  // default display from labelMap
                  let display = labelMap[n] || n;
                  // if this is the current (leaf) route, allow contextual overrides
                  const isLeaf = (i === parts.length - 1);
                  if (isLeaf && n === 'ClinicEdit') {
                    // if no clinicId param, treat as Add
                    const cid = currentRouteObj?.params?.clinicId;
                    display = cid ? 'Edit Clinic' : 'Add Clinic';
                  }
                  return (
                    <React.Fragment key={`${n}-${i}`}>
                      <TouchableOpacity onPress={() => handleBreadcrumbPress(n)}>
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{display}</Text>
                      </TouchableOpacity>
                      {i < parts.length - 1 ? <Text style={{ color: theme.colors.muted, marginHorizontal: 6 }}>/</Text> : null}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          );
        })()}
        {children}
      </View>
      {/* DevOverlay hidden in this build */}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 220, padding: 16, borderRightWidth: 1 },
  brand: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  navItem: { paddingVertical: 10 },
  content: { flex: 1, padding: 16, paddingRight: 28 }
});

Object.assign(styles, {
  breadcrumb: { paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1 }
});
