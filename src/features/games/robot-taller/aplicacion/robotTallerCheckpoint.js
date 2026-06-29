import {
  DATOS_FUNCION_PIEZA,
  FASES_ENSAMBLAGE,
  PARTES_ROBOT,
  PIEZAS_ALTERNATIVAS,
} from '../robotTaller.constants';

const ROBOT_CHECKPOINT_VERSION = 1;
const VALID_PHASES = new Set(Object.values(FASES_ENSAMBLAGE));
const VALID_MATH_OPERATORS = new Set(['+', '-', 'x', '/']);
const VALID_FINAL_STATES = new Set(['completado', 'abandonado']);
const KNOWN_PIECE_IDS = new Set([
  ...PARTES_ROBOT.map((part) => part.id),
  ...PIEZAS_ALTERNATIVAS.map((part) => part.id),
]);

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asNonNegativeInteger = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? Math.trunc(numericValue)
    : 0;
};

const asPositiveInteger = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : null;
};

export const calcularTiempoRestanteRobotTaller = ({
  tiempoLimiteMs,
  tiempoTranscurridoMs,
}) => Math.max(
  0,
  asNonNegativeInteger(tiempoLimiteMs) - asNonNegativeInteger(tiempoTranscurridoMs),
);

const asOptionalText = (value) => {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const normalizeConfiguration = (configuration) => {
  const level = asPositiveInteger(configuration?.nivel);
  const difficulty = asPositiveInteger(configuration?.dificultad);

  if (!level || !difficulty) {
    throw new Error('Robot Logico requiere nivel y dificultad validos para guardar progreso.');
  }

  return {
    nivel: level,
    dificultad: difficulty,
    idMision: asOptionalText(configuration?.idMision),
  };
};

const normalizeParts = (parts, knownPieceIds) => {
  if (!Array.isArray(parts) || parts.length < PARTES_ROBOT.length) {
    throw new Error('Robot Logico requiere piezas para guardar progreso.');
  }

  const normalized = parts.map((part) => {
    const id = asOptionalText(part?.id);
    if (!id || !knownPieceIds.has(id)) {
      throw new Error('Robot Logico contiene una pieza desconocida.');
    }

    return {
      id,
      ensamblada: Boolean(part.ensamblada),
      bloqueado: Boolean(part.bloqueado),
      bloqueadoPorMatematicas: Boolean(part.bloqueadoPorMatematicas),
    };
  });

  if (new Set(normalized.map((part) => part.id)).size !== normalized.length) {
    throw new Error('Robot Logico no permite piezas duplicadas en un checkpoint.');
  }

  return normalized;
};

const normalizeQuestion = (question, knownPieceIds) => {
  if (question == null) return null;

  const correctPieceId = asOptionalText(question.parteCorrectaId);
  const optionIds = Array.isArray(question.opciones)
    ? question.opciones.map((option) => asOptionalText(option?.id)).filter(Boolean)
    : Array.isArray(question.opcionesIds)
      ? question.opcionesIds.map(asOptionalText).filter(Boolean)
      : [];

  if (
    !correctPieceId ||
    !knownPieceIds.has(correctPieceId) ||
    optionIds.length === 0 ||
    !optionIds.includes(correctPieceId) ||
    optionIds.some((id) => !knownPieceIds.has(id)) ||
    new Set(optionIds).size !== optionIds.length
  ) {
    return null;
  }

  return { parteCorrectaId: correctPieceId, opcionesIds: optionIds };
};

const normalizeMathProblem = (problem, knownPieceIds) => {
  if (problem == null) return null;

  const pieceId = asOptionalText(problem.idParte);
  const operator = asOptionalText(problem.operador);
  const values = [problem.a, problem.b, problem.respuesta].map(Number);

  if (
    !pieceId ||
    !knownPieceIds.has(pieceId) ||
    !VALID_MATH_OPERATORS.has(operator) ||
    values.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }

  return {
    idParte: pieceId,
    operador: operator,
    a: values[0],
    b: values[1],
    respuesta: values[2],
  };
};

const normalizeAttempts = (attempts, knownPieceIds) => {
  if (!isPlainObject(attempts)) return {};

  return Object.fromEntries(
    Object.entries(attempts)
      .filter(([pieceId]) => knownPieceIds.has(pieceId))
      .map(([pieceId, count]) => [pieceId, asNonNegativeInteger(count)]),
  );
};

const normalizePendingFinalization = (finalization) => {
  if (finalization == null) return null;
  if (!isPlainObject(finalization)) return null;

  const finalizationId = asOptionalText(finalization.finalization_id);
  if (!finalizationId || !VALID_FINAL_STATES.has(finalization.estado)) {
    return null;
  }

  return {
    puntaje: asNonNegativeInteger(finalization.puntaje),
    aciertos: asNonNegativeInteger(finalization.aciertos),
    errores: asNonNegativeInteger(finalization.errores),
    combo_maximo: asNonNegativeInteger(finalization.combo_maximo),
    dificultad: asPositiveInteger(finalization.dificultad) ?? 1,
    estado: finalization.estado,
    finalization_id: finalizationId,
  };
};

const configurationsMatch = (stored, expected) => {
  if (!expected) return true;

  const normalizedExpected = normalizeConfiguration(expected);
  return stored.nivel === normalizedExpected.nivel &&
    stored.dificultad === normalizedExpected.dificultad &&
    stored.idMision === normalizedExpected.idMision;
};

export const createRobotTallerCheckpointState = ({
  configuracion,
  estado,
  intentosMatematicos = {},
  mostrarModalMatematica = false,
  pendingFinalization = null,
  preguntaActual = null,
  problemaMatematico = null,
  tiempoTranscurridoMs = 0,
}) => {
  if (!isPlainObject(estado)) {
    throw new Error('Robot Logico requiere un estado valido para guardar progreso.');
  }

  const parts = normalizeParts(estado.partes, KNOWN_PIECE_IDS);
  const activePieceIds = new Set(parts.map((part) => part.id));
  const assembledCount = parts.filter((part) => part.ensamblada).length;
  const normalizedMathProblem = normalizeMathProblem(problemaMatematico, activePieceIds);
  const normalizedPendingFinalization = normalizePendingFinalization(pendingFinalization);
  const phase = VALID_PHASES.has(estado.fase)
    ? estado.fase
    : FASES_ENSAMBLAGE.explotado;

  if (pendingFinalization != null && !normalizedPendingFinalization) {
    throw new Error('Robot Logico recibio una finalizacion pendiente invalida.');
  }

  return {
    version: ROBOT_CHECKPOINT_VERSION,
    configuracion: normalizeConfiguration(configuracion),
    fase: phase,
    partes: parts,
    contadorEnsambladas: assembledCount,
    erroresAcumulados: asNonNegativeInteger(estado.erroresAcumulados),
    ordenActual: Math.min(asNonNegativeInteger(estado.ordenActual), assembledCount),
    preguntaActual: normalizeQuestion(preguntaActual, activePieceIds),
    problemaMatematico: normalizedMathProblem,
    mostrarModalMatematica: Boolean(mostrarModalMatematica && normalizedMathProblem),
    intentosMatematicos: normalizeAttempts(intentosMatematicos, activePieceIds),
    tiempoTranscurridoMs: asNonNegativeInteger(tiempoTranscurridoMs),
    pendingFinalization: normalizedPendingFinalization,
  };
};

export const parseRobotTallerCheckpointState = (value, expectedConfiguration = null) => {
  if (
    !isPlainObject(value) ||
    value.version !== ROBOT_CHECKPOINT_VERSION ||
    !isPlainObject(value.configuracion) ||
    !VALID_PHASES.has(value.fase) ||
    !Array.isArray(value.partes)
  ) {
    return null;
  }

  try {
    const normalized = createRobotTallerCheckpointState({
      configuracion: value.configuracion,
      estado: {
      fase: value.fase,
      partes: value.partes,
      erroresAcumulados: value.erroresAcumulados,
      ordenActual: value.ordenActual,
      },
      intentosMatematicos: value.intentosMatematicos,
      mostrarModalMatematica: value.mostrarModalMatematica,
      pendingFinalization: value.pendingFinalization,
      preguntaActual: value.preguntaActual,
      problemaMatematico: value.problemaMatematico,
      tiempoTranscurridoMs: value.tiempoTranscurridoMs,
    });

    return configurationsMatch(normalized.configuracion, expectedConfiguration)
      ? normalized
      : null;
  } catch {
    return null;
  }
};

const buildQuestion = (question, definitionsById) => {
  if (!question) return null;

  const correctDefinition = definitionsById.get(question.parteCorrectaId);
  if (
    !correctDefinition ||
    question.opcionesIds.some((id) => !definitionsById.has(id))
  ) return null;

  return {
    parteCorrectaId: question.parteCorrectaId,
    opciones: question.opcionesIds.map((id) => {
      const definition = definitionsById.get(id);
      return {
        id,
        nombre: definition.nombre,
        color: definition.color,
        funcionDesc: DATOS_FUNCION_PIEZA[id]?.descripcion ?? '',
      };
    }),
    funcionNecesaria: DATOS_FUNCION_PIEZA[question.parteCorrectaId]?.funcion ?? '',
  };
};

export const restoreRobotTallerCheckpointState = ({
  checkpoint,
  configuracion,
  definicionesPiezas,
  resultado = null,
}) => {
  const parsed = parseRobotTallerCheckpointState(checkpoint, configuracion);
  if (!parsed || !Array.isArray(definicionesPiezas)) return null;

  const definitionsById = new Map(
    definicionesPiezas.map((definition) => [definition.id, definition]),
  );

  if (parsed.partes.some((part) => !definitionsById.has(part.id))) {
    return null;
  }

  const parts = parsed.partes.map((part) => {
    const definition = definitionsById.get(part.id);
    return {
      id: part.id,
      posicion: cloneJson(
        part.ensamblada ? definition.posicionObjetivo : definition.posicionExplotada,
      ),
      rotacion: cloneJson(
        part.ensamblada ? (definition.rotacionObjetivo ?? [0, 0, 0]) : [0, 0, 0],
      ),
      ensamblada: part.ensamblada,
      agarrada: false,
      esAlternativa: PIEZAS_ALTERNATIVAS.some((alternative) => alternative.id === part.id),
      bloqueado: part.bloqueado,
      bloqueadoPorMatematicas: part.bloqueadoPorMatematicas,
    };
  });

  return {
    estado: {
      fase: parsed.pendingFinalization ? FASES_ENSAMBLAGE.completado : parsed.fase,
      partes: parts,
      parteAgarrada: null,
      contadorEnsambladas: parsed.contadorEnsambladas,
      erroresAcumulados: parsed.erroresAcumulados,
      ordenActual: parsed.ordenActual,
      mensaje: parsed.pendingFinalization
        ? 'Robot armado. Estamos confirmando tus resultados.'
        : `${parsed.contadorEnsambladas} de ${parts.length} piezas colocadas.`,
      resultado,
      eventosSesion: [],
      preguntasMatematicas: {},
    },
    preguntaActual: buildQuestion(parsed.preguntaActual, definitionsById),
    problemaMatematico: parsed.problemaMatematico
      ? cloneJson(parsed.problemaMatematico)
      : null,
    mostrarModalMatematica: Boolean(
      parsed.mostrarModalMatematica && parsed.problemaMatematico,
    ),
    intentosMatematicos: cloneJson(parsed.intentosMatematicos),
    tiempoTranscurridoMs: parsed.tiempoTranscurridoMs,
    tiempoRestanteMs: calcularTiempoRestanteRobotTaller({
      tiempoLimiteMs: configuracion?.configuracion?.tiempoLimiteMs,
      tiempoTranscurridoMs: parsed.tiempoTranscurridoMs,
    }),
    pendingFinalization: parsed.pendingFinalization
      ? cloneJson(parsed.pendingFinalization)
      : null,
  };
};
