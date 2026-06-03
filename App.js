import React, { useEffect, useMemo, useState } from 'react';
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
import {
  isLoopbackApiBaseUrl,
  loadApiBaseUrlSetting,
  saveApiBaseUrlSetting,
} from './src/services/apiSettings.service';
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
  const [apiSettingsError, setApiSettingsError] = useState('');
  const [processingQr, setProcessingQr] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const accessService = useMemo(
    () => (apiBaseUrl ? createStudentAccessService(apiBaseUrl) : null),
    [apiBaseUrl],
  );
  const needsApiConfiguration = isLoopbackApiBaseUrl(apiBaseUrl);

  useEffect(() => {
    let cancelled = false;

    const loadApiSettings = async () => {
      try {
        const storedApiBaseUrl = await loadApiBaseUrlSetting();

        if (!cancelled) {
          setApiBaseUrl(storedApiBaseUrl);
          setApiSettingsError('');
        }
      } catch (error) {
        if (!cancelled) {
          setApiSettingsError(error.message || 'No pudimos cargar la URL de la API.');
        }
      }
    };

    loadApiSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveApiBaseUrl = async (nextApiBaseUrl) => {
    try {
      const savedApiBaseUrl = await saveApiBaseUrlSetting(nextApiBaseUrl);
      setApiBaseUrl(savedApiBaseUrl);
      setStudentSession(null);
      setScannerError('');
      setApiSettingsError('');
      return true;
    } catch (error) {
      setApiSettingsError(error.message || 'No pudimos guardar la URL de la API.');
      return false;
    }
  };

  const handleScanRequest = () => {
    if (needsApiConfiguration) {
      const message =
        'Configura la conexion del colegio antes de escanear. Usa una direccion como http://IP_DEL_PC:3000/api.';

      setApiSettingsError(message);
      Alert.alert('Configura la conexion', message);
      return;
    }

    setRoute('scanner');
  };

  const grantAccess = async (rawQrValue) => {
    const qrToken = extractQrToken(rawQrValue);

    if (!qrToken || processingQr || !accessService) {
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
    setRoute('onboarding');
  };

  if (!fontsLoaded || !apiBaseUrl) {
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
          apiBaseUrl={apiBaseUrl}
          apiSettingsError={apiSettingsError}
          needsApiConfiguration={needsApiConfiguration}
          onBack={() => setRoute('onboarding')}
          onSaveApiBaseUrl={handleSaveApiBaseUrl}
          onScan={handleScanRequest}
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
