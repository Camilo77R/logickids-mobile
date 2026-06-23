import { ESTADOS_OBJETO_PERDIDO_AR } from '../objetoPerdidoAr.constants';
import { CATALOGO_OBJETOS_PERDIDOS_AR } from '../objetoPerdidoArObjetos';

const CHECKPOINT_VERSION = 1;
const MAX_RELATIVE_COORDINATE = 20;
const RESUMABLE_PHASES = new Set([
  ESTADOS_OBJETO_PERDIDO_AR.jugando,
  ESTADOS_OBJETO_PERDIDO_AR.rondaCompletada,
  ESTADOS_OBJETO_PERDIDO_AR.completado,
]);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const asNonNegativeInteger = (value) => Math.max(0, Math.trunc(Number(value) || 0));

const normalizeRelativePosition = (position) => {
  if (
    !Array.isArray(position) ||
    position.length !== 3 ||
    position.some(
      (coordinate) =>
        !Number.isFinite(Number(coordinate)) ||
        Math.abs(Number(coordinate)) > MAX_RELATIVE_COORDINATE,
    )
  ) {
    return null;
  }

  return position.map(Number);
};

const normalizeRound = (round) => {
  if (
    !isPlainObject(round) ||
    !Array.isArray(round.objetos) ||
    typeof round.objetivoId !== 'string'
  ) {
    return null;
  }

  const objects = round.objetos.map((savedObject, index) => {
    const catalogObject = CATALOGO_OBJETOS_PERDIDOS_AR.find(
      (candidate) => candidate.id === savedObject?.id,
    );
    const position = normalizeRelativePosition(savedObject?.posicion);

    if (!catalogObject || !position) {
      return null;
    }

    return {
      ...catalogObject,
      indice: Number.isInteger(savedObject.indice) ? savedObject.indice : index,
      posicion: position,
    };
  });

  const objective = CATALOGO_OBJETOS_PERDIDOS_AR.find(
    (candidate) => candidate.id === round.objetivoId,
  );

  if (objects.some((object) => !object) || !objective) {
    return null;
  }

  return {
    id: typeof round.id === 'string' ? round.id : `ronda-${asNonNegativeInteger(round.numeroRonda)}`,
    numeroRonda: Math.max(1, asNonNegativeInteger(round.numeroRonda)),
    objetivoId: objective.id,
    objetivo: { ...objective },
    mision: typeof round.mision === 'string' ? round.mision : `Encuentra ${objective.nombre}.`,
    objetos: objects,
  };
};

const serializeRound = (round) => ({
  id: round.id,
  numeroRonda: round.numeroRonda,
  objetivoId: round.objetivoId,
  mision: round.mision,
  objetos: round.objetos.map((object, index) => ({
    id: object.id,
    indice: Number.isInteger(object.indice) ? object.indice : index,
    posicion: normalizeRelativePosition(object.posicion),
  })),
});

export const createObjetoPerdidoArCheckpointState = ({
  estado,
  pendingFinalization = null,
  tiempoTranscurridoMs = 0,
}) => {
  const round = normalizeRound(estado?.rondaActual);

  if (!isPlainObject(estado) || !round || !RESUMABLE_PHASES.has(estado.fase)) {
    throw new Error('Objeto Perdido requiere una ronda logica reanudable para guardar progreso.');
  }

  return {
    version: CHECKPOINT_VERSION,
    faseReanudacion: estado.fase,
    requiereRelocalizarSuperficie: true,
    ronda: serializeRound(round),
    numeroRonda: round.numeroRonda,
    tiempoRestanteMs: asNonNegativeInteger(estado.tiempoRestanteMs),
    tiempoTranscurridoMs: asNonNegativeInteger(tiempoTranscurridoMs),
    ayudasRestantes: asNonNegativeInteger(estado.ayudasRestantes),
    aciertos: asNonNegativeInteger(estado.aciertos),
    errores: asNonNegativeInteger(estado.errores),
    ayudasUsadas: asNonNegativeInteger(estado.ayudasUsadas),
    comboActual: asNonNegativeInteger(estado.comboActual),
    comboMaximo: asNonNegativeInteger(estado.comboMaximo),
    resumenRonda: isPlainObject(estado.resumenRonda)
      ? cloneJson(estado.resumenRonda)
      : null,
    resultado: isPlainObject(estado.resultado) ? cloneJson(estado.resultado) : null,
    pendingFinalization: isPlainObject(pendingFinalization)
      ? cloneJson(pendingFinalization)
      : null,
  };
};

export const parseObjetoPerdidoArCheckpointState = (value) => {
  if (
    !isPlainObject(value) ||
    value.version !== CHECKPOINT_VERSION ||
    value.requiereRelocalizarSuperficie !== true ||
    !RESUMABLE_PHASES.has(value.faseReanudacion)
  ) {
    return null;
  }

  const round = normalizeRound(value.ronda);
  if (!round || round.numeroRonda !== asNonNegativeInteger(value.numeroRonda)) {
    return null;
  }

  return createObjetoPerdidoArCheckpointState({
    estado: {
      fase: value.faseReanudacion,
      rondaActual: round,
      tiempoRestanteMs: value.tiempoRestanteMs,
      ayudasRestantes: value.ayudasRestantes,
      aciertos: value.aciertos,
      errores: value.errores,
      ayudasUsadas: value.ayudasUsadas,
      comboActual: value.comboActual,
      comboMaximo: value.comboMaximo,
      resumenRonda: value.resumenRonda,
      resultado: value.resultado,
    },
    pendingFinalization: value.pendingFinalization,
    tiempoTranscurridoMs: value.tiempoTranscurridoMs,
  });
};

export const restoreObjetoPerdidoArLogicalState = (checkpointState) => {
  const parsed = parseObjetoPerdidoArCheckpointState(checkpointState);
  if (!parsed) {
    return null;
  }

  return {
    fase: ESTADOS_OBJETO_PERDIDO_AR.buscandoSuperficie,
    faseReanudacion: parsed.faseReanudacion,
    rondaActual: normalizeRound(parsed.ronda),
    numeroRonda: parsed.numeroRonda,
    tiempoRestanteMs: parsed.tiempoRestanteMs,
    tiempoTranscurridoMs: parsed.tiempoTranscurridoMs,
    ayudasRestantes: parsed.ayudasRestantes,
    aciertos: parsed.aciertos,
    errores: parsed.errores,
    ayudasUsadas: parsed.ayudasUsadas,
    comboActual: parsed.comboActual,
    comboMaximo: parsed.comboMaximo,
    resumenRonda: parsed.resumenRonda,
    resultado: parsed.resultado,
    pendingFinalization: parsed.pendingFinalization,
  };
};
