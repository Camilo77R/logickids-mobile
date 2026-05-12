import {
  CODIGO_ESTELAR_SLUG,
  DEFAULT_DIFFICULTY,
} from '../codigoEstelar.constants';

const buildJsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const normalizeBaseUrl = (baseUrl) => baseUrl.trim().replace(/\/+$/, '');

const parseJsonResponse = async (response) => {
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const message = json?.message ?? `Fallo HTTP ${response.status}`;
    throw new Error(message);
  }

  return json.data;
};

/**
 * Cliente HTTP de Codigo Estelar.
 *
 * POR QUE:
 * la pantalla no debe saber URLs ni headers; solo pedir "login", "iniciar" o
 * "finalizar" como acciones de negocio.
 */
export const createCodigoEstelarApi = (baseUrl) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);

  return {
    async loginStudent(qrToken) {
      const response = await fetch(`${apiBaseUrl}/estudiantes/login`, {
        method: 'POST',
        headers: buildJsonHeaders(),
        body: JSON.stringify({ qr_token: qrToken.trim() }),
      });

      return parseJsonResponse(response);
    },

    async resolveMinigameBySlug(slug = CODIGO_ESTELAR_SLUG) {
      const response = await fetch(`${apiBaseUrl}/minijuegos`, {
        method: 'GET',
        headers: buildJsonHeaders(),
      });

      const data = await parseJsonResponse(response);
      const minigame = data.find((item) => item.slug === slug);

      if (!minigame) {
        throw new Error(`No existe el minijuego ${slug} en el backend.`);
      }

      return minigame;
    },

    async startSession(studentToken, { minijuegoId, dificultad = DEFAULT_DIFFICULTY }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/iniciar`, {
        method: 'POST',
        headers: buildJsonHeaders(studentToken),
        body: JSON.stringify({
          minijuego_id: minijuegoId,
          dificultad,
        }),
      });

      return parseJsonResponse(response);
    },

    async finalizeSession(studentToken, sesionId, estado = 'completado') {
      const response = await fetch(`${apiBaseUrl}/sesiones/${sesionId}/finalizar`, {
        method: 'POST',
        headers: buildJsonHeaders(studentToken),
        body: JSON.stringify({ estado }),
      });

      return parseJsonResponse(response);
    },
  };
};
