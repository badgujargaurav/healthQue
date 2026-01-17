import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DoctorsScreen from './src/screens/DoctorsScreen';
import AddDoctorScreen from './src/screens/AddDoctorScreen';
import AdminAddDoctorScreen from './src/screens/AdminAddDoctorScreen';
import ClinicsScreen from './src/screens/ClinicsScreen';
import ClinicDetailsScreen from './src/screens/ClinicDetailsScreen';
import ClinicEditScreen from './src/screens/ClinicEditScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PatientsScreen from './src/screens/PatientsScreen';
import PatientDetailScreen from './src/screens/PatientDetailScreen';
import AddPatientScreen from './src/screens/AddPatientScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import AddAppointmentScreen from './src/screens/AddAppointmentScreen';
import DoctorProfileScreen from './src/screens/DoctorProfileScreen';
import AddClinicScreen from './src/screens/AddClinicScreen';
import Toast from 'react-native-toast-message';
import ThemeProvider from './src/theme/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from './src/components/Header';
import { setSessionExpiredHandler } from './src/utils/api';
import { ProfileProvider } from './src/contexts/ProfileContext';

export const AuthContext = React.createContext();

const Stack = createNativeStackNavigator();

export default function App() {
  const [state, setState] = useState({ isLoading: true, accessToken: null });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const access = await AsyncStorage.getItem('accessToken');
        setState({ isLoading: false, accessToken: access });
      } catch (e) {
        setState({ isLoading: false, accessToken: null });
      }
    };
    bootstrap();
  }, []);

  const authContext = useMemo(() => ({
    signIn: async (accessToken, refreshToken) => {
      if (accessToken) await AsyncStorage.setItem('accessToken', accessToken);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
      setState((prev) => ({ ...prev, accessToken }));
    },
    signOut: async () => {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      setState((prev) => ({ ...prev, accessToken: null }));
    }
  }), []);

  // register central session-expired handler so fetchWithAuth can call signOut
  React.useEffect(() => {
    setSessionExpiredHandler(() => {
      authContext.signOut();
    });
  }, [authContext]);

  // Ensure icon fonts are loaded (helps Expo web and some bundlers)
  React.useEffect(() => {
    if (MaterialCommunityIcons && MaterialCommunityIcons.loadFont) {
      try {
        MaterialCommunityIcons.loadFont();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
    <AuthContext.Provider value={authContext}>
      <ProfileProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ header: (props) => <Header {...props} /> }}>
          {state.accessToken == null ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Doctors" component={DoctorsScreen} options={{ title: 'Doctors' }} />
              <Stack.Screen name="Clinics" component={ClinicsScreen} options={{ title: 'Clinics' }} />
              <Stack.Screen name="ClinicDetails" component={ClinicDetailsScreen} options={{ title: 'Clinic' }} />
              <Stack.Screen name="ClinicEdit" component={ClinicEditScreen} options={{ title: 'Edit Clinic' }} />
              <Stack.Screen name="AddDoctor" component={AddDoctorScreen} options={{ title: 'Add Doctor' }} />
              <Stack.Screen name="AdminAddDoctor" component={AdminAddDoctorScreen} options={{ title: 'Admin: Create Doctor' }} />
              <Stack.Screen name="Patients" component={PatientsScreen} options={{ title: 'Patients' }} />
              <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Patient' }} />
              <Stack.Screen name="AddPatient" component={AddPatientScreen} options={{ title: 'New Patient' }} />
              <Stack.Screen name="Appointments" component={AppointmentsScreen} options={{ title: 'Appointments' }} />
              <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} options={{ title: 'New Appointment' }} />
              <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} options={{ title: 'Doctor' }} />
              <Stack.Screen name="ClinicSetup" component={AddClinicScreen} options={{ title: 'Complete profile' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Get Started' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
      </ProfileProvider>
    </AuthContext.Provider>
    </ThemeProvider>
  );
}
