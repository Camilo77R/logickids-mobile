import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';

/**
 * Servicio del dashboard del estudiante.
 *
 * POR QUE:
 * - la pantalla no debe conocer endpoints ni headers
 * - HU-42 necesita juntar perfil, logros y progreso
 * - cada request queda centralizado en una sola capa HTTP
 */
export const createStudentDashboardService = (baseUrl, token) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);
  const headers = buildJsonHeaders(token);

  const fetchProfile = async () => {
    const response = await fetch(`${apiBaseUrl}/estudiantes/mi-perfil`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  const fetchAchievements = async () => {
    const response = await fetch(`${apiBaseUrl}/logros/mis-logros`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  const fetchStats = async () => {
    const response = await fetch(`${apiBaseUrl}/estadisticas/mis-estadisticas`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  return {
    fetchProfile,
    fetchAchievements,
    fetchStats,

    async fetchDashboardData() {
      const [profile, achievements, stats] = await Promise.all([
        fetchProfile(),
        fetchAchievements(),
        fetchStats(),
      ]);

      return { profile, achievements, stats };
    },
  };
};
