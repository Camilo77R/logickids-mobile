import {
  crearEventoSesion,
  crearFinalizacionSesion,
  ESTADOS_FINALIZACION_SESION,
} from '../core/contratoSesionJuego';
import {
  crearEstadisticasJuegoComun,
  crearResultadoJuegoComun,
} from '../core/contratoResultadoJuego';
import {
  PARTES_ROBOT,
  UMBRAL_SNAP,
  RADIO_SNAP_SUAVE,
  DISTANCIA_MAX_ENSAMBLAR,
  NIVELES,
  SECUENCIA_ENSAMBLADO,
  PIEZAS_ALTERNATIVAS,
  MISIONES_NIVEL_3,
  obtenerPartesRobot,
} from './robotTaller.constants';

const calcularDistancia = (posA, posB) => {
  const dx = posA[0] - posB[0];
  const dy = posA[1] - posB[1];
  const dz = posA[2] - posB[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const detectarSnap = (posicionParte) => {
  let snapPerfecto = null;
  let casiSnap = null;
  
  for (let indice = 0; indice < PARTES_ROBOT.length; indice++) {
    const parte = PARTES_ROBOT[indice];
    const distancia = calcularDistancia(posicionParte, parte.posicionObjetivo);
    const UMBRAL_SNAP_SUAVE = UMBRAL_SNAP * 2;
    
    if (distancia <= UMBRAL_SNAP && (!snapPerfecto || distancia < snapPerfecto.distancia)) {
      snapPerfecto = { ensamblada: true, indice, distancia };
    } else if (distancia <= UMBRAL_SNAP_SUAVE && !casiSnap) {
      casiSnap = { indice, distancia };
    }
  }
  
  if (snapPerfecto || casiSnap) {
    return { snapPerfecto, casiSnap };
  }
  return null;
};

export const obtenerPiezasPorNivel = (nivel, idMision) => {
  const nivelConfig = NIVELES[nivel] ?? NIVELES[1];
  const base = obtenerPartesRobot(nivel);
  if (!nivelConfig.usarAlternativas) {
    return [...base];
  }
  if (!idMision) {
    return [...base];
  }
  const mision = MISIONES_NIVEL_3.find((m) => m.id === idMision);
  if (!mision) {
    return [...base];
  }
  const piezasBase = base.filter(
    (p) => !PIEZAS_ALTERNATIVAS.some((a) => a.reemplaza === p.id),
  );
  const alternativas = PIEZAS_ALTERNATIVAS.filter((a) =>
    mision.alternativasCorrectas.includes(a.id),
  );
  const incorrectas = PIEZAS_ALTERNATIVAS.filter(
    (a) =>
      !mision.alternativasCorrectas.includes(a.id) &&
      a.reemplaza !== 'pierna_izq' &&
      a.reemplaza !== 'pierna_der',
  );
  const piezasDesordenadas = [...alternativas, ...incorrectas, ...piezasBase];
  const mezcladas = piezasDesordenadas
    .map((p) => ({ p, orden: Math.random() }))
    .sort((a, b) => a.orden - b.orden)
    .map(({ p }) => p);
  return mezcladas;
};

export const validarSnapPorNivel = ({
  idParte,
  posicionParte,
  nivel,
  ordenActual,
  partesEnsambladas,
  partesBase,
  alternativas = [],
}) => {
  const nivelConfig = NIVELES[nivel] ?? NIVELES[1];
  const umbral = nivelConfig.umbralSnap;
  const base = partesBase ?? PARTES_ROBOT;
  const alt = alternativas.length > 0 ? alternativas : PIEZAS_ALTERNATIVAS;

  const parteDef = base.find((p) => p.id === idParte) ?? alt.find((a) => a.id === idParte);
  if (!parteDef) {
    return { permitido: false, mensaje: 'Pieza desconocida', ensamblada: false, distancia: Infinity };
  }

  const posicionObjetivoLocal = parteDef.reemplaza
    ? (base.find((p) => p.id === parteDef.reemplaza)?.posicionObjetivo ?? parteDef.posicionObjetivo)
    : parteDef.posicionObjetivo;

  const posicionObjetivo = posicionObjetivoLocal;

  if (nivelConfig.ordenSecuencial) {
    const esperado = SECUENCIA_ENSAMBLADO[partesEnsambladas];
    if (parteDef.id !== esperado && parteDef.reemplaza !== esperado) {
      return {
        permitido: false,
        mensaje: `¡Aún no! Primero debes encontrar la pieza: ${esperado} 🤖`,
        ensamblada: false,
        distancia: Infinity,
        casiSnap: null,
      };
    }
  }

  const distancia = calcularDistancia(posicionParte, posicionObjetivo);

  // Si está dentro del umbral, permitir ensamblaje
  if (distancia <= umbral) {
    return {
      permitido: true,
      mensaje: null,
      ensamblada: true,
      distancia,
      posicionObjetivo: posicionObjetivoLocal,
      rotacionObjetivo: parteDef.rotacionObjetivo ?? [0, 0, 0],
      casiSnap: null,
    };
  }

  return {
    permitido: false,
    mensaje: 'Pieza demasiado lejos del lugar correcto',
    ensamblada: false,
    distancia,
    casiSnap: null,
  };
};

export const obtenerSiguienteEsperado = (partesEnsambladas, nivel) => {
  const nivelConfig = NIVELES[nivel] ?? NIVELES[1];
  if (!nivelConfig.ordenSecuencial) return null;
  return SECUENCIA_ENSAMBLADO[partesEnsambladas] ?? null;
};

export const construirResumenPartidaEnsamblaje = ({
  exito,
  configuracion,
  partesEnsambladas,
  tiempoTranscurridoMs,
  partesBase,
}) => {
  const base = partesBase ?? PARTES_ROBOT;
  const totalPartes = base.length;
  const aciertos = partesEnsambladas;
  const errores = Math.max(0, totalPartes - aciertos);
  const puntajeBase = Math.max(Math.round((aciertos / totalPartes) * 100) - errores * 5, 0);
  const comboMaximo = exito ? totalPartes : Math.max(aciertos - 1, 0);

  const finalizacionSesion = crearFinalizacionSesion({
    puntaje: puntajeBase,
    aciertos,
    errores,
    comboMaximo,
    dificultad: configuracion.dificultad,
    estado: ESTADOS_FINALIZACION_SESION.completado,
  });

  return crearResultadoJuegoComun({
    juego: {
      slug: configuracion.slug,
      titulo: configuracion.titulo,
      habilidad: configuracion.habilidad,
      fuenteAdaptacion: configuracion.fuenteAdaptacion,
      versionAdaptacion: configuracion.versionAdaptacion,
    },
    finalizacionSesion,
    estadisticas: crearEstadisticasJuegoComun({
      puntaje: puntajeBase,
      aciertos,
      errores,
      comboMaximo,
      tiempoTotalMs: tiempoTranscurridoMs,
      pistasUsadas: 0,
      nivelAlcanzado: configuracion.dificultad,
      dificultad: configuracion.dificultad,
      estadoSesion: finalizacionSesion.estado,
    }),
    detalles: {
      totalPartes,
      partesEnsambladas,
      ensamblajeCompleto: exito,
      piezasUtilizadas: base.map((p) => p.id),
    },
  });
};

export const construirEventoEnsamblaje = ({
  tipoEvento,
  puntos = 0,
  comboEnEvento = 0,
  metadata,
}) =>
  crearEventoSesion({
    tipoEvento,
    habilidad: 'Lógica',
    tiempoReaccionMs: null,
    puntos,
    comboEnEvento,
    metadata,
  });
