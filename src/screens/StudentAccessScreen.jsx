import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { resolveDefaultApiBaseUrl } from '../config/api';
import StudentAccessCameraStage from '../features/student-access/components/StudentAccessCameraStage';
import StudentAccessHero from '../features/student-access/components/StudentAccessHero';
import StudentAccessManualStage from '../features/student-access/components/StudentAccessManualStage';
import StudentAccessModeToggle, {
  ACCESS_MODES,
} from '../features/student-access/components/StudentAccessModeToggle';
import { ACCESS_COLORS } from '../features/student-access/studentAccess.theme';
import { createStudentAccessService } from '../services/studentAccess.service';

const buildAccessState = () => ({
  apiBaseUrl: resolveDefaultApiBaseUrl(),
  manualQrToken: '',
});

const resolveCameraModule = () => {
  try {
    return require('expo-camera');
  } catch (error) {
    return { error };
  }
};

const cameraModule = resolveCameraModule();
const CameraView = cameraModule?.CameraView ?? null;

const useSafeCameraPermissions = () => {
  if (cameraModule?.useCameraPermissions) {
    return cameraModule.useCameraPermissions();
  }

  const [permission] = useState(null);
  const requestPermission = async () => null;
  return [permission, requestPermission];
};

/**
 * Punto de entrada oficial de HU-41.
 *
 * POR QUE:
 * - el estudiante entra a la app por su pase QR, no buscando menus
 * - el screen solo orquesta estado y servicios
 * - cada bloque visual vive en su propio componente para evitar mezclar responsabilidades
 */
export default function StudentAccessScreen({ onAccessGranted }) {
  const [permission, requestPermission] = useSafeCameraPermissions();
  const cameraAvailable = Boolean(CameraView && cameraModule?.useCameraPermissions);
  const [form, setForm] = useState(buildAccessState);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('Apunta al QR para entrar.');
  const [activeMode, setActiveMode] = useState(
    cameraAvailable ? ACCESS_MODES.scan : ACCESS_MODES.manual
  );
  const [scannerEnabled, setScannerEnabled] = useState(true);

  const accessService = useMemo(
    () => createStudentAccessService(form.apiBaseUrl),
    [form.apiBaseUrl]
  );

  useEffect(() => {
    if (!cameraAvailable) {
      setActiveMode(ACCESS_MODES.manual);
    }
  }, [cameraAvailable]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const grantAccess = async (rawQrToken) => {
    const qrToken = rawQrToken?.trim();
    if (!qrToken || isBusy) {
      return;
    }

    setIsBusy(true);
    setScannerEnabled(false);
    setErrorMessage('');
    setStatusMessage('Validando tu pase...');

    try {
      const loginData = await accessService.loginByQr(qrToken);

      setStatusMessage(`¡Hola ${loginData.estudiante.nombre.split(' ')[0]}!`);
      onAccessGranted({
        token: loginData.token,
        studentProfile: loginData.estudiante,
        qrToken,
        apiBaseUrl: form.apiBaseUrl,
        authenticatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setErrorMessage(error.message);
      setStatusMessage('No pudimos leer ese código. Intenta otra vez.');
      setScannerEnabled(true);
    } finally {
      setIsBusy(false);
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (!scannerEnabled || isBusy) {
      return;
    }

    grantAccess(data);
  };

  const submitManualQr = () => {
    grantAccess(form.manualQrToken);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ACCESS_COLORS.page} />

      <View style={[styles.glow, styles.glowBlue]} />
      <View style={[styles.glow, styles.glowGreen]} />
      <View style={[styles.glow, styles.glowYellow]} />
      <View style={[styles.glow, styles.glowOrange]} />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StudentAccessHero />

          <StudentAccessModeToggle activeMode={activeMode} onChangeMode={setActiveMode} />

          {activeMode === ACCESS_MODES.scan ? (
            <StudentAccessCameraStage
              CameraView={CameraView}
              cameraAvailable={cameraAvailable}
              permission={permission}
              requestPermission={requestPermission}
              scannerEnabled={scannerEnabled}
              isBusy={isBusy}
              statusMessage={statusMessage}
              onBarcodeScanned={handleBarcodeScanned}
              onSwitchToManual={() => setActiveMode(ACCESS_MODES.manual)}
            />
          ) : (
            <StudentAccessManualStage
              apiBaseUrl={form.apiBaseUrl}
              onChangeApiBaseUrl={(value) => updateField('apiBaseUrl', value)}
              qrToken={form.manualQrToken}
              onChangeQrToken={(value) => updateField('manualQrToken', value)}
              onSubmit={submitManualQr}
              isBusy={isBusy}
            />
          )}

          {isBusy ? (
            <View style={styles.busyBanner}>
              <ActivityIndicator color={ACCESS_COLORS.navy} size="small" />
              <Text style={styles.busyText}>Entrando al tablero...</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Ups, algo no salió bien</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACCESS_COLORS.page,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 16,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowBlue: {
    top: -50,
    right: -30,
    width: 220,
    height: 220,
    backgroundColor: 'rgba(0,123,255,0.16)',
  },
  glowGreen: {
    top: 240,
    left: -60,
    width: 180,
    height: 180,
    backgroundColor: 'rgba(57,211,83,0.16)',
  },
  glowYellow: {
    bottom: 180,
    right: -40,
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255,234,0,0.22)',
  },
  glowOrange: {
    bottom: -20,
    left: 30,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,127,0,0.16)',
  },
  busyBanner: {
    minHeight: 54,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ACCESS_COLORS.green,
  },
  busyText: {
    color: ACCESS_COLORS.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  errorCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: ACCESS_COLORS.rose,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.20)',
    gap: 4,
  },
  errorTitle: {
    color: ACCESS_COLORS.coral,
    fontSize: 15,
    fontWeight: '900',
  },
  errorText: {
    color: ACCESS_COLORS.navy,
    lineHeight: 20,
  },
});
