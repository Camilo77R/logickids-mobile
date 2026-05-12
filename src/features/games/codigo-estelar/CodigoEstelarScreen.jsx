import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GAME_STATUS } from './codigoEstelar.constants';
import { useCodigoEstelarController } from './useCodigoEstelarController';

const LeaderboardCard = ({ item, index }) => (
  <View style={styles.leaderRow}>
    <Text style={styles.leaderRank}>#{index + 1}</Text>
    <View style={styles.leaderMeta}>
      <Text style={styles.leaderName}>{item.nombre}</Text>
      <Text style={styles.leaderDetail}>Combo {item.combo} · Aciertos {item.aciertos ?? 0}</Text>
    </View>
    <Text style={styles.leaderScore}>{item.puntaje}</Text>
  </View>
);

const computeStepStates = (steps) => {
  let pendingConsumed = false;

  return steps.map((step) => {
    if (step.done) {
      return { ...step, visualState: 'done' };
    }

    if (!pendingConsumed) {
      pendingConsumed = true;
      return { ...step, visualState: 'current' };
    }

    return { ...step, visualState: 'pending' };
  });
};

const buildFlowSteps = ({ runtime, status }) =>
  computeStepStates([
    {
      key: 'qr',
      title: 'QR validado',
      detail: runtime.studentProfile
        ? `Estudiante ${runtime.studentProfile.nombre}`
        : 'Aun no se autentica el estudiante',
      done: Boolean(runtime.studentProfile),
    },
    {
      key: 'http',
      title: 'Sesion HTTP creada',
      detail: runtime.session
        ? `Sesion #${runtime.session.id} para ${runtime.minigame?.titulo ?? 'Codigo Estelar'}`
        : 'Todavia no existe sesion oficial',
      done: Boolean(runtime.session),
    },
    {
      key: 'socket',
      title: 'Sala socket unida',
      detail: runtime.realtime?.room_key
        ? `Room ${runtime.realtime.room_key}`
        : 'El cliente aun no entra a la sala realtime',
      done: status === GAME_STATUS.playing || status === GAME_STATUS.finished,
    },
    {
      key: 'close',
      title: 'Cierre oficial del servidor',
      detail: runtime.finalization
        ? `Resumen oficial ${runtime.finalization.resumen_oficial.puntaje} pts`
        : 'Pendiente hasta que llegue game over',
      done: Boolean(runtime.finalization),
    },
  ]);

const FlowStep = ({ step }) => (
  <View style={styles.flowRow}>
    <View
      style={[
        styles.flowDot,
        step.visualState === 'done' && styles.flowDotDone,
        step.visualState === 'current' && styles.flowDotCurrent,
      ]}
    />
    <View style={styles.flowMeta}>
      <Text
        style={[
          styles.flowTitle,
          step.visualState === 'done' && styles.flowTitleDone,
          step.visualState === 'current' && styles.flowTitleCurrent,
        ]}
      >
        {step.title}
      </Text>
      <Text style={styles.flowDetail}>{step.detail}</Text>
    </View>
  </View>
);

const resolveRoomLabel = (roomKey) => {
  if (!roomKey) return null;

  const match = /room:grupo_(\d+):/.exec(roomKey);
  if (!match) {
    return roomKey;
  }

  return `Sala grupo ${match[1]}`;
};

const buildFinishState = ({ runtime }) => {
  if (!runtime.gameOver || !runtime.studentProfile) {
    return null;
  }

  const winnerId = runtime.gameOver.ganador?.estudianteId ?? null;
  const ranking = runtime.gameOver.rankingFinal ?? runtime.leaderboard ?? [];
  const positionIndex = ranking.findIndex(
    (entry) => entry.estudianteId === runtime.studentProfile.id
  );
  const localRankingEntry = positionIndex >= 0 ? ranking[positionIndex] : null;
  const officialSummary = runtime.finalization?.resumen_oficial ?? null;

  return {
    didWin: winnerId === runtime.studentProfile.id,
    winnerName: runtime.gameOver.ganador?.nombre ?? 'Otro jugador',
    winnerScore: runtime.gameOver.ganador?.puntaje ?? 0,
    position: positionIndex >= 0 ? positionIndex + 1 : null,
    localScore: officialSummary?.puntaje ?? localRankingEntry?.puntaje ?? 0,
    localHits: officialSummary?.aciertos ?? localRankingEntry?.aciertos ?? 0,
    localErrors: officialSummary?.errores ?? localRankingEntry?.errores ?? 0,
    localComboMax: officialSummary?.combo_maximo ?? localRankingEntry?.combo ?? 0,
  };
};

export default function CodigoEstelarScreen({ onSalir }) {
  const {
    form,
    runtime,
    status,
    errorMessage,
    connectionStep,
    updateFormField,
    startGame,
    submitClassification,
    resetFlow,
    isBusy,
  } = useCodigoEstelarController();

  const canAnswer = status === GAME_STATUS.playing && runtime.currentMeteor != null;
  const canUseEqual = runtime.gameConfig?.permite_igual ?? true;
  const meteorCardValue = runtime.currentMeteor != null
    ? runtime.currentMeteor
    : runtime.gameOver
      ? 'Juego terminado'
      : status === GAME_STATUS.ready || status === GAME_STATUS.connecting
        ? 'Uniendose a la sala...'
        : 'Esperando inicio...';
  const meteorCardHint = runtime.gameOver
    ? 'La partida ya cerro. Puede iniciar otra sesion.'
    : 'Dificultad ' + (runtime.gameConfig?.dificultad ?? '-') + ' · Meta ' + (runtime.gameConfig?.meta_puntaje ?? '-');
  const flowSteps = buildFlowSteps({ runtime, status });
  const hasFlowActivity = status !== GAME_STATUS.setup || Boolean(runtime.studentProfile);
  const roomLabel = resolveRoomLabel(runtime.realtime?.room_key);
  const finishState = buildFinishState({ runtime });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#08111f" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onSalir} style={styles.backButton}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>Modo MVP conectado al backend real</Text>
          <Text style={styles.title}>Código Estelar</Text>
          <Text style={styles.subtitle}>
            Primero cerramos contrato y realtime. Después lo llevamos al low poly.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Acceso de prueba</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={form.apiBaseUrl}
            onChangeText={(value) => updateFormField('apiBaseUrl', value)}
            placeholder="http://192.168.1.50:3000/api"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={form.qrToken}
            onChangeText={(value) => updateFormField('qrToken', value)}
            placeholder="QR-XXXXXX-XXXXXX"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={form.dificultad}
            onChangeText={(value) => updateFormField('dificultad', value)}
            placeholder="2"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />
          <TouchableOpacity
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            disabled={isBusy}
            onPress={startGame}
          >
            <Text style={styles.primaryButtonText}>
              {isBusy ? 'Conectando...' : 'Entrar a la sala'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.runtimeHint}>Estado actual: {connectionStep}</Text>
          {roomLabel && <Text style={styles.runtimeHint}>Sala actual: {roomLabel}</Text>}
          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>

        {hasFlowActivity && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Flujo del vertical slice</Text>
            <Text style={styles.flowIntro}>
              Esta vista le muestra las cuatro compuertas reales del MVP: identidad,
              sesion HTTP, sala realtime y cierre oficial.
            </Text>
            {flowSteps.map((step) => (
              <FlowStep key={step.key} step={step} />
            ))}
          </View>
        )}

        {runtime.gameConfig && (
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Objetivo central</Text>
              <Text style={styles.cardValue}>{runtime.gameConfig.numero_objetivo}</Text>
              <Text style={styles.cardHint}>
                Rango {runtime.gameConfig.rango_numeros.min} a {runtime.gameConfig.rango_numeros.max}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Meteorito actual</Text>
              <Text style={styles.cardValue}>{meteorCardValue}</Text>
              <Text style={styles.cardHint}>{meteorCardHint}</Text>
            </View>
          </View>
        )}

        <View style={styles.answerRow}>
          {['menor', 'igual', 'mayor'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.answerButton,
                (!canAnswer || (option === 'igual' && !canUseEqual)) && styles.buttonDisabled,
              ]}
              disabled={!canAnswer || (option === 'igual' && !canUseEqual)}
              onPress={() => submitClassification(option)}
            >
              <Text style={styles.answerButtonText}>{option.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {runtime.lastFeedback && !runtime.gameOver && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>
              {runtime.lastFeedback.esCorrecto ? 'Acierto oficial' : 'Error oficial'}
            </Text>
            <Text style={styles.feedbackDetail}>
              Delta {runtime.lastFeedback.deltaPuntos} · Puntaje {runtime.lastFeedback.puntajeActual}
            </Text>
            <Text style={styles.feedbackDetail}>
              Combo {runtime.lastFeedback.comboActual} · Esperada {runtime.lastFeedback.clasificacionEsperada}
            </Text>
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Ranking en vivo</Text>
          {runtime.leaderboard.length ? (
            runtime.leaderboard.map((item, index) => (
              <LeaderboardCard key={`${item.estudianteId}-${index}`} item={item} index={index} />
            ))
          ) : (
            <Text style={styles.emptyText}>Todavía no hay ranking. Únase y responda la primera ronda.</Text>
          )}
        </View>

        {runtime.gameOver && finishState && (
          <View
            style={[
              styles.finishCard,
              finishState.didWin ? styles.finishCardWinner : styles.finishCardLoser,
            ]}
          >
            <Text
              style={[
                styles.finishTitle,
                finishState.didWin ? styles.finishTitleWinner : styles.finishTitleLoser,
              ]}
            >
              {finishState.didWin ? 'Ganaste la sala' : 'La sala ya terminó'}
            </Text>
            <Text style={styles.finishWinner}>
              {finishState.didWin
                ? `Llegaste a ${finishState.winnerScore} puntos y cerraste la partida primero.`
                : `Ganó ${finishState.winnerName} con ${finishState.winnerScore} puntos.`}
            </Text>
            <View style={styles.finishMetrics}>
              {finishState.position && (
                <View style={styles.finishMetricChip}>
                  <Text style={styles.finishMetricLabel}>Puesto</Text>
                  <Text style={styles.finishMetricValue}>#{finishState.position}</Text>
                </View>
              )}
              <View style={styles.finishMetricChip}>
                <Text style={styles.finishMetricLabel}>Puntaje</Text>
                <Text style={styles.finishMetricValue}>{finishState.localScore}</Text>
              </View>
              <View style={styles.finishMetricChip}>
                <Text style={styles.finishMetricLabel}>Aciertos</Text>
                <Text style={styles.finishMetricValue}>{finishState.localHits}</Text>
              </View>
              <View style={styles.finishMetricChip}>
                <Text style={styles.finishMetricLabel}>Combo max</Text>
                <Text style={styles.finishMetricValue}>{finishState.localComboMax}</Text>
              </View>
            </View>
            <Text style={styles.finishDetail}>
              {finishState.didWin
                ? 'El servidor cerró oficialmente la sala y congeló el ranking final.'
                : `Tu cierre oficial quedó en ${finishState.localScore} pts, con ${finishState.localHits} aciertos y ${finishState.localErrors} errores.`}
            </Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetFlow}>
              <Text style={styles.secondaryButtonText}>Jugar revancha</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  content: {
    padding: 20,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backButtonText: {
    color: '#d9e3f0',
    fontWeight: '700',
  },
  eyebrow: {
    color: '#82d7ff',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fbff',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 20,
  },
  panel: {
    backgroundColor: '#101b2e',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(130,215,255,0.14)',
    gap: 12,
  },
  panelTitle: {
    color: '#f8fbff',
    fontSize: 18,
    fontWeight: '800',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#18c47a',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#062312',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#e8f3ff',
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  errorText: {
    color: '#ff8a8a',
    lineHeight: 20,
  },
  runtimeHint: {
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 20,
  },
  flowIntro: {
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 20,
  },
  flowRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  flowDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  flowDotDone: {
    backgroundColor: '#18c47a',
  },
  flowDotCurrent: {
    backgroundColor: '#82d7ff',
  },
  flowMeta: {
    flex: 1,
    gap: 2,
  },
  flowTitle: {
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '800',
  },
  flowTitleDone: {
    color: '#d8ffe9',
  },
  flowTitleCurrent: {
    color: '#dff5ff',
  },
  flowDetail: {
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 19,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#0d1727',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  cardLabel: {
    color: '#8ea4bf',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1,
  },
  cardValue: {
    color: '#fff4a4',
    fontSize: 38,
    fontWeight: '900',
  },
  cardHint: {
    color: 'rgba(255,255,255,0.58)',
  },
  answerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  answerButton: {
    flex: 1,
    backgroundColor: '#162742',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(130,215,255,0.12)',
  },
  answerButtonText: {
    color: '#f7fbff',
    fontWeight: '800',
  },
  feedbackCard: {
    backgroundColor: '#14243c',
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  feedbackTitle: {
    color: '#9ef2c7',
    fontWeight: '900',
    fontSize: 16,
  },
  feedbackDetail: {
    color: '#d8e7f6',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  leaderRank: {
    color: '#82d7ff',
    fontWeight: '900',
    width: 32,
  },
  leaderMeta: {
    flex: 1,
    gap: 2,
  },
  leaderName: {
    color: '#f8fbff',
    fontWeight: '700',
  },
  leaderDetail: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 12,
  },
  leaderScore: {
    color: '#fff3aa',
    fontWeight: '900',
    fontSize: 18,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
  },
  finishCard: {
    backgroundColor: '#101f34',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(24,196,122,0.22)',
  },
  finishCardWinner: {
    borderColor: 'rgba(24,196,122,0.28)',
    backgroundColor: '#0d2330',
  },
  finishCardLoser: {
    borderColor: 'rgba(255,234,140,0.24)',
    backgroundColor: '#162338',
  },
  finishTitle: {
    color: '#d7ffe7',
    fontWeight: '900',
    fontSize: 22,
    marginBottom: 8,
  },
  finishTitleWinner: {
    color: '#d7ffe7',
  },
  finishTitleLoser: {
    color: '#fff1a8',
  },
  finishWinner: {
    color: '#f8fbff',
    lineHeight: 22,
  },
  finishMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  finishMetricChip: {
    minWidth: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  finishMetricLabel: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  finishMetricValue: {
    color: '#f8fbff',
    fontSize: 18,
    fontWeight: '900',
  },
  finishDetail: {
    color: 'rgba(255,255,255,0.66)',
    marginTop: 12,
    lineHeight: 20,
  },
});


