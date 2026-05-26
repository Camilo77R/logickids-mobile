import { ESTADOS_CAMINO_AR } from './caminoAr.constants';

const resolverDescripcionEstado = (fase) =>
  ({
    [ESTADOS_CAMINO_AR.listo]: 'Prepárate para mirar el camino y recordarlo.',
    [ESTADOS_CAMINO_AR.mostrandoPatron]:
      'Las baldosas se iluminan una por una. Mira con mucha atención.',
    [ESTADOS_CAMINO_AR.esperandoRespuesta]:
      'Ahora te toca tocar las baldosas en el mismo orden.',
    [ESTADOS_CAMINO_AR.completado]:
      'Completaste esta ronda y tus resultados quedaron guardados.',
    [ESTADOS_CAMINO_AR.fallido]:
      'La ronda terminó. Puedes volver a intentarlo con calma.',
  })[fase] ?? 'Seguimos preparando la actividad.';

const construirResumenSesionBackend = ({ respuestaInicioSesion }) => {
  const sesion = respuestaInicioSesion?.sesion;

  if (!sesion) {
    return [];
  }

  return [
    { etiqueta: 'Modo', valor: sesion.modo ?? 'single' },
    { etiqueta: 'Paso', valor: sesion.orden_en_ruta ?? 1 },
    { etiqueta: 'Bloque', valor: sesion.bloque_orden ?? 1 },
    { etiqueta: 'Nivel', valor: sesion.nivel_en_bloque ?? 1 },
  ];
};

const construirMetricasSesion = ({ configuracion, persistenciaSesion }) => [
  { etiqueta: 'Dificultad', valor: configuracion.dificultad },
  { etiqueta: 'Patron', valor: configuracion.configuracion.longitudPatron },
  { etiqueta: 'Baldosas', valor: configuracion.configuracion.cantidadBaldosas },
  { etiqueta: 'Fuente', valor: configuracion.fuenteAdaptacion },
  { etiqueta: 'Persistencia', valor: persistenciaSesion?.modo ?? 'local' },
  { etiqueta: 'Sync', valor: persistenciaSesion?.estado ?? 'inactiva' },
];

const construirMetricasEstado = ({ estado }) => [
  { etiqueta: 'Tiempo', valor: `${Math.ceil(estado.tiempoRestanteMs / 1000)} s` },
  { etiqueta: 'Aciertos', valor: estado.aciertos },
  { etiqueta: 'Errores', valor: estado.errores },
  { etiqueta: 'Pistas', valor: estado.ayudasRestantes },
];

const resolverNumeroFinito = (valor, respaldo = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
};

const construirMetricasResultado = ({
  resultado,
  respuestaFinalizacionSesion,
}) => {
  const resumenOficial = respuestaFinalizacionSesion?.resumen_oficial ?? {};
  const puntajeOficial = resolverNumeroFinito(
    resumenOficial.puntaje,
    resultado.estadisticas.puntaje,
  );
  const aciertosOficiales = resolverNumeroFinito(
    resumenOficial.aciertos,
    resultado.estadisticas.aciertos,
  );
  const erroresOficiales = resolverNumeroFinito(
    resumenOficial.errores,
    resultado.estadisticas.errores,
  );
  const comboOficial = resolverNumeroFinito(
    resumenOficial.combo_maximo,
    resultado.estadisticas.comboMaximo,
  );

  return [
    { etiqueta: 'Puntos', valor: puntajeOficial },
    { etiqueta: 'Aciertos', valor: aciertosOficiales },
    { etiqueta: 'Errores', valor: erroresOficiales },
    { etiqueta: 'Precision', valor: `${resultado.estadisticas.precisionPct}%` },
    {
      etiqueta: 'Tiempo',
      valor: `${Math.ceil(resultado.estadisticas.tiempoTotalMs / 1000)} s`,
    },
    { etiqueta: 'Combo', valor: comboOficial },
  ];
};

const construirResumenCierreSesion = ({
  respuestaInicioSesion,
  respuestaFinalizacionSesion,
}) => {
  if (!respuestaFinalizacionSesion) {
    return null;
  }

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
    resumenOficial: respuestaFinalizacionSesion?.resumen_oficial ?? null,
  };
};

const resolverMensajeProgreso = ({ cierreSesion }) => {
  if (!cierreSesion) {
    return 'Guardando tus resultados y actualizando tu progreso...';
  }

  if (cierreSesion.haySiguientePaso && cierreSesion.siguienteEsMismoJuego) {
    return 'Tus resultados ya quedaron guardados. Sigue con el siguiente nivel cuando quieras.';
  }

  if (cierreSesion.haySiguientePaso && !cierreSesion.siguienteEsMismoJuego) {
    return 'Camino AR ya terminó por ahora. Vuelve al tablero para continuar con el siguiente juego.';
  }

  if (cierreSesion.participanteEstado === 'completado') {
    return 'Actividad completada. Al volver al tablero verás tus logros y tu progreso actualizado.';
  }

  if (cierreSesion.participanteEstado === 'abandonado') {
    return 'La actividad se cerró antes de continuar. Vuelve al tablero para revisar tu estado.';
  }

  if (cierreSesion.participanteEstado === 'cerrado') {
    return 'Esta actividad ya quedó cerrada para este estudiante.';
  }

  return 'Tus resultados quedaron guardados para esta actividad.';
};

const construirCopyResultado = ({ resultado, cierreSesion }) => {
  const patronResuelto = Boolean(resultado.detalles.patronResuelto);

  return {
    titulo: patronResuelto ? '¡Muy bien!' : 'Ronda completada',
    descripcion: patronResuelto
      ? `Recordaste ${resultado.detalles.patronLongitud} luces y ganaste ${resultado.estadisticas.puntaje} puntos.`
      : `Terminaste la ronda con ${resultado.estadisticas.aciertos} aciertos y ${resultado.estadisticas.errores} errores.`,
    mensajeProgreso: resolverMensajeProgreso({ cierreSesion }),
  };
};

const construirAccionResultado = ({
  cierreSesion,
  continuarActividad,
  salirActividad,
}) => {
  if (!cierreSesion) {
    return {
      accionContinuar: null,
      etiquetaContinuar: null,
      accionSalir: null,
      etiquetaSalir: null,
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

  if (cierreSesion.haySiguientePaso && !cierreSesion.siguienteEsMismoJuego) {
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
    accionSalir: salirActividad,
    etiquetaSalir:
      cierreSesion.participanteEstado === 'abandonado'
        ? 'Salir'
        : 'Volver al inicio',
    sincronizandoCierre: false,
  };
};

const construirBaldosasEscena = ({ configuracion, estado, columnasTablero }) =>
  Array.from({ length: configuracion.configuracion.cantidadBaldosas }).map((_, indice) => ({
    id: `baldosa-${indice}`,
    indice,
    numeroVisible: indice + 1,
    activa: estado.baldosaActiva === indice,
    deshabilitada: estado.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta,
    varianteColumna: columnasTablero === 2 ? 'dos' : 'tres',
  }));

const construirAccionesEscena = ({
  iniciarPartida,
  usarPista,
  puedePedirPista,
  fase,
  resultadoVisible,
  preparandoRonda,
}) => ({
  mostrarControlesPrincipales: !resultadoVisible,
  iniciar: {
    etiqueta: preparandoRonda ? 'Preparando...' : 'Comenzar',
    accion: iniciarPartida,
    deshabilitada:
      resultadoVisible || preparandoRonda || fase !== ESTADOS_CAMINO_AR.listo,
  },
  pista: {
    etiqueta: 'Ver de nuevo',
    accion: usarPista,
    deshabilitada: resultadoVisible || preparandoRonda || !puedePedirPista,
  },
});

/**
 * Traduce el estado interno del juego a un modelo de escena reutilizable.
 *
 * POR QUÉ:
 * el renderer AR no deberia mezclar reglas de juego, estado remoto y copy
 * pedagógico. Toda esa traduccion vive aqui.
 */
export const construirEscenaCaminoAr = ({
  configuracion,
  estado,
  columnasTablero,
  persistenciaSesion,
  respuestaInicioSesion,
  respuestaFinalizacionSesion,
  continuarActividad,
  salirActividad,
  iniciarPartida,
  seleccionarBaldosa,
  usarPista,
  puedePedirPista,
  preparandoRonda = false,
}) => ({
  salida: {
    permitida:
      estado.fase === ESTADOS_CAMINO_AR.listo ||
      Boolean(estado.resultado && respuestaFinalizacionSesion),
    etiqueta:
      estado.fase === ESTADOS_CAMINO_AR.listo ||
      Boolean(estado.resultado && respuestaFinalizacionSesion)
        ? 'Volver'
        : 'Espera a terminar',
  },
  encabezado: {
    ceja: 'Memoria en movimiento',
    titulo: 'Camino AR',
    subtitulo:
      'Mira el recorrido de luces y repítelo tocando las baldosas en el mismo orden.',
  },
  sesion: {
    titulo: 'Sesion actual',
    descripcion:
      'El backend decide el nivel, registra los eventos y controla si la actividad continua o termina.',
    metricas: [
      ...construirMetricasSesion({ configuracion, persistenciaSesion }),
      ...construirResumenSesionBackend({ respuestaInicioSesion }),
    ],
    errorPersistencia: persistenciaSesion?.error ?? null,
  },
  estadoActual: {
    titulo: 'Estado actual',
    mensaje: estado.mensaje,
    descripcion: resolverDescripcionEstado(estado.fase),
    metricas: construirMetricasEstado({ estado }),
  },
  tablero: {
    titulo: 'Recorrido activo',
    descripcion:
      'Primero se muestra el patron. Despues el estudiante debe repetirlo en el mismo orden para completar la ronda.',
    columnas: columnasTablero,
    baldosas: construirBaldosasEscena({ configuracion, estado, columnasTablero }),
    alSeleccionarBaldosa: seleccionarBaldosa,
  },
  acciones: construirAccionesEscena({
    iniciarPartida,
    usarPista,
    puedePedirPista,
    fase: estado.fase,
    resultadoVisible: Boolean(estado.resultado),
    preparandoRonda,
  }),
  resultado: (() => {
    if (!estado.resultado) {
      return {
        visible: false,
      };
    }

    const cierreSesion = construirResumenCierreSesion({
      respuestaInicioSesion,
      respuestaFinalizacionSesion,
    });
    const accionesResultado = construirAccionResultado({
      cierreSesion,
      continuarActividad,
      salirActividad,
    });
    const copyResultado = construirCopyResultado({
      resultado: estado.resultado,
      cierreSesion,
    });

    return {
      visible: true,
      titulo: copyResultado.titulo,
      descripcion: copyResultado.descripcion,
      mensajeProgreso: copyResultado.mensajeProgreso,
      metricas: construirMetricasResultado({
        resultado: estado.resultado,
        respuestaFinalizacionSesion,
      }),
      logros: cierreSesion?.logros ?? [],
      resumenOficial: cierreSesion?.resumenOficial ?? null,
      haySiguientePaso: cierreSesion?.haySiguientePaso ?? false,
      siguienteEsMismoJuego: cierreSesion?.siguienteEsMismoJuego ?? false,
      participanteEstado: cierreSesion?.participanteEstado ?? null,
      accionContinuar: accionesResultado.accionContinuar,
      etiquetaContinuar: accionesResultado.etiquetaContinuar,
      accionSalir: accionesResultado.accionSalir,
      etiquetaSalir: accionesResultado.etiquetaSalir,
      sincronizandoCierre: accionesResultado.sincronizandoCierre ?? false,
    };
  })(),
});
