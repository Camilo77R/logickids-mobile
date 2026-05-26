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
      const endpoint = `${apiBaseUrl}/estudiantes/login`;
      let response;

      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: buildJsonHeaders(),
          body: JSON.stringify({ qr_token: qrToken.trim() }),
        });
      } catch (error) {
        throw new Error(
          `No se pudo conectar con ${endpoint}. Verifica la IP, el puerto 3000 y que el backend esté encendido en la misma red.`
        );
      }

      return parseJsonResponse(response);
    },
  };
};
