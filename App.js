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

import { canConfigureApiAtRuntime } from './src/config/runtimeEnvironment';
import { colors } from './src/constants/theme';
import {
  STUDENT_AUTH_STATES,
  useStudentAuthentication,
} from './src/features/student-auth/useStudentAuthentication';
import DashboardScreen from './src/screens/DashboardScreen';
import LoginQrScreen from './src/screens/LoginQrScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import QrScannerScreen from './src/screens/QrScannerScreen';
import SessionRecoveryScreen from './src/screens/SessionRecoveryScreen';
import {
  isLoopbackApiBaseUrl,
  loadApiBaseUrlSetting,
  saveApiBaseUrlSetting,
} from './src/services/apiSettings.service';
import { extractQrToken } from './src/utils/qrToken';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_900Black,
  });
  const [route, setRoute] = useState('onboarding');
  const [scannerError, setScannerError] = useState('');
  const [apiSettingsError, setApiSettingsError] = useState('');
  const [apiSettingsLoaded, setApiSettingsLoaded] = useState(false);
  const [processingQr, setProcessingQr] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const canConfigureConnection = canConfigureApiAtRuntime();
  const needsApiConfiguration = !apiBaseUrl || isLoopbackApiBaseUrl(apiBaseUrl);
  const authentication = useStudentAuthentication({
    apiBaseUrl,
    ready: apiSettingsLoaded,
  });

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
      } finally {
        if (!cancelled) {
          setApiSettingsLoaded(true);
        }
      }
    };

    void loadApiSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authentication.session) {
      setRoute('dashboard');
    }
  }, [authentication.session]);

  const handleSaveApiBaseUrl = async (nextApiBaseUrl) => {
    try {
      await authentication.clearForApiChange();
      const savedApiBaseUrl = await saveApiBaseUrlSetting(nextApiBaseUrl);
      setApiBaseUrl(savedApiBaseUrl);
      setRoute('onboarding');
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
      const message = canConfigureConnection
        ? 'Configura la conexion del colegio antes de escanear. Usa una direccion como http://IP_DEL_PC:3000/api.'
        : 'Esta version no tiene disponible la conexion segura con el colegio. Solicita una version actualizada.';

      setApiSettingsError(message);
      Alert.alert(
        canConfigureConnection ? 'Configura la conexion' : 'Conexion no disponible',
        message,
      );
      return;
    }

    setRoute('scanner');
  };

  const grantAccess = async (rawQrValue) => {
    const qrToken = extractQrToken(rawQrValue);

    if (!qrToken || processingQr) {
      return;
    }

    setProcessingQr(true);
    setScannerError('');

    try {
      await authentication.loginByQr(qrToken);
      setRoute('dashboard');
    } catch (error) {
      const message = error.message || 'No fue posible validar el codigo QR.';
      setScannerError(message);
      Alert.alert('QR no validado', message);
    } finally {
      setProcessingQr(false);
    }
  };

  const handleLogout = async () => {
    const loggedOut = await authentication.logout();

    if (loggedOut) {
      setScannerError('');
      setRoute('onboarding');
    }
  };

  const handleUseAnotherQr = async () => {
    await authentication.clearLocalSession();
    setScannerError('');
    setRoute('login');
  };

  if (
    !fontsLoaded ||
    !apiSettingsLoaded ||
    authentication.state === STUDENT_AUTH_STATES.restoring
  ) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!authentication.session && authentication.state === STUDENT_AUTH_STATES.recovery) {
    return (
      <SafeAreaProvider>
        <SessionRecoveryScreen
          message={authentication.error}
          onRetry={authentication.restore}
          onUseAnotherQr={handleUseAnotherQr}
        />
      </SafeAreaProvider>
    );
  }

  if (!authentication.session && route === 'onboarding') {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onStart={() => setRoute('login')} />
      </SafeAreaProvider>
    );
  }

  if (!authentication.session && route === 'login') {
    return (
      <SafeAreaProvider>
        <LoginQrScreen
          apiBaseUrl={apiBaseUrl}
          apiSettingsError={apiSettingsError}
          canConfigureConnection={canConfigureConnection}
          needsApiConfiguration={needsApiConfiguration}
          onBack={() => setRoute('onboarding')}
          onSaveApiBaseUrl={handleSaveApiBaseUrl}
          onScan={handleScanRequest}
        />
      </SafeAreaProvider>
    );
  }

  if (!authentication.session && route === 'scanner') {
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
        studentSession={authentication.session}
        onLogout={handleLogout}
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
