const EMPTY_PROGRESS_SUMMARY = {
  skillsTracked: 0,
  totalAttempts: 0,
  averagePrecision: null,
  bestSkill: null,
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
