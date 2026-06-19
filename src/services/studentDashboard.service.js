import {
  STUDENT_ACHIEVEMENTS_PATH,
} from '../config/apiContract';
import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';
import { createGameService } from './game.service';
import { createRankingService } from './ranking.service';
import { createResultService } from './result.service';
import { buildStudentSessionState, createSessionService } from './session.service';
import { createSkillService } from './skill.service';

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

    async fetchDashboardData() {
      const [profile, achievements, games, results, skills, backendRanking] = await Promise.all([
        sessionService.fetchProfile(),
        fetchAchievements(),
        gameService.fetchCatalog(),
        resultService.fetchMyResults(),
        skillService.fetchMySkills(),
        rankingService.fetchMyRanking().catch(() => null),
      ]);
      const history = results.map((result) => result.raw).filter(Boolean);
      const sessionState = buildStudentSessionState({ profile, history });
      const gamesBySlug = new Map(games.map((game) => [game.slug, game]));
      const assignedGames = sessionState.assignedGames.map((game) => ({
        ...(gamesBySlug.get(game.slug) ?? {}),
        ...game,
        skillName: game.skillName ?? gamesBySlug.get(game.slug)?.skillName ?? null,
        skillDescription: game.skillDescription ?? gamesBySlug.get(game.slug)?.skillDescription ?? null,
      }));
      const enrichedSessionState = {
        ...sessionState,
        assignedGames,
        activeSession: sessionState.activeSession
          ? {
              ...sessionState.activeSession,
              assignedGames,
            }
          : null,
      };
      const activeSessionRanking = rankingService.buildSessionRanking({
        sessionId: enrichedSessionState.activeSession?.id,
        results,
        currentStudent: profile,
      });
      const ranking = backendRanking?.entries?.length
        ? backendRanking.entries
        : activeSessionRanking;

      return {
        profile,
        achievements,
        games,
        results,
        skills,
        ranking,
        rankingSummary: backendRanking,
        sessionState: enrichedSessionState,
        stats: skills.map((skill) => skill.raw).filter(Boolean),
      };
    },
  };
};
