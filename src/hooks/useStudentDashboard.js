import { useEffect, useState } from 'react';
import {
  buildProgressSummary,
  buildSkillStatsView,
} from '../features/student-dashboard/studentDashboard.selectors';
import { createStudentDashboardService } from '../services/studentDashboard.service';
import { buildStudentSessionState } from '../services/session.service';

const PROFILE_REFRESH_INTERVAL_MS = 12000;
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

  if (!profile.sesion_activa) {
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
export const useStudentDashboard = (studentSession) => {
  const [dashboard, setDashboard] = useState({
    ...EMPTY_DASHBOARD,
    profile: studentSession?.studentProfile ?? null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const service = studentSession
    ? createStudentDashboardService(studentSession.apiBaseUrl, studentSession.token)
    : null;

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!service) return;

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextDashboard = await service.fetchDashboardData();
      setDashboard(nextDashboard);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'No pudimos cargar tu dashboard.');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!service) return;
      setIsLoading(true);

      try {
        const nextDashboard = await service.fetchDashboardData();
        if (!cancelled) {
          setDashboard(nextDashboard);
          setErrorMessage('');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message || 'No pudimos cargar tu dashboard.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    boot();

    const intervalId = setInterval(async () => {
      if (!service) return;

      try {
        const freshProfile = await service.fetchProfile();
        if (!cancelled) {
          setDashboard((current) => {
            const nextSessionState = buildStudentSessionState({
              profile: freshProfile,
              history: current.results.map((result) => result.raw).filter(Boolean),
            });
            const gamesBySlug = new Map(current.games.map((game) => [game.slug, game]));
            const assignedGames = nextSessionState.assignedGames.map((game) => ({
              ...(gamesBySlug.get(game.slug) ?? {}),
              ...game,
              skillName: game.skillName ?? gamesBySlug.get(game.slug)?.skillName ?? null,
              skillDescription: game.skillDescription ?? gamesBySlug.get(game.slug)?.skillDescription ?? null,
            }));

            return {
              ...current,
              profile: freshProfile,
              sessionState: {
                ...nextSessionState,
                assignedGames,
                activeSession: nextSessionState.activeSession
                  ? {
                      ...nextSessionState.activeSession,
                      assignedGames,
                    }
                  : null,
                },
            };
          });
        }
      } catch {
        // El polling no debe tumbar la UI; solo la recarga manual informa el error.
      }
    }, PROFILE_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [studentSession?.apiBaseUrl, studentSession?.token]);

  return {
    profile: dashboard.profile,
    achievements: dashboard.achievements,
    stats: dashboard.stats,
    games: dashboard.games,
    results: dashboard.results,
    skills: dashboard.skills,
    ranking: dashboard.ranking,
    rankingSummary: dashboard.rankingSummary,
    sessionState: dashboard.sessionState,
    progressSummary: buildProgressSummary(dashboard.stats),
    skillStatsView: buildSkillStatsView(dashboard.stats),
    playState: resolvePlayState(dashboard.profile),
    isLoading,
    isRefreshing,
    errorMessage,
    reloadDashboard: () => loadDashboard({ silent: true }),
  };
};
