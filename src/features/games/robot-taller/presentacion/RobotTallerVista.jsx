import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../../../constants/theme';
import { useHandTracker } from '../aplicacion/useHandTracker';
import EscenaEnsamblaje from './EscenaEnsamblaje';

export default function RobotTallerVista({
  onSalir,
  escena,
  estado,
  configuracion,
  agarrarParte,
  moverParte,
  soltarParte,
  reiniciarPartida,
}) {
  const cameraRef = useRef(null);
  const handTracker = useHandTracker(cameraRef);
  const [cursorPos, setCursorPos] = useState(null);
  const [isPinching, setIsPinching] = useState(false);

  useEffect(() => {
    if (handTracker.isAvailable && !handTracker.isTracking) {
      handTracker.startTracking();
    }
  }, [handTracker.isAvailable]);

  useEffect(() => {
    const interval = setInterval(() => {
      const rawPos = handTracker.getHandPosition();
      if (!rawPos) {
        setCursorPos(null);
        setIsPinching(false);
        return;
      }
      setCursorPos([rawPos.x, rawPos.y, rawPos.z]);

      const pinchDist = handTracker.getPinchDistance();
      const pinching = pinchDist != null && pinchDist < 0.04;
      setIsPinching(pinching);

      if (estado.parteAgarrada == null && pinching) {
        const parteCercana = encontrarParteCercana(rawPos, estado.partes);
        if (parteCercana) agarrarParte(parteCercana);
      } else if (estado.parteAgarrada != null) {
        if (pinching) {
          moverParte(estado.parteAgarrada, [rawPos.x, rawPos.y, rawPos.z]);
        } else {
          soltarParte();
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [handTracker.hands, estado.parteAgarrada, estado.partes]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <CameraView
        ref={cameraRef}
        facing="front"
        style={StyleSheet.absoluteFill}
        animateShutter={false}
      />
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!escena.salida.permitida}
            onPress={onSalir}
            style={[styles.exitButton, !escena.salida.permitida && styles.exitButtonDisabled]}
          >
            <Ionicons name="arrow-back" size={20} color={escena.salida.permitida ? colors.white : colors.muted} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{escena.encabezado.titulo}</Text>
            <Text style={styles.subtitle}>{estado.contadorEnsambladas}/{configuracion.partes ?? 7} piezas</Text>
          </View>
          <View style={styles.skillBadge}>
            <Ionicons name="construct" size={14} color={colors.white} />
            <Text style={styles.skillBadgeText}>{configuracion.habilidad}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.sceneContainer}>
        <EscenaEnsamblaje
          estado={estado}
          onAgarrarParte={agarrarParte}
          onMoverParte={moverParte}
          onSoltarParte={soltarParte}
          cursorPosition={cursorPos}
          isPinching={isPinching}
        />
      </View>

      <SafeAreaView style={styles.safeAreaBottom} edges={['bottom']}>
        <View style={styles.footer}>
          <Text style={styles.hint}>{escena.estadoActual.mensaje}</Text>
          {!handTracker.isAvailable ? (
            <Text style={styles.hintSub}>Usa tus manos frente a la camara. Toca la pantalla como alternativa.</Text>
          ) : !handTracker.isTracking ? (
            <Text style={styles.hintSub}>Iniciando camara...</Text>
          ) : (
            <Text style={styles.hintSub}>Mueve tu mano para controlar el cursor. Pellizca para agarrar.</Text>
          )}
          {estado.parteAgarrada ? (
            <TouchableOpacity activeOpacity={0.88} onPress={soltarParte} style={styles.dropButton}>
              <Ionicons name="hand-left" size={18} color={colors.white} />
              <Text style={styles.dropButtonText}>Soltar pieza</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.88} onPress={reiniciarPartida} style={styles.resetButton}>
              <Ionicons name="refresh" size={18} color={colors.white} />
              <Text style={styles.resetButtonText}>Reiniciar</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function encontrarParteCercana(pos, partes) {
  if (!pos || !partes) return null;
  let minimaDistancia = Infinity;
  let masCercana = null;
  for (const p of partes) {
    if (p.ensamblada) continue;
    const dx = pos.x - p.posicion[0];
    const dy = pos.y - p.posicion[1];
    const dz = pos.z - p.posicion[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < minimaDistancia && dist < 1.5) {
      minimaDistancia = dist;
      masCercana = p.id;
    }
  }
  return masCercana;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safeAreaTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  safeAreaBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  exitButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  exitButtonDisabled: { opacity: 0.5 },
  headerCenter: { flex: 1 },
  title: { color: colors.white, fontFamily: fonts.black, fontSize: 17 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.semiBold, fontSize: 11 },
  skillBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FF6B35', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  skillBadgeText: { color: colors.white, fontFamily: fonts.black, fontSize: 10 },
  sceneContainer: { flex: 1 },
  footer: {
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', gap: 8,
  },
  hint: { color: colors.white, fontFamily: fonts.semiBold, fontSize: 13, textAlign: 'center' },
  hintSub: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.semiBold, fontSize: 11, textAlign: 'center' },
  dropButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FF6B35', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  dropButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
  resetButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  resetButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
});
