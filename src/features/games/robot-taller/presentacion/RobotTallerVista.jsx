import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../../constants/theme';
import EscenaEnsamblaje from './EscenaEnsamblaje';
import QuizOverlay from './QuizOverlay';
import MathChallengeModal from './MathChallengeModal';
import { NIVELES } from '../robotTaller.constants';
import {
  GameResultOverlay,
} from '../../core/GameShellOverlays';

const ROBOT_GUIDE_MASCOT = require('../../../../../assets/branding/fondo definitivo.jpeg');

function RobotMissionGuide({ guia, preparandoPartida, onStart }) {
  return (
    <View style={styles.robotGuideOverlay}>
      <View style={styles.robotGuideCard}>
        <View style={styles.robotGuideMascotFrame}>
          <Image source={ROBOT_GUIDE_MASCOT} style={styles.robotGuideMascotImage} resizeMode="cover" />
        </View>

        <View style={styles.robotGuideContent}>
          <Text style={styles.robotGuideTitle}>{guia.titulo}</Text>
          <Text style={styles.robotGuideMessage}>{guia.mensaje}</Text>

          <View style={styles.robotGuideSteps}>
            {guia.pasos.map((paso, indice) => (
              <View key={`robot-guide-step-${indice}`} style={styles.robotGuideStepRow}>
                <View style={styles.robotGuideStepBadge}>
                  <Text style={styles.robotGuideStepBadgeText}>{indice + 1}</Text>
                </View>
                <Text style={styles.robotGuideStepText}>{paso}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          disabled={preparandoPartida}
          onPress={onStart}
          style={[styles.robotGuidePrimaryButton, preparandoPartida && styles.robotGuidePrimaryButtonDisabled]}
        >
          <Text style={styles.robotGuidePrimaryButtonText}>
            {preparandoPartida ? 'Preparando...' : guia.accion}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

export default function RobotTallerVista({
  onSalir, escena, estado, configuracion,
  agarrarParte, moverParte, soltarParte, reiniciarPartida,
  finalizarPorTiempo, permitirReinicioManual = false,
  prepararPartida, preparandoPartida = false,
  tiempoRestanteInicialMs = null,
  rondaVersion = 0,
  modoQuiz, preguntaActual, feedbackQuiz, responderQuiz,
  problemaMatematico, mostrarModalMatematica,
  manejarCorrectaMatematica, manejarIncorrectaMatematica,
  setMostrarModalMatematica,
  temaNombre,
  uiAudio,
}) {
  const viewport = useWindowDimensions();
  const [enPausa, setEnPausa] = useState(false);
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(true);
  const [bloqueandoPorTiempo, setBloqueandoPorTiempo] = useState(false);
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
  const faseAnteriorRef = useRef(estado.fase);

  const nivelConfig = NIVELES[configuracion?.nivel] ?? NIVELES[1];
  const piezaDesbloqueadaId =
    estado.piezaObjetivoActualId
    ?? estado.partes.find((p) => !p.ensamblada && !p.bloqueado)?.id
    ?? null;
  const mathTargetId =
    problemaMatematico && estado.partes.find((p) => p.id === problemaMatematico.idParte)?.bloqueado
      ? problemaMatematico.idParte
      : null;
  const totalPiezas = estado.partes.length;

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setEnPausa(false);
    setTiempoRestanteMs(resolverTiempoInicial());
    tiempoAgotadoNotificadoRef.current = false;
    setBloqueandoPorTiempo(false);
  }, [resolverTiempoInicial, rondaVersion]);

  useEffect(() => {
    if (estado.fase === 'completado' || mostrarInstrucciones || enPausa || preparandoPartida) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      setTiempoRestanteMs((prev) => {
        if (prev <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }

        const siguienteValor = Math.max(prev - 1000, 0);
        if (siguienteValor <= 0 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return siguienteValor;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [estado.fase, enPausa, mostrarInstrucciones, preparandoPartida, rondaVersion]);

  useEffect(() => {
    finalizarPorTiempoRef.current = finalizarPorTiempo;
  }, [finalizarPorTiempo]);

  useEffect(() => {
    if (estado.fase === 'completado') {
      tiempoAgotadoNotificadoRef.current = false;
      setBloqueandoPorTiempo(false);
      return;
    }

    if (tiempoRestanteMs > 0 || tiempoAgotadoNotificadoRef.current) {
      return;
    }

    tiempoAgotadoNotificadoRef.current = true;
    setBloqueandoPorTiempo(true);
    finalizarPorTiempoRef.current?.();
  }, [estado.fase, tiempoRestanteMs]);

  useEffect(() => {
    const faseAnterior = faseAnteriorRef.current;
    const reinicioDeRonda =
      faseAnterior === 'completado' &&
      estado.fase === 'explotado' &&
      estado.contadorEnsambladas === 0;

    if (reinicioDeRonda) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTiempoRestanteMs(resolverTiempoInicial());
      tiempoAgotadoNotificadoRef.current = false;
      setBloqueandoPorTiempo(false);
    }

    faseAnteriorRef.current = estado.fase;
  }, [estado.contadorEnsambladas, estado.fase, resolverTiempoInicial]);

  const togglePausa = useCallback(() => setEnPausa((prev) => !prev), []);

  const handleReiniciar = useCallback(() => {
    uiAudio?.reproducirSeleccion?.();
    setMostrarInstrucciones(true);
    setTiempoRestanteMs(tiempoLimiteMs);
    reiniciarPartida();
  }, [reiniciarPartida, tiempoLimiteMs, uiAudio]);

  const handleComenzar = useCallback(async () => {
    if (preparandoPartida) {
      return;
    }

    const partidaLista =
      typeof prepararPartida === 'function' ? await prepararPartida() : true;

    if (partidaLista) {
      uiAudio?.reproducirSeleccion?.();
      setMostrarInstrucciones(false);
    }
  }, [preparandoPartida, prepararPartida, uiAudio]);

  const interaccionesBloqueadas =
    enPausa ||
    mostrarInstrucciones ||
    bloqueandoPorTiempo ||
    preparandoPartida ||
    estado.fase === 'completado';

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
          interaccionesBloqueadas={interaccionesBloqueadas}
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
            <Text style={styles.subtitle}>Nivel {configuracion.nivel}: {nivelConfig.nombre} | {temaNombre ?? 'Robot Constructor'} | {estado.contadorEnsambladas}/{totalPiezas} piezas</Text>
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
          onResponder={responderQuiz} partesEnsambladas={estado.contadorEnsambladas} totalPiezas={totalPiezas} />
      ) : null}
      
      {mostrarInstrucciones ? (
        <RobotMissionGuide
          guia={escena.guiaInicial}
          preparandoPartida={preparandoPartida}
          onStart={handleComenzar}
        />
      ) : null}

      {enPausa && <OverlayPausa alReanudar={togglePausa} />}

      {estado.fase !== 'completado' ? (
        <SafeAreaView style={styles.safeAreaBottom} edges={['bottom']}>
          <View style={styles.footer}>
            {tiempoRestanteMs <= 0 ? (
              <Text style={styles.hintTimeout}>Se acabo el tiempo. Estamos guardando tu resultado.</Text>
            ) : bloqueandoPorTiempo ? (
              <Text style={styles.hintTimeout}>Estamos cerrando esta ronda para dejar tu progreso consistente.</Text>
            ) : (
              <Text style={styles.hintSub}>{estado.mensaje}</Text>
            )}
            <View style={styles.footerButtons}>
              {problemaMatematico && !mostrarModalMatematica && !bloqueandoPorTiempo && (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => {
                    uiAudio?.reproducirSeleccion?.();
                    setMostrarModalMatematica(true);
                  }}
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

      {!mostrarInstrucciones && !bloqueandoPorTiempo && estado.fase !== 'completado' && (
        <MathChallengeModal
          problema={problemaMatematico}
          visible={mostrarModalMatematica}
          onCorrectAnswer={manejarCorrectaMatematica}
          onIncorrectAnswer={manejarIncorrectaMatematica}
          onClose={() => setMostrarModalMatematica(false)}
        />
      )}

      {escena.resultado.visible && (
        <GameResultOverlay
          ribbonText={escena.resultado.cinta}
          badgeText={escena.resultado.insignia}
          title={escena.resultado.titulo}
          rewardTitle="Premio del reto"
          description={escena.resultado.descripcion}
          starsEarned={escena.resultado.estrellas}
          metrics={escena.resultado.metricas}
          progressTitle="Progreso guardado"
          progressMessage={escena.resultado.mensajeProgreso}
          achievements={escena.resultado.logros}
          continueLabel={escena.resultado.etiquetaContinuar}
          onContinue={escena.resultado.accionContinuar}
          exitLabel={escena.resultado.etiquetaSalir}
          onExit={escena.resultado.accionSalir}
          topExitLabel={escena.salida.etiqueta}
          onTopExit={escena.salida.permitida ? onSalir : null}
          topExitDisabled={!escena.salida.permitida}
          celebrating={escena.resultado.mostrarCelebracion}
          syncing={escena.resultado.sincronizandoCierre}
          viewport={viewport}
        />
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
  robotGuideOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(8,19,38,0.58)',
  },
  robotGuideCard: {
    width: '92%',
    maxWidth: 430,
    borderRadius: 28,
    borderWidth: 5,
    borderColor: '#8D4E20',
    backgroundColor: '#FFF4D8',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#422713',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  robotGuideMascotFrame: {
    width: 126,
    height: 126,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: '#F5C84B',
    backgroundColor: '#9B36D9',
    overflow: 'hidden',
    marginBottom: 16,
  },
  robotGuideMascotImage: {
    width: '112%',
    height: '112%',
    marginLeft: '-6%',
    marginTop: '-6%',
  },
  robotGuideContent: {
    width: '100%',
    gap: 10,
  },
  robotGuideTitle: {
    color: '#3F2512',
    fontFamily: fonts.black,
    fontSize: 28,
    lineHeight: 31,
    textAlign: 'center',
  },
  robotGuideMessage: {
    color: '#6F3D1E',
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  robotGuideSteps: {
    gap: 10,
    marginTop: 2,
  },
  robotGuideStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  robotGuideStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#35B84A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  robotGuideStepBadgeText: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 15,
  },
  robotGuideStepText: {
    flex: 1,
    color: '#5B3019',
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  robotGuidePrimaryButton: {
    width: '100%',
    minHeight: 62,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#1D7B31',
    backgroundColor: '#39C84F',
    shadowColor: '#145A26',
    shadowOpacity: 0.38,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  robotGuidePrimaryButtonDisabled: {
    opacity: 0.75,
  },
  robotGuidePrimaryButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  instructionsCard: { alignItems: 'center', gap: 16, paddingHorizontal: 32, paddingVertical: 36, borderRadius: 30, backgroundColor: '#8338EC', borderWidth: 6, borderColor: '#FFBE0B', marginHorizontal: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  iconCircle: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 35, padding: 10, marginBottom: -5 },
  instructionsTitle: { color: colors.white, fontFamily: fonts.black, fontSize: 28, textAlign: 'center' },
  instructionsText: { color: '#00F5D4', fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  startButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FF006E', borderRadius: 30, paddingHorizontal: 32, paddingVertical: 16, marginTop: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  startButtonDisabled: { opacity: 0.7 },
  startButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 20, textTransform: 'uppercase' },
});
