import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
const DASHBOARD_LIVE_REFRESH_INTERVAL_MS = 5000;
const APP_FOREGROUND_REFRESH_COOLDOWN_MS = 4000;
const DASHBOARD_CONVERGENCE_REFRESH_DELAYS_MS = Object.freeze([1500, 4000]);
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
  const appStateRef = useRef(AppState.currentState);
  const lastForegroundRefreshAtRef = useRef(0);
  const dashboardRequestInFlightRef = useRef(false);
  const pendingDashboardRefreshRef = useRef(false);
  const profileRefreshInFlightRef = useRef(false);
  const scheduledDashboardRefreshTimeoutsRef = useRef([]);
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

  const hasLiveRankingScope = Boolean(
    dashboard.rankingSummary?.scope?.sesion_clase_id ||
    dashboard.rankingSummary?.raw?.scope?.sesion_clase_id ||
    dashboard.rankingSummary?.currentStudent?.sessionId ||
    dashboard.ranking?.[0]?.sessionId,
  );
  const shouldUseLiveDashboardRefresh = Boolean(
    dashboard.sessionState.activeSession?.id || hasLiveRankingScope,
  );

  const loadDashboard = async ({ silent = false, showRefreshingIndicator = !silent } = {}) => {
    if (!service || dashboardRequestInFlightRef.current) {
      if (dashboardRequestInFlightRef.current) {
        pendingDashboardRefreshRef.current = true;
      }
      return null;
    }

    dashboardRequestInFlightRef.current = true;

    if (!silent) {
      setIsLoading(true);
    } else if (showRefreshingIndicator) {
      setIsRefreshing(true);
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
        if (!silent) {
          setIsLoading(false);
        } else if (showRefreshingIndicator) {
          setIsRefreshing(false);
        }
      }

      if (pendingDashboardRefreshRef.current) {
        pendingDashboardRefreshRef.current = false;
        void loadDashboard({ silent: true, showRefreshingIndicator: false });
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

    void loadDashboard({ silent, showRefreshingIndicator: false });
  };

  const clearScheduledDashboardRefreshes = () => {
    scheduledDashboardRefreshTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    scheduledDashboardRefreshTimeoutsRef.current = [];
  };

  const scheduleDashboardRefreshSequence = ({ silent = true } = {}) => {
    if (!service) {
      return;
    }

    queueDashboardReload(silent);
    clearScheduledDashboardRefreshes();

    DASHBOARD_CONVERGENCE_REFRESH_DELAYS_MS.forEach((delayMs) => {
      const timeoutId = setTimeout(() => {
        scheduledDashboardRefreshTimeoutsRef.current =
          scheduledDashboardRefreshTimeoutsRef.current.filter(
            (registeredTimeoutId) => registeredTimeoutId !== timeoutId,
          );
        queueDashboardReload(true);
      }, delayMs);

      scheduledDashboardRefreshTimeoutsRef.current.push(timeoutId);
    });
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
    scheduleDashboardRefreshSequence({ silent: true });
  });

  const refreshDashboardOnForeground = useEffectEvent(() => {
    const now = Date.now();
    if (now - lastForegroundRefreshAtRef.current < APP_FOREGROUND_REFRESH_COOLDOWN_MS) {
      return;
    }

    lastForegroundRefreshAtRef.current = now;
    scheduleDashboardRefreshSequence({ silent: true });
  });

  const handleRealtimeAuthError = useEffectEvent(() => {
    onSessionExpired?.();
  });

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearScheduledDashboardRefreshes();
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
      onConnected: refreshDashboardFromRealtime,
      onClassSessionChanged: refreshDashboardFromRealtime,
      onRankingUpdated: refreshDashboardFromRealtime,
      onStudentAccessChanged: refreshDashboardFromRealtime,
    });
  }, [studentSession?.apiBaseUrl, studentSession?.token]);

  useEffect(() => {
    if (!service) {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (
        nextAppState === 'active' &&
        previousAppState &&
        previousAppState !== 'active'
      ) {
        refreshDashboardOnForeground();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [service, refreshDashboardOnForeground]);

  useEffect(() => {
    if (!service) {
      return undefined;
    }

    const profileIntervalId = setInterval(() => {
      void refreshProfileSnapshot();
    }, PROFILE_REFRESH_INTERVAL_MS);

    const dashboardIntervalId = setInterval(() => {
      requestDashboardReload({ silent: true });
    }, shouldUseLiveDashboardRefresh
      ? DASHBOARD_LIVE_REFRESH_INTERVAL_MS
      : DASHBOARD_SAFETY_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(profileIntervalId);
      clearInterval(dashboardIntervalId);
    };
  }, [service, refreshProfileSnapshot, shouldUseLiveDashboardRefresh]);

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
    reloadDashboard: ({ silent = true } = {}) =>
      loadDashboard({ silent, showRefreshingIndicator: true }),
    reloadAfterGameExit: async () => {
      await refreshProfileSnapshot({ triggerDashboardReload: true });
      scheduleDashboardRefreshSequence({ silent: true });
    },
  };
};
