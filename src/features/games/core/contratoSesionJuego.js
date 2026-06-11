const normalizarEnteroNoNegativo = (valor, respaldo = 0) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return respaldo;
  }

  return Math.round(numero);
};

export const TIPOS_EVENTO_SESION = Object.freeze({
  acierto: 'acierto',
  error: 'error',
  combo: 'combo',
  nivelCompletado: 'nivel_completado',
  agarre: 'agarre',
});

const TIPOS_EVENTO_SESION_SOPORTADOS = new Set(Object.values(TIPOS_EVENTO_SESION));

export const ESTADOS_FINALIZACION_SESION = Object.freeze({
  completado: 'completado',
  abandonado: 'abandonado',
});

const ESTADOS_FINALIZACION_SOPORTADOS = new Set(Object.values(ESTADOS_FINALIZACION_SESION));

const normalizarMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  return metadata;
};

/**
 * Construye un evento compatible con POST /api/sesiones/:id/eventos.
 *
 * POR QUÉ:
 * todos los juegos deben reportar sus jugadas usando el mismo contrato que ya
 * soporta el backend. La mecánica cambia; la forma de persistir no.
 *
 * REGLA:
 * si un juego necesita otro tipo de evento, primero se agrega en la DB y en el
 * backend. Aqui no disfrazamos semanticas para que "medio entren".
 */
export const crearEventoSesion = ({
  tipoEvento,
  habilidad,
  tiempoReaccionMs,
  puntos = 0,
  comboEnEvento = 0,
  metadata,
}) => {
  if (!TIPOS_EVENTO_SESION_SOPORTADOS.has(tipoEvento)) {
    throw new Error(
      `Tipo de evento no soportado por el backend actual: ${tipoEvento}`,
    );
  }

  return {
    tipo_evento: tipoEvento,
    ...(habilidad ? { habilidad } : {}),
    ...(Number.isFinite(tiempoReaccionMs)
      ? { tiempo_reaccion_ms: normalizarEnteroNoNegativo(tiempoReaccionMs) }
      : {}),
    puntos: normalizarEnteroNoNegativo(puntos),
    combo_en_evento: normalizarEnteroNoNegativo(comboEnEvento),
    ...(normalizarMetadata(metadata) ? { metadata: normalizarMetadata(metadata) } : {}),
  };
};

/**
 * Construye el payload compatible con POST /api/sesiones/:id/finalizar.
 */
export const crearFinalizacionSesion = ({
  puntaje = 0,
  aciertos = 0,
  errores = 0,
  comboMaximo = 0,
  dificultad,
  estado = ESTADOS_FINALIZACION_SESION.completado,
}) => {
  if (!ESTADOS_FINALIZACION_SOPORTADOS.has(estado)) {
    throw new Error(`Estado final no soportado por el backend actual: ${estado}`);
  }

  return {
    puntaje: normalizarEnteroNoNegativo(puntaje),
    aciertos: normalizarEnteroNoNegativo(aciertos),
    errores: normalizarEnteroNoNegativo(errores),
    combo_maximo: normalizarEnteroNoNegativo(comboMaximo),
    ...(dificultad != null
      ? { dificultad: normalizarEnteroNoNegativo(dificultad, 1) }
      : {}),
    estado,
  };
};
