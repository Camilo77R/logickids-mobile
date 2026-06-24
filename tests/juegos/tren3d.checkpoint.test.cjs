const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createTren3DCheckpointState,
  parseTren3DCheckpointState,
} = require('../../src/features/games/tren-3d/aplicacion/tren3dCheckpoint.js');
const {
  finalizarSesionTren3DConCheckpoint,
} = require('../../src/features/games/tren-3d/aplicacion/finalizarSesionTren3D.js');
const {
  generarPatronNivel,
} = require('../../src/features/games/tren-3d/tren3dConfiguracion.js');
const {
  generarHtmlMotorBabylon,
} = require('../../src/features/games/tren-3d/presentacion/tren3dMotorBabylon.js');

const crearCheckpointJugando = (overrides = {}) => createTren3DCheckpointState({
  accumulatedStats: {
    aciertos: 14,
    errores: 2,
    comboMaximo: 6,
    tiempoMs: 31000,
  },
  currentLevelStats: {
    aciertos: 4,
    errores: 1,
    comboActual: 2,
    comboMaximo: 4,
    tiempoMs: 9000,
  },
  elapsedSessionMs: 35000,
  gameState: {
    fase: 'jugando',
    nivel: 2,
    dificultad: 3,
    velocidadTren: 1.15,
    puntaje: 134,
    patronActual: generarPatronNivel(3),
    vagonesResueltos: [0, 1, 4],
    seleccionClave: 'transitorio:no-guardar',
    objetoBabylon: { meshId: 'no-guardar' },
  },
  ...overrides,
});

test('checkpoint de Tren hace round-trip del estado logico allowlisted', () => {
  const checkpoint = crearCheckpointJugando();
  const restaurado = parseTren3DCheckpointState(checkpoint);

  assert.deepEqual(restaurado, checkpoint);
  assert.deepEqual(restaurado.vagonesResueltos, [0, 1, 4]);
  assert.equal(restaurado.estadisticasNivel.comboActual, 2);
  assert.equal(Object.hasOwn(restaurado, 'seleccionClave'), false);
  assert.equal(Object.hasOwn(restaurado, 'objetoBabylon'), false);
});

test('checkpoint de Tren conserva una transicion de nivel exacta', () => {
  const patronSiguiente = generarPatronNivel(4);
  const checkpoint = crearCheckpointJugando({
    gameState: {
      fase: 'transicionNivel',
      nivel: 3,
      dificultad: 4,
      velocidadTren: 1.35,
      puntaje: 180,
      patronActual: patronSiguiente,
      vagonesResueltos: [],
    },
    pendingLevel: {
      siguienteNivel: 3,
      dificultad: 4,
      parametros: {
        dificultad: 4,
        velocidadTren: 1.35,
        patron: patronSiguiente,
      },
      resumen: {
        nivelCompletado: 2,
        aciertos: 10,
        errores: 1,
        comboMaximo: 7,
        precisionPct: 90.91,
        descripcion: 'Patron largo de siete pasos con figura y color',
      },
    },
  });

  assert.deepEqual(parseTren3DCheckpointState(checkpoint), checkpoint);
  assert.equal(checkpoint.siguienteNivelPendiente.resumen.nivelCompletado, 2);
});

test('checkpoint final conserva el finalization_id para reanudar sin duplicar', () => {
  const finalizacion = {
    puntaje: 197,
    aciertos: 20,
    errores: 1,
    combo_maximo: 8,
    dificultad: 4,
    estado: 'completado',
    finalization_id: 'final-tren-estable-1',
  };
  const checkpoint = crearCheckpointJugando({
    gameState: {
      fase: 'finalizado',
      nivel: 4,
      dificultad: 4,
      velocidadTren: 1.35,
      puntaje: 197,
      patronActual: generarPatronNivel(4),
      vagonesResueltos: Array.from({ length: 10 }, (_, index) => index),
    },
    pendingFinalization: finalizacion,
  });

  const restaurado = parseTren3DCheckpointState(checkpoint);
  assert.deepEqual(restaurado.finalizacionPendiente, finalizacion);
});

test('parser rechaza transiciones incompletas en vez de regenerar el nivel', () => {
  const checkpoint = crearCheckpointJugando();

  assert.equal(parseTren3DCheckpointState({
    ...checkpoint,
    fase: 'transicionNivel',
    siguienteNivelPendiente: null,
  }), null);
});

test('finalizacion espera el flush y reutiliza el mismo payload idempotente', async () => {
  const orden = [];
  const payload = {
    estado: 'completado',
    finalization_id: 'final-tren-estable-2',
  };
  const finalizarSesion = async (finalizacion) => {
    orden.push(`finalizar:${finalizacion.finalization_id}`);
    return { finalizacion_idempotente: true };
  };

  const primera = await finalizarSesionTren3DConCheckpoint({
    flushCheckpoint: async () => orden.push('flush'),
    finalizarSesion,
    finalizacion: payload,
  });
  const segunda = await finalizarSesionTren3DConCheckpoint({
    flushCheckpoint: async () => orden.push('flush'),
    finalizarSesion,
    finalizacion: payload,
  });

  assert.deepEqual(orden, [
    'flush',
    'finalizar:final-tren-estable-2',
    'flush',
    'finalizar:final-tren-estable-2',
  ]);
  assert.deepEqual(primera, { finalizacion_idempotente: true });
  assert.deepEqual(segunda, { finalizacion_idempotente: true });
});

test('bridge Babylon restaura DTO logico sin serializar objetos de escena', () => {
  const html = generarHtmlMotorBabylon({
    dificultad: 1,
    velocidadTren: 0.75,
    patron: generarPatronNivel(1),
  });

  assert.match(html, /window\.restaurarNivel/);
  assert.match(html, /params\.vagonesResueltos/);
  assert.match(html, /params\.tiempoNivelMs/);
  assert.doesNotMatch(html, /params\.grupoTren/);
  assert.doesNotMatch(html, /params\.scene/);
});
