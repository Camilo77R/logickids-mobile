import { STUDENT_RANKING_PATH } from '../config/apiContract';
import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';

const COMPLETED_RESULT_STATES = new Set(['completado', 'cerrado']);

const resolveRankingEntries = (payload = {}) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload.entries ??
    payload.entradas ??
    payload.top3 ??
    payload.top ??
    payload.ranking ??
    payload.leaderboard ??
    []
  );
};

export const normalizeRankingEntry = (entry = {}, index = 0) => {
  const studentName = entry.studentName ?? entry.nombre ?? entry.estudiante_nombre ?? entry.name ?? null;
  const score = entry.score ?? entry.points ?? entry.puntaje ?? entry.valor ?? entry.puntaje_total ?? 0;

  return {
    position: entry.position ?? entry.posicion ?? entry.rank ?? index + 1,
    sessionId: entry.sessionId ?? entry.sesion_clase_id ?? entry.scope?.sesion_clase_id ?? null,
    studentId: entry.studentId ?? entry.estudiante_id ?? entry.id_estudiante ?? entry.estudianteId ?? null,
    studentName,
    name: studentName,
    score,
    points: score,
    hits: entry.hits ?? entry.aciertos ?? entry.aciertos_totales ?? 0,
    errors: entry.errors ?? entry.errores ?? entry.errores_totales ?? 0,
    combo: entry.combo ?? entry.combo_maximo ?? null,
    stars: entry.stars ?? entry.estrellas ?? entry.estrellas_obtenidas ?? entry.estrellas_totales ?? null,
    finishedSessions: entry.finishedSessions ?? entry.sesiones_finalizadas ?? 0,
    isCurrentStudent: Boolean(entry.isCurrentStudent ?? entry.es_estudiante_actual ?? entry.actual ?? entry.es_mi_posicion),
    avatar: entry.avatar ?? entry.profile?.avatar ?? null,
    avatarColor: entry.avatarColor ?? entry.avatar_color ?? entry.color_avatar ?? null,
    photoURL: entry.photoURL ?? null,
    photo: entry.photo ?? null,
    image: entry.image ?? null,
    profileImage: entry.profileImage ?? null,
    imagenPerfil: entry.imagenPerfil ?? null,
    avatarUrl:
      entry.avatarUrl ??
      entry.avatar_url ??
      entry.profile?.avatarUrl ??
      entry.profile?.avatar_url ??
      null,
    profile: entry.profile ?? {},
    raw: entry,
  };
};

export const normalizeSessionRanking = (payload = {}) => {
  const entries = resolveRankingEntries(payload);
  const currentStudent = payload.currentStudent ?? payload.estudiante_actual ?? payload.mi_posicion ?? null;
  const current = currentStudent
    ? normalizeRankingEntry({ ...currentStudent, isCurrentStudent: true })
    : null;
  const normalizedEntries = entries.map((entry, index) => {
    const normalized = normalizeRankingEntry(entry, index);
    return current?.studentId && normalized.studentId === current.studentId
      ? { ...normalized, isCurrentStudent: true }
      : normalized;
  });
  const top = normalizedEntries.slice(0, 3);
  const currentIsInEntries = current
    ? normalizedEntries.some((entry) => entry.studentId === current.studentId)
    : true;

  return {
    status: payload.status ?? payload.estado ?? null,
    scope: payload.scope ?? null,
    metric: payload.metrica ?? null,
    totalParticipants: payload.total_participantes ?? payload.totalParticipants ?? top.length,
    top,
    currentStudent: current,
    entries: current && !currentIsInEntries ? [...normalizedEntries, current] : normalizedEntries,
    raw: payload,
  };
};

export const fetchMyRanking = async ({ baseUrl, token }) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);
  const response = await fetch(`${apiBaseUrl}${STUDENT_RANKING_PATH}`, {
    method: 'GET',
    headers: buildJsonHeaders(token),
  });

  return normalizeSessionRanking(await parseJsonResponse(response));
};

export const buildSessionRanking = ({ sessionId, results = [], currentStudent = null }) => {
  const sessionResults = results
    .filter((result) => {
      if (!sessionId) return false;
      return result.sessionId === sessionId && COMPLETED_RESULT_STATES.has(result.status);
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if ((right.stars ?? 0) !== (left.stars ?? 0)) return (right.stars ?? 0) - (left.stars ?? 0);
      return new Date(left.finishedAt ?? 0).getTime() - new Date(right.finishedAt ?? 0).getTime();
    });

  return sessionResults.map((result, index) =>
    normalizeRankingEntry({
      position: index + 1,
      resultId: result.id,
      sessionId: result.sessionId,
      studentId: result.studentId ?? currentStudent?.id ?? currentStudent?.estudiante_id ?? null,
      studentName: result.studentName ?? currentStudent?.nombre ?? currentStudent?.name ?? null,
      game: result.game,
      score: result.score,
      stars: result.stars,
      finishedAt: result.finishedAt,
      isCurrentStudent: true,
    }, index),
  );
};

export const createRankingService = (baseUrl, token) => ({
  buildSessionRanking,
  normalizeSessionRanking,
  fetchMyRanking: () => fetchMyRanking({ baseUrl, token }),
});
