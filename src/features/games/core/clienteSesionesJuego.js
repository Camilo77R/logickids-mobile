const construirHeadersJson = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const normalizarBaseUrl = (baseUrl) => baseUrl.trim().replace(/\/+$/, '');

const parsearRespuesta = async (response) => {
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    throw new Error(json?.message ?? `Fallo HTTP ${response.status}`);
  }

  return json.data;
};

/**
 * Cliente genérico de sesiones de juego basado en el contrato real del backend.
 *
 * NOTA:
 * hoy no lo conectamos todavía al login porque ese frente lo lleva otra
 * persona, pero el contrato ya queda listo para que todos los juegos hablen
 * igual.
 */
export const crearClienteSesionesJuego = (baseUrl) => {
  const apiBaseUrl = normalizarBaseUrl(baseUrl);

  return {
    async iniciarSesion({ tokenEstudiante, minijuegoId, dificultad }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/iniciar`, {
        method: 'POST',
        headers: construirHeadersJson(tokenEstudiante),
        body: JSON.stringify({
          minijuego_id: minijuegoId,
          ...(dificultad != null ? { dificultad } : {}),
        }),
      });

      return parsearRespuesta(response);
    },

    async registrarEvento({ tokenEstudiante, sesionId, evento }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/${sesionId}/eventos`, {
        method: 'POST',
        headers: construirHeadersJson(tokenEstudiante),
        body: JSON.stringify(evento),
      });

      return parsearRespuesta(response);
    },

    async finalizarSesion({ tokenEstudiante, sesionId, finalizacion }) {
      const response = await fetch(`${apiBaseUrl}/sesiones/${sesionId}/finalizar`, {
        method: 'POST',
        headers: construirHeadersJson(tokenEstudiante),
        body: JSON.stringify(finalizacion),
      });

      return parsearRespuesta(response);
    },
  };
};
