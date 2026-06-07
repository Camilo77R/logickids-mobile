import {
  crearEventoSesion,
  crearFinalizacionSesion,
  ESTADOS_FINALIZACION_SESION,
} from '../core/contratoSesionJuego';
import {
  crearEstadisticasJuegoComun,
  crearResultadoJuegoComun,
} from '../core/contratoResultadoJuego';
import { PIEZAS_ROBOT } from './robotTaller.constants';

const enteroAleatorio = (minimo, maximo) =>
  minimo + Math.floor(Math.random() * (maximo - minimo + 1));

export const crearPatronPiezasAleatorio = ({ cantidadPiezas, longitudPatron }) =>
  Array.from({ length: longitudPatron }, () => enteroAleatorio(0, cantidadPiezas - 1));

export const resolverCantidadColumnas = (cantidadPiezas) => {
  if (cantidadPiezas <= 3) {
    return 3;
  }
  if (cantidadPiezas <= 6) {
    return 3;
  }
  return 4;
};

export const construirResumenPartidaRobotTaller = ({
  exito,
  configuracion,
  aciertos,
  errores,
  tiempoTranscurridoMs,
  patron,
}) => {
  const puntajeBase = Math.max(aciertos * 12 - errores * 4, 0);
  const comboMaximo = exito ? aciertos : Math.max(aciertos - 1, 0);

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
      patronLongitud: patron.length,
      patronResuelto: exito,
      cantidadPiezas: configuracion.configuracion.cantidadPiezas,
      piezasUtilizadas: PIEZAS_ROBOT.map((pieza) => pieza.id),
    },
  });
};

export const construirEventoRobotTaller = ({
  tipoEvento,
  tiempoReaccionMs,
  puntos = 0,
  comboEnEvento = 0,
  metadata,
}) =>
  crearEventoSesion({
    tipoEvento,
    habilidad: 'Lógica',
    tiempoReaccionMs,
    puntos,
    comboEnEvento,
    metadata,
  });
