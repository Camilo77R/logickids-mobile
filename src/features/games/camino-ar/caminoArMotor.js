import {
  crearEventoSesion,
  crearFinalizacionSesion,
  ESTADOS_FINALIZACION_SESION,
} from '../core/contratoSesionJuego';
import {
  crearEstadisticasJuegoComun,
  crearResultadoJuegoComun,
} from '../core/contratoResultadoJuego';

const enteroAleatorio = (minimo, maximo) =>
  minimo + Math.floor(Math.random() * (maximo - minimo + 1));

export const crearPatronAleatorio = ({ cantidadBaldosas, longitudPatron }) =>
  Array.from({ length: longitudPatron }, () => enteroAleatorio(0, cantidadBaldosas - 1));

export const resolverColumnasTablero = (cantidadBaldosas) => {
  if (cantidadBaldosas <= 4) {
    return 2;
  }

  if (cantidadBaldosas <= 6) {
    return 3;
  }

  return 3;
};

export const construirResumenPartida = ({
  exito,
  configuracion,
  aciertos,
  errores,
  ayudasUsadas,
  tiempoTranscurridoMs,
  patron,
}) => {
  const puntajeBase = Math.max(aciertos * 10 - errores * 3 - ayudasUsadas * 2, 0);
  const comboMaximo = exito ? aciertos : Math.max(aciertos - 1, 0);

  /**
   * REGLA DE NEGOCIO:
   * - `abandonado` se reserva para interrupciones reales: salirse, cierre del tutor,
   *   cambio de grupo, desactivación, etc.
   * - si la ronda terminó de forma natural, aunque el patrón no se haya resuelto,
   *   la actividad del estudiante sí quedó concluida y debe cerrar como `completado`.
   *
   * ANALOGÍA:
   * perder un examen no significa abandonar el salón. El intento terminó y se registra.
   */
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
      habilidad: 'Memoria',
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
      pistasUsadas: ayudasUsadas,
      nivelAlcanzado: configuracion.dificultad,
      dificultad: configuracion.dificultad,
      estadoSesion: finalizacionSesion.estado,
    }),
    detalles: {
      patronLongitud: patron.length,
      patronResuelto: exito,
      cantidadBaldosas: configuracion.configuracion.cantidadBaldosas,
    },
  });
};

export const construirEventoCaminoAr = ({
  tipoEvento,
  tiempoReaccionMs,
  puntos = 0,
  comboEnEvento = 0,
  metadata,
}) =>
  crearEventoSesion({
    tipoEvento,
    habilidad: 'Memoria',
    tiempoReaccionMs,
    puntos,
    comboEnEvento,
    metadata,
  });
