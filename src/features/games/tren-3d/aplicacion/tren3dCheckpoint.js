import { ESTADOS_TREN_3D } from '../tren3d.constants';

export const TREN_3D_CHECKPOINT_VERSION = 1;

const VALID_PHASES = new Set(Object.values(ESTADOS_TREN_3D));
const VALID_FINAL_STATES = new Set(['completado', 'abandonado']);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asNonNegativeInteger = (value) => Math.max(0, Math.trunc(Number(value) || 0));

const asPositiveInteger = (value, fallback = 1) => {
  const normalized = Math.trunc(Number(value));
  return normalized > 0 ? normalized : fallback;
};

const asFiniteNumber = (value, fallback = 0) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

const normalizeText = (value) => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const normalizePatternStep = (step, fallbackPosition) => {
  if (!isPlainObject(step)) {
    return null;
  }

  const figuraId = normalizeText(step.figuraId);
  const figuraLabel = normalizeText(step.figuraLabel);
  const colorId = normalizeText(step.colorId);
  const colorLabel = normalizeText(step.colorLabel);
  const clave = normalizeText(step.clave);
  const colorHex = normalizeText(step.colorHex);

  if (
    !figuraId ||
    !figuraLabel ||
    !colorId ||
    !colorLabel ||
    !clave ||
    !colorHex ||
    !HEX_COLOR_PATTERN.test(colorHex)
  ) {
    return null;
  }

  return {
    figuraId,
    figuraLabel,
    colorId,
    colorLabel,
    colorHex,
    clave,
    posicion: asNonNegativeInteger(step.posicion ?? fallbackPosition),
  };
};

const normalizePattern = (pattern) => {
  if (!Array.isArray(pattern) || pattern.length === 0 || pattern.length > 20) {
    return null;
  }

  const normalized = pattern.map(normalizePatternStep);
  return normalized.every(Boolean) ? normalized : null;
};

const normalizeSolvedWagons = (value, patternLength) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value
    .map(asNonNegativeInteger)
    .filter((index) => index < patternLength))]
    .sort((left, right) => left - right);
};

const normalizeStats = (stats = {}) => ({
  aciertos: asNonNegativeInteger(stats.aciertos),
  errores: asNonNegativeInteger(stats.errores),
  comboActual: asNonNegativeInteger(stats.comboActual),
  comboMaximo: asNonNegativeInteger(stats.comboMaximo),
  tiempoMs: asNonNegativeInteger(stats.tiempoMs ?? stats.tiempoTotalMs),
});

const normalizeFinalization = (value) => {
  if (!isPlainObject(value)) {
    return null;
  }

  const estado = normalizeText(value.estado);
  const finalizationId = normalizeText(value.finalization_id);

  if (!VALID_FINAL_STATES.has(estado) || !finalizationId) {
    return null;
  }

  return {
    puntaje: asNonNegativeInteger(value.puntaje),
    aciertos: asNonNegativeInteger(value.aciertos),
    errores: asNonNegativeInteger(value.errores),
    combo_maximo: asNonNegativeInteger(value.combo_maximo),
    dificultad: asPositiveInteger(value.dificultad),
    estado,
    finalization_id: finalizationId,
  };
};

const normalizePendingLevel = (value) => {
  if (!isPlainObject(value) || !isPlainObject(value.parametros)) {
    return null;
  }

  const patron = normalizePattern(value.parametros.patron);
  if (!patron) {
    return null;
  }

  return {
    siguienteNivel: asPositiveInteger(value.siguienteNivel),
    dificultad: asPositiveInteger(value.dificultad),
    parametros: {
      dificultad: asPositiveInteger(value.parametros.dificultad),
      velocidadTren: Math.max(0.1, asFiniteNumber(value.parametros.velocidadTren, 1)),
      patron,
    },
    resumen: {
      nivelCompletado: asPositiveInteger(value.resumen?.nivelCompletado),
      aciertos: asNonNegativeInteger(value.resumen?.aciertos),
      errores: asNonNegativeInteger(value.resumen?.errores),
      comboMaximo: asNonNegativeInteger(value.resumen?.comboMaximo),
      precisionPct: Math.min(100, Math.max(0, asFiniteNumber(value.resumen?.precisionPct))),
      descripcion: normalizeText(value.resumen?.descripcion) ?? 'Siguiente nivel listo.',
    },
  };
};

export const createTren3DCheckpointState = ({
  accumulatedStats,
  currentLevelStats,
  elapsedSessionMs,
  gameState,
  pendingFinalization = null,
  pendingLevel = null,
}) => {
  if (!isPlainObject(gameState)) {
    throw new Error('Tren de Figuras requiere un estado logico para guardar progreso.');
  }

  const patronActual = normalizePattern(gameState.patronActual);
  if (!patronActual) {
    throw new Error('El patron del checkpoint de Tren de Figuras no es valido.');
  }

  const fase = VALID_PHASES.has(gameState.fase)
    ? gameState.fase
    : ESTADOS_TREN_3D.jugando;
  const siguienteNivelPendiente = normalizePendingLevel(pendingLevel);
  const finalizacionPendiente = normalizeFinalization(pendingFinalization);

  if (fase === ESTADOS_TREN_3D.transicionNivel && !siguienteNivelPendiente) {
    throw new Error('La transicion de Tren requiere el siguiente nivel pendiente.');
  }

  if (fase === ESTADOS_TREN_3D.finalizado && !finalizacionPendiente) {
    throw new Error('El cierre de Tren requiere una finalizacion pendiente idempotente.');
  }

  return {
    version: TREN_3D_CHECKPOINT_VERSION,
    fase,
    nivel: asPositiveInteger(gameState.nivel),
    dificultad: asPositiveInteger(gameState.dificultad),
    velocidadTren: Math.max(0.1, asFiniteNumber(gameState.velocidadTren, 1)),
    puntaje: asNonNegativeInteger(gameState.puntaje),
    patronActual,
    vagonesResueltos: normalizeSolvedWagons(
      gameState.vagonesResueltos,
      patronActual.length,
    ),
    estadisticasAcumuladas: normalizeStats(accumulatedStats),
    estadisticasNivel: normalizeStats(currentLevelStats),
    tiempoSesionMs: asNonNegativeInteger(elapsedSessionMs),
    siguienteNivelPendiente,
    finalizacionPendiente,
  };
};

export const parseTren3DCheckpointState = (value) => {
  if (
    !isPlainObject(value) ||
    value.version !== TREN_3D_CHECKPOINT_VERSION ||
    !VALID_PHASES.has(value.fase) ||
    !Array.isArray(value.patronActual) ||
    !Array.isArray(value.vagonesResueltos) ||
    !isPlainObject(value.estadisticasAcumuladas) ||
    !isPlainObject(value.estadisticasNivel)
  ) {
    return null;
  }

  try {
    return createTren3DCheckpointState({
      accumulatedStats: value.estadisticasAcumuladas,
      currentLevelStats: value.estadisticasNivel,
      elapsedSessionMs: value.tiempoSesionMs,
      gameState: {
        fase: value.fase,
        nivel: value.nivel,
        dificultad: value.dificultad,
        velocidadTren: value.velocidadTren,
        puntaje: value.puntaje,
        patronActual: value.patronActual,
        vagonesResueltos: value.vagonesResueltos,
      },
      pendingFinalization: value.finalizacionPendiente,
      pendingLevel: value.siguienteNivelPendiente,
    });
  } catch {
    return null;
  }
};
