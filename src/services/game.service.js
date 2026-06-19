import { GAMES_CATALOG_PATH } from '../config/apiContract';
import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';

export const normalizeGame = (game = {}) => ({
  id: game.id ?? game.id_minijuego ?? game.minijuego_id ?? null,
  slug: game.slug ?? game.minijuego_slug ?? null,
  title: game.titulo ?? game.title ?? game.minijuego ?? game.minijuego_titulo ?? 'Juego asignado',
  description: game.descripcion ?? game.description ?? '',
  skillName: game.habilidad ?? game.skillName ?? game.skill_label ?? null,
  skillDescription: game.habilidad_descripcion ?? game.skillDescription ?? null,
  maxDifficulty: game.dificultad_maxima ?? game.maxDifficulty ?? null,
  catalogOrder: game.orden_catalogo ?? game.catalogOrder ?? null,
});

export const createGameService = (baseUrl, token) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);
  const headers = buildJsonHeaders(token);

  const fetchCatalog = async () => {
    const response = await fetch(`${apiBaseUrl}${GAMES_CATALOG_PATH}`, {
      method: 'GET',
      headers,
    });

    const games = await parseJsonResponse(response);
    return Array.isArray(games) ? games.map(normalizeGame) : [];
  };

  return {
    fetchCatalog,
  };
};
