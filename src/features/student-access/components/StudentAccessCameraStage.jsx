import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ACCESS_COLORS } from '../studentAccess.theme';

export default function StudentAccessCameraStage({
  CameraView,
  cameraAvailable,
  permission,
  requestPermission,
  scannerEnabled,
  isBusy,
  statusMessage,
  onBarcodeScanned,
  onSwitchToManual,
}) {
  if (!cameraAvailable) {
    return (
      <View style={[styles.shell, styles.infoShell]}>
        <View style={styles.stateMark}>
          <View style={styles.stateMarkInner} />
        </View>
        <Text style={styles.title}>Esta versión no puede escanear</Text>
        <Text style={styles.copy}>
          Sigue con el botón de escribir QR. Así no te quedas bloqueado.
        </Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchToManual} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>Escribir QR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.shell, styles.infoShell]}>
        <ActivityIndicator color={ACCESS_COLORS.blue} size="large" />
        <Text style={styles.title}>Preparando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.shell, styles.infoShell]}>
        <View style={styles.stateMark}>
          <View style={[styles.stateMarkInner, styles.stateMarkInnerBlue]} />
        </View>
        <Text style={styles.title}>Activa la cámara</Text>
        <Text style={styles.copy}>
          Es la forma más rápida de entrar al juego.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Permitir cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onSwitchToManual} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>Escribir QR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scannerEnabled ? onBarcodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        <View style={styles.overlay}>
          <View style={styles.topBubble}>
            <Text style={styles.topBubbleLabel}>Escanea el pase</Text>
            <Text style={styles.topBubbleText}>{statusMessage}</Text>
          </View>

          <View style={styles.scanAreaWrap}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          <View style={styles.bottomCard}>
            <Text style={styles.bottomTitle}>Pon el QR dentro del marco</Text>
            <Text style={styles.bottomCopy}>Cuando lo detectemos, entras a tu tablero.</Text>

            {isBusy ? (
              <View style={styles.busyPill}>
                <ActivityIndicator color={ACCESS_COLORS.navy} size="small" />
                <Text style={styles.busyText}>Entrando...</Text>
              </View>
            ) : null}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 430,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: ACCESS_COLORS.card,
    borderWidth: 2,
    borderColor: 'rgba(0,123,255,0.16)',
    shadowColor: ACCESS_COLORS.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  infoShell: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
    gap: 14,
    backgroundColor: ACCESS_COLORS.card,
  },
  stateMark: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: ACCESS_COLORS.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateMarkInner: {
    width: 24,
    height: 24,
    borderRadius: 10,
    backgroundColor: ACCESS_COLORS.orange,
  },
  stateMarkInnerBlue: {
    backgroundColor: ACCESS_COLORS.blue,
  },
  title: {
    color: ACCESS_COLORS.navy,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  copy: {
    color: ACCESS_COLORS.navySoft,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
    fontSize: 15,
  },
  primaryButton: {
    minWidth: 210,
    minHeight: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCESS_COLORS.green,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: ACCESS_COLORS.navy,
    fontSize: 17,
    fontWeight: '900',
  },
  secondaryButton: {
    minWidth: 210,
    minHeight: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCESS_COLORS.sky,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: ACCESS_COLORS.blue,
    fontSize: 16,
    fontWeight: '900',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: 'rgba(0,123,255,0.10)',
  },
  topBubble: {
    alignSelf: 'stretch',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.94)',
    gap: 4,
  },
  topBubbleLabel: {
    color: ACCESS_COLORS.blue,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  topBubbleText: {
    color: ACCESS_COLORS.navy,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  scanAreaWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.62)',
  },
  corner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderColor: ACCESS_COLORS.yellow,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 7,
    borderLeftWidth: 7,
    borderTopLeftRadius: 28,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 7,
    borderRightWidth: 7,
    borderTopRightRadius: 28,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 7,
    borderLeftWidth: 7,
    borderBottomLeftRadius: 28,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 7,
    borderRightWidth: 7,
    borderBottomRightRadius: 28,
  },
  bottomCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    gap: 6,
  },
  bottomTitle: {
    color: ACCESS_COLORS.navy,
    fontSize: 19,
    fontWeight: '900',
  },
  bottomCopy: {
    color: ACCESS_COLORS.navySoft,
    fontSize: 14,
    lineHeight: 20,
  },
  busyPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: ACCESS_COLORS.green,
  },
  busyText: {
    color: ACCESS_COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
  },
});
