// sesiones.service.js — registra el resultado de cada ronda en el backend
// Responsabilidad única: comunicación HTTP con la API de LogicKids.
// El juego y la pantalla NO saben que esto existe — lo llama solo el hook.

const API_BASE_URL = 'https://tu-backend-logickids.com/api'; // ← cambiar por URL real

export const sesionesService = {
  /**
   * Registra el resultado de una ronda en el backend.
   * @param {Object} resultados - Resultado del juego enviado por el WebView
   */
  registrarSesion: async (resultados) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sesiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          juego_id:                    'cazador-estrellas',
          puntaje:                      resultados.puntaje,
          aciertos:                     resultados.aciertos,
          errores:                      resultados.errores,
          omisiones:                    resultados.omisiones,
          tiempo_reaccion_promedio_ms:  resultados.tiempo_reaccion_promedio_ms,
          eventos:                      resultados.eventos,
          timestamp:                    new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.warn('[sesionesService] El backend respondió con error:', response.status);
      }

      return await response.json();
    } catch (error) {
      // Sin backend activo → solo log, no crashea la app
      console.warn('[sesionesService] No se pudo registrar la sesión:', error.message);
    }
  },
};
