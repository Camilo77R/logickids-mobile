import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
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
import ProfileNinoScreen from './ProfileNinoScreen';

const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'abandonado', 'cerrado']);
const DASHBOARD_BACKGROUND = '#FAF3FF';
const trainHeroImage = require('../../assets/branding/fondo definitivo.jpeg');

const OFFICIAL_SKILLS = Object.freeze([
  { name: 'Memoria', icon: 'bulb', gameSlug: 'camino-ar' },
  { name: 'Patrones', icon: 'extension-puzzle', gameSlug: SLUG_TREN_3D },
  { name: 'Logica', icon: 'scale', gameSlug: 'robot-logico' },
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

const buildActivityCopy = ({ profile, access, playState }) => {
  if (!profile) {
    return {
      title: 'Preparando tu aventura',
      text: 'Estamos revisando tu grupo y el estado de tu clase.',
      buttonLabel: 'Cargando',
    };
  }

  if (access.estado === ESTADOS_ACCESO_JUEGO.disponible) {
    return {
      title: profile.sesion_minijuego_titulo ?? 'Camino AR',
      text: 'Tu clase esta activa. Entra, observa el patron y completa la actividad.',
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

const buildLockedReason = (access, hasGame) => {
  if (!hasGame) {
    return 'Completa una actividad para desbloquear estadisticas';
  }

  if (access?.estado === ESTADOS_ACCESO_JUEGO.disponible) {
    return '';
  }

  if (access?.motivo) {
    return access.motivo;
  }

  return 'Disponible despues de finalizar la actividad anterior';
};

const buildMapLockedReason = (access, hasGame, gameSlug) => {
  if (!hasGame) {
    return 'Completa una actividad para desbloquear estadisticas';
  }

  if (!access || access.estado === ESTADOS_ACCESO_JUEGO.disponible) {
    return '';
  }

  if (access.juegoHabilitadoSlug && access.juegoHabilitadoSlug !== gameSlug) {
    return 'Disponible despues de finalizar la actividad anterior';
  }

  return access.motivo || 'Disponible despues de finalizar la actividad anterior';
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
    const lockedReason = buildMapLockedReason(access, Boolean(skill.gameSlug), skill.gameSlug);

    return {
      ...skill,
      id: skill.name,
      number: index + 1,
      active: isAvailable,
      locked: !isAvailable,
      value: stat?.precisionLabel ?? (isAvailable ? 'Listo para jugar' : 'Listo para comenzar'),
      detail: stat?.attemptsLabel ?? (isAvailable ? 'Juego habilitado' : lockedReason),
      activeMessage: isAvailable ? 'Juego habilitado' : '',
      lockedReason,
      actionLabel: isAvailable ? 'OK' : index + 1,
    };
  });
};

const clampProgress = (value) => Math.min(Math.max(value, 0), 100);

const buildProgressPercent = (value, maxValue) => {
  if (!value || !maxValue) {
    return 8;
  }

  return clampProgress(Math.round((value / maxValue) * 100));
};

export default function DashboardScreen({ studentSession, onLogout }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const fabScale = useRef(new Animated.Value(1)).current;
  const [activeGame, setActiveGame] = useState(null);
  const [showGamePath, setShowGamePath] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
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
  const robotTallerConfig = useMemo(() => obtenerConfiguracionBaseRobotTaller(), []);
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
  const robotTallerAccess = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante: studentProfile,
        slugJuego: robotTallerConfig.slug,
      }),
    [studentProfile, robotTallerConfig.slug],
  );
  const caminoArSessionContext = useMemo(
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
  const robotTallerSessionContext = useMemo(
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
        playState,
      }),
    [currentGameAccess, playState, studentProfile],
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
  const sessionStatusLabel = buildSessionStatusLabel(studentProfile);
  const dashboardAccess = resolveStudentDashboardAccess(studentProfile);
  const activeActivitySlug =
    currentGameAccess.juegoHabilitadoSlug ?? studentProfile?.sesion_minijuego_slug ?? availableGameSlug;
  const activeActivityTitle = String(
    studentProfile?.sesion_minijuego_titulo ?? currentGameAccess.juegoHabilitadoTitulo ?? activityCopy.title ?? '',
  ).toLowerCase();
  const isTrainHero =
    activeActivitySlug === SLUG_TREN_3D ||
    activeActivityTitle.includes('tren') ||
    activeActivityTitle.includes('figura') ||
    activeActivityTitle.includes('patron');
  const scrollBottomPadding = activeTab === DASHBOARD_TABS.perfil ? 92 : 128;
  const heroActivityLabel = isTrainHero
    ? 'Tren de Figuras'
    : activeActivityTitle.includes('camino')
      ? 'Camino AR'
      : 'Actividad de hoy';
  const hasProgressData = progressSummary.skillsTracked > 0 || achievementsCount > 0 || progressSummary.totalAttempts > 0;
  const progressIntro = hasProgressData
    ? 'Mira como crece tu aventura'
    : 'Comienza tu primera aventura!';
  const precisionValue = progressSummary.averagePrecision == null
    ? '0%'
    : `${progressSummary.averagePrecision}%`;
  const precisionLabel = precisionValue;
  const precisionProgress = progressSummary.averagePrecision == null ? 8 : clampProgress(progressSummary.averagePrecision);
  const attemptsLabel = progressSummary.totalAttempts
    ? `${progressSummary.totalAttempts}`
    : '0';
  const achievementsProgress = buildProgressPercent(achievementsCount, 10);
  const attemptsProgress = buildProgressPercent(progressSummary.totalAttempts, 10);
  const activityCards = useMemo(
    () => [
      {
        slug: caminoArConfig.slug,
        id: caminoArConfig.slug,
        title: 'Camino AR',
        status: canPlayCaminoAr ? 'Actividad' : 'Bloqueado',
        locked: !canPlayCaminoAr,
        lockedReason: buildLockedReason(caminoArAccess, true),
        icon: 'trail-sign',
      },
      {
        slug: tren3DConfig.slug,
        id: tren3DConfig.slug,
        title: 'Tren de Figuras',
        status: canPlayTren3D ? 'Actividad' : 'Bloqueado',
        locked: !canPlayTren3D,
        lockedReason: buildLockedReason(tren3DAccess, true),
        icon: 'shapes',
      },
      {
        slug: robotTallerConfig.slug,
        id: robotTallerConfig.slug,
        title: robotTallerAccess.juegoHabilitadoTitulo ?? 'Robot Lógico',
        status: canPlayRobotTaller ? 'Actividad' : 'Bloqueado',
        locked: !canPlayRobotTaller,
        lockedReason: buildLockedReason(robotTallerAccess, true),
        icon: 'hardware-chip',
      },
    ],
    [
      caminoArAccess,
      caminoArConfig.slug,
      canPlayCaminoAr,
      canPlayTren3D,
      tren3DAccess,
      tren3DConfig.slug,
      canPlayRobotTaller,
      robotTallerAccess,
      robotTallerConfig.slug,
    ],
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [fabScale]);

  const openActivityBySlug = (slug) => {
    if (!slug) {
      return false;
    }

    const access = accessBySlug[slug];

    if (access?.estado !== ESTADOS_ACCESO_JUEGO.disponible) {
      return false;
    }

    setActiveGame(slug);
    setShowGamePath(false);
    return true;
  };

  const startOrRefresh = () => {
    if (openActivityBySlug(availableGameSlug)) {
      return;
    }

    reloadDashboard();
  };

  const handlePathSkillPress = (skill) => {
    openActivityBySlug(skill.gameSlug);
  };

  const exitGame = async () => {
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

  const selectDashboardTab = (nextTab) => {
    setActiveTab(nextTab);
    setShowGamePath(false);
    setSkillsExpanded(false);
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

  if (activeGame === robotTallerConfig.slug) {
    return (
      <RobotTallerScreen
        onSalir={exitGame}
        configuracionInicial={robotTallerConfig}
        contextoSesion={robotTallerSessionContext}
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
            { paddingBottom: (showGamePath ? 82 : scrollBottomPadding) + Math.max(insets.bottom, 10) },
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
              onPress={() => selectDashboardTab(DASHBOARD_TABS.perfil)}
            />
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>No pudimos refrescar el tablero</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {activeTab === DASHBOARD_TABS.perfil ? (
            <ProfileNinoScreen
              achievementsCount={achievementsCount}
              activityTitle={activityCopy.title}
              activityText={activityCopy.text}
              canContinue={Boolean(availableGameSlug)}
              attemptsLabel={attemptsLabel}
              avatarColor={avatarColor}
              avatarUri={avatarUri}
              groupLabel={buildGroupLabel(studentProfile)}
              onLogout={onLogout}
              onContinue={startOrRefresh}
              precisionLabel={precisionLabel}
              progressSummary={progressSummary}
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
                  <Text style={styles.heroEyebrow}>{heroActivityLabel}</Text>
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
                <Image source={trainHeroImage} resizeMode="contain" style={styles.heroImage} />
              </View>

              <View style={styles.sectionBlock}>
                <SectionTitle title="Mi progreso" subtitle={progressIntro} />
                <View style={styles.progress}>
                  <ProgressItem
                    icon="trophy"
                    value={achievementsCount}
                    label="Logros"
                    helper={achievementsCount ? 'Desbloqueados' : 'Tu primer logro te espera'}
                    progress={achievementsProgress}
                  />
                  <ProgressItem
                    icon="star"
                    value={precisionValue}
                    label="Precision"
                    helper={progressSummary.averagePrecision == null ? 'Comienza tu primera aventura!' : 'Promedio real'}
                    progress={precisionProgress}
                  />
                  <ProgressItem
                    icon="flame"
                    value={attemptsLabel}
                    label="Actividades"
                    helper={progressSummary.totalAttempts ? 'Completadas' : 'Lista para empezar'}
                    progress={attemptsProgress}
                  />
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <SectionTitle title="Continua jugando" />
                <View style={styles.games}>
                  {activityCards.map((activity) => (
                    <GameCard
                      key={activity.id}
                      icon={activity.icon}
                      title={activity.title}
                      status={activity.status}
                      lockedReason={activity.lockedReason}
                      locked={activity.locked}
                      onPress={!activity.locked ? () => openActivityBySlug(activity.slug) : undefined}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <SectionTitle
                  title="Habilidades"
                  subtitle={skillsExpanded ? 'Tus habilidades escolares' : 'Toca para ver el detalle'}
                  actionIcon={skillsExpanded ? 'chevron-up' : 'chevron-down'}
                  onAction={() => setSkillsExpanded((current) => !current)}
                />
                {skillsExpanded ? (
                  <View style={styles.skillGrid}>
                    {skillCards.map((skill) => (
                      <SkillCard key={skill.id} skill={skill} />
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <View style={styles.emptyTabContent} />
          )}
        </ScrollView>

        {activeTab === DASHBOARD_TABS.mapa && !showGamePath ? (
          <Animated.View style={[styles.mapFabWrap, { bottom: Math.max(insets.bottom, 10) + 78, transform: [{ scale: fabScale }] }]}>
            <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Abrir mapa de actividades"
            activeOpacity={0.88}
            onPress={() => setShowGamePath(true)}
            style={styles.mapFab}
            >
              <Ionicons name="map" size={28} color={colors.purpleDark} />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

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

function SectionTitle({ title, subtitle, action, actionIcon, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleBlock}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {actionIcon ? (
            <TouchableOpacity activeOpacity={0.82} onPress={onAction} style={styles.sectionIconButton}>
              <Ionicons name={actionIcon} size={20} color={colors.white} />
            </TouchableOpacity>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {!actionIcon && action ? (
        <TouchableOpacity activeOpacity={0.82} onPress={onAction} style={styles.sectionActionButton}>
          <Text style={styles.sectionAction}>{action} &gt;</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function StudentHeader({ avatarColor, avatarUri, firstName, groupLabel, isRefreshing, onPress }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Abrir perfil"
      activeOpacity={0.86}
      onPress={onPress}
      style={styles.header}
    >
      <AvatarImage avatarColor={avatarColor} avatarUri={avatarUri} size={58} iconSize={30} />
      <View style={styles.greeting}>
        <Text style={styles.title}>Hola, {firstName}!</Text>
        <Text style={styles.subtitle}>
          {groupLabel} · {isRefreshing ? 'Actualizando...' : 'Sesion sincronizada'}
        </Text>
      </View>
    </TouchableOpacity>
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

function ProgressItem({ icon, value, label, helper, progress = 0 }) {
  return (
    <View style={styles.progressItem}>
      <View style={styles.progressIcon}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <Text style={styles.progressValue}>{value}</Text>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clampProgress(progress)}%` }]} />
      </View>
      <Text style={styles.progressHelper}>{helper}</Text>
    </View>
  );
}

function GameCard({ icon, title, status, locked, lockedReason, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.gameCard, locked && styles.gameCardLocked]}
    >
      <View style={styles.gameArt}>
        <Ionicons
          name={locked ? 'lock-closed' : icon}
          size={30}
          color={locked ? colors.muted : colors.purple}
        />
      </View>
      <Text style={styles.gameStatus}>{status}</Text>
      <Text style={styles.gameTitle}>{title}</Text>
      {locked ? <Text style={styles.gameLockText}>{lockedReason}</Text> : null}
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
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  contentCompact: { paddingHorizontal: 14, paddingTop: spacing.sm, gap: spacing.md },
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
  heroEyebrow: {
    color: colors.yellow,
    fontFamily: fonts.black,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
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
  heroImage: {
    width: 118,
    height: 118,
    alignSelf: 'center',
    marginLeft: spacing.xs,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleBlock: { flex: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 16 },
  sectionSubtitle: { color: colors.textGray, fontFamily: fonts.semiBold, fontSize: 11, marginTop: 2 },
  sectionActionButton: { minHeight: 32, justifyContent: 'center', paddingLeft: spacing.sm },
  sectionAction: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13 },
  sectionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.purpleDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 7,
  },
  sectionBlock: { gap: spacing.sm },
  progress: {
    borderRadius: 20,
    backgroundColor: colors.white,
    minHeight: 96,
    flexDirection: 'row',
    padding: spacing.md,
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
  progressValue: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 14, textAlign: 'center' },
  progressLabel: { color: colors.textGray, fontFamily: fonts.black, fontSize: 9, lineHeight: 12, textAlign: 'center' },
  progressTrack: {
    width: '82%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lavender,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  progressHelper: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 8,
    lineHeight: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  games: { flexDirection: 'row', gap: spacing.sm },
  gameCard: {
    flex: 1,
    minHeight: 132,
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
  gameLockText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 8,
    lineHeight: 11,
    marginTop: 3,
  },
  gameTrack: { height: 6, borderRadius: 3, backgroundColor: colors.lavender, marginTop: 'auto', overflow: 'hidden' },
  gameFill: { height: '100%', borderRadius: 4, backgroundColor: colors.purple },
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
  mapFabWrap: {
    position: 'absolute',
    right: 22,
  },
  mapFab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.yellow,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
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
