import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const resolveOfficialResult = (runtime, finalization) => {
  const selfId = runtime.studentProfile?.id;
  const ranking = runtime.gameOver?.rankingFinal ?? runtime.leaderboard ?? [];
  const playerRow = ranking.find((entry) => entry.estudianteId === selfId) ?? null;
  const winner = runtime.gameOver?.ganador ?? null;

  const summary = finalization?.resumen_oficial ?? {
    puntaje: Number(playerRow?.puntaje ?? runtime.lastFeedback?.puntajeActual ?? 0),
    aciertos: Number(playerRow?.aciertos ?? 0),
    errores: Number(playerRow?.errores ?? 0),
    combo_maximo: Number(playerRow?.combo_maximo ?? playerRow?.combo ?? 0),
  };

  return {
    summary,
    position: ranking.findIndex((entry) => entry.estudianteId === selfId) + 1,
    winner,
    isWinner: winner?.estudianteId === selfId,
    achievements: finalization?.logros_desbloqueados ?? [],
  };
};

const buildStatusCopy = ({ finalization, isFinalizing, errorMessage, isWinner }) => {
  if (isFinalizing) {
    return {
      badge: 'Guardando',
      title: 'Registrando tu partida',
      description: 'Estamos enviando puntaje, aciertos, errores y logros al sistema.',
    };
  }

  if (finalization) {
    return {
      badge: finalization.finalizacion_idempotente ? 'Confirmado' : 'Guardado',
      title: isWinner ? '¡Victoria registrada!' : 'Resultados oficiales listos',
      description: 'Tu partida ya quedó guardada y el dashboard puede actualizarse.',
    };
  }

  return {
    badge: 'Pendiente',
    title: 'No pudimos guardar la partida',
    description: errorMessage || 'Puedes reintentar el guardado antes de volver al dashboard.',
  };
};

export default function CodigoEstelarResultsSheet({
  runtime,
  finalization,
  errorMessage,
  isFinalizing,
  onRetryFinalization,
  onReturnToDashboard,
}) {
  const { summary, position, winner, isWinner, achievements } = resolveOfficialResult(
    runtime,
    finalization
  );
  const statusCopy = buildStatusCopy({
    finalization,
    isFinalizing,
    errorMessage,
    isWinner,
  });

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{statusCopy.badge}</Text>
            </View>
            <Text style={styles.headerEmoji}>{isWinner ? '🏆' : '🚀'}</Text>
          </View>

          <Text style={styles.title}>{statusCopy.title}</Text>
          <Text style={styles.description}>{statusCopy.description}</Text>

          <View style={styles.winnerCard}>
            <Text style={styles.winnerLabel}>Resultado de la sala</Text>
            <Text style={styles.winnerValue}>
              {winner ? `${winner.nombre} ganó con ${winner.puntaje} pts` : 'La carrera terminó'}
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.puntaje}</Text>
              <Text style={styles.statLabel}>Puntos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{position > 0 ? `#${position}` : '—'}</Text>
              <Text style={styles.statLabel}>Puesto</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.aciertos}</Text>
              <Text style={styles.statLabel}>Aciertos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summary.combo_maximo}</Text>
              <Text style={styles.statLabel}>Combo max</Text>
            </View>
          </View>

          <View style={styles.achievementsBlock}>
            <Text style={styles.sectionTitle}>Logros de esta partida</Text>
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <View key={`${achievement.id}-${achievement.clave_logro}`} style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>{achievement.icono || '⭐'}</Text>
                  <View style={styles.achievementBody}>
                    <Text style={styles.achievementTitle}>{achievement.nombre_logro}</Text>
                    <Text style={styles.achievementDescription}>{achievement.descripcion}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyAchievementCard}>
                <Text style={styles.emptyAchievementText}>
                  {finalization
                    ? 'Esta vez no desbloqueaste logros nuevos, pero tu progreso sí quedó guardado.'
                    : 'Todavía no podemos confirmar logros porque el guardado no terminó.'}
                </Text>
              </View>
            )}
          </View>

          {isFinalizing ? (
            <View style={styles.pendingRow}>
              <ActivityIndicator color="#6bd5ff" size="small" />
              <Text style={styles.pendingText}>Guardando resultados oficiales...</Text>
            </View>
          ) : null}

          {!finalization && !isFinalizing ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetryFinalization}
              activeOpacity={0.82}
            >
              <Text style={styles.retryButtonText}>Reintentar guardado</Text>
            </TouchableOpacity>
          ) : null}

          {!isFinalizing ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onReturnToDashboard}
              activeOpacity={0.82}
            >
              <Text style={styles.primaryButtonText}>Volver al dashboard</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 14,
  },
  sheet: {
    maxHeight: '72%',
    borderRadius: 28,
    backgroundColor: 'rgba(7, 15, 29, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(107,213,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 20,
    elevation: 14,
  },
  sheetContent: {
    padding: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    color: '#f8fbff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  headerEmoji: {
    fontSize: 30,
  },
  title: {
    color: '#f8fbff',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
  },
  description: {
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 21,
  },
  winnerCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  winnerLabel: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '900',
  },
  winnerValue: {
    color: '#fff1a8',
    fontSize: 16,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47%',
    minHeight: 88,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(12, 24, 44, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'space-between',
  },
  statValue: {
    color: '#fff1a8',
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
  },
  achievementsBlock: {
    gap: 10,
  },
  sectionTitle: {
    color: '#f8fbff',
    fontSize: 16,
    fontWeight: '900',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(55,215,159,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(55,215,159,0.20)',
  },
  achievementIcon: {
    fontSize: 26,
  },
  achievementBody: {
    flex: 1,
    gap: 4,
  },
  achievementTitle: {
    color: '#eafff5',
    fontSize: 15,
    fontWeight: '900',
  },
  achievementDescription: {
    color: 'rgba(234,255,245,0.78)',
    lineHeight: 18,
    fontSize: 12,
  },
  emptyAchievementCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyAchievementText: {
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 19,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingText: {
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '700',
  },
  retryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,126,114,0.24)',
    backgroundColor: 'rgba(255,126,114,0.12)',
  },
  retryButtonText: {
    color: '#ffd6d2',
    fontSize: 16,
    fontWeight: '900',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#37d79f',
  },
  primaryButtonText: {
    color: '#061a12',
    fontSize: 17,
    fontWeight: '900',
  },
});
