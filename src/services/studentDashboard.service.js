import { STUDENT_ACHIEVEMENTS_PATH } from '../config/apiContract';
import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';
import { createGameService } from './game.service';
import { createRankingService } from './ranking.service';
import { createResultService } from './result.service';
import { buildDashboardSessionState, createSessionService } from './session.service';
import { createSkillService } from './skill.service';

const unwrapRequiredResult = (result, fallbackMessage) => {
  if (result.status === 'fulfilled') {
    return result.value;
  }

  if (result.reason instanceof Error) {
    throw result.reason;
  }

  throw new Error(fallbackMessage);
};

const buildDashboardStats = (skills = []) =>
  skills.map((skill) => skill.raw).filter(Boolean);

const getProfileStudentId = (profile = {}) =>
  profile.id ?? profile.estudiante_id ?? profile.id_estudiante ?? profile.studentId ?? null;

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
  const sessionService = createSessionService(apiBaseUrl, token);
  const gameService = createGameService(apiBaseUrl, token);
  const resultService = createResultService(apiBaseUrl, token);
  const skillService = createSkillService(apiBaseUrl, token);
  const rankingService = createRankingService(apiBaseUrl, token);

  const fetchAchievements = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_ACHIEVEMENTS_PATH}`, {
      method: 'GET',
      headers,
    });

    return parseJsonResponse(response);
  };

  return {
    fetchProfile: sessionService.fetchProfile,
    fetchAchievements,
    fetchGames: gameService.fetchCatalog,
    fetchResults: resultService.fetchMyResults,
    fetchSkills: skillService.fetchMySkills,
    fetchRanking: rankingService.fetchMyRanking,
    fetchStats: async () => buildDashboardStats(await skillService.fetchMySkills()),

    async fetchDashboardData() {
      const [
        profileResult,
        achievementsResult,
        gamesResult,
        resultsResult,
        skillsResult,
        rankingResult,
      ] = await Promise.allSettled([
        sessionService.fetchProfile(),
        fetchAchievements(),
        gameService.fetchCatalog(),
        resultService.fetchMyResults(),
        skillService.fetchMySkills(),
        rankingService.fetchMyRanking(),
      ]);

      const profile = unwrapRequiredResult(profileResult, 'No pudimos cargar tu perfil.');
      const achievements = achievementsResult.status === 'fulfilled'
        ? achievementsResult.value
        : [];
      const games = unwrapRequiredResult(gamesResult, 'No pudimos cargar tus juegos asignados.');
      const initialResults = unwrapRequiredResult(
        resultsResult,
        'No pudimos cargar tu historial de sesiones.',
      );
      const studentHistoryResults = await resultService
        .fetchByStudentId(getProfileStudentId(profile))
        .catch(() => []);
      const results = studentHistoryResults.length > initialResults.length
        ? studentHistoryResults
        : initialResults;
      const skills = unwrapRequiredResult(skillsResult, 'No pudimos cargar tu progreso.');
      const rankingSummary = rankingResult.status === 'fulfilled' ? rankingResult.value : null;
      const history = results
        .map((result) => ({
          ...(result.raw ?? {}),
          sesion_clase_id: result.raw?.sesion_clase_id ?? result.sessionId,
          minijuego_id: result.raw?.minijuego_id ?? result.game?.id,
          minijuego_slug: result.raw?.minijuego_slug ?? result.game?.slug,
          minijuego_titulo: result.raw?.minijuego_titulo ?? result.game?.title,
          habilidad: result.raw?.habilidad ?? result.game?.skillName,
          estado: result.raw?.estado ?? result.status,
          aciertos: result.raw?.aciertos ?? result.hits,
          errores: result.raw?.errores ?? result.errors,
          iniciada_en: result.raw?.iniciada_en ?? result.startedAt,
          finalizada_en: result.raw?.finalizada_en ?? result.finishedAt,
        }))
        .filter(Boolean);
      const sessionState = buildDashboardSessionState({ profile, history, games });
      const activeSessionRanking = rankingService.buildSessionRanking({
        sessionId: sessionState.activeSession?.id,
        results,
        currentStudent: profile,
      });
      const ranking = rankingSummary?.entries?.length ? rankingSummary.entries : activeSessionRanking;

      return {
        profile,
        achievements,
        games,
        results,
        skills,
        ranking,
        rankingSummary,
        sessionState,
        stats: buildDashboardStats(skills),
      };
    },
  };
};
