import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../../constants/theme';
import EscenaEnsamblaje from './EscenaEnsamblaje';
import QuizOverlay from './QuizOverlay';
import MathChallengeModal from './MathChallengeModal';
import { NIVELES, PARTES_ROBOT } from '../robotTaller.constants';

function Temporizador({ tiempoRestanteMs, enPausa }) {
  const minutos = Math.floor(tiempoRestanteMs / 60000);
  const segundos = Math.floor((tiempoRestanteMs % 60000) / 1000);
  const agotado = tiempoRestanteMs <= 0;
  const urgente = !agotado && tiempoRestanteMs < 30000;
  return (
    <View style={[styles.timer, agotado && styles.timerAgotado, urgente && styles.timerUrgente]}>
      <Ionicons name={enPausa ? 'pause-circle' : agotado ? 'alarm' : 'hourglass'} size={18}
        color={agotado ? '#FF6B35' : urgente ? '#FFD166' : colors.white} />
      <Text style={[styles.timerText, (agotado || urgente) && styles.timerTextUrgente]}>
        {enPausa ? 'PAUSA' : agotado ? '0:00' : `${minutos}:${segundos.toString().padStart(2, '0')}`}
      </Text>
    </View>
  );
}

function OverlayPausa({ alReanudar }) {
  return (
    <View style={styles.pauseOverlay}>
      <View style={styles.pauseCard}>
        <Ionicons name="pause-circle-outline" size={64} color={colors.white} />
        <Text style={styles.pauseTitle}>Juego en pausa</Text>
        <Text style={styles.pauseSubtitle}>Presiona para continuar</Text>
        <TouchableOpacity activeOpacity={0.88} onPress={alReanudar} style={styles.resumeButton}>
          <Ionicons name="play" size={20} color={colors.white} />
          <Text style={styles.resumeButtonText}>Reanudar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InstruccionesIniciales({ alComenzar, preparando = false }) {
  return (
    <View style={styles.pauseOverlay}>
      <View style={styles.instructionsCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="game-controller" size={32} color="#FFD166" style={{ marginLeft: 2 }} />
        </View>
        <Text style={styles.instructionsTitle}>¡Armá tu Robot!</Text>
        <Text style={styles.instructionsText}>
          1️⃣ Resolvé las cuentas para ganar cada pieza.{"\n\n"}
          2️⃣ Tocá la pieza que ganaste y arrastrala hasta su holograma brillante.{"\n\n"}
          🤖 ¡Completá todo el robot para ganar! ¡Vos podés!
        </Text>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={preparando}
          onPress={alComenzar}
          style={[styles.startButton, preparando && styles.startButtonDisabled]}
        >
          {preparando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Ionicons name="rocket" size={24} color={colors.white} />
          )}
          <Text style={styles.startButtonText}>{preparando ? 'Preparando...' : '¡A Jugar!'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RobotTallerVista({
  onSalir, escena, estado, configuracion,
  agarrarParte, moverParte, soltarParte, reiniciarPartida,
  finalizarPorTiempo, permitirReinicioManual = false,
  prepararPartida, preparandoPartida = false,
  tiempoRestanteInicialMs = null,
  modoQuiz, preguntaActual, feedbackQuiz, responderQuiz,
  problemaMatematico, mostrarModalMatematica,
  manejarCorrectaMatematica, manejarIncorrectaMatematica,
  setMostrarModalMatematica,
  temaNombre,
}) {
  const [enPausa, setEnPausa] = useState(false);
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(true);
  const tiempoLimiteMs = configuracion?.configuracion?.tiempoLimiteMs
    ?? NIVELES[1].tiempoLimiteMs;
  const resolverTiempoInicial = useCallback(() => {
    if (tiempoRestanteInicialMs == null) {
      return tiempoLimiteMs;
    }

    const tiempoRestaurado = Number(tiempoRestanteInicialMs);
    return Number.isFinite(tiempoRestaurado) && tiempoRestaurado >= 0
      ? Math.min(tiempoRestaurado, tiempoLimiteMs)
      : tiempoLimiteMs;
  }, [tiempoLimiteMs, tiempoRestanteInicialMs]);
  const [tiempoRestanteMs, setTiempoRestanteMs] = useState(resolverTiempoInicial);
  const timerRef = useRef(null);
  const tiempoAgotadoNotificadoRef = useRef(false);
  const finalizarPorTiempoRef = useRef(finalizarPorTiempo);

  const nivelConfig = NIVELES[configuracion?.nivel] ?? NIVELES[1];
  const piezaDesbloqueadaId = estado.partes.find((p) => !p.ensamblada && !p.bloqueado)?.id ?? null;
  const mathTargetId = problemaMatematico?.idParte ?? null;

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTiempoRestanteMs(resolverTiempoInicial());
    tiempoAgotadoNotificadoRef.current = false;
  }, [resolverTiempoInicial]);

  useEffect(() => {
    if (estado.fase === 'completado' || mostrarInstrucciones || enPausa) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTiempoRestanteMs((prev) => {
        if (prev <= 0) { clearInterval(timerRef.current); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [estado.fase, enPausa, mostrarInstrucciones, tiempoRestanteInicialMs]);

  useEffect(() => {
    finalizarPorTiempoRef.current = finalizarPorTiempo;
  }, [finalizarPorTiempo]);

  useEffect(() => {
    if (estado.fase === 'completado') {
      tiempoAgotadoNotificadoRef.current = false;
      return;
    }

    if (tiempoRestanteMs > 0 || tiempoAgotadoNotificadoRef.current) {
      return;
    }

    tiempoAgotadoNotificadoRef.current = true;
    finalizarPorTiempoRef.current?.();
  }, [estado.fase, tiempoRestanteMs]);

  const togglePausa = useCallback(() => setEnPausa((prev) => !prev), []);

  const handleReiniciar = useCallback(() => {
    setMostrarInstrucciones(true);
    setTiempoRestanteMs(tiempoLimiteMs);
    reiniciarPartida();
  }, [reiniciarPartida, tiempoLimiteMs]);

  const handleComenzar = useCallback(async () => {
    if (preparandoPartida) {
      return;
    }

    const partidaLista =
      typeof prepararPartida === 'function' ? await prepararPartida() : true;

    if (partidaLista) {
      setMostrarInstrucciones(false);
    }
  }, [preparandoPartida, prepararPartida]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={StyleSheet.absoluteFill}>
        <EscenaEnsamblaje
          estado={estado}
          nivel={configuracion.nivel}
          slotDestacadoId={piezaDesbloqueadaId}
          mathTargetId={mathTargetId}
          feedbackQuiz={feedbackQuiz}
          onAgarrarParte={agarrarParte}
          onMoverParte={moverParte}
          onSoltarParte={soltarParte}
        />
      </View>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.85} disabled={!escena.salida.permitida}
            onPress={onSalir} style={[styles.exitButton, !escena.salida.permitida && styles.exitButtonDisabled]}>
            <Ionicons name="arrow-back" size={20} color={escena.salida.permitida ? colors.white : colors.muted} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{escena.encabezado.titulo}</Text>
            <Text style={styles.subtitle}>Nivel {configuracion.nivel}: {nivelConfig.nombre} | {temaNombre ?? 'Robot Constructor'} | {estado.contadorEnsambladas}/{PARTES_ROBOT.length} piezas</Text>
          </View>
          <Temporizador tiempoRestanteMs={tiempoRestanteMs} enPausa={enPausa} />
          <TouchableOpacity activeOpacity={0.85} onPress={togglePausa} style={styles.pauseButton}>
            <Ionicons name={enPausa ? 'play' : 'pause'} size={18} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.skillBadge}>
            <Ionicons name="construct" size={14} color={colors.white} />
            <Text style={styles.skillBadgeText}>{configuracion.habilidad}</Text>
          </View>
        </View>
      </SafeAreaView>

      {modoQuiz && preguntaActual && !enPausa ? (
        <QuizOverlay pregunta={preguntaActual} feedback={feedbackQuiz}
          onResponder={responderQuiz} partesEnsambladas={estado.contadorEnsambladas} totalPiezas={PARTES_ROBOT.length} />
      ) : null}
      
      {mostrarInstrucciones && (
        <InstruccionesIniciales
          alComenzar={handleComenzar}
          preparando={preparandoPartida}
        />
      )}

      {enPausa && <OverlayPausa alReanudar={togglePausa} />}

      {estado.fase !== 'completado' ? (
        <SafeAreaView style={styles.safeAreaBottom} edges={['bottom']}>
          <View style={styles.footer}>
            {tiempoRestanteMs <= 0 ? (
              <Text style={styles.hintTimeout}>Se acabo el tiempo. Estamos guardando tu resultado.</Text>
            ) : (
              <Text style={styles.hintSub}>{estado.mensaje}</Text>
            )}
            <View style={styles.footerButtons}>
              {problemaMatematico && !mostrarModalMatematica && (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setMostrarModalMatematica(true)}
                  style={styles.solveButton}
                >
                  <Ionicons name="bulb" size={18} color={colors.white} />
                  <Text style={styles.solveButtonText}>Desbloquear Pieza</Text>
                </TouchableOpacity>
              )}
              {permitirReinicioManual ? (
                <TouchableOpacity activeOpacity={0.88} onPress={handleReiniciar} style={styles.resetButton}>
                  <Ionicons name="refresh" size={18} color={colors.white} />
                  <Text style={styles.resetButtonText}>Reiniciar práctica</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      ) : null}

      {!mostrarInstrucciones && (
        <MathChallengeModal
          problema={problemaMatematico}
          visible={mostrarModalMatematica}
          onCorrectAnswer={manejarCorrectaMatematica}
          onIncorrectAnswer={manejarIncorrectaMatematica}
          onClose={() => setMostrarModalMatematica(false)}
        />
      )}

      {escena.resultado.visible && (
        <View style={styles.pauseOverlay}>
          <View style={styles.instructionsCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="trophy" size={32} color="#FFD166" style={{ marginLeft: 2 }} />
            </View>
            <Text style={styles.instructionsTitle}>{escena.resultado.titulo}</Text>
            
            {escena.resultado.accionContinuar && (
              <TouchableOpacity activeOpacity={0.88} onPress={escena.resultado.accionContinuar} style={styles.startButton}>
                <Ionicons name="play" size={24} color={colors.white} />
                <Text style={styles.startButtonText}>{escena.resultado.etiquetaContinuar}</Text>
              </TouchableOpacity>
            )}

            {escena.resultado.accionSalir && (
              <TouchableOpacity activeOpacity={0.88} onPress={escena.resultado.accionSalir} style={[styles.resetButton, { marginTop: 12 }]}>
                <Text style={styles.resetButtonText}>{escena.resultado.etiquetaSalir}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safeAreaTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  safeAreaBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  exitButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  exitButtonDisabled: { opacity: 0.5 },
  headerCenter: { flex: 1 },
  title: { color: colors.white, fontFamily: fonts.black, fontSize: 17 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.semiBold, fontSize: 10 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  timerAgotado: { backgroundColor: 'rgba(255,107,53,0.3)' },
  timerUrgente: { backgroundColor: 'rgba(255,209,102,0.2)' },
  timerText: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
  timerTextUrgente: { color: '#FFD166' },
  pauseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  skillBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6B35', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  skillBadgeText: { color: colors.white, fontFamily: fonts.black, fontSize: 10 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.7)', marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  errorText: { color: '#FF6B35', fontFamily: fonts.semiBold, fontSize: 11, flex: 1 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', gap: 8 },
  hintTimeout: { color: '#FF6B35', fontFamily: fonts.semiBold, fontSize: 13, textAlign: 'center' },
  hintSub: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.semiBold, fontSize: 11, textAlign: 'center' },
  footerButtons: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  solveButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00E676', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  solveButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  resetButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
  pauseOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 20, alignItems: 'center', justifyContent: 'center' },
  pauseCard: { alignItems: 'center', gap: 16, paddingHorizontal: 40, paddingVertical: 40, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  pauseTitle: { color: colors.white, fontFamily: fonts.black, fontSize: 24 },
  pauseSubtitle: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.semiBold, fontSize: 14 },
  resumeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00E676', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  resumeButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 16 },
  instructionsCard: { alignItems: 'center', gap: 16, paddingHorizontal: 32, paddingVertical: 36, borderRadius: 30, backgroundColor: '#8338EC', borderWidth: 6, borderColor: '#FFBE0B', marginHorizontal: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  iconCircle: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 35, padding: 10, marginBottom: -5 },
  instructionsTitle: { color: colors.white, fontFamily: fonts.black, fontSize: 28, textAlign: 'center' },
  instructionsText: { color: '#00F5D4', fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  startButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FF006E', borderRadius: 30, paddingHorizontal: 32, paddingVertical: 16, marginTop: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  startButtonDisabled: { opacity: 0.7 },
  startButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 20, textTransform: 'uppercase' },
});
