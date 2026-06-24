import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { obtenerConfiguracionBaseCaminoAr } from '../features/games/camino-ar/caminoArConfiguracion';
import { obtenerConfiguracionBaseMercado } from '../features/games/mercado-inteligente/mercadoConfiguracion';
import { obtenerConfiguracionBaseObjetoPerdidoAr } from '../features/games/objeto-perdido-ar/objetoPerdidoArConfiguracion';
import { obtenerConfiguracionBaseTren3D } from '../features/games/tren-3d/tren3dConfiguracion';
import {
  SLUG_TREN_3D,
} from '../features/games/tren-3d/tren3d.constants';
import { CATALOGO_JUEGOS } from '../features/games/core/catalogoJuegos';
import { shouldCloseActiveGame } from '../features/games/core/activeGameLifecycle';
import { obtenerConfiguracionBaseRobotTaller } from '../features/games/robot-taller/robotTallerConfiguracion';
import {
  ESTADOS_ACCESO_JUEGO,
  resolverAccesoJuegoDesdePerfil,
} from '../features/games/core/resolverAccesoJuego';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import PodiumRanking from '../components/PodiumRanking';
import StudentAvatar from '../components/StudentAvatar';
import { colors, fonts, shadows, spacing } from '../constants/theme';
import { resolveStudentAvatarUri } from '../services/studentAvatar.service';
import ActivitiesTabScreen from './ActivitiesTabScreen';
import AchievementsTabScreen from './AchievementsTabScreen';
import GamePathScreen from './GamePathScreen';
import ProfileNinoScreen from './ProfileNinoScreen';
import ProgressTabScreen from './ProgressTabScreen';

const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'abandonado', 'cerrado']);
const DASHBOARD_BACKGROUND = '#F5F5F5';
const trainHeroImage = require('../../assets/branding/fondo definitivo.jpeg');

const MAP_SKILL_NODES = Object.freeze([
  { id: 'memoria', name: 'Memoria', icon: 'bulb', slugHints: ['camino'], gameTitle: 'Camino AR' },
  { id: 'patrones', name: 'Patrones', icon: 'extension-puzzle', slugHints: ['tren'], gameTitle: 'Tren de Figuras' },
  { id: 'logica', name: 'Logica', icon: 'hardware-chip', slugHints: ['robot', 'logico'], gameTitle: 'Robot Logico' },
  { id: 'razonar', name: 'Razonar', icon: 'cube', slugHints: ['mercado'], gameTitle: 'Mercado Inteligente' },
  { id: 'atencion', name: 'Atencion', icon: 'search', slugHints: ['objeto', 'atencion'], gameTitle: 'Objeto Perdido' },
]);

const DASHBOARD_TABS = Object.freeze({
  mapa: 'mapa',
  actividades: 'actividades',
  logros: 'logros',
  progreso: 'progreso',
  perfil: 'perfil',
});

const INTEGRATED_CATALOG_GAME_KEYS = Object.freeze([
  'caminoAr',
  'trenFiguras',
  'robotLogico',
  'mercadoInteligente',
  'objetoPerdido',
]);

const INTEGRATED_CATALOG_GAMES = Object.freeze(
  INTEGRATED_CATALOG_GAME_KEYS
    .map((gameKey) => CATALOGO_JUEGOS[gameKey])
    .filter(Boolean),
);

const INTEGRATED_GAME_SLUGS = new Set(
  INTEGRATED_CATALOG_GAMES.map((game) => game.slug).filter(Boolean),
);

const loadCaminoArScreen = () => require('../features/games/camino-ar/CaminoARScreen').default;
const loadMercadoInteligenteScreen = () =>
  require('../features/games/mercado-inteligente/MercadoInteligenteScreen').default;
const loadTren3DScreen = () => require('../features/games/tren-3d/Tren3DScreen').default;
const loadRobotTallerScreen = () =>
  require('../features/games/robot-taller/RobotTallerScreen').default;
const loadObjetoPerdidoArScreen = () =>
  require('../features/games/objeto-perdido-ar/ObjetoPerdidoARScreen').default;

const normalizeSkillKey = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getGameIcon = (slug = '') => {
  if (slug.includes('tren')) return 'shapes';
  if (slug.includes('mercado')) return 'basket';
  if (slug.includes('camino')) return 'trail-sign';
  if (slug.includes('robot')) return 'hardware-chip';
  if (slug.includes('objeto') || slug.includes('atencion')) return 'search';
  return 'game-controller';
};

const getStudentName = (profile, fallbackProfile) =>
  profile?.nombre || profile?.name || fallbackProfile?.nombre || fallbackProfile?.name || 'Estudiante';

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

  if (access?.estado === ESTADOS_ACCESO_JUEGO.disponible) {
    return {
      title: profile.sesion_minijuego_titulo ?? 'Actividad asignada',
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
    text: access?.motivo || playState.message,
    buttonLabel: playState.buttonLabel,
  };
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

const buildSkillCards = ({ assignedGames, accessBySlug, skillStatsView }) => {
  const entries = skillStatsView?.entries ?? [];
  const allGames = assignedGames;

  return MAP_SKILL_NODES.map((node, index) => {
    const skillKey = normalizeSkillKey(node.name);
    const stat = entries.find((entry) => normalizeSkillKey(entry.skillName) === skillKey);
    const game = findGameForSkillNode({ node, games: allGames });
    const access = game?.slug ? accessBySlug[game.slug] : null;
    const isAvailable = access?.estado === ESTADOS_ACCESO_JUEGO.disponible;
    const lockedReason = buildMapLockedReason(access, Boolean(game?.slug), game?.slug);

    return {
      id: node.id,
      name: node.name,
      icon: node.icon,
      gameSlug: game?.slug ?? null,
      color: stat?.tone?.accent ?? colors.purple,
      number: index + 1,
      active: isAvailable,
      locked: !isAvailable,
      level: stat?.tone?.label ?? (isAvailable ? 'Lista' : 'Sin resultados'),
      percent: stat?.precision ?? 0,
      percentLabel: stat?.precisionLabel ?? 'Sin datos',
      activitiesLabel: stat?.attemptsLabel ?? '0 intentos',
      achievementsLabel: stat ? stat.tone.label : 'Sin resultados',
      detailProgressLabel: stat?.reactionLabel ?? (isAvailable ? 'Juego habilitado' : lockedReason),
      value: stat?.precisionLabel ?? (isAvailable ? 'Listo para jugar' : 'Listo para comenzar'),
      detail: stat?.attemptsLabel ?? (isAvailable ? 'Juego habilitado' : lockedReason),
      activeMessage: isAvailable ? 'Juego habilitado' : '',
      lockedReason,
      actionLabel: isAvailable ? 'OK' : index + 1,
    };
  });
};

const getGradeLabel = (profile) =>
  profile?.grado_nombre ||
  profile?.grado ||
  profile?.curso ||
  profile?.grupo_nombre ||
  buildGroupLabel(profile);

const getSessionGamesLabel = (games = []) => {
  if (!games.length) {
    return 'Sin juegos asignados';
  }

  return games.map((game) => game.title).join(' + ');
};

const getSessionCompletedCount = (session) =>
  (session?.results ?? []).filter((result) => TERMINAL_PARTICIPANT_STATES.has(result.estado ?? result.status)).length;

const findGameForSkillNode = ({ node, games = [] }) => {
  const nodeKey = normalizeSkillKey(node.name);

  return games.find((game) => {
    const skillKey = normalizeSkillKey(game.skillName);
    const slug = String(game.slug ?? '').toLowerCase();
    const title = String(game.title ?? '').toLowerCase();

    return (
      skillKey === nodeKey ||
      node.slugHints.some((hint) => slug.includes(hint) || title.includes(hint))
    );
  }) ?? null;
};

const getResultGameSlug = (result = {}) =>
  result.game?.slug ?? result.slug ?? result.minijuego_slug ?? null;

const getResultSkillName = (result = {}) =>
  result.game?.skillName ?? result.habilidad ?? result.skillName ?? null;

const buildSkillProgressCards = ({ skills, results }) => {
  const resultSkills = new Set(results.map(getResultSkillName).filter(Boolean).map(normalizeSkillKey));
  const skillRows = skills.length
    ? skills
    : [...resultSkills].map((skillName) => ({ id: skillName, name: skillName }));

  return skillRows.map((skill) => {
    const skillKey = normalizeSkillKey(skill.name ?? skill.skillName ?? skill.habilidad);
    const playedResults = results.filter((result) => normalizeSkillKey(getResultSkillName(result)) === skillKey);
    const precision = skill.precision ?? null;

    return {
      id: skill.id ?? skillKey,
      name: skill.name ?? skill.skillName ?? skill.habilidad ?? 'Habilidad',
      progressLabel: precision == null ? 'Sin precision aun' : `${precision}%`,
      precision,
      gamesPlayed: playedResults.length || skill.attempts || 0,
      detail: skill.reactionLabel ?? 'Resultados guardados por sesion',
    };
  });
};

const normalizeAchievement = (achievement = {}) => {
  const unlockedValue = achievement.isUnlocked
    ?? achievement.desbloqueado
    ?? achievement.unlocked
    ?? achievement.obtenido
    ?? false;

  return {
    id: achievement.id ?? achievement.id_catalogo_logro ?? achievement.id_logro ?? achievement.logro_id ?? achievement.code ?? achievement.clave ?? achievement.nombre,
    code: achievement.code ?? achievement.clave ?? achievement.clave_logro,
    title: achievement.title ?? achievement.nombre ?? achievement.nombre_logro ?? achievement.titulo ?? 'Logro',
    description: achievement.description ?? achievement.descripcion ?? '',
    gameTitle: achievement.minijuego_titulo ?? achievement.juego ?? achievement.gameTitle ?? 'Juego',
    iconKey: achievement.iconKey ?? achievement.icon_key ?? achievement.icono,
    module: achievement.module ?? achievement.modulo ?? achievement.habilidad,
    points: achievement.points ?? achievement.puntos ?? achievement.puntos_otorgados ?? achievement.awardedPoints ?? 1,
    unlocked: Boolean(unlockedValue),
    isUnlocked: Boolean(unlockedValue),
    unlockedAt: achievement.unlockedAt ?? achievement.desbloqueado_en ?? null,
    progress: achievement.progress ?? (unlockedValue ? 1 : 0),
    progressTarget: achievement.progressTarget ?? 1,
  };
};

const buildProgressMetrics = ({ historicalSessions, results, skills, ranking = [] }) => {
  const completedResults = results.filter((result) => TERMINAL_PARTICIPANT_STATES.has(result.status ?? result.estado));
  const uniqueGames = new Set(results.map(getResultGameSlug).filter(Boolean));
  const precisionValues = skills
    .map((skill) => Number(skill.precision))
    .filter((value) => Number.isFinite(value));
  const averagePrecision = precisionValues.length
    ? Math.round(precisionValues.reduce((sum, value) => sum + value, 0) / precisionValues.length)
    : null;
  const currentRanking = ranking.find((entry) => entry.isCurrentStudent) ?? null;

  return [
    { icon: 'school', label: 'Sesiones', value: String(historicalSessions.length), helper: 'Registradas' },
    { icon: 'game-controller', label: 'Juegos', value: String(uniqueGames.size), helper: 'Jugados' },
    { icon: 'analytics', label: 'Precision', value: averagePrecision == null ? 'Sin datos' : `${averagePrecision}%`, helper: 'Promedio real' },
    { icon: 'podium', label: 'Ranking', value: currentRanking ? `#${currentRanking.position}` : 'Sin ranking', helper: 'Sesion actual' },
  ];
};

const resolveSessionStateLabel = (session) => {
  if (!session) return 'Sin sesion';
  if (session.participantState === 'completado' || session.status === 'completado') return 'Finalizada';
  if (session.isPlayable || session.participantState === 'en_progreso' || session.participantState === 'pendiente') {
    return 'En progreso';
  }
  if (TERMINAL_PARTICIPANT_STATES.has(session.participantState) || TERMINAL_PARTICIPANT_STATES.has(session.status)) {
    return 'Finalizada';
  }
  return 'En progreso';
};

const formatRankingDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatSessionDateTime = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getRankingSessionDate = (session, ranking = []) =>
  formatRankingDate(
    session?.finishedAt ??
      session?.startedAt ??
      session?.openedAt ??
      session?.abierta_en ??
      ranking.find((entry) => entry.raw?.ultima_finalizacion)?.raw?.ultima_finalizacion,
  );

const getSessionDateLabel = (session) =>
  formatSessionDateTime(
    session?.finishedAt ??
      session?.startedAt ??
      session?.openedAt ??
      session?.abierta_en ??
      session?.results?.find((result) => result.finalizada_en ?? result.finishedAt)?.finalizada_en ??
      session?.results?.find((result) => result.finalizada_en ?? result.finishedAt)?.finishedAt ??
      session?.results?.find((result) => result.iniciada_en ?? result.startedAt)?.iniciada_en ??
      session?.results?.find((result) => result.iniciada_en ?? result.startedAt)?.startedAt,
  ) || 'Fecha y hora no registradas';

const getSessionHitsCount = (session) =>
  (session?.results ?? []).reduce(
    (sum, result) => sum + Number(result.aciertos ?? result.hits ?? 0),
    0,
  );

const getIntegratedGames = (games = []) =>
  (Array.isArray(games) ? games : []).filter((game) => INTEGRATED_GAME_SLUGS.has(game.slug));

const getIntegratedSessionGames = (session) => {
  const assignedGames = getIntegratedGames(session?.assignedGames ?? []);
  if (assignedGames.length) return assignedGames;

  const gamesBySlug = new Map();
  (session?.results ?? []).forEach((result) => {
    const slug = result.game?.slug ?? result.minijuego_slug ?? result.slug;
    if (!INTEGRATED_GAME_SLUGS.has(slug) || gamesBySlug.has(slug)) return;
    gamesBySlug.set(slug, result.game ?? {
      slug,
      title: result.minijuego_titulo ?? result.minijuego ?? 'Juego',
    });
  });

  return [...gamesBySlug.values()];
};

const buildSessionListCards = ({ activeSession, historicalSessions, ranking = [] }) => {
  const activeCard = activeSession
    ? [{
        ...activeSession,
        id: `active-${activeSession.id}`,
        source: 'active',
        title: activeSession.mode === 'path' ? 'Ruta activa' : 'Clase actual',
        stateLabel: resolveSessionStateLabel(activeSession),
        ranking,
      }]
    : [];

  const rankingSessionId = ranking[0]?.raw?.sesion_clase_id ?? ranking[0]?.raw?.scope?.sesion_clase_id ?? null;
  const latestHistoricalId = historicalSessions[0]?.id ?? null;
  const historicalCards = historicalSessions.map((session) => {
    const belongsToRanking = rankingSessionId
      ? String(rankingSessionId) === String(session.id)
      : String(latestHistoricalId) === String(session.id);

    return {
      ...session,
      id: `history-${session.id}`,
      source: 'history',
      title: session.activityTitle ?? session.routeName ?? (session.mode === 'path' ? 'Ruta de clase' : 'Sesion de clase'),
      stateLabel: resolveSessionStateLabel(session),
      ranking: belongsToRanking ? ranking : [],
    };
  });

  return [...activeCard, ...historicalCards];
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
  const [activeGameContext, setActiveGameContext] = useState(null);
  const [activeGameResultVisible, setActiveGameResultVisible] = useState(false);
  const [showGamePath, setShowGamePath] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [expandedSkillId, setExpandedSkillId] = useState(null);
  const [activeTab, setActiveTab] = useState(DASHBOARD_TABS.mapa);
  const {
    profile,
    achievements,
    results,
    skills,
    progressSummary,
    skillStatsView,
    sessionState,
    ranking,
    rankingSummary,
    playState,
    isLoading,
    isRefreshing,
    errorMessage,
    reloadDashboard,
  } = useStudentDashboard(studentSession, {
    onSessionExpired: onLogout,
  });

  const studentProfile = profile ?? studentSession?.studentProfile ?? null;
  const activeSession = sessionState?.activeSession ?? null;
  const assignedGames = sessionState?.assignedGames ?? [];
  const historicalSessions = sessionState?.historicalSessions ?? [];
  const safeResults = results ?? [];
  const safeSkills = skills ?? [];
  const caminoArConfig = useMemo(() => obtenerConfiguracionBaseCaminoAr(), []);
  const mercadoConfig = useMemo(() => obtenerConfiguracionBaseMercado(), []);
  const tren3DConfig = useMemo(() => obtenerConfiguracionBaseTren3D(), []);
  const robotTallerConfig = useMemo(() => obtenerConfiguracionBaseRobotTaller(), []);
  const objetoPerdidoConfig = useMemo(() => obtenerConfiguracionBaseObjetoPerdidoAr(), []);
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
  const mercadoAccess = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante: studentProfile,
        slugJuego: mercadoConfig.slug,
      }),
    [mercadoConfig.slug, studentProfile],
  );
  const objetoPerdidoAccess = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante: studentProfile,
        slugJuego: objetoPerdidoConfig.slug,
      }),
    [objetoPerdidoConfig.slug, studentProfile],
  );
  const commonSessionIdentity = useMemo(() => ({
    tokenEstudiante: studentSession?.token ?? null,
    baseUrlApi: studentSession?.apiBaseUrl ?? null,
    sesionClaseId: studentProfile?.sesion_clase_id ?? null,
    sesionModo: studentProfile?.sesion_modo ?? null,
    sesionRutaId: studentProfile?.sesion_ruta_id ?? null,
    sesionPasoActual: studentProfile?.sesion_paso_actual ?? null,
    sesionBloqueActual: studentProfile?.sesion_bloque_actual ?? null,
    sesionNivelEnBloque: studentProfile?.sesion_nivel_en_bloque ?? null,
    sesionTotalPasos: studentProfile?.sesion_total_pasos ?? null,
  }), [
    studentProfile?.sesion_bloque_actual,
    studentProfile?.sesion_clase_id,
    studentProfile?.sesion_modo,
    studentProfile?.sesion_nivel_en_bloque,
    studentProfile?.sesion_paso_actual,
    studentProfile?.sesion_ruta_id,
    studentProfile?.sesion_total_pasos,
    studentSession?.apiBaseUrl,
    studentSession?.token,
  ]);
  const buildSessionContextForGame = (slug, extraContext = {}) => ({
    ...commonSessionIdentity,
    minijuegoId:
      studentProfile?.sesion_minijuego_slug === slug
        ? studentProfile?.sesion_minijuego_id ?? null
        : null,
    ...extraContext,
  });
  const caminoArSessionContext = useMemo(
    () => buildSessionContextForGame(caminoArConfig.slug),
    [caminoArConfig.slug, commonSessionIdentity, studentProfile?.sesion_minijuego_id, studentProfile?.sesion_minijuego_slug],
  );
  const tren3DSessionContext = useMemo(
    () => buildSessionContextForGame(tren3DConfig.slug),
    [commonSessionIdentity, studentProfile?.sesion_minijuego_id, studentProfile?.sesion_minijuego_slug, tren3DConfig.slug],
  );
  const robotTallerSessionContext = useMemo(
    () => buildSessionContextForGame(robotTallerConfig.slug),
    [commonSessionIdentity, robotTallerConfig.slug, studentProfile?.sesion_minijuego_id, studentProfile?.sesion_minijuego_slug],
  );
  const mercadoSessionContext = useMemo(
    () => buildSessionContextForGame(mercadoConfig.slug, {
      nombreEstudiante: getStudentName(studentProfile, studentSession?.studentProfile),
    }),
    [
      commonSessionIdentity,
      mercadoConfig.slug,
      studentProfile?.sesion_minijuego_id,
      studentProfile?.sesion_minijuego_slug,
      studentSession?.studentProfile,
    ],
  );
  const objetoPerdidoSessionContext = useMemo(
    () => buildSessionContextForGame(objetoPerdidoConfig.slug),
    [commonSessionIdentity, objetoPerdidoConfig.slug, studentProfile?.sesion_minijuego_id, studentProfile?.sesion_minijuego_slug],
  );
  const sessionContextBySlug = useMemo(
    () => ({
      [caminoArConfig.slug]: caminoArSessionContext,
      [mercadoConfig.slug]: mercadoSessionContext,
      [objetoPerdidoConfig.slug]: objetoPerdidoSessionContext,
      [robotTallerConfig.slug]: robotTallerSessionContext,
      [tren3DConfig.slug]: tren3DSessionContext,
    }),
    [
      caminoArConfig.slug,
      caminoArSessionContext,
      mercadoConfig.slug,
      mercadoSessionContext,
      objetoPerdidoConfig.slug,
      objetoPerdidoSessionContext,
      robotTallerConfig.slug,
      robotTallerSessionContext,
      tren3DConfig.slug,
      tren3DSessionContext,
    ],
  );
  const accessBySlug = useMemo(
    () =>
      assignedGames.reduce((acc, game) => {
        if (!game.slug) return acc;

        return {
          ...acc,
          [game.slug]: resolverAccesoJuegoDesdePerfil({
            perfilEstudiante: studentProfile,
            slugJuego: game.slug,
          }),
        };
      }, {
        [caminoArConfig.slug]: caminoArAccess,
        [mercadoConfig.slug]: mercadoAccess,
        [objetoPerdidoConfig.slug]: objetoPerdidoAccess,
        [tren3DConfig.slug]: tren3DAccess,
        [robotTallerConfig.slug]: robotTallerAccess,
      }),
    [
      assignedGames,
      caminoArAccess,
      caminoArConfig.slug,
      mercadoAccess,
      mercadoConfig.slug,
      objetoPerdidoAccess,
      objetoPerdidoConfig.slug,
      robotTallerAccess,
      robotTallerConfig.slug,
      studentProfile,
      tren3DAccess,
      tren3DConfig.slug,
    ],
  );

  useEffect(() => {
    if (activeGame && shouldCloseActiveGame({
      accessState: accessBySlug[activeGame]?.estado,
      participantState: studentProfile?.sesion_participante_estado,
      resultVisible: activeGameResultVisible,
      sessionActive: studentProfile?.sesion_activa,
    })) {
      setActiveGame(null);
      setActiveGameContext(null);
      setActiveGameResultVisible(false);
    }
  }, [accessBySlug, activeGame, activeGameResultVisible, studentProfile]);
  const supportedGameSlugs = useMemo(
    () =>
      new Set([
        caminoArConfig.slug,
        mercadoConfig.slug,
        objetoPerdidoConfig.slug,
        tren3DConfig.slug,
        robotTallerConfig.slug,
      ]),
    [
      caminoArConfig.slug,
      mercadoConfig.slug,
      objetoPerdidoConfig.slug,
      robotTallerConfig.slug,
      tren3DConfig.slug,
    ],
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
        assignedGames,
        accessBySlug,
        skillStatsView,
      }),
    [accessBySlug, assignedGames, skillStatsView],
  );

  const firstName = getStudentName(studentProfile, studentSession?.studentProfile).split(' ')[0];
  const avatarUri = resolveStudentAvatarUri(studentProfile, studentSession?.studentProfile);
  const avatarColor = getStudentAvatarColor(studentProfile, studentSession?.studentProfile);
  const gradeLabel = getGradeLabel(studentProfile);
  const availableGameSlug =
    assignedGames.find(
      (game) =>
        supportedGameSlugs.has(game.slug) &&
        accessBySlug[game.slug]?.estado === ESTADOS_ACCESO_JUEGO.disponible,
    )?.slug ??
    [
      caminoArConfig.slug,
      tren3DConfig.slug,
      robotTallerConfig.slug,
      mercadoConfig.slug,
      objetoPerdidoConfig.slug,
    ].find(
      (slug) => accessBySlug[slug]?.estado === ESTADOS_ACCESO_JUEGO.disponible,
    ) ??
    null;
  const achievementsCount = achievements.length;
  const sessionStatusLabel = buildSessionStatusLabel(studentProfile);
  const dashboardAccess = resolveStudentDashboardAccess(studentProfile);
  const scrollBottomPadding = activeTab === DASHBOARD_TABS.perfil ? 92 : 128;
  const precisionValue = progressSummary.averagePrecision == null
    ? 'Sin datos'
    : `${progressSummary.averagePrecision}%`;
  const precisionLabel = precisionValue;
  const attemptsLabel = progressSummary.totalAttempts
    ? `${progressSummary.totalAttempts}`
    : '0';
  const dashboardSessions = useMemo(
    () =>
      buildSessionListCards({
        activeSession,
        historicalSessions,
        ranking,
      }),
    [activeSession, historicalSessions, ranking],
  );
  const lastSession = dashboardSessions[0] ?? null;
  const skillProgressCards = useMemo(
    () => buildSkillProgressCards({ skills: safeSkills, results: safeResults }),
    [safeResults, safeSkills],
  );
  const achievementCards = useMemo(
    () => achievements.map(normalizeAchievement),
    [achievements],
  );
  const progressMetrics = useMemo(
    () =>
      buildProgressMetrics({
        historicalSessions,
        results: safeResults,
        skills: safeSkills,
        ranking,
      }),
    [historicalSessions, ranking, safeResults, safeSkills],
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

    if (!supportedGameSlugs.has(slug)) {
      return false;
    }

    const access = accessBySlug[slug];

    if (access?.estado !== ESTADOS_ACCESO_JUEGO.disponible) {
      return false;
    }

    setActiveGame(slug);
    setActiveGameContext(sessionContextBySlug[slug] ?? null);
    setActiveGameResultVisible(false);
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

  const exitGame = () => {
    setActiveGame(null);
    setActiveGameContext(null);
    setActiveGameResultVisible(false);
    void reloadDashboard();
  };

  const handleGameResultVisible = useCallback(() => {
    setActiveGameResultVisible(true);
  }, []);

  const handleSkillDetailPress = (skill) => {
    if (skill.gameSlug && skill.active) {
      openActivityBySlug(skill.gameSlug);
    }
  };

  const openActivitiesTab = () => {
    setActiveTab(DASHBOARD_TABS.actividades);
    setShowGamePath(false);
    setSkillsExpanded(false);
  };

  const handleActivityDetailPress = () => {
    setActiveTab(DASHBOARD_TABS.actividades);
  };

  const handleActivityActionPress = (activity) => {
    if (activity.status === 'Activa' && activity.slug) {
      openActivityBySlug(activity.slug);
      return;
    }

    handleActivityDetailPress(activity);
  };

  const activeGameScreen = useMemo(() => {
    if (activeGame === caminoArConfig.slug) {
      return {
        ScreenComponent: loadCaminoArScreen(),
        config: caminoArConfig,
        sessionContext: activeGameContext ?? caminoArSessionContext,
      };
    }

    if (activeGame === SLUG_TREN_3D) {
      return {
        ScreenComponent: loadTren3DScreen(),
        config: tren3DConfig,
        sessionContext: activeGameContext ?? tren3DSessionContext,
      };
    }

    if (activeGame === robotTallerConfig.slug) {
      return {
        ScreenComponent: loadRobotTallerScreen(),
        config: robotTallerConfig,
        sessionContext: activeGameContext ?? robotTallerSessionContext,
      };
    }

    if (activeGame === mercadoConfig.slug) {
      return {
        ScreenComponent: loadMercadoInteligenteScreen(),
        config: mercadoConfig,
        sessionContext: activeGameContext ?? mercadoSessionContext,
      };
    }

    if (activeGame === objetoPerdidoConfig.slug) {
      return {
        ScreenComponent: loadObjetoPerdidoArScreen(),
        config: objetoPerdidoConfig,
        sessionContext: activeGameContext ?? objetoPerdidoSessionContext,
      };
    }

    return null;
  }, [
    activeGame,
    activeGameContext,
    caminoArConfig,
    caminoArSessionContext,
    mercadoConfig,
    mercadoSessionContext,
    objetoPerdidoConfig,
    objetoPerdidoSessionContext,
    robotTallerConfig,
    robotTallerSessionContext,
    tren3DConfig,
    tren3DSessionContext,
  ]);

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

  const selectDashboardTab = (nextTab) => {
    setActiveTab(nextTab);
    setShowGamePath(false);
    setSkillsExpanded(false);
    setExpandedSkillId(null);
  };

  if (activeGameScreen) {
    const { ScreenComponent, config, sessionContext } = activeGameScreen;

    return (
      <ScreenComponent
        onSalir={exitGame}
        onResultadoVisible={handleGameResultVisible}
        configuracionInicial={config}
        contextoSesion={sessionContext}
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
              gradeLabel={gradeLabel}
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
              achievements={achievementCards}
              achievementsCount={achievementsCount}
              activityTitle={activityCopy.title}
              activityText={activityCopy.text}
              canContinue={Boolean(availableGameSlug)}
              attemptsLabel={attemptsLabel}
              avatarColor={avatarColor}
              avatarUri={avatarUri}
              gradeLabel={gradeLabel}
              lastSession={lastSession}
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
              <CurrentClassCard
                activeSession={activeSession}
                activityCopy={activityCopy}
                assignedGames={assignedGames}
                canPlay={Boolean(availableGameSlug)}
                isLoading={isLoading || isRefreshing}
                onAction={startOrRefresh}
              />
              <RankingPanel
                activeSession={activeSession}
                ranking={ranking}
                totalParticipants={rankingSummary?.totalParticipants}
                studentName={getStudentName(studentProfile, studentSession?.studentProfile)}
              />

              <View style={styles.sectionBlock}>
                <SectionTitle
                  title="Mis Sesiones"
                  subtitle="Resumen de tu ultima clase"
                />
                <DashboardSessionsPreview
                  sessions={dashboardSessions}
                  loading={isLoading}
                  onDetail={() => selectDashboardTab(DASHBOARD_TABS.actividades)}
                />
              </View>

            </>
          ) : activeTab === DASHBOARD_TABS.actividades ? (
            <ActivitiesTabScreen
              sessions={dashboardSessions}
              loading={isLoading}
            />
          ) : activeTab === DASHBOARD_TABS.logros ? (
            <AchievementsTabScreen
              achievements={achievementCards}
              loading={isLoading}
            />
          ) : activeTab === DASHBOARD_TABS.progreso ? (
            <ProgressTabScreen
              achievements={achievementCards}
              metrics={progressMetrics}
              sessions={dashboardSessions}
              skills={skillProgressCards}
              results={safeResults}
              loading={isLoading}
            />
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

function StudentHeader({ avatarColor, avatarUri, firstName, gradeLabel, isRefreshing, onPress }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Abrir perfil"
      activeOpacity={0.86}
      onPress={onPress}
      style={styles.header}
    >
      <StudentAvatar
        backgroundColor={avatarColor}
        iconSize={30}
        size={58}
        uri={avatarUri}
      />
      <View style={styles.greeting}>
        <Text style={styles.title}>Hola, {firstName}!</Text>
        <Text style={styles.subtitle}>
          {gradeLabel} - {isRefreshing ? 'Actualizando...' : 'Sesion sincronizada'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CurrentClassCard({ activeSession, activityCopy, assignedGames, canPlay, isLoading, onAction }) {
  const gameLabel = assignedGames[0]?.title ?? 'Actividad';

  return (
    <View style={styles.hero}>
      <View style={styles.heroTextBlock}>
        <Text style={styles.heroEyebrow}>{gameLabel}</Text>
        <Text style={styles.heroTitle}>{activeSession ? activityCopy.title : 'Sin sesion activa'}</Text>
        <Text style={styles.heroText}>
          {activeSession
            ? activityCopy.text
            : 'Cuando tu tutor abra una clase, aparecera aqui con sus juegos asignados.'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onAction}
          style={[styles.heroButton, !canPlay && styles.heroButtonMuted]}
        >
          {isLoading ? <ActivityIndicator color={colors.white} /> : null}
          <Text style={styles.heroButtonText}>
            {isLoading ? 'Cargando' : canPlay ? 'Entrar a clase' : 'Actualizar clase'}
          </Text>
          <Ionicons name={canPlay ? 'play' : 'sync'} size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
      <Image source={trainHeroImage} style={styles.heroImage} resizeMode="cover" />
    </View>
  );
}

function RankingPanel({ activeSession, ranking = [], totalParticipants, studentName }) {
  const currentStudent = ranking.find((entry) => entry.isCurrentStudent);
  const currentStudentPosition = currentStudent?.position ?? null;
  const totalStudents = totalParticipants ?? ranking.length;
  const rankingDate = getRankingSessionDate(activeSession, ranking);
  const rankingTitle = `Ranking de tu ultima sesion${rankingDate ? ` - ${rankingDate}` : ''}`;

  if (!activeSession) {
    return (
      <View style={styles.rankingPanel}>
        <View style={styles.rankingHeader}>
          <Text style={styles.rankingTitle}>{rankingTitle}</Text>
          <Text style={styles.rankingSubtitle}>Esperando una clase activa</Text>
        </View>
        <View style={styles.rankingEmpty}>
          <Ionicons name="podium" size={30} color={colors.purple} />
          <Text style={styles.rankingEmptyText}>Sin sesion activa para mostrar posiciones.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rankingPanel}>
      <View style={styles.rankingHeader}>
        <Text style={styles.rankingTitle}>{rankingTitle}</Text>
      </View>

      {ranking.length ? (
        <>
          {/* PODIO ANIMADO */}
          <PodiumRanking ranking={ranking} />

          {/* TU POSICIÓN */}
          {currentStudent ? (
            <View style={styles.rankingYourPosition}>
              <View style={styles.rankingYourPositionContent}>
                <Text style={styles.rankingYourPositionLabel}>Tu posición</Text>
                <Text style={styles.rankingYourPositionValue}>
                  #{currentStudentPosition} de {totalStudents} estudiantes
                </Text>
              </View>
              {currentStudentPosition <= 3 ? (
                <Text style={styles.rankingYourPositionEmoji}>🎉</Text>
              ) : (
                <Text style={styles.rankingYourPositionEmoji}>📈</Text>
              )}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.rankingEmpty}>
          <Ionicons name="hourglass" size={30} color={colors.purple} />
          <Text style={styles.rankingEmptyText}>Ranking en progreso. Aparecerá cuando lleguen resultados.</Text>
        </View>
      )}
    </View>
  );
}

function SessionStatusPill({ label }) {
  const isActive = label === 'En progreso';
  const isDone = label === 'Finalizada';

  return (
    <View style={[
      styles.sessionStatusPill,
      isActive && styles.sessionStatusPillActive,
      isDone && styles.sessionStatusPillDone,
    ]}>
      <Text style={[
        styles.sessionStatusPillText,
        isActive && styles.sessionStatusPillTextActive,
        isDone && styles.sessionStatusPillTextDone,
      ]}>
        {label}
      </Text>
    </View>
  );
}

function LoadingPanel({ text = 'Cargando datos reales...' }) {
  return (
    <View style={styles.loadingPanel}>
      <ActivityIndicator color={colors.purple} />
      <Text style={styles.loadingPanelText}>{text}</Text>
    </View>
  );
}

function EmptyPanel({ icon = 'sparkles', title, text }) {
  return (
    <View style={styles.sessionsEmpty}>
      <Ionicons name={icon} size={34} color={colors.purple} />
      <Text style={styles.sessionsEmptyTitle}>{title}</Text>
      <Text style={styles.sessionsEmptyText}>{text}</Text>
    </View>
  );
}

function DashboardSessionsPreview({ sessions, loading, onDetail }) {
  if (loading) return <LoadingPanel text="Cargando sesiones..." />;
  if (!sessions.length) {
    return (
      <EmptyPanel
        icon="calendar"
        title="Sin sesiones todavia"
        text="Tu tutor debe abrir una clase para que aparezca aqui."
      />
    );
  }

  const session = sessions.find((entry) => entry.source === 'history') ?? sessions[0];
  const games = getIntegratedSessionGames(session);
  const completed = getSessionCompletedCount(session);
  const total = games.length || session.totalSteps || completed;
  const friendlyMessage = total
    ? `Completaste ${completed || 0} reto${completed === 1 ? '' : 's'} de ${total}.`
    : 'Tienes una sesion lista para revisar.';
  const gameNames = games.map((game) => game.title).join(', ');

  return (
    <View style={styles.sessionSummaryCard}>
      <View style={styles.sessionSummaryTop}>
        <View style={styles.sessionSummaryIcon}>
          <Ionicons name={session.source === 'active' ? 'rocket' : 'sparkles'} size={28} color={colors.white} />
        </View>
        <View style={styles.sessionSummaryText}>
          <Text style={styles.sessionSummaryEyebrow}>Ultima sesion</Text>
          <Text style={styles.sessionSummaryTitle}>{session.title}</Text>
          {session.activityDetail ? (
            <Text style={styles.sessionSummaryCopy}>{session.activityDetail}</Text>
          ) : null}
          <Text style={styles.sessionSummaryCopy}>{friendlyMessage}</Text>
          {gameNames ? (
            <Text style={styles.sessionSummaryCopy} numberOfLines={2}>
              Juegos: {gameNames}
            </Text>
          ) : null}
          <Text style={styles.sessionSummaryDate}>{getSessionDateLabel(session)}</Text>
        </View>
        <SessionStatusPill label={session.stateLabel} />
      </View>

      <View style={styles.sessionProgressTrack}>
        <View
          style={[
            styles.sessionProgressFill,
            { width: `${buildProgressPercent(getSessionCompletedCount(session), games.length || 1)}%` },
          ]}
        />
      </View>

      <View style={styles.sessionGamesPreview}>
        {games.length ? games.slice(0, 5).map((game, index) => (
          <View key={game.slug ?? game.title} style={styles.sessionGameBubble}>
            <Ionicons name={getGameIcon(game.slug)} size={15} color={colors.purple} />
            <Text style={styles.sessionGameBubbleText}>{index + 1}</Text>
          </View>
        )) : (
          <Text style={styles.sessionSummaryCopy}>Sin juegos asignados todavia.</Text>
        )}
      </View>

      <TouchableOpacity activeOpacity={0.86} onPress={onDetail} style={styles.sessionSummaryButton}>
        <Text style={styles.sessionSummaryButtonText}>Ver detalles</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.white} />
      </TouchableOpacity>
    </View>
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

function SkillCard({ skill, expanded, onToggle, onDetail }) {
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onToggle} style={styles.skillCard}>
      <View style={styles.skillHeader}>
        <View style={[styles.skillIconWrap, { backgroundColor: `${skill.color}1F` }]}>
          <Ionicons name={skill.icon} size={22} color={skill.color} />
        </View>
        <View style={styles.skillMain}>
          <Text style={styles.skillName} numberOfLines={1}>{skill.name}</Text>
          <Text style={styles.skillLevel} numberOfLines={1}>Nivel {skill.level}</Text>
        </View>
        <Text style={[styles.skillPercent, { color: skill.color }]}>{skill.percentLabel}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </View>

      <View style={styles.skillTrack}>
        <View style={[styles.skillFill, { width: `${clampProgress(skill.percent)}%`, backgroundColor: skill.color }]} />
      </View>

      {expanded ? (
        <View style={styles.skillExpanded}>
          <SkillInfoRow label="Actividades realizadas" value={skill.activitiesLabel} />
          <SkillInfoRow label="Logros asociados" value={skill.achievementsLabel} />
          <SkillInfoRow label="Progreso detallado" value={skill.detailProgressLabel} />
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={!skill.gameSlug || !skill.active}
            onPress={onDetail}
            style={[styles.skillDetailButton, (!skill.gameSlug || !skill.active) && styles.skillDetailButtonDisabled]}
          >
            <Text
              style={[
                styles.skillDetailButtonText,
                (!skill.gameSlug || !skill.active) && styles.skillDetailButtonTextDisabled,
              ]}
            >
              Ver detalle
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function SkillInfoRow({ label, value }) {
  return (
    <View style={styles.skillInfoRow}>
      <Text style={styles.skillInfoLabel}>{label}</Text>
      <Text style={styles.skillInfoValue}>{value}</Text>
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
    minHeight: 150,
    borderRadius: 24,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: spacing.lg,
    ...shadows.soft,
  },
  heroTextBlock: { flex: 1.35, justifyContent: 'center' },
  heroEyebrow: {
    color: colors.yellow,
    fontFamily: fonts.black,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: { color: colors.white, fontFamily: fonts.black, fontSize: 24, lineHeight: 30 },
  heroText: { color: '#F3DDFE', fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18, marginTop: 4 },
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
    width: 104,
    height: 104,
    alignSelf: 'center',
    marginLeft: spacing.sm,
    borderRadius: 22,
  },
  currentClassCard: {
    borderRadius: 24,
    backgroundColor: colors.purple,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.soft,
  },
  currentClassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentClassIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentClassTitleBlock: { flex: 1 },
  currentClassEyebrow: {
    color: colors.yellow,
    fontFamily: fonts.black,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  currentClassTitle: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 20,
    lineHeight: 25,
    marginTop: 1,
  },
  currentClassText: {
    color: '#F3DDFE',
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
  },
  currentClassMetaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  classMeta: {
    flex: 1,
    minHeight: 82,
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: spacing.sm,
    justifyContent: 'center',
    gap: 2,
  },
  classMetaLabel: {
    color: colors.textGray,
    fontFamily: fonts.black,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  classMetaValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 11,
    lineHeight: 14,
  },
  currentClassButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.button,
  },
  currentClassButtonMuted: {
    backgroundColor: colors.lavender,
    shadowOpacity: 0,
    elevation: 0,
  },
  currentClassButtonText: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  rankingPanel: {
    borderRadius: 22,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.md,
    ...shadows.soft,
  },
  rankingHeader: {
    gap: spacing.xs,
  },
  rankingTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
  },
  rankingSubtitle: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  rankingYourPosition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  rankingYourPositionContent: {
    flex: 1,
  },
  rankingYourPositionLabel: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  rankingYourPositionValue: {
    color: colors.purpleDark,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  rankingYourPositionEmoji: {
    fontSize: 24,
    marginLeft: spacing.sm,
  },
  rankingEmpty: {
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  rankingEmptyText: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    textAlign: 'center',
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
  sessionsCarousel: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  sessionCard: {
    width: 220,
    height: 150,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: spacing.md,
    justifyContent: 'space-between',
    ...shadows.soft,
  },
  sessionCardLocked: { opacity: 0.78 },
  sessionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sessionBadge: {
    minHeight: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  sessionBadgeText: { fontFamily: fonts.black, fontSize: 11 },
  sessionTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 21,
  },
  sessionActionButton: {
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  sessionActionText: { color: colors.white, fontFamily: fonts.black, fontSize: 10 },
  sessionsScreen: {
    gap: spacing.md,
  },
  sessionList: {
    gap: spacing.sm,
  },
  sessionsEmpty: {
    minHeight: 172,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.soft,
  },
  sessionsEmptyTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 17,
  },
  sessionsEmptyText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadingPanel: {
    minHeight: 170,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.soft,
  },
  loadingPanelText: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  dashboardSessionCard: {
    borderRadius: 22,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  dashboardSessionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dashboardSessionTitleBlock: { flex: 1 },
  dashboardSessionTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 20,
  },
  dashboardSessionSubtitle: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  dashboardSessionMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sessionDetailButton: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sessionDetailButtonDisabled: {
    backgroundColor: '#C7A3DA',
  },
  sessionDetailButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  sessionSummaryCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  sessionSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionSummaryIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionSummaryText: {
    flex: 1,
  },
  sessionSummaryEyebrow: {
    color: colors.yellowDark,
    fontFamily: fonts.black,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  sessionSummaryTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 20,
  },
  sessionSummaryCopy: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  sessionSummaryDate: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  sessionSummaryButton: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sessionSummaryButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  sessionGamesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sessionProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lavender,
    overflow: 'hidden',
  },
  sessionProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  sessionGameChip: {
    maxWidth: '48%',
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.purpleSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
  },
  sessionGameChipText: {
    flex: 1,
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 10,
  },
  sessionGameBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  sessionGameBubbleText: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 10,
  },
  sessionSkillsPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  sessionSkillsTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  sessionSkillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sessionSkillChip: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  sessionSkillChipText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
  sessionDetailPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  sessionDetailTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
  sessionGameDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sessionGameDetailText: {
    flex: 1,
    gap: 2,
  },
  sessionGameDetailTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  sessionGameDetailMeta: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
  },
  sessionStatusPill: {
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: '#ECEFF3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  sessionStatusPillActive: {
    backgroundColor: '#DDF8EA',
  },
  sessionStatusPillDone: {
    backgroundColor: colors.purpleSoft,
  },
  sessionStatusPillText: {
    color: colors.textGray,
    fontFamily: fonts.black,
    fontSize: 10,
  },
  sessionStatusPillTextActive: {
    color: '#157347',
  },
  sessionStatusPillTextDone: {
    color: colors.purple,
  },
  mapNodesGrid: {
    gap: spacing.sm,
  },
  mapNodeCard: {
    minHeight: 128,
    borderRadius: 22,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.soft,
  },
  mapNodeCardActive: {
    backgroundColor: '#FFF7D7',
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  mapNodeIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNodeIconActive: {
    backgroundColor: colors.yellow,
  },
  mapNodeName: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
  },
  mapNodeGame: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
  mapNodeReason: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
  },
  skillProgressCard: {
    borderRadius: 22,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  skillProgressValue: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  achievementCard: {
    minHeight: 86,
    borderRadius: 22,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.soft,
  },
  achievementCardLocked: {
    opacity: 0.76,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillsList: { gap: 12 },
  skillCard: {
    borderRadius: 16,
    backgroundColor: colors.white,
    padding: spacing.md,
    ...shadows.soft,
  },
  skillHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  skillIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillMain: { flex: 1 },
  skillName: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 14, lineHeight: 18 },
  skillLevel: { color: colors.textGray, fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14, marginTop: 1 },
  skillPercent: { fontFamily: fonts.black, fontSize: 14, minWidth: 42, textAlign: 'right' },
  skillTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ECE7F3',
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  skillFill: { height: '100%', borderRadius: 4 },
  skillExpanded: {
    borderTopWidth: 1,
    borderTopColor: '#EEE8F4',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  skillInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  skillInfoLabel: { flex: 1, color: colors.textGray, fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14 },
  skillInfoValue: {
    flex: 1,
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'right',
  },
  skillDetailButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  skillDetailButtonDisabled: { backgroundColor: '#E5E1EA' },
  skillDetailButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 11 },
  skillDetailButtonTextDisabled: { color: colors.textGray },
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
