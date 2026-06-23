import { ESTADOS_CAMINO_AR } from '../caminoAr.constants';

const CHECKPOINT_VERSION = 1;
const RESUMABLE_PHASES = new Set([
  ESTADOS_CAMINO_AR.mostrandoPatron,
  ESTADOS_CAMINO_AR.esperandoRespuesta,
  ESTADOS_CAMINO_AR.completado,
  ESTADOS_CAMINO_AR.fallido,
]);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asNonNegativeInteger = (value) => Math.max(0, Math.trunc(Number(value) || 0));

const cloneJsonObject = (value) =>
  isPlainObject(value) ? JSON.parse(JSON.stringify(value)) : null;

const normalizePattern = (pattern) => {
  if (!Array.isArray(pattern) || pattern.length === 0) {
    return null;
  }

  const normalized = pattern.map(Number);
  return normalized.every((tileIndex) => Number.isInteger(tileIndex) && tileIndex >= 0)
    ? normalized
    : null;
};

export const createCaminoArCheckpointState = ({
  estado,
  pendingFinalization = null,
}) => {
  const patron = normalizePattern(estado?.patron);

  if (!patron || !RESUMABLE_PHASES.has(estado?.fase)) {
    throw new Error('Camino AR requiere un estado logico reanudable para guardar progreso.');
  }

  return {
    version: CHECKPOINT_VERSION,
    fase: estado.fase,
    patron,
    indiceRespuesta: Math.min(asNonNegativeInteger(estado.indiceRespuesta), patron.length),
    tiempoRestanteMs: asNonNegativeInteger(estado.tiempoRestanteMs),
    ayudasRestantes: asNonNegativeInteger(estado.ayudasRestantes),
    aciertos: asNonNegativeInteger(estado.aciertos),
    errores: asNonNegativeInteger(estado.errores),
    ayudasUsadas: asNonNegativeInteger(estado.ayudasUsadas),
    resultado: cloneJsonObject(estado.resultado),
    pendingFinalization: cloneJsonObject(pendingFinalization),
  };
};

export const parseCaminoArCheckpointState = (value) => {
  if (
    !isPlainObject(value) ||
    value.version !== CHECKPOINT_VERSION ||
    !RESUMABLE_PHASES.has(value.fase) ||
    !normalizePattern(value.patron)
  ) {
    return null;
  }

  try {
    return createCaminoArCheckpointState({
      estado: value,
      pendingFinalization: value.pendingFinalization,
    });
  } catch {
    return null;
  }
};
