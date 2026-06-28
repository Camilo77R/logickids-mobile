import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../constants/theme';

const scannerYellow = '#FFC107';
const scannerGreen = '#22C55E';
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function QrScannerScreen({ onBack, onCodeScanned, processing = false, error }) {
  const { width, height } = Dimensions.get('window');
  const sizes = useMemo(
    () => ({
      frame: clamp(Math.min(width * 0.72, height * 0.36), 238, 292),
      title: clamp(width * 0.072, 25, 30),
      subtitle: clamp(width * 0.04, 14, 16),
      infoPadding: height < 700 ? 18 : 22,
      infoGap: clamp(height * 0.02, 14, 28),
      frameGap: clamp(height * 0.05, 34, 76),
    }),
    [height, width]
  );
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const scanLockRef = useRef(false);
  const scanLinePosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!processing && error) {
      setScanSuccess(false);
      Vibration.vibrate([0, 80, 60, 80]);

      const retryTimer = setTimeout(() => {
        scanLockRef.current = false;
        setScanned(false);
      }, 1800);
      return () => clearTimeout(retryTimer);
    }
  }, [processing, error]);

  useEffect(() => {
    const scanAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLinePosition, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLinePosition, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    scanAnimation.start();
    return () => scanAnimation.stop();
  }, [scanLinePosition]);

  const handleBarCodeScanned = ({ data }) => {
    if (scanLockRef.current || scanned || processing) {
      return;
    }

    scanLockRef.current = true;
    setScanned(true);
    setScanSuccess(true);
    Vibration.vibrate(35);

    setTimeout(() => {
      onCodeScanned(data);
    }, 500);
  };

  const renderCamera = () => {
    if (!permission) {
      return <ActivityIndicator color={scannerYellow} size="large" />;
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camara requerida</Text>
          <Text style={styles.permissionText}>Activa el permiso de camara para escanear el QR.</Text>
        </View>
      );
    }

    return (
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchEnabled}
        onBarcodeScanned={scanned || processing ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
    );
  };

  const frameColor = scanSuccess ? scannerGreen : scannerYellow;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {renderCamera()}
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver"
            activeOpacity={0.85}
            onPress={onBack}
            style={styles.circleButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.topActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Ayuda"
              activeOpacity={0.85}
              style={styles.circleButton}
            >
              <Ionicons name="help" size={24} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Activar luz"
              activeOpacity={0.85}
              onPress={() => setTorchEnabled((value) => !value)}
              style={[styles.circleButton, torchEnabled && styles.lightButtonActive]}
            >
              <Ionicons name="flash" size={23} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.infoCard,
            {
              marginTop: sizes.infoGap,
              padding: sizes.infoPadding,
            },
          ]}
        >
          <Text style={[styles.title, { fontSize: sizes.title, lineHeight: sizes.title + 6 }]}>
            Escanea tu
          </Text>
          <Text style={[styles.titleAccent, { fontSize: sizes.title, lineHeight: sizes.title + 6 }]}>
            codigo QR
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                fontSize: sizes.subtitle,
                lineHeight: sizes.subtitle + 7,
              },
            ]}
          >
            Coloca el codigo dentro del marco para escanear.
          </Text>
        </View>

        <View
          style={[
            styles.scannerFrame,
            {
              width: sizes.frame,
              height: sizes.frame,
              marginTop: sizes.frameGap,
            },
          ]}
        >
          <View style={[styles.corner, styles.cornerTopLeft, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cornerTopRight, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: frameColor }]} />
          <View style={[styles.corner, styles.cornerBottomRight, { borderColor: frameColor }]} />
          <Animated.View
            style={[
              styles.scanLine,
              {
                backgroundColor: frameColor,
                shadowColor: frameColor,
                transform: [
                  {
                    translateY: scanLinePosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-(sizes.frame * 0.39), sizes.frame * 0.39],
                    }),
                  },
                ],
              },
            ]}
          />
          {processing ? (
            <View style={styles.processingPill}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.processingText}>Validando QR...</Text>
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>Intenta de nuevo</Text> : null}

        <View style={styles.bottomActions}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            onPress={onBack}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 10,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  lightButtonActive: {
    backgroundColor: colors.yellow,
  },
  infoCard: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 32,
    marginHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    color: colors.white,
    fontFamily: fonts.black,
    textAlign: 'center',
  },
  titleAccent: {
    color: scannerYellow,
    fontFamily: fonts.black,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.white,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 260,
  },
  scannerFrame: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 58,
    height: 58,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 7,
    borderLeftWidth: 7,
    borderTopLeftRadius: radii.md,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 7,
    borderRightWidth: 7,
    borderTopRightRadius: radii.md,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 7,
    borderLeftWidth: 7,
    borderBottomLeftRadius: radii.md,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 7,
    borderRightWidth: 7,
    borderBottomRightRadius: radii.md,
  },
  scanLine: {
    position: 'absolute',
    left: '8%',
    width: '84%',
    height: 4,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  processingPill: {
    position: 'absolute',
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  processingText: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
  errorText: {
    color: colors.white,
    backgroundColor: 'rgba(244,84,94,0.9)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    textAlign: 'center',
    fontFamily: fonts.black,
  },
  bottomActions: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
  },
  cancelButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.black,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  permissionTitle: {
    color: colors.white,
    fontSize: 22,
    fontFamily: fonts.black,
  },
  permissionText: {
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
  },
});
