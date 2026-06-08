import { ESTADOS_ROBOT_TALLER, PIEZAS_ROBOT } from './robotTaller.constants';

const resolverDescripcionEstado = (fase) =>
  ({
    [ESTADOS_ROBOT_TALLER.listo]: 'Tu taller esta listo. Toca "Armar" cuando estes preparado.',
    [ESTADOS_ROBOT_TALLER.mostrandoPatron]:
      'Observa el orden en que brillan las piezas del robot.',
    [ESTADOS_ROBOT_TALLER.esperandoRespuesta]:
      'Ahora arma el robot tocando las piezas en el mismo orden.',
    [ESTADOS_ROBOT_TALLER.completado]:
      'Robot armado. Tus resultados ya quedaron guardados.',
    [ESTADOS_ROBOT_TALLER.fallido]:
      'Esa pieza no encaja. Tu intento quedo guardado para seguir practicando.',
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
  { etiqueta: 'Piezas', valor: configuracion.configuracion.cantidadPiezas },
  { etiqueta: 'Habilidad', valor: configuracion.habilidad },
  { etiqueta: 'Persistencia', valor: persistenciaSesion?.modo ?? 'local' },
  { etiqueta: 'Sync', valor: persistenciaSesion?.estado ?? 'inactiva' },
];

const construirMetricasEstado = ({ estado }) => [
  { etiqueta: 'Tiempo', valor: `${Math.ceil(estado.tiempoRestanteMs / 1000)} s` },
  { etiqueta: 'Aciertos', valor: estado.aciertos },
  { etiqueta: 'Errores', valor: estado.errores },
];

const resolverNumeroFinito = (valor, respaldo = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
};

const construirDatosResultadoOficial = ({
  resultado,
  respuestaFinalizacionSesion,
}) => {
  const resumenOficial = respuestaFinalizacionSesion?.resumen_oficial ?? {};
  return {
    puntaje: resolverNumeroFinito(
      resumenOficial.puntaje,
      resultado.estadisticas.puntaje,
    ),
    aciertos: resolverNumeroFinito(
      resumenOficial.aciertos,
      resultado.estadisticas.aciertos,
    ),
    errores: resolverNumeroFinito(
      resumenOficial.errores,
      resultado.estadisticas.errores,
    ),
    comboMaximo: resolverNumeroFinito(
      resumenOficial.combo_maximo,
      resultado.estadisticas.comboMaximo,
    ),
    estrellasObtenidas:
      resumenOficial.estrellas_obtenidas == null
        ? null
        : resolverNumeroFinito(resumenOficial.estrellas_obtenidas, 0),
  };
};

const construirResumenInfantilResultado = ({
  resultado,
  respuestaFinalizacionSesion,
}) => {
  const datos = construirDatosResultadoOficial({
    resultado,
    respuestaFinalizacionSesion,
  });
  const patronLongitud = resolverNumeroFinito(resultado.detalles.patronLongitud, 0);
  const patronResuelto = Boolean(resultado.detalles.patronResuelto);

  return {
    estrellas: datos.estrellasObtenidas ?? 0,
    estrellasSincronizadas: datos.estrellasObtenidas != null,
    estrellasMaximas: 3,
    aciertos: datos.aciertos,
    errores: datos.errores,
    faltaron: patronResuelto
      ? 0
      : Math.max(0, patronLongitud - datos.aciertos),
    combo: datos.comboMaximo,
    patronLongitud,
    patronResuelto,
  };
};

const construirMetricasResultado = ({
  resultado,
  respuestaFinalizacionSesion,
}) => {
  const datos = construirDatosResultadoOficial({
    resultado,
    respuestaFinalizacionSesion,
  });
  return [
    { etiqueta: 'Puntaje', valor: datos.puntaje },
    { etiqueta: 'Aciertos', valor: datos.aciertos },
    { etiqueta: 'Errores', valor: datos.errores },
    { etiqueta: 'Precision', valor: `${resultado.estadisticas.precisionPct}%` },
    {
      etiqueta: 'Tiempo',
      valor: `${Math.ceil(resultado.estadisticas.tiempoTotalMs / 1000)} s`,
    },
    { etiqueta: 'Combo', valor: datos.comboMaximo },
    { etiqueta: 'Estrellas', valor: datos.estrellasObtenidas ?? '--' },
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
    return 'Robot Lógico ya termino por ahora. Vuelve al tablero para continuar con el siguiente juego.';
  }
  if (cierreSesion.participanteEstado === 'completado') {
    return 'Actividad completada. Al volver al tablero veras tus logros y tu progreso actualizado.';
  }
  if (cierreSesion.participanteEstado === 'abandonado') {
    return 'La actividad se cerro antes de continuar. Vuelve al tablero para revisar tu estado.';
  }
  if (cierreSesion.participanteEstado === 'cerrado') {
    return 'Esta actividad ya quedo cerrada para este estudiante.';
  }
  return 'Tus resultados quedaron guardados para esta actividad.';
};

const construirCopyResultado = ({ resultado, cierreSesion, resumenInfantil }) => {
  const patronResuelto = Boolean(resultado.detalles.patronResuelto);
  return {
    titulo: patronResuelto ? 'Robot armado' : 'Buen intento',
    descripcion: patronResuelto
      ? resumenInfantil.estrellasSincronizadas
        ? `Armaste el robot en ${resumenInfantil.patronLongitud} pasos y ganaste ${resumenInfantil.estrellas} estrellas.`
        : `Armaste el robot en ${resumenInfantil.patronLongitud} pasos. Estamos guardando tus estrellas.`
      : `Llegaste a ${resumenInfantil.aciertos} pasos correctos. Tu avance quedo guardado para seguir practicando.`,
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
      etiquetaContinuar: 'Siguiente reto',
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

const construirPiezasEscena = ({ configuracion, estado, columnas }) => {
  const cantidad = configuracion.configuracion.cantidadPiezas;
  return Array.from({ length: cantidad }).map((_, indice) => {
    const pieza = PIEZAS_ROBOT[indice] ?? PIEZAS_ROBOT[indice % PIEZAS_ROBOT.length];
    const colocada = estado.piezasColocadas.includes(indice);
    return {
      id: pieza.id,
      etiqueta: pieza.etiqueta,
      icono: pieza.icono,
      indice,
      activa: estado.piezaActiva === indice,
      colocada,
      deshabilitada:
        estado.fase !== ESTADOS_ROBOT_TALLER.esperandoRespuesta || colocada,
      varianteColumna: columnas,
    };
  });
};

const construirAccionesEscena = ({
  iniciarPartida,
  fase,
  resultadoVisible,
  preparandoRonda,
}) => ({
  mostrarControlesPrincipales: !resultadoVisible,
  iniciar: {
    etiqueta: preparandoRonda ? 'Preparando...' : 'Armar',
    accion: iniciarPartida,
    deshabilitada:
      resultadoVisible || preparandoRonda || fase !== ESTADOS_ROBOT_TALLER.listo,
  },
});

export const construirEscenaRobotTaller = ({
  configuracion,
  estado,
  columnasTablero,
  persistenciaSesion,
  respuestaInicioSesion,
  respuestaFinalizacionSesion,
  continuarActividad,
  salirActividad,
  iniciarPartida,
  seleccionarPieza,
  preparandoRonda = false,
}) => ({
  salida: {
    permitida:
      estado.fase === ESTADOS_ROBOT_TALLER.listo ||
      Boolean(estado.resultado && respuestaFinalizacionSesion),
    etiqueta:
      estado.fase === ESTADOS_ROBOT_TALLER.listo ||
      Boolean(estado.resultado && respuestaFinalizacionSesion)
        ? 'Volver'
        : 'Espera a terminar',
  },
  encabezado: {
    ceja: 'Reto de logica',
    titulo: 'Robot Lógico',
    subtitulo:
      'Mira el orden en que brillan las piezas y luego armalo en el mismo orden.',
  },
  sesion: {
    titulo: 'Sesion actual',
    descripcion:
      'Cada ronda guarda tu avance y prepara el siguiente reto cuando corresponde.',
    metricas: [
      ...construirMetricasSesion({ configuracion, persistenciaSesion }),
      ...construirResumenSesionBackend({ respuestaInicioSesion }),
    ],
    errorPersistencia: persistenciaSesion?.error ?? null,
  },
  estadoActual: {
    fase: estado.fase,
    titulo: 'Estado actual',
    mensaje: estado.mensaje,
    descripcion: resolverDescripcionEstado(estado.fase),
    metricas: construirMetricasEstado({ estado }),
  },
  tablero: {
    titulo: 'Banco de piezas',
    descripcion:
      'Toca cada pieza en el orden que se mostro. Si tocas una pieza equivocada, la ronda termina.',
    columnas: columnasTablero,
    piezas: construirPiezasEscena({
      configuracion,
      estado,
      columnas: columnasTablero,
    }),
    alSeleccionarPieza: seleccionarPieza,
  },
  acciones: construirAccionesEscena({
    iniciarPartida,
    fase: estado.fase,
    resultadoVisible: Boolean(estado.resultado),
    preparandoRonda,
  }),
  resultado: (() => {
    if (!estado.resultado) {
      return { visible: false };
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
    const resumenInfantil = construirResumenInfantilResultado({
      resultado: estado.resultado,
      respuestaFinalizacionSesion,
    });
    const copyResultado = construirCopyResultado({
      resultado: estado.resultado,
      cierreSesion,
      resumenInfantil,
    });

    return {
      visible: true,
      titulo: copyResultado.titulo,
      descripcion: copyResultado.descripcion,
      mensajeProgreso: copyResultado.mensajeProgreso,
      resumenInfantil,
      mostrarCelebracion:
        resumenInfantil.estrellas >= 2 || Boolean(cierreSesion?.logros?.length),
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
