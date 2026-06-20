import { PARTES_ROBOT, FASES_ENSAMBLAGE, MODO_PRESENTACION_ROBOT_TALLER } from './robotTaller.constants';

const resolverMensajeEstado = (fase, mensaje) =>
  fase === FASES_ENSAMBLAGE.completado ? 'Robot armado. Tus resultados quedaron guardados.' : mensaje;

const construirMetricas = ({ estado, configuracion }) => [
  { etiqueta: 'Dificultad', valor: configuracion.dificultad },
  { etiqueta: 'Partes', valor: PARTES_ROBOT.length },
  { etiqueta: 'Habilidad', valor: configuracion.habilidad },
  { etiqueta: 'Ensambladas', valor: estado.contadorEnsambladas },
];

const construirMetricasResultado = ({ resultado }) => [
  { etiqueta: 'Puntaje', valor: resultado.estadisticas.puntaje },
  { etiqueta: 'Aciertos', valor: resultado.estadisticas.aciertos },
  { etiqueta: 'Errores', valor: resultado.estadisticas.errores },
  { etiqueta: 'Precision', valor: `${resultado.estadisticas.precisionPct}%` },
];

const construirResumenCierreSesion = ({ respuestaInicioSesion, respuestaFinalizacionSesion }) => {
  if (!respuestaFinalizacionSesion) return null;
  const logros = Array.isArray(respuestaFinalizacionSesion.logros_desbloqueados)
    ? respuestaFinalizacionSesion.logros_desbloqueados
    : [];
  const progreso = respuestaFinalizacionSesion.progreso_ruta ?? null;
  const siguientePaso = progreso?.siguientePaso ?? null;
  const minijuegoActualId = Number(respuestaInicioSesion?.sesion?.minijuego_id ?? 0);
  const siguienteMinijuegoId = Number(siguientePaso?.minijuego_id ?? 0);
  const siguienteEsMismoJuego =
    Boolean(siguientePaso) &&
    minijuegoActualId > 0 &&
    siguienteMinijuegoId > 0 &&
    minijuegoActualId === siguienteMinijuegoId;

  return {
    logros,
    haySiguientePaso: Boolean(progreso?.haySiguientePaso),
    siguienteEsMismoJuego,
    participanteEstado: progreso?.participanteEstado ?? null,
  };
};

const construirAccionesResultado = ({ cierreSesion, continuarActividad, salirActividad }) => {
  if (!cierreSesion) {
    return {
      accionContinuar: null,
      etiquetaContinuar: null,
      accionSalir: salirActividad,
      etiquetaSalir: 'Volver al tablero',
      sincronizandoCierre: true,
    };
  }

  if (cierreSesion.haySiguientePaso && cierreSesion.siguienteEsMismoJuego) {
    return {
      accionContinuar: continuarActividad,
      etiquetaContinuar: 'Siguiente nivel',
      accionSalir: salirActividad,
      etiquetaSalir: 'Volver al tablero',
      sincronizandoCierre: false,
    };
  }

  return {
    accionContinuar: null,
    etiquetaContinuar: null,
    accionSalir: salirActividad,
    etiquetaSalir: 'Volver al tablero',
    sincronizandoCierre: false,
  };
};

export const construirEscenaRobotTaller = ({
  configuracion,
  estado,
  respuestaInicioSesion,
  respuestaFinalizacionSesion,
  continuarActividad,
  salirActividad,
  reiniciarPartida,
}) => {
  const resultadoVisible = Boolean(estado.resultado);
  const cierreSesion = resultadoVisible
    ? construirResumenCierreSesion({ respuestaInicioSesion, respuestaFinalizacionSesion })
    : null;
  const accionesResultado = resultadoVisible
    ? construirAccionesResultado({ cierreSesion, continuarActividad, salirActividad })
    : null;

  return {
    encabezado: {
      ceja: 'Reto de logica',
      titulo: 'Robot Lógico',
      subtitulo: 'Arma el robot moviendo cada pieza a su lugar usando tus manos.',
    },
    sesion: {
      metricas: construirMetricas({ estado, configuracion }),
      errorPersistencia: null,
    },
    estadoActual: {
      fase: estado.fase,
      mensaje: resolverMensajeEstado(estado.fase, estado.mensaje),
      metricas: [
        { etiqueta: 'Progreso', valor: `${estado.contadorEnsambladas}/${PARTES_ROBOT.length}` },
      ],
    },
    salida: {
      permitida: estado.fase === FASES_ENSAMBLAGE.explotado || resultadoVisible,
      etiqueta: 'Volver',
    },
    resultado: resultadoVisible
      ? {
          visible: true,
          titulo: estado.resultado.detalles.ensamblajeCompleto ? 'Robot armado' : 'Buen intento',
          metricas: construirMetricasResultado({ resultado: estado.resultado }),
          logros: cierreSesion?.logros ?? [],
          accionContinuar: accionesResultado?.accionContinuar ?? null,
          etiquetaContinuar: accionesResultado?.etiquetaContinuar ?? null,
          accionSalir: accionesResultado?.accionSalir ?? null,
          etiquetaSalir: accionesResultado?.etiquetaSalir ?? null,
          sincronizandoCierre: accionesResultado?.sincronizandoCierre ?? false,
        }
      : { visible: false },
  };
};
