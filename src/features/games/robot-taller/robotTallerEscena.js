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

const construirResumenCierreSesion = ({ respuestaFinalizacionSesion }) => {
  if (!respuestaFinalizacionSesion) return null;
  const logros = Array.isArray(respuestaFinalizacionSesion.logros_desbloqueados)
    ? respuestaFinalizacionSesion.logros_desbloqueados
    : [];
  const progreso = respuestaFinalizacionSesion.progreso_ruta ?? null;
  return { logros, haySiguientePaso: Boolean(progreso?.haySiguientePaso), participanteEstado: progreso?.participanteEstado ?? null };
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
  const cierreSesion = resultadoVisible ? construirResumenCierreSesion({ respuestaFinalizacionSesion }) : null;

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
          accionContinuar: continuarActividad ?? null,
          etiquetaContinuar: cierreSesion?.haySiguientePaso ? 'Siguiente Nivel' : 'Reintentar',
          accionSalir: salirActividad,
          etiquetaSalir: 'Volver al inicio',
          sincronizandoCierre: false,
        }
      : { visible: false },
  };
};
