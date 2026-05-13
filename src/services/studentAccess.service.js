import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';

/**
 * Servicio de acceso del estudiante.
 *
 * POR QUE:
 * - la pantalla no debe saber endpoints ni parsear respuestas
 * - HU-41 solo necesita "validar QR y entrar"
 * - deja la regla de negocio de acceso en una sola puerta
 */
export const createStudentAccessService = (baseUrl) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);

  return {
    async loginByQr(qrToken) {
      const response = await fetch(`${apiBaseUrl}/estudiantes/login`, {
        method: 'POST',
        headers: buildJsonHeaders(),
        body: JSON.stringify({ qr_token: qrToken.trim() }),
      });

      return parseJsonResponse(response);
    },
  };
};
