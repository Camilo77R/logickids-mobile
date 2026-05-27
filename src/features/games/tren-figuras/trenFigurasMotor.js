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
  HABILIDAD_TREN_FIGURAS,
  VAGONES_POR_NIVEL,
} from './trenFiguras.constants';

const normalizarEnteroNoNegativo = (valor) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return 0;
  }

  return Math.round(numero);
};

export const construirEventoTrenFiguras = ({
  tipoEvento,
  tiempoReaccionMs,
  puntos = 0,
  comboEnEvento = 0,
  metadata,
}) => ({
  ...crearEventoSesion({
    tipoEvento,
    habilidad: HABILIDAD_TREN_FIGURAS,
    tiempoReaccionMs,
    puntos,
    comboEnEvento,
  }),
  ...(metadata ? { metadata } : {}),
});

export const calcularPuntaje = ({ aciertos = 0, errores = 0 }) =>
  Math.max(normalizarEnteroNoNegativo(aciertos) * 10 - normalizarEnteroNoNegativo(errores) * 3, 0);

export const construirResumenPartidaTren = ({
  configuracion,
  aciertos,
  errores,
  comboMaximo,
  nivelAlcanzado,
  tiempoTotalMs,
  dificultadFinal,
  estado = ESTADOS_FINALIZACION_SESION.completado,
}) => {
  const puntaje = calcularPuntaje({ aciertos, errores });
  const dificultadResultado = dificultadFinal ?? configuracion.dificultad;
  const finalizacionSesion = crearFinalizacionSesion({
    puntaje,
    aciertos,
    errores,
    comboMaximo,
    dificultad: dificultadResultado,
    estado,
  });

  return crearResultadoJuegoComun({
    juego: {
      slug: configuracion.slug,
      titulo: configuracion.titulo,
      habilidad: HABILIDAD_TREN_FIGURAS,
      fuenteAdaptacion: configuracion.fuenteAdaptacion,
      versionAdaptacion: configuracion.versionAdaptacion,
    },
    finalizacionSesion,
    estadisticas: crearEstadisticasJuegoComun({
      puntaje,
      aciertos,
      errores,
      comboMaximo,
      tiempoTotalMs,
      nivelAlcanzado,
      dificultad: dificultadResultado,
      estadoSesion: finalizacionSesion.estado,
    }),
    detalles: {
      nivelAlcanzado,
      nivelesPorPartida: configuracion.nivelesPorPartida,
      vagonesPorNivel: configuracion.vagonesPorNivel ?? VAGONES_POR_NIVEL,
    },
  });
};
