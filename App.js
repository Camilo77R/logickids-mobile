import React, { useEffect, useRef, useState } from 'react';
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
  useStudentAuthentication,
} from './src/features/student-auth/useStudentAuthentication';
import { STUDENT_AUTH_STATES } from './src/features/student-auth/studentAuthState';
import {
  resolveStudentRecoveryScreenCopy,
  STUDENT_RECOVERY_ACTIONS,
} from './src/features/student-auth/studentSessionRecovery';
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
import { installDevelopmentWarningFilters } from './src/dev/installDevelopmentWarningFilters';
import {
  isNetworkError,
  isStudentSessionRecoveryRequiredError,
} from './src/services/http.service';
import { extractQrToken } from './src/utils/qrToken';

installDevelopmentWarningFilters();

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
  const qrRequestInFlightRef = useRef(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const canConfigureConnection = canConfigureApiAtRuntime();
  const needsApiConfiguration = !apiBaseUrl || isLoopbackApiBaseUrl(apiBaseUrl);
  const authentication = useStudentAuthentication({
    apiBaseUrl,
    ready: apiSettingsLoaded,
  });
  const sessionRecoveryCopy = resolveStudentRecoveryScreenCopy({
    recoveryReason: authentication.recoveryReason,
    errorMessage: authentication.error,
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

    if (!qrToken || processingQr || qrRequestInFlightRef.current) {
      return;
    }

    qrRequestInFlightRef.current = true;
    setProcessingQr(true);
    setScannerError('');

    try {
      const authenticatedSession = await authentication.loginByQr(qrToken);

      if (authenticatedSession) {
        setRoute('dashboard');
      }
    } catch (error) {
      const message = error.message || 'No fue posible validar el codigo QR.';
      setScannerError(message);

      if (isStudentSessionRecoveryRequiredError(error)) {
        return;
      }

      if (isNetworkError(error)) {
        Alert.alert('Sin conexion', message);
        return;
      }

      Alert.alert('QR no validado', message);
    } finally {
      qrRequestInFlightRef.current = false;
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

  const handleReturnToScanner = () => {
    setScannerError('');
    setProcessingQr(false);
    setRoute(needsApiConfiguration ? 'login' : 'scanner');
  };

  const handleReturnToHome = () => {
    setScannerError('');
    setProcessingQr(false);
    setRoute('onboarding');
  };

  const handlePrimaryRecoveryAction = async () => {
    if (sessionRecoveryCopy.primaryActionKind === STUDENT_RECOVERY_ACTIONS.scan) {
      handleReturnToScanner();
      return true;
    }

    if (sessionRecoveryCopy.primaryActionKind === STUDENT_RECOVERY_ACTIONS.home) {
      handleReturnToHome();
      return true;
    }

    return authentication.retryRecovery();
  };

  const handleSecondaryRecoveryAction = async () => {
    authentication.dismissRecovery();

    if (sessionRecoveryCopy.secondaryActionKind === STUDENT_RECOVERY_ACTIONS.home) {
      handleReturnToHome();
      return;
    }

    handleReturnToScanner();
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
          message={sessionRecoveryCopy.message}
          onRetry={handlePrimaryRecoveryAction}
          onUseAnotherQr={handleSecondaryRecoveryAction}
          title={sessionRecoveryCopy.title}
          primaryActionLabel={sessionRecoveryCopy.primaryActionLabel}
          secondaryActionLabel={sessionRecoveryCopy.secondaryActionLabel}
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
