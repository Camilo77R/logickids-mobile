import { ESTADOS_CAMINO_AR } from './caminoAr.constants';

const resolverDescripcionEstado = (fase) =>
  ({
    [ESTADOS_CAMINO_AR.listo]: 'Tu camino magico ya esta listo.',
    [ESTADOS_CAMINO_AR.mostrandoPatron]:
      'Las luces te muestran la ruta secreta.',
    [ESTADOS_CAMINO_AR.esperandoRespuesta]:
      'Ahora sigue la misma ruta con tus dedos.',
    [ESTADOS_CAMINO_AR.completado]:
      'Terminaste esta ronda y tu avance ya quedo guardado.',
    [ESTADOS_CAMINO_AR.fallido]:
      'La ronda termino y tu intento tambien quedo guardado.',
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

const limitarEstrellasResultado = (valor) =>
  Math.max(0, Math.min(3, Math.round(resolverNumeroFinito(valor, 0))));

const resolverEstrellasVisualesResultado = (resultado) => {
  const estrellasDeclaradas = resultado?.detalles?.estrellasVisuales;

  if (estrellasDeclaradas != null) {
    return limitarEstrellasResultado(estrellasDeclaradas);
  }

  const patronResuelto = Boolean(resultado?.detalles?.patronResuelto);
  const aciertos = resolverNumeroFinito(resultado?.estadisticas?.aciertos, 0);
  const errores = resolverNumeroFinito(resultado?.estadisticas?.errores, 0);

  if (patronResuelto && errores === 0) {
    return 3;
  }

  if (patronResuelto) {
    return errores <= 1 ? 2 : 1;
  }

  return aciertos > 0 ? 1 : 0;
};

const construirDatosResultadoOficial = ({
  resultado,
  respuestaFinalizacionSesion,
}) => {
  const resumenOficial = respuestaFinalizacionSesion?.resumen_oficial ?? {};
  const estrellasObtenidas = resumenOficial.estrellas_obtenidas;

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
      estrellasObtenidas == null ? null : resolverNumeroFinito(estrellasObtenidas, 0),
  };
};

const construirResumenInfantilResultado = ({
  resultado,
  respuestaFinalizacionSesion,
}) => {
  const datosResultado = construirDatosResultadoOficial({
    resultado,
    respuestaFinalizacionSesion,
  });
  const patronLongitud = resolverNumeroFinito(resultado.detalles.patronLongitud, 0);
  const patronResuelto = Boolean(resultado.detalles.patronResuelto);
  const estrellasVisuales = resolverEstrellasVisualesResultado(resultado);

  return {
    estrellas: estrellasVisuales,
    estrellasSincronizadas: datosResultado.estrellasObtenidas != null,
    estrellasMaximas: 3,
    aciertos: datosResultado.aciertos,
    errores: datosResultado.errores,
    faltaron: patronResuelto
      ? 0
      : Math.max(0, patronLongitud - datosResultado.aciertos),
    combo: datosResultado.comboMaximo,
    patronLongitud,
    patronResuelto,
  };
};

const construirMetricasResultado = ({
  resultado,
  respuestaFinalizacionSesion,
}) => {
  const datosResultado = construirDatosResultadoOficial({
    resultado,
    respuestaFinalizacionSesion,
  });
  const estrellasVisuales = resolverEstrellasVisualesResultado(resultado);

  return [
    { etiqueta: 'Puntaje', valor: datosResultado.puntaje },
    { etiqueta: 'Aciertos', valor: datosResultado.aciertos },
    { etiqueta: 'Errores', valor: datosResultado.errores },
    { etiqueta: 'Precision', valor: `${resultado.estadisticas.precisionPct}%` },
    {
      etiqueta: 'Tiempo',
      valor: `${Math.ceil(resultado.estadisticas.tiempoTotalMs / 1000)} s`,
    },
    { etiqueta: 'Combo', valor: datosResultado.comboMaximo },
    { etiqueta: 'Estrellas', valor: estrellasVisuales },
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
    return 'Resultado listo. Guardamos tu progreso en segundo plano.';
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

const construirCopyResultado = ({ resultado, cierreSesion, resumenInfantil }) => {
  const patronResuelto = Boolean(resultado.detalles.patronResuelto);

  return {
    titulo: patronResuelto ? 'Misión cumplida' : 'Buen intento',
    descripcion: patronResuelto
      ? `Seguiste ${resumenInfantil.patronLongitud} luces y ganaste ${resumenInfantil.estrellas} ${resumenInfantil.estrellas === 1 ? 'estrella' : 'estrellas'}.`
      : `Llegaste a ${resumenInfantil.aciertos} aciertos. Tu avance quedo guardado para seguir practicando.`,
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
        : 'Volver al tablero',
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
    etiqueta: preparandoRonda ? 'Preparando...' : 'Vamos',
    accion: iniciarPartida,
    deshabilitada:
      resultadoVisible || preparandoRonda || fase !== ESTADOS_CAMINO_AR.listo,
  },
  pista: {
    etiqueta: 'Ver camino',
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
    ceja: 'Reto de memoria',
    titulo: 'Camino AR',
    subtitulo: 'Mira la ruta de luces y repitela tocando las baldosas en el mismo orden.',
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
