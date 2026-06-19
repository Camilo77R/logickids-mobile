import { STUDENT_SESSIONS_PATH } from '../config/apiContract';
import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';
import { normalizeGame } from './game.service';

export const normalizeResult = (result = {}) => ({
  id: result.id ?? null,
  sessionId: result.sesion_clase_id ?? null,
  gameSessionId: result.id ?? null,
  studentId: result.estudiante_id ?? result.id_estudiante ?? result.studentId ?? null,
  studentName: result.estudiante_nombre ?? result.nombre_estudiante ?? result.studentName ?? result.nombre ?? null,
  game: normalizeGame(result),
  status: result.estado ?? null,
  score: result.puntaje ?? 0,
  hits: result.aciertos ?? 0,
  errors: result.errores ?? 0,
  maxCombo: result.combo_maximo ?? 0,
  stars: result.estrellas_obtenidas ?? null,
  difficulty: result.dificultad ?? null,
  routeOrder: result.orden_en_ruta ?? null,
  startedAt: result.iniciada_en ?? null,
  finishedAt: result.finalizada_en ?? null,
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
    return Array.isArray(results) ? results.map(normalizeResult) : [];
  };

  return {
    fetchMyResults,
  };
};
