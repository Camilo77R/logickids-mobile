import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from '../../../services/http.service';

const construirHeadersJson = buildJsonHeaders;

/**
 * Cliente genérico de sesiones de juego basado en el contrato real del backend.
 *
 * NOTA:
 * hoy no lo conectamos todavía al login porque ese frente lo lleva otra
 * persona, pero el contrato ya queda listo para que todos los juegos hablen
 * igual.
 */
export const crearClienteSesionesJuego = (baseUrl) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);

  return {
    async iniciarSesion({
      tokenEstudiante,
      minijuegoId,
      dificultad,
      modoDificultad,
      attemptId,
    }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/iniciar`, {
        method: 'POST',
        headers: construirHeadersJson(tokenEstudiante),
        body: JSON.stringify({
          minijuego_id: minijuegoId,
          attempt_id: attemptId,
          ...(modoDificultad ? { modo_dificultad: modoDificultad } : {}),
          ...(dificultad != null ? { dificultad } : {}),
        }),
      });

      return parseJsonResponse(response);
    },

    async registrarEvento({ tokenEstudiante, sesionId, evento }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/${sesionId}/eventos`, {
        method: 'POST',
        headers: construirHeadersJson(tokenEstudiante),
        body: JSON.stringify(evento),
      });

      return parseJsonResponse(response);
    },

    async finalizarSesion({ tokenEstudiante, sesionId, finalizacion }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/${sesionId}/finalizar`, {
        method: 'POST',
        headers: construirHeadersJson(tokenEstudiante),
        body: JSON.stringify(finalizacion),
      });

      return parseJsonResponse(response);
    },

    async obtenerCheckpoint({ tokenEstudiante, sesionId }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/${sesionId}/checkpoint`, {
        headers: construirHeadersJson(tokenEstudiante),
      });

      const data = await parseJsonResponse(response);
      return {
        checkpoint: data?.state ?? {},
        revision: Number(data?.version) || 0,
        updatedAt: data?.updated_at ?? null,
      };
    },

    async guardarCheckpoint({ tokenEstudiante, sesionId, revision, checkpoint }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/${sesionId}/checkpoint`, {
        method: 'PUT',
        headers: construirHeadersJson(tokenEstudiante),
        body: JSON.stringify({
          expected_version: revision,
          state: checkpoint,
        }),
      });

      const data = await parseJsonResponse(response);
      return {
        checkpoint: data?.state ?? {},
        revision: Number(data?.version) || 0,
        updatedAt: data?.updated_at ?? null,
      };
    },
  };
};
