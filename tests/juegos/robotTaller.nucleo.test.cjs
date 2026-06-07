const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarConfiguracionRobotTaller,
} = require('../../src/features/games/robot-taller/robotTallerConfiguracion.js');
const {
  MODO_PRESENTACION_ROBOT_TALLER,
  PIEZAS_ROBOT,
} = require('../../src/features/games/robot-taller/robotTaller.constants.js');
const {
  TIPOS_EVENTO_SESION,
  crearEventoSesion,
  ESTADOS_FINALIZACION_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');
const {
  construirResumenPartidaRobotTaller,
  crearPatronPiezasAleatorio,
  resolverCantidadColumnas,
  construirEventoRobotTaller,
} = require('../../src/features/games/robot-taller/robotTallerMotor.js');
const {
  construirEscenaRobotTaller,
} = require('../../src/features/games/robot-taller/robotTallerEscena.js');

test('normalizarConfiguracionRobotTaller usa defaults seguros y valida modo de presentacion', () => {
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 0,
    modoPresentacion: 'modo-raro',
    configuracion: {
      cantidadPiezas: -2,
      longitudPatron: 4,
    },
  });

  assert.equal(configuracion.dificultad, 2);
  assert.equal(
    configuracion.modoPresentacion,
    MODO_PRESENTACION_ROBOT_TALLER,
  );
  assert.equal(configuracion.configuracion.cantidadPiezas, 6);
  assert.equal(configuracion.configuracion.longitudPatron, 4);
  assert.equal(configuracion.habilidad, 'Lógica');
  assert.equal(configuracion.slug, 'robot-taller');
});

test('crearEventoRobotTaller reporta habilidad Logica y tipos de evento soportados', () => {
  assert.throws(
    () =>
      construirEventoRobotTaller({
        tipoEvento: 'pista_usada',
        habilidad: 'Lógica',
      }),
    /no soportado/i,
  );

  const eventoAcierto = construirEventoRobotTaller({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    tiempoReaccionMs: 950,
    puntos: 12,
    comboEnEvento: 3,
    metadata: { pieza_seleccionada: 1, pieza_esperada: 1 },
  });

  assert.equal(eventoAcierto.tipo_evento, 'acierto');
  assert.equal(eventoAcierto.habilidad, 'Lógica');
  assert.equal(eventoAcierto.tiempo_reaccion_ms, 950);
  assert.equal(eventoAcierto.puntos, 12);
  assert.equal(eventoAcierto.combo_en_evento, 3);
  assert.deepEqual(eventoAcierto.metadata, { pieza_seleccionada: 1, pieza_esperada: 1 });

  const eventoError = construirEventoRobotTaller({
    tipoEvento: TIPOS_EVENTO_SESION.error,
    puntos: 0,
  });
  assert.equal(eventoError.tipo_evento, 'error');
  assert.equal(eventoError.habilidad, 'Lógica');
});

test('crearPatronPiezasAleatorio respeta cantidad y longitud y todos los indices son validos', () => {
  const cantidadPiezas = 5;
  const longitudPatron = 6;
  const patron = crearPatronPiezasAleatorio({ cantidadPiezas, longitudPatron });

  assert.equal(patron.length, longitudPatron);
  for (const indice of patron) {
    assert.ok(Number.isInteger(indice));
    assert.ok(indice >= 0 && indice < cantidadPiezas);
  }
});

test('resolverCantidadColumnas devuelve un layout razonable para tableros chicos y grandes', () => {
  assert.equal(resolverCantidadColumnas(2), 3);
  assert.equal(resolverCantidadColumnas(5), 3);
  assert.equal(resolverCantidadColumnas(9), 4);
});

test('construirResumenPartidaRobotTaller devuelve contrato comun con estadisticas consistentes', () => {
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 3,
    fuenteAdaptacion: 'base',
    versionAdaptacion: 'v1',
    configuracion: {
      cantidadPiezas: 6,
      longitudPatron: 4,
    },
  });

  const resultado = construirResumenPartidaRobotTaller({
    exito: true,
    configuracion,
    aciertos: 4,
    errores: 0,
    tiempoTranscurridoMs: 11200,
    patron: [0, 1, 2, 3],
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, 'robot-taller');
  assert.equal(resultado.juego.habilidad, 'Lógica');
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.estadisticas.puntaje, 48);
  assert.equal(resultado.estadisticas.totalIntentos, 4);
  assert.equal(resultado.estadisticas.precisionPct, 100);
  assert.equal(resultado.detalles.patronLongitud, 4);
  assert.equal(resultado.detalles.patronResuelto, true);
  assert.deepEqual(resultado.detalles.piezasUtilizadas, PIEZAS_ROBOT.map((p) => p.id));
});

test('construirResumenPartidaRobotTaller penaliza errores y nunca deja puntaje negativo', () => {
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 1,
    configuracion: {
      cantidadPiezas: 4,
      longitudPatron: 3,
    },
  });

  const resultado = construirResumenPartidaRobotTaller({
    exito: false,
    configuracion,
    aciertos: 1,
    errores: 3,
    tiempoTranscurridoMs: 9000,
    patron: [0, 1, 2],
  });

  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.detalles.patronResuelto, false);
  assert.equal(resultado.estadisticas.puntaje, 0);
  assert.equal(resultado.estadisticas.precisionPct, 25);
});

test('construirEscenaRobotTaller traduce el estado a una escena reusable para cualquier renderer', () => {
  const accionesInvocadas = [];
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 2,
    configuracion: {
      cantidadPiezas: 4,
      longitudPatron: 3,
      tiempoLimiteMs: 15000,
    },
  });

  const escena = construirEscenaRobotTaller({
    configuracion,
    estado: {
      fase: 'esperandoRespuesta',
      mensaje: 'Arma el robot tocando cada pieza en orden.',
      tiempoRestanteMs: 11200,
      aciertos: 1,
      errores: 0,
      piezaActiva: 1,
      piezasColocadas: [0],
      patron: [0, 1, 2],
      resultado: null,
    },
    columnasTablero: 3,
    persistenciaSesion: {
      modo: 'local',
      estado: 'inactiva',
      error: null,
    },
    iniciarPartida: () => accionesInvocadas.push('iniciar'),
    seleccionarPieza: (indice) => accionesInvocadas.push(`pieza:${indice}`),
  });

  assert.equal(escena.encabezado.titulo, 'Taller del Robot');
  assert.equal(escena.sesion.metricas[3].valor, 'Lógica');
  assert.equal(escena.estadoActual.metricas[0].valor, '12 s');
  assert.equal(escena.tablero.piezas.length, 4);
  assert.equal(escena.tablero.piezas[1].activa, true);
  assert.equal(escena.tablero.piezas[0].colocada, true);
  assert.equal(escena.acciones.iniciar.deshabilitada, true);
  assert.equal(escena.salida.permitida, false);

  escena.acciones.iniciar.accion();
  escena.tablero.alSeleccionarPieza(2);

  assert.deepEqual(accionesInvocadas, ['iniciar', 'pieza:2']);
});

test('construirEscenaRobotTaller usa resumen oficial, logros y progreso para el cierre final', () => {
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 2,
    configuracion: {
      cantidadPiezas: 4,
      longitudPatron: 3,
      tiempoLimiteMs: 15000,
    },
  });

  const escena = construirEscenaRobotTaller({
    configuracion,
    estado: {
      fase: 'completado',
      mensaje: 'Robot armado.',
      tiempoRestanteMs: 0,
      aciertos: 3,
      errores: 1,
      piezaActiva: null,
      piezasColocadas: [0, 1, 2],
      patron: [0, 1, 2],
      resultado: {
        estadisticas: {
          puntaje: 30,
          aciertos: 3,
          errores: 1,
          precisionPct: 75,
          comboMaximo: 3,
          tiempoTotalMs: 8400,
        },
        detalles: {
          patronLongitud: 3,
          patronResuelto: true,
          cantidadPiezas: 4,
        },
      },
    },
    columnasTablero: 3,
    persistenciaSesion: {
      modo: 'remota',
      estado: 'finalizada',
      error: null,
    },
    respuestaInicioSesion: {
      sesion: {
        minijuego_id: 4,
      },
    },
    respuestaFinalizacionSesion: {
      resumen_oficial: {
        puntaje: 32,
        aciertos: 3,
        errores: 1,
        combo_maximo: 3,
        estrellas_obtenidas: 2,
      },
      logros_desbloqueados: [
        {
          id: 7,
          nombre_logro: 'Primer robot',
          descripcion: 'Armaste tu primer robot.',
        },
      ],
      progreso_ruta: {
        haySiguientePaso: false,
        participanteEstado: 'completado',
      },
    },
    iniciarPartida: () => {},
    seleccionarPieza: () => {},
    salirActividad: () => {},
  });

  assert.equal(escena.resultado.visible, true);
  assert.equal(escena.resultado.titulo, 'Robot armado');
  assert.match(escena.resultado.mensajeProgreso, /Actividad completada/i);
  assert.equal(escena.resultado.metricas[0].valor, 32);
  assert.equal(escena.resultado.metricas[1].valor, 3);
  assert.equal(escena.resultado.logros.length, 1);
  assert.equal(escena.resultado.etiquetaSalir, 'Volver al inicio');
});

test('crearEventoSesion del core rechaza tipos no soportados por el backend', () => {
  assert.throws(
    () =>
      crearEventoSesion({
        tipoEvento: 'finalizo_ronda',
        habilidad: 'Lógica',
      }),
    /no soportado/i,
  );
});
