import {
  STUDENT_ACHIEVEMENTS_PATH,
  STUDENT_PROFILE_PATH,
  STUDENT_RANKING_PATH,
  STUDENT_STATS_PATH,
} from '../config/apiContract';
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

  const unwrapRequiredResult = (result, fallbackMessage) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    if (result.reason instanceof Error) {
      throw result.reason;
    }

    throw new Error(fallbackMessage);
  };

  const fetchProfile = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_PROFILE_PATH}`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  const fetchAchievements = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_ACHIEVEMENTS_PATH}`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  const fetchStats = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_STATS_PATH}`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  const fetchRanking = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_RANKING_PATH}`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  return {
    fetchProfile,
    fetchAchievements,
    fetchRanking,
    fetchStats,

    async fetchDashboardData() {
      const [profileResult, achievementsResult, statsResult, rankingResult] = await Promise.allSettled([
        fetchProfile(),
        fetchAchievements(),
        fetchStats(),
        fetchRanking(),
      ]);

      const profile = unwrapRequiredResult(profileResult, 'No pudimos cargar tu perfil.');
      const achievements = unwrapRequiredResult(
        achievementsResult,
        'No pudimos cargar tus logros.',
      );
      const stats = unwrapRequiredResult(statsResult, 'No pudimos cargar tu progreso.');
      const ranking = rankingResult.status === 'fulfilled' ? rankingResult.value : null;

      return { profile, achievements, stats, ranking };
    },
  };
};
