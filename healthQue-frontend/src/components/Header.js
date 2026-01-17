import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { AuthContext } from '../../App';
import { Appbar } from 'react-native-paper';
import { fetchWithAuth, API_BASE } from '../utils/api';
import { useProfile } from '../contexts/ProfileContext';

export default function Header({ navigation, route, options, back }) {
  const { theme, toggleTheme } = useTheme();
  const auth = useContext(AuthContext);
  const title = options.title || route.name;
  // small wrapper to show a tooltip-like label on hover (useful for web)
  function ActionWithLabel({ label, icon, onPress }) {
    const [visible, setVisible] = useState(false);
    const hideTimer = React.useRef(null);

    useEffect(() => {
      return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
    }, []);

    function showTemporary() {
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 2000);
    }

    return (
      <Pressable
        style={{ position: 'relative' }}
        onHoverIn={() => setVisible(true)}
        onHoverOut={() => setVisible(false)}
        onLongPress={showTemporary}
        android_ripple={null}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onPress={onPress}
      >
        <View style={{ padding: 8 }}>{typeof icon === 'function' ? icon() : icon}</View>
        {visible ? (
          <View pointerEvents="none" style={[styles.tooltip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <Text style={{ color: theme.colors.text, fontSize: 12 }}>{label}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  const { profile, refreshProfile } = useProfile();

  useEffect(() => {
    // ensure profile is loaded when header mounts; refreshProfile is cached so this is cheap
    if (!profile) refreshProfile().catch(() => {});
    const unsub = navigation.addListener('focus', () => { if (!profile) refreshProfile().catch(() => {}); });
    return () => { unsub && unsub(); };
  }, [navigation, profile, refreshProfile]);

  // Determine whether the current user is a doctor with incomplete profile
  const isDoctor = !!(profile && profile.doctor);
  let doctorIncomplete = false;
  if (isDoctor) {
    const d = profile.doctor || {};
    // If backend marks profile_completed, respect it as authoritative
    if (d.profile_completed) {
      doctorIncomplete = !Boolean(d.profile_completed === 0 || d.profile_completed === '0');
      // if profile_completed truthy (1), then not incomplete
      doctorIncomplete = !(d.profile_completed === 1 || d.profile_completed === '1') ? true : false;
    } else {
      try {
        const cs = typeof d.clinic_schedule === 'string' ? JSON.parse(d.clinic_schedule) : d.clinic_schedule;
        const hasHours = cs && cs.hours && Object.keys(cs.hours).length > 0;
        const hasLocation = !!(d.clinic_location || d.clinic_address);
        doctorIncomplete = !(hasHours || hasLocation);
      } catch (e) {
        doctorIncomplete = !(d.clinic_location || d.clinic_address);
      }
    }
  }

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: 1 }}>
      {back ? <Appbar.BackAction onPress={() => navigation.goBack()} color={theme.colors.text} /> : null}
      <Appbar.Content title={title} titleStyle={{ color: theme.colors.text }} />
      {/* If a doctor has an incomplete profile, hide all action buttons to limit navigation */}
      {doctorIncomplete ? null : (
        <>
          <ActionWithLabel
            label="Dashboard"
            icon={() => <MaterialCommunityIcons name="view-grid" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('Dashboard')}
          />
          {profile && profile.role === 'doctor' ? (
            <ActionWithLabel
              label="Clinics"
              icon={() => <MaterialCommunityIcons name="hospital-building" size={22} color={theme.colors.primary} />}
              onPress={() => navigation.navigate('Clinics')}
            />
          ) : null}
          <ActionWithLabel
            label="Patients"
            icon={() => <MaterialCommunityIcons name="account-group-outline" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('Patients')}
          />
          <ActionWithLabel
            label="Appointments"
            icon={() => <MaterialCommunityIcons name="calendar-month" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('Appointments')}
          />
          {profile && profile.role === 'admin' ? (
            <ActionWithLabel
              label="Doctors"
              icon={() => <MaterialCommunityIcons name="stethoscope" size={22} color={theme.colors.primary} />}
              onPress={() => navigation.navigate('Doctors')}
            />
          ) : null}
          <ActionWithLabel
            label="Settings"
            icon={() => <MaterialCommunityIcons name="cog" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('Settings')}
          />
          <ActionWithLabel
            label={theme.mode === 'dark' ? 'Light' : 'Dark'}
            icon={() => (
              <MaterialCommunityIcons
                name={theme.mode === 'dark' ? 'white-balance-sunny' : 'moon-waning-crescent'}
                size={22}
                color={theme.colors.muted}
              />
            )}
            onPress={toggleTheme}
          />
        </>
      )}
      {/* Keep logout available always, even when profile is incomplete */}
      <Appbar.Action
        icon={() => <MaterialCommunityIcons name="logout" size={22} color={theme.colors.muted} />}
        onPress={() => auth?.signOut && auth.signOut()}
      />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
  iconBtn: { padding: 8 }
});

// tooltip style for hover labels
styles.tooltip = {
  position: 'absolute',
  top: -36,
  left: 0,
  right: 0,
  alignItems: 'center',
  paddingHorizontal: 8,
  paddingVertical: 6,
  borderRadius: 6,
  borderWidth: 1,
  zIndex: 9999
};
