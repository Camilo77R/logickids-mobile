import {
  QR_LOGIN_PATH,
  STUDENT_DEVICE_SESSION_PATH,
  STUDENT_PROFILE_PATH,
} from '../config/apiContract';
import {
  buildJsonHeaders,
  createNetworkError,
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
    async loginByQr(
      qrToken,
      { installationId, appVersion, deviceConflictStrategy } = {},
    ) {
      const endpoint = `${apiBaseUrl}${QR_LOGIN_PATH}`;
      let response;

      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: buildJsonHeaders(),
          body: JSON.stringify({
            qr_token: qrToken.trim(),
            installation_id: installationId,
            app_version: appVersion,
            device_conflict_strategy: deviceConflictStrategy,
          }),
        });
      } catch (error) {
        throw createNetworkError(
          'No pudimos conectar con el colegio. Revisa tu conexion e intentalo de nuevo.',
          error,
        );
      }

      return parseJsonResponse(response);
    },

    async fetchProfile(token) {
      let response;

      try {
        response = await fetch(`${apiBaseUrl}${STUDENT_PROFILE_PATH}`, {
          headers: buildJsonHeaders(token),
        });
      } catch (error) {
        throw createNetworkError(
          'No pudimos verificar tu sesion. Revisa tu conexion e intentalo de nuevo.',
          error,
        );
      }

      return parseJsonResponse(response);
    },

    async logout(token) {
      let response;

      try {
        response = await fetch(`${apiBaseUrl}${STUDENT_DEVICE_SESSION_PATH}`, {
          method: 'DELETE',
          headers: buildJsonHeaders(token),
        });
      } catch (error) {
        throw createNetworkError(
          'Necesitamos conexion para cerrar la sesion de forma segura.',
          error,
        );
      }

      return parseJsonResponse(response);
    },
  };
};
