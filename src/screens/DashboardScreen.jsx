import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CaminoARScreen from '../features/games/camino-ar/CaminoARScreen';
import { obtenerConfiguracionBaseCaminoAr } from '../features/games/camino-ar/caminoArConfiguracion';
import Tren3DScreen from '../features/games/tren-3d/Tren3DScreen';
import { obtenerConfiguracionBaseTren3D } from '../features/games/tren-3d/tren3dConfiguracion';
import {
  SLUG_TREN_3D,
  TITULO_TREN_3D,
} from '../features/games/tren-3d/tren3d.constants';
import RobotTallerScreen from '../features/games/robot-taller/RobotTallerScreen';
import { obtenerConfiguracionBaseRobotTaller } from '../features/games/robot-taller/robotTallerConfiguracion';
import {
  ESTADOS_ACCESO_JUEGO,
  resolverAccesoJuegoDesdePerfil,
} from '../features/games/core/resolverAccesoJuego';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import { colors, fonts, shadows, spacing } from '../constants/theme';
import GamePathScreen from './GamePathScreen';

const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'abandonado', 'cerrado']);
const DASHBOARD_BACKGROUND = '#FAF3FF';

const OFFICIAL_SKILLS = Object.freeze([
  { name: 'Memoria', icon: 'bulb', gameSlug: 'camino-ar' },
  { name: 'Patrones', icon: 'extension-puzzle', gameSlug: SLUG_TREN_3D },
  { name: 'Logica', icon: 'scale', gameSlug: 'robot-taller' },
  { name: 'Razonar', icon: 'cube' },
  { name: 'Atencion', icon: 'search' },
]);

const DASHBOARD_TABS = Object.freeze({
  mapa: 'mapa',
  actividades: 'actividades',
  logros: 'logros',
  progreso: 'progreso',
  perfil: 'perfil',
});

const normalizeSkillKey = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getStudentName = (profile, fallbackProfile) =>
  profile?.nombre || profile?.name || fallbackProfile?.nombre || fallbackProfile?.name || 'Estudiante';

const getStudentAvatarSeed = (profile, fallbackProfile) => {
  const rawSeed =
    profile?.nombre ||
    profile?.name ||
    fallbackProfile?.nombre ||
    fallbackProfile?.name ||
    profile?.id ||
    profile?.estudiante_id ||
    profile?.studentId ||
    fallbackProfile?.id ||
    fallbackProfile?.estudiante_id ||
    fallbackProfile?.studentId;

  return String(rawSeed || 'Estudiante');
};

const getFrontendAvatarUri = (profile, fallbackProfile) => {
  const seed = encodeURIComponent(getStudentAvatarSeed(profile, fallbackProfile));
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=${DASHBOARD_BACKGROUND.replace('#', '')}`;
};

const getStudentAvatarColor = (profile, fallbackProfile) =>
  profile?.color_avatar || profile?.avatarColor || fallbackProfile?.color_avatar || fallbackProfile?.avatarColor || colors.white;

const buildGroupLabel = (profile) => {
  if (!profile?.grupo_id) {
    return 'Sin grupo activo';
  }

  return profile.grupo_nombre ?? `Grupo #${profile.grupo_id}`;
};

const buildSessionStatusLabel = (profile) => {
  if (!profile) {
    return 'Cargando perfil';
  }

  if (profile.sesion_activa) {
    return profile.sesion_minijuego_titulo
      ? `Actividad activa: ${profile.sesion_minijuego_titulo}`
      : 'Actividad activa';
  }

  if (profile.sesion_participante_estado === 'completado') {
    return 'Actividad completada';
  }

  if (TERMINAL_PARTICIPANT_STATES.has(profile.sesion_participante_estado)) {
    return 'Actividad cerrada';
  }

  return 'Esperando actividad del tutor';
};

const resolveStudentDashboardAccess = (profile) => {
  if (!profile) {
    return {
      allowed: false,
      pending: true,
      icon: 'hourglass',
      title: 'Validando acceso escolar',
      message: 'Estamos revisando si tu cuenta ya tiene un grupo activo para entrar al tablero.',
    };
  }

  if (!profile.grupo_id) {
    return {
      allowed: false,
      icon: 'school',
      title: 'Necesitas un grupo activo',
      message:
        'Tu QR fue reconocido, pero todavia no estas vinculado a un grupo activo. Pide ayuda a tu tutor para entrar al tablero.',
    };
  }

  if (profile.grupo_activo === false) {
    return {
      allowed: false,
      icon: 'lock-closed',
      title: 'Grupo no disponible',
      message:
        'Tu grupo esta archivado o cerrado. Pide ayuda a tu tutor para activar tu acceso escolar.',
    };
  }

  return { allowed: true };
};

const buildActivityCopy = ({ profile, access, robotTallerAccess, playState }) => {
  if (!profile) {
    return {
      title: 'Preparando tu aventura',
      text: 'Estamos revisando tu grupo y el estado de tu clase.',
      buttonLabel: 'Cargando',
    };
  }

  const accesoEfectivo =
    access.estado === ESTADOS_ACCESO_JUEGO.disponible
      ? access
      : robotTallerAccess.estado === ESTADOS_ACCESO_JUEGO.disponible
        ? robotTallerAccess
        : access;

  if (accesoEfectivo.estado === ESTADOS_ACCESO_JUEGO.disponible) {
    return {
      title: profile.sesion_minijuego_titulo ?? 'Camino AR',
      text:
        accesoEfectivo.juegoHabilitadoSlug === 'robot-taller'
          ? 'Tu clase esta activa. Entra, observa el orden de las piezas y arma el robot.'
          : 'Tu clase esta activa. Entra, observa el patron y completa la actividad.',
      buttonLabel: 'Comenzar',
    };
  }

  if (!profile.sesion_activa && TERMINAL_PARTICIPANT_STATES.has(profile.sesion_participante_estado)) {
    return {
      title: profile.sesion_participante_estado === 'completado' ? 'Actividad completada' : 'Actividad cerrada',
      text:
        profile.sesion_participante_estado === 'completado'
          ? 'Ya terminaste tu actividad actual. Revisa tus logros y progreso.'
          : 'Esta actividad ya no esta disponible para este estudiante.',
      buttonLabel: 'Actualizar',
    };
  }

  return {
    title: playState.title,
    text: access.motivo || playState.message,
    buttonLabel: playState.buttonLabel,
  };
};

const buildSkillCards = ({ accessBySlug, skillStatsView }) => {
  const entries = skillStatsView?.entries ?? [];
  const statsBySkill = new Map(
    entries.map((entry) => [normalizeSkillKey(entry.skillName), entry]),
  );

  return OFFICIAL_SKILLS.map((skill, index) => {
    const stat = statsBySkill.get(normalizeSkillKey(skill.name));
    const access = skill.gameSlug ? accessBySlug[skill.gameSlug] : null;
    const isAvailable = access?.estado === ESTADOS_ACCESO_JUEGO.disponible;

    return {
      ...skill,
      id: skill.name,
      number: index + 1,
      active: isAvailable,
      locked: !isAvailable,
      value: stat?.precisionLabel ?? (isAvailable ? 'Jugar' : 'Pendiente'),
      detail: stat?.attemptsLabel ?? (isAvailable ? 'Disponible' : 'Sin datos'),
      actionLabel: isAvailable ? 'OK' : index + 1,
    };
  });
};

export default function DashboardScreen({ studentSession, onLogout }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const [activeGame, setActiveGame] = useState(null);
  const [showGamePath, setShowGamePath] = useState(false);
  const [activeTab, setActiveTab] = useState(DASHBOARD_TABS.mapa);
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
  const caminoArConfig = useMemo(() => obtenerConfiguracionBaseCaminoAr(), []);
  const tren3DConfig = useMemo(() => obtenerConfiguracionBaseTren3D(), []);
  const caminoArAccess = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante: studentProfile,
        slugJuego: caminoArConfig.slug,
      }),
    [caminoArConfig.slug, studentProfile],
  );
  const tren3DAccess = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante: studentProfile,
        slugJuego: tren3DConfig.slug,
      }),
    [studentProfile, tren3DConfig.slug],
  );
  const caminoArSessionContext = useMemo(
    () => ({
      tokenEstudiante: studentSession?.token ?? null,
      baseUrlApi: studentSession?.apiBaseUrl ?? null,
      minijuegoId: studentProfile?.sesion_minijuego_id ?? null,
    }),
    [studentProfile?.sesion_minijuego_id, studentSession?.apiBaseUrl, studentSession?.token],
  );
  const robotTallerConfig = useMemo(() => obtenerConfiguracionBaseRobotTaller(), []);
  const robotTallerAccess = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante: studentProfile,
        slugJuego: robotTallerConfig.slug,
      }),
    [robotTallerConfig.slug, studentProfile],
  );
  const robotTallerSessionContext = useMemo(
    () => ({
      tokenEstudiante: studentSession?.token ?? null,
      baseUrlApi: studentSession?.apiBaseUrl ?? null,
      minijuegoId: studentProfile?.sesion_minijuego_id ?? null,
    }),
    [studentProfile?.sesion_minijuego_id, studentSession?.apiBaseUrl, studentSession?.token],
  );
  const tren3DSessionContext = useMemo(
    () => ({
      tokenEstudiante: studentSession?.token ?? null,
      baseUrlApi: studentSession?.apiBaseUrl ?? null,
      minijuegoId: studentProfile?.sesion_minijuego_id ?? null,
    }),
    [studentProfile?.sesion_minijuego_id, studentSession?.apiBaseUrl, studentSession?.token],
  );
  const accessBySlug = useMemo(
    () => ({
      [caminoArConfig.slug]: caminoArAccess,
      [tren3DConfig.slug]: tren3DAccess,
      [robotTallerConfig.slug]: robotTallerAccess,
    }),
    [caminoArAccess, caminoArConfig.slug, tren3DAccess, tren3DConfig.slug, robotTallerAccess, robotTallerConfig.slug],
  );
  const currentGameAccess = accessBySlug[studentProfile?.sesion_minijuego_slug] ?? caminoArAccess;
  const activityCopy = useMemo(
    () =>
      buildActivityCopy({
        profile: studentProfile,
        access: currentGameAccess,
        robotTallerAccess,
        playState,
      }),
    [currentGameAccess, robotTallerAccess, playState, studentProfile],
  );
  const skillCards = useMemo(
    () =>
      buildSkillCards({
        accessBySlug,
        skillStatsView,
      }),
    [accessBySlug, skillStatsView],
  );

  const firstName = getStudentName(studentProfile, studentSession?.studentProfile).split(' ')[0];
  const avatarUri = getFrontendAvatarUri(studentProfile, studentSession?.studentProfile);
  const avatarColor = getStudentAvatarColor(studentProfile, studentSession?.studentProfile);
  const canPlayCaminoAr = caminoArAccess.estado === ESTADOS_ACCESO_JUEGO.disponible;
  const canPlayTren3D = tren3DAccess.estado === ESTADOS_ACCESO_JUEGO.disponible;
  const canPlayRobotTaller = robotTallerAccess.estado === ESTADOS_ACCESO_JUEGO.disponible;
  const availableGameSlug = canPlayCaminoAr
    ? caminoArConfig.slug
    : canPlayTren3D
      ? tren3DConfig.slug
      : canPlayRobotTaller
        ? robotTallerConfig.slug
        : null;
  const achievementsCount = achievements.length;
  const precisionLabel =
    progressSummary.averagePrecision == null ? 'Sin datos' : `${progressSummary.averagePrecision}%`;
  const attemptsLabel = progressSummary.totalAttempts || 0;
  const sessionStatusLabel = buildSessionStatusLabel(studentProfile);
  const dashboardAccess = resolveStudentDashboardAccess(studentProfile);

  const startOrRefresh = () => {
    if (availableGameSlug) {
      setActiveGame(availableGameSlug);
      setShowGamePath(false);
      return;
    }
    if (canPlayRobotTaller) {
      setActiveGame('robot-taller');
      setShowGamePath(false);
      return;
    }

    reloadDashboard();
  };

  const handlePathSkillPress = (skill) => {
    if (skill.gameSlug === 'camino-ar' || skill.gameSlug === 'tren-3d' || skill.gameSlug === 'robot-taller') {
      startOrRefresh();
    }
  };

  const exitGame = async () => {
    try {
      await reloadDashboard();
    } finally {
      setActiveGame(null);
    }
  };

  const exitRobotTaller = async () => {
    try {
      await reloadDashboard();
    } finally {
      setActiveGame(null);
    }
  };

  if (!dashboardAccess.allowed) {
    return (
      <StudentAccessGateScreen
        access={dashboardAccess}
        firstName={firstName}
        groupLabel={buildGroupLabel(studentProfile)}
        isRefreshing={isLoading || isRefreshing}
        onLogout={onLogout}
        onRefresh={reloadDashboard}
      />
    );
  }

  if (activeGame === 'camino-ar') {
    return (
      <CaminoARScreen
        onSalir={exitGame}
        configuracionInicial={caminoArConfig}
        contextoSesion={caminoArSessionContext}
      />
    );
  }

  if (activeGame === 'robot-taller') {
    return (
      <RobotTallerScreen
        onSalir={exitRobotTaller}
        configuracionInicial={robotTallerConfig}
        contextoSesion={robotTallerSessionContext}
      />
    );
  }

  const selectDashboardTab = (nextTab) => {
    setActiveTab(nextTab);
    setShowGamePath(false);
  };

  if (activeGame === SLUG_TREN_3D) {
    return (
      <Tren3DScreen
        onSalir={exitGame}
        configuracionInicial={tren3DConfig}
        contextoSesion={tren3DSessionContext}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            compact && styles.contentCompact,
            showGamePath && styles.pathContent,
            { paddingBottom: (showGamePath ? 82 : 96) + Math.max(insets.bottom, 10) },
          ]}
          scrollEnabled={!showGamePath}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === DASHBOARD_TABS.mapa && !showGamePath ? (
            <StudentHeader
              avatarColor={avatarColor}
              avatarUri={avatarUri}
              firstName={firstName}
              groupLabel={buildGroupLabel(studentProfile)}
              isRefreshing={isRefreshing}
            />
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>No pudimos refrescar el tablero</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {activeTab === DASHBOARD_TABS.perfil ? (
            <ProfilePanel
              achievementsCount={achievementsCount}
              attemptsLabel={attemptsLabel}
              avatarColor={avatarColor}
              avatarUri={avatarUri}
              groupLabel={buildGroupLabel(studentProfile)}
              onLogout={onLogout}
              precisionLabel={precisionLabel}
              sessionStatusLabel={sessionStatusLabel}
              studentName={getStudentName(studentProfile, studentSession?.studentProfile)}
            />
          ) : activeTab === DASHBOARD_TABS.mapa && showGamePath ? (
            <GamePathScreen
              skills={skillCards}
              onBack={() => setShowGamePath(false)}
              onStartSkill={handlePathSkillPress}
            />
          ) : activeTab === DASHBOARD_TABS.mapa ? (
            <>
              <View style={styles.hero}>
                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroTitle}>{activityCopy.title}</Text>
                  <Text style={styles.heroText}>{activityCopy.text}</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={startOrRefresh}
                    style={[styles.heroButton, !availableGameSlug && styles.heroButtonMuted]}
                  >
                    {isLoading || isRefreshing ? <ActivityIndicator color={colors.white} /> : null}
                    <Text style={styles.heroButtonText}>
                      {isLoading || isRefreshing ? 'Cargando' : activityCopy.buttonLabel}
                    </Text>
                    <Ionicons name={availableGameSlug ? 'play' : 'sync'} size={18} color={colors.white} />
                  </TouchableOpacity>
                </View>
                <View style={styles.character}>
                  <View style={styles.characterEyes}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                  <View style={styles.smile} />
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <SectionTitle title="Ruta de hoy" action="Ver mas" onAction={() => setShowGamePath(true)} />
                <View style={styles.route}>
                  {skillCards.map((skill) => (
                    <RouteCard
                      key={skill.id}
                      active={skill.active}
                      icon={skill.icon}
                      label={skill.name}
                      number={skill.actionLabel}
                      onPress={skill.active ? startOrRefresh : undefined}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <SectionTitle title="Mi progreso" />
                <View style={styles.progress}>
                  <ProgressItem icon="trophy" value={achievementsCount} label="Logros desbloqueados" />
                  <ProgressItem icon="analytics" value={precisionLabel} label="Precision promedio" />
                  <ProgressItem icon="footsteps" value={attemptsLabel} label="Intentos registrados" />
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <SectionTitle title="Continua jugando" />
                <View style={styles.games}>
                  <GameCard
                    title={caminoArAccess.juegoHabilitadoTitulo ?? 'Camino AR'}
                    status={canPlayCaminoAr ? 'Actividad' : 'Bloqueado'}
                    locked={!canPlayCaminoAr}
                    onPress={canPlayCaminoAr ? () => setActiveGame(caminoArConfig.slug) : undefined}
                  />
                  <GameCard
                    title={tren3DAccess.juegoHabilitadoTitulo ?? TITULO_TREN_3D}
                    status={canPlayTren3D ? 'Actividad' : 'Bloqueado'}
                    locked={!canPlayTren3D}
                    onPress={canPlayTren3D ? () => setActiveGame(SLUG_TREN_3D) : undefined}
                  />
                  <GameCard
                    title={robotTallerAccess.juegoHabilitadoTitulo ?? 'Taller del Robot'}
                    status={canPlayRobotTaller ? 'Actividad' : 'Bloqueado'}
                    locked={!canPlayRobotTaller}
                    onPress={canPlayRobotTaller ? startOrRefresh : undefined}
                  />
                  <GameCard title="Equilibra ideas" status="Proximamente" locked />
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <SectionTitle title="Habilidades" />
                <View style={styles.skillGrid}>
                  {skillCards.map((skill) => (
                    <SkillCard key={skill.id} skill={skill} />
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyTabContent} />
          )}
        </ScrollView>

        <View style={[styles.nav, { bottom: Math.max(insets.bottom, 10) }]}>
          <NavItem
            icon="home"
            label="Mapa"
            active={activeTab === DASHBOARD_TABS.mapa}
            onPress={() => selectDashboardTab(DASHBOARD_TABS.mapa)}
          />
          <NavItem
            icon="clipboard-outline"
            label="Actividades"
            active={activeTab === DASHBOARD_TABS.actividades}
            onPress={() => selectDashboardTab(DASHBOARD_TABS.actividades)}
          />
          <NavItem
            icon="star-outline"
            label="Logros"
            active={activeTab === DASHBOARD_TABS.logros}
            onPress={() => selectDashboardTab(DASHBOARD_TABS.logros)}
          />
          <NavItem
            icon="bar-chart-outline"
            label="Progreso"
            active={activeTab === DASHBOARD_TABS.progreso}
            onPress={() => selectDashboardTab(DASHBOARD_TABS.progreso)}
          />
          <NavItem
            icon="person-outline"
            label="Perfil"
            active={activeTab === DASHBOARD_TABS.perfil}
            onPress={() => selectDashboardTab(DASHBOARD_TABS.perfil)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function SectionTitle({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity activeOpacity={0.82} onPress={onAction} style={styles.sectionActionButton}>
          <Text style={styles.sectionAction}>{action} &gt;</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function RouteCard({ active, icon, label, number, onPress }) {
  const content = (
    <>
      <View style={[styles.routeNumber, active && styles.routeNumberActive]}>
        <Text style={styles.routeNumberText}>{number}</Text>
      </View>
      <Ionicons name={icon} size={24} color={active ? colors.white : colors.purple} />
      <Text style={[styles.routeLabel, active && styles.routeLabelActive]}>{label}</Text>
    </>
  );

  if (!onPress) {
    return <View style={[styles.routeCard, active && styles.routeCardActive]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.routeCard, active && styles.routeCardActive]}
    >
      {content}
    </TouchableOpacity>
  );
}

function StudentHeader({ avatarColor, avatarUri, firstName, groupLabel, isRefreshing }) {
  return (
    <View style={styles.header}>
      <AvatarImage avatarColor={avatarColor} avatarUri={avatarUri} size={58} iconSize={30} />
      <View style={styles.greeting}>
        <Text style={styles.title}>Hola, {firstName}!</Text>
        <Text style={styles.subtitle}>
          {groupLabel} · {isRefreshing ? 'Actualizando...' : 'Sesion sincronizada'}
        </Text>
      </View>
    </View>
  );
}

function AvatarImage({ avatarColor, avatarUri, size, iconSize }) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: avatarUri ? DASHBOARD_BACKGROUND : avatarColor,
  };

  return (
    <View style={[styles.avatar, avatarStyle]}>
      {avatarUri ? (
        <SvgUri uri={avatarUri} width={size} height={size} />
      ) : (
        <Ionicons name="happy" size={iconSize} color={colors.purple} />
      )}
    </View>
  );
}

function ProgressItem({ icon, value, label }) {
  return (
    <View style={styles.progressItem}>
      <View style={styles.progressIcon}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <Text style={styles.progressValue}>{value}</Text>
      <Text style={styles.progressLabel}>{label}</Text>
    </View>
  );
}

function GameCard({ title, status, locked, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.gameCard, locked && styles.gameCardLocked]}
    >
      <View style={styles.gameArt}>
        <Ionicons
          name={locked ? 'lock-closed' : 'trail-sign'}
          size={30}
          color={locked ? colors.muted : colors.purple}
        />
      </View>
      <Text style={styles.gameStatus}>{status}</Text>
      <Text style={styles.gameTitle}>{title}</Text>
      <View style={styles.gameTrack}>
        <View style={[styles.gameFill, { width: locked ? '18%' : '72%' }]} />
      </View>
    </TouchableOpacity>
  );
}

function StudentAccessGateScreen({
  access,
  firstName,
  groupLabel,
  isRefreshing,
  onLogout,
  onRefresh,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[
            styles.accessGateContent,
            { paddingBottom: spacing.xl + Math.max(insets.bottom, 14) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.accessGateTop}>
            <View style={styles.avatar}>
              <Ionicons name="happy" size={30} color={colors.purple} />
            </View>
            <View style={styles.greeting}>
              <Text style={styles.title}>Hola, {firstName}!</Text>
              <Text style={styles.subtitle}>{groupLabel}</Text>
            </View>
          </View>

          <View style={styles.accessGateCard}>
            <View style={styles.accessGateIcon}>
              <Ionicons name={access.icon} size={44} color={colors.purple} />
            </View>
            <Text style={styles.accessGateTitle}>{access.title}</Text>
            <Text style={styles.accessGateText}>{access.message}</Text>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onRefresh}
              style={styles.accessGatePrimaryButton}
            >
              {isRefreshing ? <ActivityIndicator color={colors.white} /> : null}
              <Text style={styles.accessGatePrimaryButtonText}>
                {isRefreshing ? 'Revisando...' : 'Actualizar estado'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={onLogout}
              style={styles.accessGateSecondaryButton}
            >
              <Text style={styles.accessGateSecondaryButtonText}>Escanear otro QR</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ProfilePanel({
  achievementsCount,
  attemptsLabel,
  avatarColor,
  avatarUri,
  groupLabel,
  onLogout,
  precisionLabel,
  sessionStatusLabel,
  studentName,
}) {
  return (
    <View style={styles.profilePanel}>
      <View style={styles.profileHero}>
        <AvatarImage avatarColor={avatarColor || colors.yellow} avatarUri={avatarUri} size={72} iconSize={36} />
        <View style={styles.profileInfo}>
          <Text style={styles.profileEyebrow}>Mi perfil</Text>
          <Text style={styles.profileName}>{studentName}</Text>
          <Text style={styles.profileMeta}>{groupLabel}</Text>
        </View>
      </View>

      <View style={styles.profileStatusCard}>
        <Ionicons name="school" size={22} color={colors.purple} />
        <View style={styles.profileStatusTextBlock}>
          <Text style={styles.profileStatusTitle}>Estado de clase</Text>
          <Text style={styles.profileStatusText}>{sessionStatusLabel}</Text>
        </View>
      </View>

      <View style={styles.profileMetrics}>
        <ProfileMetric icon="trophy" label="Logros" value={achievementsCount} />
        <ProfileMetric icon="analytics" label="Precision" value={precisionLabel} />
        <ProfileMetric icon="footsteps" label="Intentos" value={attemptsLabel} />
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={onLogout} style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={20} color={colors.white} />
        <Text style={styles.logoutButtonText}>Salir de mi cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProfileMetric({ icon, label, value }) {
  return (
    <View style={styles.profileMetric}>
      <Ionicons name={icon} size={20} color={colors.purple} />
      <Text style={styles.profileMetricValue}>{value}</Text>
      <Text style={styles.profileMetricLabel}>{label}</Text>
    </View>
  );
}

function SkillCard({ skill }) {
  return (
    <View style={[styles.skillCard, skill.active && styles.skillCardActive]}>
      <Text style={[styles.skillName, skill.active && styles.skillNameActive]}>{skill.name}</Text>
      <Text style={[styles.skillValue, skill.active && styles.skillValueActive]}>{skill.value}</Text>
      <Text style={[styles.skillDetail, skill.active && styles.skillDetailActive]}>{skill.detail}</Text>
    </View>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.navItem}>
      <Ionicons name={icon} size={24} color={active ? colors.yellowDark : colors.purple} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DASHBOARD_BACKGROUND },
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  contentCompact: { paddingHorizontal: 14, paddingTop: spacing.xs, gap: spacing.sm },
  pathContent: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.soft,
  },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { flex: 1 },
  title: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 19 },
  subtitle: { color: colors.textGray, fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 15 },
  exitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  errorCard: {
    borderRadius: 18,
    backgroundColor: '#FFE7EA',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FFC7CF',
  },
  errorTitle: { color: colors.danger, fontFamily: fonts.black, fontSize: 14 },
  errorText: { color: colors.purpleDark, fontFamily: fonts.semiBold, marginTop: 4, lineHeight: 18 },
  accessGateContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  accessGateTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accessGateCard: {
    flex: 1,
    minHeight: 420,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    ...shadows.soft,
  },
  accessGateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  accessGateTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 25,
    lineHeight: 31,
    textAlign: 'center',
  },
  accessGateText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  accessGatePrimaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    ...shadows.soft,
  },
  accessGatePrimaryButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  accessGateSecondaryButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.white,
  },
  accessGateSecondaryButtonText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  hero: {
    minHeight: 128,
    borderRadius: 24,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: spacing.md,
    ...shadows.soft,
  },
  heroTextBlock: { flex: 1, justifyContent: 'center' },
  heroTitle: { color: colors.white, fontFamily: fonts.black, fontSize: 19, lineHeight: 24 },
  heroText: { color: '#F3DDFE', fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 17, marginTop: 4 },
  heroButton: {
    marginTop: spacing.sm,
    minHeight: 38,
    alignSelf: 'flex-start',
    borderRadius: 20,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroButtonMuted: { backgroundColor: '#C7A3DA' },
  heroButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
  character: {
    width: 70,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.yellow,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '4deg' }],
  },
  characterEyes: { flexDirection: 'row', gap: 14 },
  eye: { width: 9, height: 12, borderRadius: 7, backgroundColor: colors.purpleDark },
  smile: { width: 26, height: 13, borderBottomWidth: 4, borderBottomColor: colors.purpleDark, borderRadius: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 16 },
  sectionActionButton: { minHeight: 32, justifyContent: 'center', paddingLeft: spacing.sm },
  sectionAction: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13 },
  sectionBlock: { gap: spacing.xs },
  route: { flexDirection: 'row', gap: 6 },
  routeCard: {
    flex: 1,
    height: 68,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...shadows.soft,
  },
  routeCardActive: { backgroundColor: colors.yellow },
  routeNumber: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  routeNumberActive: { backgroundColor: colors.white },
  routeNumberText: { color: colors.purple, fontFamily: fonts.black, fontSize: 9 },
  routeLabel: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 9, textAlign: 'center' },
  routeLabelActive: { color: colors.white },
  progress: {
    borderRadius: 20,
    backgroundColor: colors.white,
    minHeight: 88,
    flexDirection: 'row',
    padding: spacing.sm,
    ...shadows.soft,
  },
  progressItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  progressIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  progressValue: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 15 },
  progressLabel: { color: colors.textGray, fontFamily: fonts.semiBold, fontSize: 9, lineHeight: 12, textAlign: 'center' },
  games: { flexDirection: 'row', gap: spacing.sm },
  gameCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: spacing.xs,
    ...shadows.soft,
  },
  gameCardLocked: { opacity: 0.72 },
  gameArt: {
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gameStatus: { color: colors.purple, fontFamily: fonts.black, fontSize: 8 },
  gameTitle: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 10, lineHeight: 13, marginTop: 2 },
  gameTrack: { height: 6, borderRadius: 3, backgroundColor: colors.lavender, marginTop: 'auto', overflow: 'hidden' },
  gameFill: { height: '100%', borderRadius: 4, backgroundColor: colors.purple },
  profilePanel: {
    gap: spacing.md,
  },
  profileHero: {
    minHeight: 132,
    borderRadius: 28,
    backgroundColor: colors.purple,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.soft,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileEyebrow: {
    color: '#F3DDFE',
    fontFamily: fonts.black,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  profileName: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 24,
    lineHeight: 30,
    marginTop: 3,
  },
  profileMeta: {
    color: '#F3DDFE',
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  profileStatusCard: {
    borderRadius: 22,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.soft,
  },
  profileStatusTextBlock: {
    flex: 1,
  },
  profileStatusTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  profileStatusText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  profileMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  profileMetric: {
    flex: 1,
    minHeight: 94,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    ...shadows.soft,
  },
  profileMetricValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 18,
    marginTop: 5,
  },
  profileMetricLabel: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    textAlign: 'center',
  },
  logoutButton: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.soft,
  },
  logoutButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillCard: {
    width: '47.5%',
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: spacing.sm,
    ...shadows.soft,
  },
  skillCardActive: { backgroundColor: colors.yellow },
  skillName: { color: colors.purple, fontFamily: fonts.black, fontSize: 12 },
  skillNameActive: { color: colors.white },
  skillValue: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 18, marginTop: 4 },
  skillValueActive: { color: colors.white },
  skillDetail: { color: colors.textGray, fontFamily: fonts.semiBold, fontSize: 10, marginTop: 2 },
  skillDetailActive: { color: colors.white },
  emptyTabContent: { flexGrow: 1 },
  nav: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 66,
    borderRadius: 22,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...shadows.soft,
  },
  navItem: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 9, textAlign: 'center' },
  navTextActive: { color: colors.yellowDark },
});
