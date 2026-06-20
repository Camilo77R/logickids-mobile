const EMPTY_PROGRESS_SUMMARY = {
  skillsTracked: 0,
  totalAttempts: 0,
  averagePrecision: null,
  bestSkill: null,
};

const EMPTY_RANKING_VIEW = {
  hasRanking: false,
  headline: 'Ranking del grupo',
  subtitle: 'Se actualiza con resultados oficiales del backend.',
  scopeLabel: 'Tu grupo',
  status: 'waiting',
  statusLabel: 'Esperando clase',
  totalParticipantsLabel: '0 participantes',
  top3: [],
  rest: [],
  myPosition: null,
  emptyMessage: 'Tu tutor debe abrir una sesion de clase para mostrar posiciones.',
};

const toSafeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const resolvePerformanceTone = (precision) => {
  if (precision >= 85) {
    return {
      label: 'Muy fuerte',
      accent: '#37d79f',
    };
  }

  if (precision >= 60) {
    return {
      label: 'Va bien',
      accent: '#ffbf5b',
    };
  }

  return {
    label: 'Para practicar',
    accent: '#ff7e72',
  };
};

const resolveRankingHeadline = (scope = {}) => {
  if (scope.sesion_ruta_nombre) {
    return scope.sesion_ruta_nombre;
  }

  if (scope.sesion_minijuego_titulo) {
    return scope.sesion_minijuego_titulo;
  }

  return 'Tu grupo';
};

const resolveRankingStatus = (ranking) => {
  if (!ranking?.scope?.sesion_clase_id) {
    return {
      status: 'waiting',
      label: 'Esperando clase',
      subtitle: 'Aparece cuando tu tutor abre una sesion de clase.',
      emptyMessage: 'Tu tutor debe abrir una sesion de clase para mostrar posiciones.',
    };
  }

  const totalParticipants = Number(ranking?.totalParticipants ?? ranking?.total_participantes ?? 0);
  const sessionStatus = ranking?.status ?? ranking?.scope?.sesion_estado ?? null;

  if (!totalParticipants) {
    if (sessionStatus === 'activa') {
      return {
        status: 'live',
        label: 'En vivo',
        subtitle: 'La clase ya abrio. El podio aparecera cuando lleguen resultados.',
        emptyMessage: 'Cuando tu grupo registre resultados oficiales, veras el podio aqui.',
      };
    }

    return {
      status: 'final',
      label: 'Ultima sesion',
      subtitle: 'Todavia no hay puntajes oficiales para esta sesion.',
      emptyMessage: 'Aun no hay resultados oficiales acumulados para mostrar.',
    };
  }

  if (sessionStatus === 'activa') {
    return {
      status: 'live',
      label: 'En vivo',
      subtitle: 'Se actualiza en tiempo real cuando cambian los resultados.',
      emptyMessage: '',
    };
  }

  return {
    status: 'final',
    label: 'Ultima sesion',
    subtitle: 'Estas viendo los resultados oficiales mas recientes de tu grupo.',
    emptyMessage: '',
  };
};

export const buildStudentInitials = (value = '') => {
  const safeValue = String(value).trim();
  if (!safeValue) {
    return '';
  }

  const tokens = safeValue
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return '';
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0][0] ?? ''}${tokens[1][0] ?? ''}`.toUpperCase();
};

export const buildProgressSummary = (stats = []) => {
  if (!stats.length) {
    return EMPTY_PROGRESS_SUMMARY;
  }

  const totals = stats.reduce(
    (acc, stat) => {
      acc.totalAttempts += toSafeNumber(stat.total_intentos);
      acc.precisionSum += toSafeNumber(stat.precision_pct);
      return acc;
    },
    { totalAttempts: 0, precisionSum: 0 }
  );

  const bestSkill = stats.reduce((best, current) => {
    if (!best) return current;
    return toSafeNumber(current.precision_pct) > toSafeNumber(best.precision_pct) ? current : best;
  }, null);

  return {
    skillsTracked: stats.length,
    totalAttempts: totals.totalAttempts,
    averagePrecision: Math.round(totals.precisionSum / stats.length),
    bestSkill: bestSkill
      ? {
          name: bestSkill.habilidad,
          precision: Math.round(toSafeNumber(bestSkill.precision_pct)),
        }
      : null,
  };
};

export const buildSkillStatsView = (stats = []) => {
  if (!stats.length) {
    return {
      hasStats: false,
      strongestSkill: null,
      needsPracticeSkill: null,
      entries: [],
    };
  }

  const entries = [...stats]
    .map((stat) => {
      const precision = Math.round(toSafeNumber(stat.precision_pct));
      const attempts = toSafeNumber(stat.total_intentos);
      const averageReaction = stat.promedio_reaccion_ms == null
        ? null
        : Math.round(toSafeNumber(stat.promedio_reaccion_ms));
      const tone = resolvePerformanceTone(precision);

      return {
        id: stat.id,
        skillName: stat.habilidad,
        skillDescription: stat.habilidad_descripcion,
        precision,
        precisionLabel: `${precision}%`,
        attemptsLabel: `${attempts} intentos`,
        reactionLabel: averageReaction == null ? 'Sin tiempo medido' : `${averageReaction} ms`,
        tone,
      };
    })
    .sort((left, right) => right.precision - left.precision);

  const strongestSkill = entries[0] ?? null;
  const needsPracticeSkill = entries.at(-1) ?? null;

  return {
    hasStats: true,
    strongestSkill,
    needsPracticeSkill,
    entries,
  };
};

export const buildRankingView = (ranking) => {
  const status = resolveRankingStatus(ranking);
  const totalParticipants = Number(ranking?.totalParticipants ?? ranking?.total_participantes ?? 0);
  const topEntries = ranking?.top ?? ranking?.top3 ?? [];
  const allEntries = ranking?.entries ?? ranking?.resto ?? [];
  const currentStudent = ranking?.currentStudent ?? ranking?.mi_posicion ?? null;

  return {
    ...EMPTY_RANKING_VIEW,
    hasRanking: totalParticipants > 0 && topEntries.length > 0,
    headline: 'Ranking del grupo',
    subtitle: status.subtitle,
    scopeLabel: resolveRankingHeadline(ranking?.scope),
    status: status.status,
    statusLabel: status.label,
    totalParticipantsLabel: `${totalParticipants} participante${totalParticipants === 1 ? '' : 's'}`,
    top3: topEntries,
    rest: ranking?.rest ?? allEntries.slice(topEntries.length),
    myPosition: currentStudent,
    emptyMessage: status.emptyMessage,
  };
};
