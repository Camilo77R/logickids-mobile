import {
  crearEventoSesion,
  crearFinalizacionSesion,
  ESTADOS_FINALIZACION_SESION,
} from '../core/contratoSesionJuego';
import {
  crearEstadisticasJuegoComun,
  crearResultadoJuegoComun,
} from '../core/contratoResultadoJuego';
import { PARTES_ROBOT, UMBRAL_SNAP, RADIO_SNAP_SUAVE, DISTANCIA_MAX_ENSAMBLAR } from './robotTaller.constants';

const calcularDistancia = (posA, posB) => {
  const dx = posA[0] - posB[0];
  const dy = posA[1] - posB[1];
  const dz = posA[2] - posB[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const detectarSnap = (posicionParte) => {
  for (let indice = 0; indice < PARTES_ROBOT.length; indice++) {
    const parte = PARTES_ROBOT[indice];
    const distancia = calcularDistancia(posicionParte, parte.posicionObjetivo);
    if (distancia <= UMBRAL_SNAP) {
      return { ensamblada: distancia <= DISTANCIA_MAX_ENSAMBLAR, indice, distancia };
    }
  }
  return null;
};

export const construirResumenPartidaEnsamblaje = ({
  exito,
  configuracion,
  partesEnsambladas,
  tiempoTranscurridoMs,
}) => {
  const totalPartes = PARTES_ROBOT.length;
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
      piezasUtilizadas: PARTES_ROBOT.map((p) => p.id),
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
