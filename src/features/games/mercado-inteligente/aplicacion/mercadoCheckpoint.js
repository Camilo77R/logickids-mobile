const CHECKPOINT_VERSION = 1;
const VALID_PHASES = new Set(['preparando', 'jugando', 'completado', 'bloqueado']);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const asNonNegativeInteger = (value) => Math.max(0, Math.trunc(Number(value) || 0));

export const createMercadoCheckpointHydrationBarrier = () => {
  let pendingRestore = null;

  return Object.freeze({
    begin({ sessionId, checkpointState }) {
      pendingRestore = {
        sessionId,
        serializedState: JSON.stringify(checkpointState),
      };
    },

    blocksAutosave({ sessionId, checkpointState }) {
      if (!pendingRestore || pendingRestore.sessionId !== sessionId) {
        return false;
      }

      if (JSON.stringify(checkpointState) === pendingRestore.serializedState) {
        pendingRestore = null;
      }

      return true;
    },

    clear() {
      pendingRestore = null;
    },
  });
};

export const createMercadoCheckpointState = ({
  configuracion,
  estado,
  pendingFinalization = false,
  resumenActividad,
}) => {
  if (!isPlainObject(configuracion) || !isPlainObject(estado) || !isPlainObject(estado.ronda)) {
    throw new Error('Mercado requiere configuracion, estado y ronda para guardar progreso.');
  }

  return {
    version: CHECKPOINT_VERSION,
    fase: VALID_PHASES.has(estado.fase) ? estado.fase : 'jugando',
    configuracion: cloneJson(configuracion),
    ronda: cloneJson(estado.ronda),
    seleccionadosIds: Array.isArray(estado.seleccionadosIds)
      ? [...estado.seleccionadosIds]
      : [],
    aciertos: asNonNegativeInteger(estado.aciertos),
    errores: asNonNegativeInteger(estado.errores),
    comboActual: asNonNegativeInteger(estado.comboActual),
    comboMaximo: asNonNegativeInteger(estado.comboMaximo),
    ayudasUsadas: asNonNegativeInteger(estado.ayudasUsadas),
    tuvoErrorAntesDeAcierto: Boolean(estado.tuvoErrorAntesDeAcierto),
    resultado: isPlainObject(estado.resultado) ? cloneJson(estado.resultado) : null,
    resumenActividad: isPlainObject(resumenActividad)
      ? cloneJson(resumenActividad)
      : null,
    pendingFinalization: isPlainObject(pendingFinalization)
      ? cloneJson(pendingFinalization)
      : null,
  };
};

export const parseMercadoCheckpointState = (value) => {
  if (
    !isPlainObject(value) ||
    value.version !== CHECKPOINT_VERSION ||
    !VALID_PHASES.has(value.fase) ||
    !isPlainObject(value.configuracion) ||
    !isPlainObject(value.ronda) ||
    !Array.isArray(value.seleccionadosIds)
  ) {
    return null;
  }

  return createMercadoCheckpointState({
    configuracion: value.configuracion,
    estado: value,
    pendingFinalization: value.pendingFinalization,
    resumenActividad: value.resumenActividad,
  });
};
