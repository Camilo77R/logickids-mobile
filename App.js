import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_900Black,
  useFonts,
} from '@expo-google-fonts/poppins';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';
import LoginQrScreen from './src/screens/LoginQrScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import QrScannerScreen from './src/screens/QrScannerScreen';
import { colors } from './src/constants/theme';
import { loginWithQr } from './src/services/authService';
import { getMyStudentProfile } from './src/services/studentService';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_900Black,
  });
  const [route, setRoute] = useState('loading');
  const [session, setSession] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [processingQr, setProcessingQr] = useState(false);

  useEffect(() => {
    setRoute('onboarding');
  }, []);

  const loadStudentProfile = async (token) => {
    setProfileLoading(true);

    try {
      const profile = await getMyStudentProfile(token);
      setStudentProfile(profile);
      return profile;
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCodeScanned = async (qrValue) => {
    setProcessingQr(true);
    setScannerError('');

    try {
      const nextSession = await loginWithQr(qrValue);
      setSession(nextSession);
      await loadStudentProfile(nextSession.token);
      setRoute('dashboard');
    } catch (error) {
      const message = error.message || 'No fue posible validar el codigo QR.';
      setScannerError(message);
      Alert.alert('QR no validado', message);
    } finally {
      setProcessingQr(false);
    }
  };

  const handleRefreshProfile = async () => {
    if (!session?.token) {
      setRoute('login');
      return;
    }

    try {
      await loadStudentProfile(session.token);
    } catch (error) {
      Alert.alert('Perfil no actualizado', error.message || 'No fue posible cargar el perfil.');
    }
  };

  const handleLogout = () => {
    setSession(null);
    setStudentProfile(null);
    setScannerError('');
    setRoute('login');
  };

  if (route === 'loading' || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (route === 'onboarding') {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onStart={() => setRoute('login')} />
      </SafeAreaProvider>
    );
  }

  if (route === 'login') {
    return (
      <SafeAreaProvider>
        <LoginQrScreen onBack={() => setRoute('onboarding')} onScan={() => setRoute('scanner')} />
      </SafeAreaProvider>
    );
  }

  if (route === 'scanner') {
    return (
      <SafeAreaProvider>
        <QrScannerScreen
          error={scannerError}
          processing={processingQr}
          onBack={() => setRoute('login')}
          onCodeScanned={handleCodeScanned}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <DashboardScreen
        loading={profileLoading}
        profile={studentProfile}
        session={session}
        onLogout={handleLogout}
        onRefresh={handleRefreshProfile}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
