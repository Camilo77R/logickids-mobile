const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarConfiguracionCaminoAr,
} = require('../../src/features/games/camino-ar/caminoArConfiguracion.js');
const {
  MODO_PRESENTACION_CAMINO_AR,
} = require('../../src/features/games/camino-ar/caminoAr.constants.js');
const {
  TIPOS_EVENTO_SESION,
  crearEventoSesion,
  ESTADOS_FINALIZACION_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');
const {
  construirMetadataResultadoCaminoAr,
  construirResumenPartida,
  crearPatronAleatorio,
  MOTIVOS_FIN_CAMINO_AR,
} = require('../../src/features/games/camino-ar/caminoArMotor.js');
const {
  construirEscenaCaminoAr,
} = require('../../src/features/games/camino-ar/caminoArEscena.js');
const {
  construirEscenaEspacialCaminoAr,
} = require('../../src/features/games/camino-ar/caminoArEscenaEspacial.js');
const {
  crearEstadoInicialDeteccionSuperficieAr,
  reducirDeteccionSuperficieAr,
  resolverMensajeDeteccionSuperficieAr,
} = require('../../src/features/games/camino-ar/presentacion/ar/deteccionSuperficieAr.js');
const {
  calcularColocacionTableroAr,
  esPlanoCandidatoAPiso,
  resolverReferenciaPisoDesdeHitTests,
} = require('../../src/features/games/camino-ar/presentacion/ar/posicionamientoTableroAr.js');

test('normalizarConfiguracionCaminoAr usa defaults seguros y valida modo de presentacion', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 0,
    modoPresentacion: 'modo-raro',
    configuracion: {
      cantidadBaldosas: -2,
      longitudPatron: 5,
    },
  });

  assert.equal(configuracion.dificultad, 1);
  assert.equal(
    configuracion.modoPresentacion,
    MODO_PRESENTACION_CAMINO_AR,
  );
  assert.equal(configuracion.configuracion.cantidadBaldosas, 4);
  assert.equal(configuracion.configuracion.longitudPatron, 5);
});

test('normalizarConfiguracionCaminoAr acepta cero pistas en el reto maximo', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 4,
    configuracion: {
      ayudasDisponibles: 0,
      erroresPermitidos: 1,
    },
  });

  assert.equal(configuracion.configuracion.ayudasDisponibles, 0);
  assert.equal(configuracion.configuracion.erroresPermitidos, 1);
});

test('crearPatronAleatorio evita repetir la misma baldosa de forma consecutiva', () => {
  for (let intento = 0; intento < 25; intento += 1) {
    const patron = crearPatronAleatorio({ cantidadBaldosas: 4, longitudPatron: 12 });

    patron.slice(1).forEach((baldosa, indice) => {
      assert.notEqual(baldosa, patron[indice]);
    });
  }
});

test('construirMetadataResultadoCaminoAr entrega el contrato que consume la adaptacion', () => {
  const metadata = construirMetadataResultadoCaminoAr({
    exito: false,
    motivoFin: MOTIVOS_FIN_CAMINO_AR.tiempoAgotado,
    patron: [0, 1, 2, 3],
    aciertos: 3,
    errores: 0,
    ayudasUsadas: 1,
  });

  assert.deepEqual(metadata, {
    game: 'camino-ar',
    end_reason: 'tiempo_agotado',
    pattern_resolved: false,
    progress_pct: 75,
    hints_used: 1,
    errors: 0,
    pattern_length: 4,
  });
});

test('crearEventoSesion rechaza tipos de evento no soportados por backend', () => {
  assert.throws(
    () =>
      crearEventoSesion({
        tipoEvento: 'pista_usada',
        habilidad: 'Memoria',
      }),
    /no soportado/i,
  );

  const eventoValido = crearEventoSesion({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    habilidad: 'Memoria',
    tiempoReaccionMs: 812,
    puntos: 10,
    comboEnEvento: 2,
  });

  assert.deepEqual(eventoValido, {
    tipo_evento: 'acierto',
    habilidad: 'Memoria',
    tiempo_reaccion_ms: 812,
    puntos: 10,
    combo_en_evento: 2,
  });
});

test('construirResumenPartida devuelve contrato comun con estadisticas consistentes', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 3,
    fuenteAdaptacion: 'base',
    versionAdaptacion: 'v1',
    configuracion: {
      cantidadBaldosas: 6,
      longitudPatron: 4,
      ayudasDisponibles: 1,
    },
  });

  const resultado = construirResumenPartida({
    exito: true,
    configuracion,
    aciertos: 4,
    errores: 1,
    ayudasUsadas: 1,
    tiempoTranscurridoMs: 9200,
    patron: [0, 2, 3, 1],
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, 'camino-ar');
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.estadisticas.puntaje, 35);
  assert.equal(resultado.estadisticas.totalIntentos, 5);
  assert.equal(resultado.estadisticas.precisionPct, 80);
  assert.equal(resultado.detalles.patronLongitud, 4);
  assert.equal(resultado.detalles.patronResuelto, true);
});

test('construirResumenPartida marca completado cuando la ronda termina aunque el patron falle', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 1,
    configuracion: {
      cantidadBaldosas: 4,
      longitudPatron: 3,
      ayudasDisponibles: 1,
    },
  });

  const resultado = construirResumenPartida({
    exito: false,
    configuracion,
    aciertos: 2,
    errores: 1,
    ayudasUsadas: 0,
    tiempoTranscurridoMs: 7000,
    patron: [0, 1, 2],
  });

  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.detalles.patronResuelto, false);
  assert.equal(resultado.estadisticas.estadoSesion, ESTADOS_FINALIZACION_SESION.completado);
});

test('construirEscenaCaminoAr traduce el estado a una escena reusable para cualquier renderer', () => {
  const accionesInvocadas = [];
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 2,
    configuracion: {
      cantidadBaldosas: 4,
      longitudPatron: 3,
      tiempoLimiteMs: 15000,
      ayudasDisponibles: 1,
    },
  });

  const escena = construirEscenaCaminoAr({
    configuracion,
    estado: {
      fase: 'esperandoRespuesta',
      mensaje: 'Ahora repite el recorrido tocando cada baldosa en orden.',
      tiempoRestanteMs: 9100,
      ayudasRestantes: 1,
      aciertos: 2,
      errores: 0,
      baldosaActiva: 1,
      resultado: null,
    },
    columnasTablero: 2,
    persistenciaSesion: {
      modo: 'local',
      estado: 'inactiva',
      error: null,
    },
    iniciarPartida: () => accionesInvocadas.push('iniciar'),
    seleccionarBaldosa: (indice) => accionesInvocadas.push(`baldosa:${indice}`),
    usarPista: () => accionesInvocadas.push('pista'),
    puedePedirPista: true,
  });

  assert.equal(escena.encabezado.titulo, 'Camino AR');
  assert.equal(escena.sesion.metricas[0].valor, 2);
  assert.equal(escena.estadoActual.metricas[0].valor, '10 s');
  assert.equal(escena.tablero.baldosas.length, 4);
  assert.equal(escena.tablero.baldosas[1].activa, true);
  assert.equal(escena.tablero.baldosas[0].varianteColumna, 'dos');
  assert.equal(escena.acciones.pista.deshabilitada, false);
  assert.equal(escena.acciones.mostrarControlesPrincipales, true);
  assert.equal(escena.acciones.iniciar.deshabilitada, true);
  assert.equal(escena.salida.permitida, false);

  escena.acciones.iniciar.accion();
  escena.tablero.alSeleccionarBaldosa(3);

  assert.deepEqual(accionesInvocadas, ['iniciar', 'baldosa:3']);
});

test('construirEscenaCaminoAr usa resumen oficial, logros y progreso para el cierre final', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 2,
    configuracion: {
      cantidadBaldosas: 4,
      longitudPatron: 3,
      tiempoLimiteMs: 15000,
      ayudasDisponibles: 1,
    },
  });

  const escena = construirEscenaCaminoAr({
    configuracion,
    estado: {
      fase: 'completado',
      mensaje: 'Actividad completada.',
      tiempoRestanteMs: 0,
      ayudasRestantes: 0,
      aciertos: 2,
      errores: 1,
      baldosaActiva: null,
      resultado: {
        estadisticas: {
          puntaje: 20,
          aciertos: 2,
          errores: 1,
          precisionPct: 66.67,
          comboMaximo: 2,
          tiempoTotalMs: 7800,
        },
        detalles: {
          patronLongitud: 3,
          patronResuelto: false,
        },
      },
    },
    columnasTablero: 2,
    persistenciaSesion: {
      modo: 'remota',
      estado: 'finalizada',
      error: null,
    },
    respuestaInicioSesion: {
      sesion: {
        minijuego_id: 1,
      },
    },
    respuestaFinalizacionSesion: {
      resumen_oficial: {
        puntaje: 25,
        aciertos: 2,
        errores: 1,
        combo_maximo: 2,
      },
      logros_desbloqueados: [
        {
          id: 1,
          nombre_logro: 'Primer intento',
          descripcion: 'Completaste tu primera sesión.',
        },
      ],
      progreso_ruta: {
        haySiguientePaso: false,
        participanteEstado: 'completado',
      },
    },
    iniciarPartida: () => {},
    seleccionarBaldosa: () => {},
    usarPista: () => {},
    puedePedirPista: false,
    salirActividad: () => {},
  });

  assert.equal(escena.resultado.visible, true);
  assert.equal(escena.resultado.titulo, 'Buen intento');
  assert.match(escena.resultado.mensajeProgreso, /Actividad completada/i);
  assert.equal(escena.resultado.metricas[0].valor, 25);
  assert.equal(escena.resultado.metricas[1].valor, 2);
  assert.equal(escena.resultado.logros.length, 1);
  assert.equal(escena.resultado.etiquetaSalir, 'Volver al tablero');
});

test('construirEscenaCaminoAr congela estrellas visuales mientras sincroniza cierre', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 2,
    configuracion: {
      cantidadBaldosas: 4,
      longitudPatron: 3,
      tiempoLimiteMs: 15000,
      ayudasDisponibles: 1,
    },
  });

  const escena = construirEscenaCaminoAr({
    configuracion,
    estado: {
      fase: 'completado',
      mensaje: 'Actividad completada.',
      tiempoRestanteMs: 0,
      ayudasRestantes: 0,
      aciertos: 3,
      errores: 0,
      baldosaActiva: null,
      resultado: construirResumenPartida({
        exito: true,
        configuracion,
        aciertos: 3,
        errores: 0,
        ayudasUsadas: 0,
        tiempoTranscurridoMs: 6200,
        patron: [0, 1, 2],
      }),
    },
    columnasTablero: 2,
    persistenciaSesion: {
      modo: 'remota',
      estado: 'finalizando',
      error: null,
    },
    respuestaInicioSesion: {
      sesion: {
        minijuego_id: 1,
      },
    },
    respuestaFinalizacionSesion: null,
    iniciarPartida: () => {},
    seleccionarBaldosa: () => {},
    usarPista: () => {},
    puedePedirPista: false,
    salirActividad: () => {},
  });

  assert.equal(escena.resultado.visible, true);
  assert.equal(escena.resultado.resumenInfantil.estrellas, 3);
  assert.match(escena.resultado.descripcion, /ganaste 3 estrellas/i);
  assert.match(escena.resultado.mensajeProgreso, /segundo plano/i);
  assert.equal(escena.resultado.accionSalir, null);
  assert.equal(escena.resultado.etiquetaSalir, null);
  assert.equal(escena.resultado.sincronizandoCierre, true);
});

test('construirEscenaEspacialCaminoAr deja listo un modelo AR agnostico al renderer', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 2,
    modoPresentacion: MODO_PRESENTACION_CAMINO_AR,
    configuracion: {
      cantidadBaldosas: 4,
      longitudPatron: 3,
    },
  });

  const escena = construirEscenaCaminoAr({
    configuracion,
    estado: {
      fase: 'esperandoRespuesta',
      mensaje: 'Repite el recorrido tocando cada baldosa en orden.',
      tiempoRestanteMs: 8000,
      ayudasRestantes: 1,
      aciertos: 1,
      errores: 0,
      baldosaActiva: 2,
      resultado: null,
    },
    columnasTablero: 2,
    persistenciaSesion: {
      modo: 'local',
      estado: 'inactiva',
      error: null,
    },
    iniciarPartida: () => {},
    reiniciarPartida: () => {},
    seleccionarBaldosa: () => {},
    usarPista: () => {},
    puedePedirPista: true,
  });

  const escenaEspacial = construirEscenaEspacialCaminoAr({
    escena,
    configuracion,
  });

  assert.equal(escenaEspacial.plano.tipo, 'horizontal');
  assert.equal(escenaEspacial.plano.ancho, 0.78);
  assert.equal(escenaEspacial.plano.profundo, 0.78);
  assert.equal(escenaEspacial.baldosas.length, 4);
  assert.deepEqual(escenaEspacial.baldosas[0].posicion, [-0.16, 0, -0.16]);
  assert.deepEqual(escenaEspacial.baldosas[2].posicion, [-0.16, 0, 0.16]);
  assert.equal(escenaEspacial.baldosas[2].estadoVisual, 'activa');
  assert.equal(escenaEspacial.adaptacion.modoPresentacion, 'realidad-aumentada');
});

test('reducirDeteccionSuperficieAr modela la busqueda y fijacion del piso sin acoplarse al juego', () => {
  const estadoInicial = crearEstadoInicialDeteccionSuperficieAr();

  const estadoConSuperficie = reducirDeteccionSuperficieAr(estadoInicial, {
    tipo: 'ancla-registrada',
    cantidadSuperficies: 2,
  });

  assert.equal(estadoConSuperficie.estado, 'superficies-disponibles');
  assert.equal(estadoConSuperficie.cantidadSuperficies, 2);
  assert.match(resolverMensajeDeteccionSuperficieAr(estadoConSuperficie), /Toque una zona del piso/i);

  const estadoSeleccionado = reducirDeteccionSuperficieAr(estadoConSuperficie, {
    tipo: 'superficie-seleccionada',
  });

  assert.equal(estadoSeleccionado.estado, 'superficie-seleccionada');
  assert.equal(estadoSeleccionado.superficieSeleccionada, true);

  const estadoReiniciado = reducirDeteccionSuperficieAr(estadoSeleccionado, {
    tipo: 'reiniciar-seleccion',
  });

  assert.equal(estadoReiniciado.estado, 'buscando');
  assert.equal(estadoReiniciado.cantidadSuperficies, 0);
});

test('esPlanoCandidatoAPiso filtra superficies elevadas que no parecen piso', () => {
  const posicionCamara = [0, 1.45, 0];

  assert.equal(
    esPlanoCandidatoAPiso({
      plano: { position: [0.15, 0.02, -0.8] },
      posicionCamara,
    }),
    true,
  );

  assert.equal(
    esPlanoCandidatoAPiso({
      plano: { position: [0, 1.2, -0.5] },
      posicionCamara,
    }),
    false,
  );
});

test('calcularColocacionTableroAr usa la altura del plano para no levantar el tablero', () => {
  const colocacion = calcularColocacionTableroAr({
    puntoToque: [0.1, 0.65, -0.6],
    posicionCamara: [0, 1.45, 0],
    alturaPlano: 0.02,
    anchoTablero: 0.74,
    profundoTablero: 0.74,
  });

  assert.equal(colocacion.posicion[1], 0.026);
  assert.ok(colocacion.posicion[2] < -0.6);
});

test('resolverReferenciaPisoDesdeHitTests elige un plano real antes que una estimacion', () => {
  const referencia = resolverReferenciaPisoDesdeHitTests({
    posicionCamara: [0, 1.45, 0],
    hitTestResults: [
      {
        type: 'EstimatedHorizontalPlane',
        transform: {
          position: [0.05, 0.02, -0.7],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
      {
        type: 'ExistingPlaneUsingExtent',
        transform: {
          position: [0, 0.01, -0.9],
          rotation: [0, 10, 0],
          scale: [1, 1, 1],
        },
      },
    ],
  });

  assert.equal(referencia.tipo, 'ExistingPlaneUsingExtent');
  assert.deepEqual(referencia.posicion, [0, 0.01, -0.9]);
});
