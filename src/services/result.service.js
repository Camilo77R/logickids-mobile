import { STUDENT_SESSIONS_PATH } from '../config/apiContract';
import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';
import { normalizeGame } from './game.service';

const unwrapCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.sesiones)) return payload.sesiones;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.resultados)) return payload.resultados;
  return [];
};

export const normalizeResult = (result = {}) => ({
  id: result.id ?? null,
  sessionId: result.sesion_clase_id ?? result.id_sesion_clase ?? result.sesion_id ?? result.sessionId ?? result.id ?? null,
  gameSessionId: result.id ?? null,
  studentId: result.estudiante_id ?? result.id_estudiante ?? result.studentId ?? null,
  studentName: result.estudiante_nombre ?? result.nombre_estudiante ?? result.studentName ?? result.nombre ?? null,
  game: normalizeGame(result),
  status: result.estado ?? result.status ?? null,
  score: result.puntaje ?? result.score ?? 0,
  hits: result.aciertos ?? result.hits ?? result.correctas ?? result.respuestas_correctas ?? 0,
  errors: result.errores ?? result.errors ?? result.incorrectas ?? result.respuestas_incorrectas ?? 0,
  maxCombo: result.combo_maximo ?? 0,
  stars: result.estrellas_obtenidas ?? null,
  difficulty: result.dificultad ?? null,
  routeOrder: result.orden_en_ruta ?? null,
  startedAt: result.iniciada_en ?? result.startedAt ?? result.fecha_inicio ?? null,
  finishedAt: result.finalizada_en ?? result.finishedAt ?? result.fecha_fin ?? result.created_at ?? null,
  raw: result,
});

export const createResultService = (baseUrl, token) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);
  const headers = buildJsonHeaders(token);

  const fetchMyResults = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_SESSIONS_PATH}`, {
      method: 'GET',
      headers,
    });

    const results = await parseJsonResponse(response);
    return unwrapCollection(results).map(normalizeResult);
  };

  const fetchByStudentId = async (studentId) => {
    if (!studentId) {
      return [];
    }

    const response = await fetch(`${apiBaseUrl}/sesiones/estudiante/${studentId}`, {
      method: 'GET',
      headers,
    });

    const results = await parseJsonResponse(response);
    return unwrapCollection(results).map(normalizeResult);
  };

  return {
    fetchByStudentId,
    fetchMyResults,
  };
};
