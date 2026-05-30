import React, { useMemo, useState } from 'react';
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
import { resolveDefaultApiBaseUrl } from './src/config/api';
import { colors } from './src/constants/theme';
import { createStudentAccessService } from './src/services/studentAccess.service';
import { extractQrToken } from './src/utils/qrToken';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_900Black,
  });
  const [route, setRoute] = useState('onboarding');
  const [studentSession, setStudentSession] = useState(null);
  const [scannerError, setScannerError] = useState('');
  const [processingQr, setProcessingQr] = useState(false);
  const apiBaseUrl = useMemo(() => resolveDefaultApiBaseUrl(), []);
  const accessService = useMemo(
    () => createStudentAccessService(apiBaseUrl),
    [apiBaseUrl],
  );

  const grantAccess = async (rawQrValue) => {
    const qrToken = extractQrToken(rawQrValue);

    if (!qrToken || processingQr) {
      return;
    }

    setProcessingQr(true);
    setScannerError('');

    try {
      const loginData = await accessService.loginByQr(qrToken);
      setStudentSession({
        token: loginData.token,
        studentProfile: loginData.estudiante,
        qrToken,
        apiBaseUrl,
        authenticatedAt: new Date().toISOString(),
      });
      setRoute('dashboard');
    } catch (error) {
      const message = error.message || 'No fue posible validar el codigo QR.';
      setScannerError(message);
      Alert.alert('QR no validado', message);
    } finally {
      setProcessingQr(false);
    }
  };

  const logout = () => {
    setStudentSession(null);
    setScannerError('');
    setRoute('login');
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!studentSession && route === 'onboarding') {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onStart={() => setRoute('login')} />
      </SafeAreaProvider>
    );
  }

  if (!studentSession && route === 'login') {
    return (
      <SafeAreaProvider>
        <LoginQrScreen
          onBack={() => setRoute('onboarding')}
          onScan={() => setRoute('scanner')}
        />
      </SafeAreaProvider>
    );
  }

  if (!studentSession && route === 'scanner') {
    return (
      <SafeAreaProvider>
        <QrScannerScreen
          error={scannerError}
          processing={processingQr}
          onBack={() => setRoute('login')}
          onCodeScanned={grantAccess}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <DashboardScreen
        studentSession={studentSession}
        onLogout={logout}
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
