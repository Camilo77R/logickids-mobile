import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CazadorEstrellasScreen from '../features/games/cazador-estrellas/CazadorEstrellasScreen';
import CodigoEstelarScreen from '../features/games/codigo-estelar/CodigoEstelarScreen';
import StudentAchievementsStrip from '../features/student-dashboard/components/StudentAchievementsStrip';
import StudentHeroCard from '../features/student-dashboard/components/StudentHeroCard';
import StudentPlayMissionCard from '../features/student-dashboard/components/StudentPlayMissionCard';
import StudentProgressCard from '../features/student-dashboard/components/StudentProgressCard';
import StudentSkillStatsCard from '../features/student-dashboard/components/StudentSkillStatsCard';
import { useStudentDashboard } from '../hooks/useStudentDashboard';

const buildGroupLabel = (profile) => {
  if (!profile?.grupo_id) return 'Sin grupo activo';
  return profile.grupo_nombre ?? `Grupo #${profile.grupo_id}`;
};

/**
 * Dashboard personal del estudiante.
 *
 * POR QUE:
 * - HU-42 pide identidad, logros y progreso en un solo vistazo
 * - HU-43 arranca desde aqui, pero solo si la sesion del grupo esta activa
 * - la pantalla solo orquesta navegacion y layout
 * - la carga de datos vive en un hook separado para no mezclar capas
 */
export default function DashboardScreen({ studentSession, onLogout }) {
  const [juegoActivo, setJuegoActivo] = useState(null);
  const {
    profile,
    achievements,
    progressSummary,
    skillStatsView,
    playState,
    isLoading,
    isRefreshing,
    errorMessage,
    reloadDashboard,
  } = useStudentDashboard(studentSession);

  const studentProfile = profile ?? studentSession?.studentProfile ?? null;

  const handleStartCodigoEstelar = () => {
    if (!playState.canPlay) {
      return;
    }

    setJuegoActivo('codigo-estelar');
  };

  const handleCloseCodigoEstelar = () => {
    setJuegoActivo(null);
    void reloadDashboard();
  };

  if (juegoActivo === 'cazador-estrellas') {
    return <CazadorEstrellasScreen onSalir={() => setJuegoActivo(null)} />;
  }

  if (juegoActivo === 'codigo-estelar') {
    return (
      <CodigoEstelarScreen
        onSalir={() => setJuegoActivo(null)}
        onReturnToDashboard={handleCloseCodigoEstelar}
        studentSession={studentSession}
        autoLaunch={playState.canPlay}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060c18" />

      <View style={styles.glowBlue} />
      <View style={styles.glowGreen} />
      <View style={styles.glowGold} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={reloadDashboard}
            tintColor="#8bddff"
          />
        }
      >
        <StudentHeroCard
          profile={studentProfile}
          onLogout={onLogout}
          isRefreshing={isRefreshing}
        />

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>No pudimos refrescar tu tablero</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#8bddff" />
            <Text style={styles.loadingText}>Cargando tu progreso espacial...</Text>
          </View>
        ) : null}

        <StudentAchievementsStrip achievements={achievements} />

        <StudentProgressCard progressSummary={progressSummary} />

        <StudentSkillStatsCard skillStatsView={skillStatsView} />

        <StudentPlayMissionCard
          playState={playState}
          groupLabel={buildGroupLabel(studentProfile)}
          onPlayPress={handleStartCodigoEstelar}
        />

        <TouchableOpacity
          style={styles.labCard}
          onPress={() => setJuegoActivo('cazador-estrellas')}
          activeOpacity={0.86}
        >
          <View style={styles.labBadge}>
            <Text style={styles.labBadgeText}>Laboratorio</Text>
          </View>
          <Text style={styles.labTitle}>Cazador de Estrellas</Text>
          <Text style={styles.labText}>
            Modo arcade para seguir probando reflejos y experimentar nuevas mecanicas.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060c18',
  },
  content: {
    padding: 18,
    gap: 16,
  },
  glowBlue: {
    position: 'absolute',
    top: -80,
    right: -24,
    width: 230,
    height: 230,
    borderRadius: 999,
    backgroundColor: 'rgba(82,133,255,0.14)',
  },
  glowGreen: {
    position: 'absolute',
    top: 300,
    left: -96,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(53,213,155,0.10)',
  },
  glowGold: {
    position: 'absolute',
    bottom: 60,
    right: -88,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(255,185,91,0.10)',
  },
  errorCard: {
    borderRadius: 22,
    padding: 16,
    gap: 4,
    backgroundColor: 'rgba(107, 34, 42, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,126,114,0.28)',
  },
  errorTitle: {
    color: '#ffe3de',
    fontWeight: '900',
    fontSize: 15,
  },
  errorText: {
    color: '#ffd1ca',
    lineHeight: 19,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '700',
  },
  labCard: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
    backgroundColor: 'rgba(12, 22, 42, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  labBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,191,91,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,191,91,0.22)',
  },
  labBadgeText: {
    color: '#f7fbff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labTitle: {
    color: '#f8fbff',
    fontSize: 22,
    fontWeight: '900',
  },
  labText: {
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 20,
  },
});

