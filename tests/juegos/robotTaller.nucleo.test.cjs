const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarConfiguracionRobotTaller,
} = require('../../src/features/games/robot-taller/robotTallerConfiguracion.js');
const {
  MODO_PRESENTACION_ROBOT_TALLER,
  PARTES_ROBOT,
  FASES_ENSAMBLAGE,
} = require('../../src/features/games/robot-taller/robotTaller.constants.js');
const {
  TIPOS_EVENTO_SESION,
  ESTADOS_FINALIZACION_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');
const {
  construirResumenPartidaEnsamblaje,
  construirEventoEnsamblaje,
  detectarSnap,
} = require('../../src/features/games/robot-taller/robotTallerMotor.js');
const {
  calcularTiempoRestanteRobotTaller,
  createRobotTallerCheckpointState,
  parseRobotTallerCheckpointState,
  restoreRobotTallerCheckpointState,
} = require('../../src/features/games/robot-taller/aplicacion/robotTallerCheckpoint.js');

test('normalizarConfiguracionRobotTaller usa defaults seguros y valida modo de presentacion', () => {
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 0,
    modoPresentacion: 'modo-raro',
    configuracion: {
      tiempoLimiteMs: -5000,
    },
  });

  assert.equal(configuracion.dificultad, 2);
  assert.equal(configuracion.modoPresentacion, MODO_PRESENTACION_ROBOT_TALLER);
  assert.equal(configuracion.configuracion.tiempoLimiteMs, 120000);
  assert.equal(configuracion.habilidad, 'Lógica');
  assert.equal(configuracion.slug, 'robot-logico');
});

test('PARTES_ROBOT define 7 piezas con formas y posiciones', () => {
  assert.equal(PARTES_ROBOT.length, 7);
  const ids = PARTES_ROBOT.map((p) => p.id);
  assert.ok(ids.includes('cabeza'));
  assert.ok(ids.includes('torso'));
  assert.ok(ids.includes('brazo_izq'));
  assert.ok(ids.includes('brazo_der'));
  assert.ok(ids.includes('pierna_izq'));
  assert.ok(ids.includes('pierna_der'));
  assert.ok(ids.includes('antena'));
  PARTES_ROBOT.forEach((parte) => {
    assert.ok(Array.isArray(parte.posicionExplotada));
    assert.ok(Array.isArray(parte.posicionObjetivo));
    assert.equal(parte.posicionExplotada.length, 3);
    assert.equal(parte.posicionObjetivo.length, 3);
  });
});

test('detectarSnap reconoce pieza cerca de su objetivo', () => {
  const resultado = detectarSnap(PARTES_ROBOT[1].posicionObjetivo);
  assert.ok(resultado);
  assert.ok(resultado.snapPerfecto);
  assert.equal(resultado.snapPerfecto.ensamblada, true);
  assert.equal(resultado.snapPerfecto.distancia, 0);
});

test('detectarSnap retorna null para posicion lejana', () => {
  const resultado = detectarSnap([100, 100, 100]);
  assert.equal(resultado, null);
});

test('construirResumenPartidaEnsamblaje devuelve contrato comun con slug robot-logico', () => {
  const configuracion = normalizarConfiguracionRobotTaller({ dificultad: 2 });
  const resultado = construirResumenPartidaEnsamblaje({
    exito: true,
    configuracion,
    partesEnsambladas: 7,
    tiempoTranscurridoMs: 45000,
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, 'robot-logico');
  assert.equal(resultado.juego.habilidad, 'Lógica');
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.estadisticas.totalIntentos, 7);
});

test('construirEventoEnsamblaje respeta el contrato de sesion', () => {
  const evento = construirEventoEnsamblaje({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    puntos: 15,
    comboEnEvento: 3,
    metadata: { parte_id: 'cabeza' },
  });

  assert.equal(evento.tipo_evento, 'acierto');
  assert.equal(evento.habilidad, 'Lógica');
  assert.equal(evento.puntos, 15);
  assert.equal(evento.combo_en_evento, 3);
  assert.deepEqual(evento.metadata, { parte_id: 'cabeza' });
});

test('construirResumenPartidaEnsamblaje penaliza partes faltantes', () => {
  const configuracion = normalizarConfiguracionRobotTaller({ dificultad: 1 });
  const resultado = construirResumenPartidaEnsamblaje({
    exito: false,
    configuracion,
    partesEnsambladas: 3,
    tiempoTranscurridoMs: 60000,
  });

  assert.equal(resultado.estadisticas.aciertos, 3);
  assert.equal(resultado.estadisticas.errores, 4);
  assert.equal(resultado.detalles.totalPartes, 7);
  assert.equal(resultado.detalles.ensamblajeCompleto, false);
});

test('checkpoint de Robot Logico hace round-trip del estado logico allowlisted', () => {
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 2,
    nivel: 1,
  });
  const estado = {
    fase: FASES_ENSAMBLAGE.ensamblando,
    partes: PARTES_ROBOT.map((parte, index) => ({
      id: parte.id,
      posicion: index === 1 ? [99, 99, 99] : parte.posicionExplotada,
      rotacion: [1, 2, 3],
      ensamblada: index === 0,
      agarrada: index === 1,
      bloqueado: index > 1,
      bloqueadoPorMatematicas: index > 1,
    })),
    parteAgarrada: PARTES_ROBOT[1].id,
    contadorEnsambladas: 999,
    ordenActual: 1,
    mensaje: 'Este texto visual no pertenece al checkpoint.',
    eventosSesion: [{ tipo: 'no-persistir' }],
  };
  const pendingFinalization = {
    puntaje: 15,
    aciertos: 1,
    errores: 6,
    combo_maximo: 1,
    dificultad: 2,
    estado: 'completado',
    finalization_id: 'finalization-robot-1',
    campo_no_permitido: true,
  };

  const checkpoint = createRobotTallerCheckpointState({
    configuracion,
    estado,
    preguntaActual: {
      parteCorrectaId: 'torso',
      opciones: [
        { id: 'torso', nombre: 'No se persiste' },
        { id: 'cabeza', nombre: 'Tampoco se persiste' },
      ],
    },
    problemaMatematico: {
      idParte: 'torso',
      operador: '+',
      a: 2,
      b: 3,
      respuesta: 5,
      timestamp: Date.now(),
    },
    mostrarModalMatematica: true,
    intentosMatematicos: { torso: 2, pieza_inventada: 500 },
    tiempoTranscurridoMs: 42000,
    pendingFinalization,
  });
  const parsed = parseRobotTallerCheckpointState(checkpoint, configuracion);
  const restored = restoreRobotTallerCheckpointState({
    checkpoint,
    configuracion,
    definicionesPiezas: PARTES_ROBOT,
    resultado: { contrato: 'resultado-juego-v1' },
  });

  assert.deepEqual(parsed, checkpoint);
  assert.equal(checkpoint.contadorEnsambladas, 1);
  assert.equal(Object.hasOwn(checkpoint.partes[0], 'posicion'), false);
  assert.equal(Object.hasOwn(checkpoint, 'mensaje'), false);
  assert.equal(Object.hasOwn(checkpoint, 'eventosSesion'), false);
  assert.deepEqual(checkpoint.intentosMatematicos, { torso: 2 });
  assert.deepEqual(checkpoint.preguntaActual, {
    parteCorrectaId: 'torso',
    opcionesIds: ['torso', 'cabeza'],
  });
  assert.equal(checkpoint.pendingFinalization.finalization_id, 'finalization-robot-1');
  assert.equal(Object.hasOwn(checkpoint.pendingFinalization, 'campo_no_permitido'), false);

  assert.equal(restored.estado.fase, FASES_ENSAMBLAGE.completado);
  assert.equal(restored.estado.parteAgarrada, null);
  assert.deepEqual(restored.estado.partes[0].posicion, PARTES_ROBOT[0].posicionObjetivo);
  assert.deepEqual(restored.estado.partes[1].posicion, PARTES_ROBOT[1].posicionExplotada);
  assert.equal(restored.estado.partes[1].agarrada, false);
  assert.deepEqual(restored.preguntaActual.opciones.map((opcion) => opcion.id), [
    'torso',
    'cabeza',
  ]);
  assert.equal(restored.problemaMatematico.timestamp, undefined);
  assert.equal(restored.pendingFinalization.finalization_id, 'finalization-robot-1');
});

test('checkpoint de Robot Logico rechaza piezas desconocidas y otra configuracion', () => {
  const configuracion = normalizarConfiguracionRobotTaller({ dificultad: 2, nivel: 1 });
  const checkpoint = createRobotTallerCheckpointState({
    configuracion,
    estado: {
      fase: FASES_ENSAMBLAGE.explotado,
      partes: PARTES_ROBOT.map((parte) => ({
        id: parte.id,
        ensamblada: false,
        bloqueado: true,
        bloqueadoPorMatematicas: true,
      })),
      ordenActual: 0,
    },
  });

  assert.equal(
    parseRobotTallerCheckpointState(checkpoint, { ...configuracion, nivel: 2 }),
    null,
  );
  assert.equal(
    parseRobotTallerCheckpointState({
      ...checkpoint,
      partes: [{
        id: 'pieza_inventada',
        ensamblada: false,
        bloqueado: false,
        bloqueadoPorMatematicas: false,
      }],
    }, configuracion),
    null,
  );
});

test('checkpoint de Robot Logico restaura el tiempo restante real', () => {
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 2,
    nivel: 1,
    configuracion: { tiempoLimiteMs: 120000 },
  });
  const checkpoint = createRobotTallerCheckpointState({
    configuracion,
    estado: {
      fase: FASES_ENSAMBLAGE.ensamblando,
      partes: PARTES_ROBOT.map((parte) => ({
        id: parte.id,
        ensamblada: false,
        bloqueado: true,
        bloqueadoPorMatematicas: true,
      })),
      ordenActual: 0,
    },
    tiempoTranscurridoMs: 45000,
  });
  const restored = restoreRobotTallerCheckpointState({
    checkpoint,
    configuracion,
    definicionesPiezas: PARTES_ROBOT,
  });

  assert.equal(restored.tiempoRestanteMs, 75000);
  assert.equal(
    calcularTiempoRestanteRobotTaller({
      tiempoLimiteMs: 120000,
      tiempoTranscurridoMs: 150000,
    }),
    0,
  );
});
