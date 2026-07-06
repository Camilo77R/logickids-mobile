import { FASES_ENSAMBLAGE, MODO_PRESENTACION_ROBOT_TALLER } from './robotTaller.constants';
import { resolvePostGameNavigation, resolveSessionClosure } from '../core/postGameFlow';

const resolverMensajeEstado = (fase, mensaje) =>
  fase === FASES_ENSAMBLAGE.completado ? 'Robot armado. Tus resultados quedaron guardados.' : mensaje;

const construirMetricas = ({ estado, configuracion }) => [
  { etiqueta: 'Dificultad', valor: configuracion.dificultad },
  { etiqueta: 'Partes', valor: estado.partes.length },
  { etiqueta: 'Habilidad', valor: configuracion.habilidad },
  { etiqueta: 'Ensambladas', valor: estado.contadorEnsambladas },
];

const resolverNumeroFinito = (valor, respaldo = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
};

const construirMetricasResultado = ({ resultado, respuestaFinalizacionSesion }) => {
  const resumenOficial = respuestaFinalizacionSesion?.resumen_oficial ?? {};

  return [
    {
      etiqueta: 'Puntaje',
      valor: resolverNumeroFinito(
        resumenOficial.puntaje,
        resultado.estadisticas.puntaje,
      ),
    },
    {
      etiqueta: 'Aciertos',
      valor: resolverNumeroFinito(
        resumenOficial.aciertos,
        resultado.estadisticas.aciertos,
      ),
    },
    {
      etiqueta: 'Errores',
      valor: resolverNumeroFinito(
        resumenOficial.errores,
        resultado.estadisticas.errores,
      ),
    },
    {
      etiqueta: 'Combo',
      valor: `x${resolverNumeroFinito(
        resumenOficial.combo_maximo,
        resultado.estadisticas.comboMaximo,
      )}`,
    },
  ];
};

const GUIA_INICIAL_ROBOT_TALLER = Object.freeze({
  titulo: '¡Bienvenido al Taller del Robot!',
  mensaje: 'Yo te acompaño mientras armas el robot. Gana piezas, arrastralas a su lugar y completa el reto.',
  pasos: [
    'Resuelve la cuenta para desbloquear una pieza.',
    'Toca la pieza ganada y arrastrala hasta su silueta brillante.',
    'Completa todo el robot para terminar la mision.',
  ],
  accion: 'Empezar mision',
});

const calcularEstrellasResultado = (resultado) => {
  const precision = Number(resultado?.estadisticas?.precisionPct ?? 0);

  if (precision >= 90) return 3;
  if (precision >= 70) return 2;
  if (precision > 0) return 1;
  return 0;
};

const construirDescripcionResultado = ({ resultado }) => (
  resultado.detalles.ensamblajeCompleto
    ? 'Completaste el robot y dejaste todas sus piezas en el lugar correcto.'
    : 'Avanzaste en el ensamblaje y tus resultados quedaron listos para seguir aprendiendo.'
);

const construirMensajeProgreso = ({ sincronizandoCierre, resultado }) => {
  if (sincronizandoCierre) {
    return 'Estamos guardando tu resultado para dejar el robot listo en tu progreso.';
  }

  return resultado.detalles.ensamblajeCompleto
    ? 'Tu robot quedo armado y tus resultados ya fueron guardados.'
    : 'Tu avance ya quedo guardado para esta actividad.';
};

const construirAccionesResultado = ({ navegacionResultado, continuarActividad, salirActividad }) => {
  if (!navegacionResultado) {
    return {
      accionContinuar: null,
      etiquetaContinuar: null,
      accionSalir: null,
      etiquetaSalir: null,
      sincronizandoCierre: true,
    };
  }

  if (navegacionResultado.shouldContinue) {
    return {
      accionContinuar: continuarActividad,
      etiquetaContinuar: 'Siguiente nivel',
      accionSalir: null,
      etiquetaSalir: null,
      sincronizandoCierre: false,
    };
  }

  if (navegacionResultado.shouldExit) {
    return {
      accionContinuar: null,
      etiquetaContinuar: null,
      accionSalir: salirActividad,
      etiquetaSalir: 'Volver al tablero',
      sincronizandoCierre: false,
    };
  }

  return {
    accionContinuar: null,
    etiquetaContinuar: null,
    accionSalir: null,
    etiquetaSalir: null,
    sincronizandoCierre: true,
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
  contextoSesion,
}) => {
  const resultadoVisible = Boolean(estado.resultado);
  const cierreSesion = resultadoVisible
    ? resolveSessionClosure({
        responseStartSession: respuestaInicioSesion,
        responseFinalizationSession: respuestaFinalizacionSesion,
      })
    : null;
  const navegacionResultado = resultadoVisible
    ? resolvePostGameNavigation({
        sessionContext: contextoSesion,
        responseStartSession: respuestaInicioSesion,
        responseFinalizationSession: respuestaFinalizacionSesion,
      })
    : null;
  const accionesResultado = resultadoVisible
    ? construirAccionesResultado({ navegacionResultado, continuarActividad, salirActividad })
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
        { etiqueta: 'Progreso', valor: `${estado.contadorEnsambladas}/${estado.partes.length}` },
      ],
    },
    guiaInicial: {
      titulo: GUIA_INICIAL_ROBOT_TALLER.titulo,
      mensaje: GUIA_INICIAL_ROBOT_TALLER.mensaje,
      pasos: GUIA_INICIAL_ROBOT_TALLER.pasos,
      accion: GUIA_INICIAL_ROBOT_TALLER.accion,
    },
    salida: {
      permitida: estado.fase === FASES_ENSAMBLAGE.explotado || resultadoVisible,
      etiqueta: 'Volver',
    },
    resultado: resultadoVisible
      ? {
          visible: true,
          cinta: estado.resultado.detalles.ensamblajeCompleto ? 'VICTORIA' : 'RETO TERMINADO',
          insignia: 'Robot Logico · Logica',
          titulo: estado.resultado.detalles.ensamblajeCompleto ? 'Robot armado' : 'Buen intento',
          descripcion: construirDescripcionResultado({ resultado: estado.resultado }),
          estrellas: calcularEstrellasResultado(estado.resultado),
          metricas: construirMetricasResultado({
            resultado: estado.resultado,
            respuestaFinalizacionSesion,
          }),
          mostrarCelebracion: Boolean(estado.resultado.detalles.ensamblajeCompleto),
          mensajeProgreso: construirMensajeProgreso({
            sincronizandoCierre: accionesResultado?.sincronizandoCierre ?? false,
            resultado: estado.resultado,
          }),
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
