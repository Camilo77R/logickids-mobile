import { STUDENT_STATS_PATH } from '../config/apiContract';
import {
  buildJsonHeaders,
  normalizeBaseUrl,
  parseJsonResponse,
} from './http.service';

const toSafeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const normalizeSkill = (skill = {}) => {
  const precision = Math.round(toSafeNumber(skill.precision_pct));
  const attempts = toSafeNumber(skill.total_intentos);
  const averageReaction = skill.promedio_reaccion_ms == null
    ? null
    : Math.round(toSafeNumber(skill.promedio_reaccion_ms));

  return {
    id: skill.id ?? skill.habilidad_id ?? skill.id_habilidad ?? skill.habilidad,
    name: skill.habilidad ?? skill.nombre ?? skill.name ?? 'Habilidad',
    description: skill.habilidad_descripcion ?? skill.descripcion ?? null,
    attempts,
    hits: toSafeNumber(skill.aciertos),
    errors: toSafeNumber(skill.errores),
    precision,
    precisionLabel: `${precision}%`,
    averageReactionMs: averageReaction,
    reactionLabel: averageReaction == null ? 'Sin tiempo medido' : `${averageReaction} ms`,
    raw: skill,
  };
};

export const createSkillService = (baseUrl, token) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);
  const headers = buildJsonHeaders(token);

  const fetchMySkills = async () => {
    const response = await fetch(`${apiBaseUrl}${STUDENT_STATS_PATH}`, {
      method: 'GET',
      headers,
    });

    const skills = await parseJsonResponse(response);
    return Array.isArray(skills) ? skills.map(normalizeSkill) : [];
  };

  return {
    fetchMySkills,
  };
};
