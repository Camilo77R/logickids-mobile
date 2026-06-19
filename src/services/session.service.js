import {
  STUDENT_PROFILE_PATH,
  STUDENT_SESSIONS_PATH,
} from '../config/apiContract';
import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';
import { normalizeGame } from './game.service';

const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'abandonado', 'cerrado']);

const toPositiveInt = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
};

const buildActivityContext = (session) => {
  const classSessionId = toPositiveInt(session?.sesion_clase_id);

  if (!classSessionId) {
    return {
      activityTitle: 'Sesion independiente',
      activityDetail: 'Actividad individual',
    };
  }

  const totalSteps = toPositiveInt(session?.sesion_total_pasos, 1);
  const routeOrder = toPositiveInt(session?.orden_en_ruta, 1);
  const blockLevel = toPositiveInt(session?.nivel_en_bloque, routeOrder);

  if (session?.sesion_modo === 'path') {
    return {
      activityTitle: session?.sesion_ruta_nombre
        ? `Ruta - ${session.sesion_ruta_nombre}`
        : 'Ruta pedagogica',
      activityDetail: `Paso ${routeOrder} de ${totalSteps}`,
    };
  }

  return {
    activityTitle: 'Actividad single',
    activityDetail: `Nivel ${blockLevel} de ${totalSteps}`,
  };
};

export const hasActiveClassSession = (profile) =>
  Boolean(profile?.sesion_clase_id && profile?.sesion_minijuego_id);

export const buildActiveSessionFromProfile = (profile) => {
  if (!hasActiveClassSession(profile)) {
    return null;
  }

  return {
    id: profile.sesion_clase_id,
    mode: profile.sesion_modo ?? null,
    routeId: profile.sesion_ruta_id ?? null,
    tutorName: profile.sesion_tutor_nombre ?? profile.tutor_nombre ?? profile.docente_nombre ?? null,
    participantState: profile.sesion_participante_estado ?? null,
    currentStep: profile.sesion_paso_actual ?? null,
    totalSteps: profile.sesion_total_pasos ?? null,
    currentBlock: profile.sesion_bloque_actual ?? null,
    currentLevelInBlock: profile.sesion_nivel_en_bloque ?? null,
    isPlayable: !TERMINAL_PARTICIPANT_STATES.has(profile.sesion_participante_estado),
    assignedGames: [
      normalizeGame({
        minijuego_id: profile.sesion_minijuego_id,
        minijuego_slug: profile.sesion_minijuego_slug,
        minijuego_titulo: profile.sesion_minijuego_titulo,
      }),
    ].filter((game) => game.id && game.slug),
  };
};

export const groupHistoricalSessions = (history = []) => {
  const sessionsById = new Map();

  history.forEach((result) => {
    const sessionId = result.sesion_clase_id ?? `game-session-${result.id}`;
    const activityContext = buildActivityContext(result);
    const current = sessionsById.get(sessionId) ?? {
      id: sessionId,
      mode: result.sesion_modo ?? null,
      routeId: result.sesion_ruta_id ?? null,
      routeName: result.sesion_ruta_nombre ?? null,
      activityTitle: activityContext.activityTitle,
      activityDetail: activityContext.activityDetail,
      tutorName: result.sesion_tutor_nombre ?? result.tutor_nombre ?? result.docente_nombre ?? null,
      totalSteps: result.sesion_total_pasos ?? null,
      status: result.estado ?? null,
      startedAt: result.iniciada_en ?? null,
      finishedAt: result.finalizada_en ?? null,
      assignedGames: [],
      results: [],
    };

    const game = normalizeGame(result);
    if (game.slug && !current.assignedGames.some((entry) => entry.slug === game.slug)) {
      current.assignedGames.push(game);
    }

    current.results.push(result);
    current.startedAt = current.startedAt ?? result.iniciada_en ?? null;
    current.finishedAt = result.finalizada_en ?? current.finishedAt ?? null;
    sessionsById.set(sessionId, current);
  });

  return [...sessionsById.values()];
};

export const buildStudentSessionState = ({ profile, history }) => {
  const activeSession = buildActiveSessionFromProfile(profile);
  const historicalSessions = groupHistoricalSessions(history);

  return {
    activeSession,
    historicalSessions,
    assignedGames: activeSession?.assignedGames ?? [],
  };
};

export const createSessionService = (baseUrl, token) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);
  const headers = buildJsonHeaders(token);

  const fetchProfile = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_PROFILE_PATH}`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  const fetchHistory = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_SESSIONS_PATH}`, {
      method: 'GET',
      headers,
    });

    const history = await parseJsonResponse(response);
    return Array.isArray(history) ? history : [];
  };

  return {
    fetchProfile,
    fetchHistory,
  };
};
