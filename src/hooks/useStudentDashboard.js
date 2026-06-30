import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  buildRankingView,
  buildProgressSummary,
  buildSkillStatsView,
} from '../features/student-dashboard/studentDashboard.selectors';
import { createStudentDashboardService } from '../services/studentDashboard.service';
import { isAuthenticationError } from '../services/http.service';
import { buildDashboardSessionState } from '../services/session.service';
import { subscribeStudentRealtime } from '../services/studentRealtime.service';

const PROFILE_REFRESH_INTERVAL_MS = 12000;
const DASHBOARD_SAFETY_REFRESH_INTERVAL_MS = 30000;
const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'abandonado', 'cerrado']);

const EMPTY_DASHBOARD = {
  profile: null,
  achievements: [],
  stats: [],
  games: [],
  results: [],
  skills: [],
  ranking: [],
  rankingSummary: null,
  sessionState: {
    activeSession: null,
    historicalSessions: [],
    assignedGames: [],
  },
};

/**
 * Resuelve si el estudiante puede jugar desde el dashboard.
 *
 * POR QUE:
 * - la HU-42 pide mostrar el boton siempre, pero no siempre habilitarlo
 * - el dashboard no debe inventar estos mensajes en cada componente
 * - centralizamos la lectura del estado en una funcion pura
 */
export const resolvePlayState = (profile) => {
  if (!profile) {
    return {
      canPlay: false,
      status: 'loading',
      title: 'Preparando tu actividad',
      message: 'Estamos revisando tu grupo y el estado de tu clase.',
      buttonLabel: 'Cargando...',
    };
  }

  if (!profile.grupo_id) {
    return {
      canPlay: false,
      status: 'missing-group',
      title: 'Todavia sin grupo',
      message: 'Tu perfil no tiene un grupo activo. Pide ayuda a tu tutor para poder jugar.',
      buttonLabel: 'Esperando grupo',
    };
  }

  if (profile.grupo_activo === false) {
    return {
      canPlay: false,
      status: 'archived-group',
      title: 'Grupo no disponible',
      message: 'Tu grupo actual esta archivado. Tu tutor debe activarte en una sala vigente.',
      buttonLabel: 'Grupo archivado',
    };
  }

  if (TERMINAL_PARTICIPANT_STATES.has(profile.sesion_participante_estado)) {
    return {
      canPlay: false,
      status: 'completed-session',
      title:
        profile.sesion_participante_estado === 'completado'
          ? 'Actividad completada'
          : 'Actividad cerrada',
      message:
        profile.sesion_participante_estado === 'completado'
          ? 'Ya terminaste tu actividad actual. Espera una nueva sesion o revisa tu progreso.'
          : 'Esta actividad ya no esta disponible para este estudiante.',
      buttonLabel:
        profile.sesion_participante_estado === 'completado'
          ? 'Actividad completada'
          : 'Actividad cerrada',
    };
  }

  if (!profile.sesion_activa) {
    return {
      canPlay: false,
      status: 'waiting-tutor',
      title: 'La actividad aun no abre',
      message: 'Tu tutor debe activar la sesion del grupo para que puedas jugar.',
      buttonLabel: 'Esperando tutor',
    };
  }

  return {
    canPlay: true,
    status: 'ready',
    title: 'Actividad disponible',
    message: 'Tu clase esta activa y puedes entrar al juego actual.',
    buttonLabel: 'Jugar',
  };
};

/**
 * Hook del dashboard personal del estudiante.
 *
 * POR QUE:
 * - separa carga de datos de la capa visual
 * - deja el polling del estado del grupo lejos de la UI
 * - el screen solo compone datos ya listos para pintar
 */
export const useStudentDashboard = (
  studentSession,
  { onSessionExpired } = {},
) => {
  const isMountedRef = useRef(false);
  const dashboardRequestInFlightRef = useRef(false);
  const pendingDashboardRefreshRef = useRef(false);
  const profileRefreshInFlightRef = useRef(false);
  const [dashboard, setDashboard] = useState({
    ...EMPTY_DASHBOARD,
    profile: studentSession?.studentProfile ?? null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const service = useMemo(
    () =>
      studentSession
        ? createStudentDashboardService(studentSession.apiBaseUrl, studentSession.token)
        : null,
    [studentSession?.apiBaseUrl, studentSession?.token],
  );

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!service || dashboardRequestInFlightRef.current) {
      if (dashboardRequestInFlightRef.current) {
        pendingDashboardRefreshRef.current = true;
      }
      return null;
    }

    dashboardRequestInFlightRef.current = true;

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextDashboard = await service.fetchDashboardData();
      if (isMountedRef.current) {
        setDashboard(nextDashboard);
        setErrorMessage('');
      }
      return nextDashboard;
    } catch (error) {
      if (isAuthenticationError(error)) {
        onSessionExpired?.();
        return null;
      }

      if (isMountedRef.current) {
        setErrorMessage(error.message || 'No pudimos cargar tu dashboard.');
      }
      return null;
    } finally {
      dashboardRequestInFlightRef.current = false;

      if (isMountedRef.current) {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }

      if (pendingDashboardRefreshRef.current) {
        pendingDashboardRefreshRef.current = false;
        void loadDashboard({ silent: true });
      }
    }
  };

  const queueDashboardReload = (silent = true) => {
    if (!service) {
      return;
    }

    if (dashboardRequestInFlightRef.current) {
      pendingDashboardRefreshRef.current = true;
      return;
    }

    void loadDashboard({ silent });
  };

  const requestDashboardReload = useEffectEvent(({ silent = true } = {}) => {
    queueDashboardReload(silent);
  });

  const refreshProfileSnapshot = useEffectEvent(async ({ triggerDashboardReload = false } = {}) => {
    if (!service || profileRefreshInFlightRef.current || dashboardRequestInFlightRef.current) {
      if (triggerDashboardReload && dashboardRequestInFlightRef.current) {
        pendingDashboardRefreshRef.current = true;
      }
      return null;
    }

    profileRefreshInFlightRef.current = true;

    try {
      const freshProfile = await service.fetchProfile();

      if (isMountedRef.current) {
        setDashboard((current) => {
          const history = current.results.map((result) => result.raw).filter(Boolean);

          return {
            ...current,
            profile: freshProfile,
            sessionState: buildDashboardSessionState({
              profile: freshProfile,
              history,
              games: current.games,
            }),
          };
        });
      }

      if (triggerDashboardReload) {
        queueDashboardReload(true);
      }

      return freshProfile;
    } catch (error) {
      if (isAuthenticationError(error)) {
        onSessionExpired?.();
      }

      // El polling de respaldo no debe tumbar la UI ni interrumpir la clase.
      return null;
    } finally {
      profileRefreshInFlightRef.current = false;
    }
  });

  const refreshDashboardFromRealtime = useEffectEvent(() => {
    requestDashboardReload({ silent: true });
  });

  const handleRealtimeAuthError = useEffectEvent(() => {
    onSessionExpired?.();
  });

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!service) {
      dashboardRequestInFlightRef.current = false;
      pendingDashboardRefreshRef.current = false;
      profileRefreshInFlightRef.current = false;
      setDashboard({
        ...EMPTY_DASHBOARD,
        profile: studentSession?.studentProfile ?? null,
      });
      setIsLoading(false);
      setIsRefreshing(false);
      setErrorMessage('');
      return undefined;
    }

    void loadDashboard();
    return undefined;
  }, [service, studentSession?.studentProfile]);

  useEffect(() => {
    if (!studentSession?.apiBaseUrl || !studentSession?.token) {
      return undefined;
    }

    return subscribeStudentRealtime({
      baseUrl: studentSession.apiBaseUrl,
      token: studentSession.token,
      onAuthError: handleRealtimeAuthError,
      onClassSessionChanged: refreshDashboardFromRealtime,
      onRankingUpdated: refreshDashboardFromRealtime,
      onStudentAccessChanged: refreshDashboardFromRealtime,
    });
  }, [studentSession?.apiBaseUrl, studentSession?.token]);

  useEffect(() => {
    if (!service) {
      return undefined;
    }

    const profileIntervalId = setInterval(() => {
      void refreshProfileSnapshot();
    }, PROFILE_REFRESH_INTERVAL_MS);

    const dashboardIntervalId = setInterval(() => {
      requestDashboardReload({ silent: true });
    }, DASHBOARD_SAFETY_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(profileIntervalId);
      clearInterval(dashboardIntervalId);
    };
  }, [service, refreshProfileSnapshot]);

  return {
    profile: dashboard.profile,
    achievements: dashboard.achievements,
    ranking: dashboard.ranking,
    rankingView: buildRankingView(dashboard.rankingSummary),
    stats: dashboard.stats,
    games: dashboard.games,
    results: dashboard.results,
    skills: dashboard.skills,
    rankingSummary: dashboard.rankingSummary,
    sessionState: dashboard.sessionState,
    progressSummary: buildProgressSummary(dashboard.stats),
    skillStatsView: buildSkillStatsView(dashboard.stats),
    playState: resolvePlayState(dashboard.profile),
    isLoading,
    isRefreshing,
    errorMessage,
    reloadDashboard: ({ silent = true } = {}) => loadDashboard({ silent }),
    reloadAfterGameExit: () => refreshProfileSnapshot({ triggerDashboardReload: true }),
  };
};
