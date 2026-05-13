import { useEffect, useState } from 'react';
import {
  buildProgressSummary,
  buildSkillStatsView,
} from '../features/student-dashboard/studentDashboard.selectors';
import { createStudentDashboardService } from '../services/studentDashboard.service';

const PROFILE_REFRESH_INTERVAL_MS = 12000;

const EMPTY_DASHBOARD = {
  profile: null,
  achievements: [],
  stats: [],
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
      title: 'Preparando tu cabina',
      message: 'Estamos revisando tu grupo y el estado de tu clase.',
      buttonLabel: 'Cargando...',
    };
  }

  if (!profile.grupo_id) {
    return {
      canPlay: false,
      status: 'missing-group',
      title: 'Todavia sin tripulacion',
      message: 'Tu perfil no tiene un grupo activo. Pide ayuda a tu tutor para poder jugar.',
      buttonLabel: 'Esperando grupo',
    };
  }

  if (profile.grupo_activo === false) {
    return {
      canPlay: false,
      status: 'archived-group',
      title: 'Sala en mantenimiento',
      message: 'Tu grupo actual esta archivado. Tu tutor debe activarte en una sala vigente.',
      buttonLabel: 'Grupo archivado',
    };
  }

  if (!profile.sesion_activa) {
    return {
      canPlay: false,
      status: 'waiting-tutor',
      title: 'La mision aun no abre',
      message: 'Tu tutor debe activar la sesion del grupo para que puedas despegar.',
      buttonLabel: 'Esperando tutor',
    };
  }

  return {
    canPlay: true,
    status: 'ready',
    title: 'Todo listo para despegar',
    message: 'Tu sala esta activa y puedes entrar a competir ahora mismo.',
    buttonLabel: 'Jugar ahora',
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
          setDashboard((current) => ({
            ...current,
            profile: freshProfile,
          }));
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
    progressSummary: buildProgressSummary(dashboard.stats),
    skillStatsView: buildSkillStatsView(dashboard.stats),
    playState: resolvePlayState(dashboard.profile),
    isLoading,
    isRefreshing,
    errorMessage,
    reloadDashboard: () => loadDashboard({ silent: true }),
  };
};
