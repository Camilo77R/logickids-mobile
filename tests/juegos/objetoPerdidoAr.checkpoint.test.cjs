const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createObjetoPerdidoArCheckpointState,
  parseObjetoPerdidoArCheckpointState,
  restoreObjetoPerdidoArLogicalState,
} = require('../../src/features/games/objeto-perdido-ar/aplicacion/objetoPerdidoArCheckpoint.js');
const {
  ESTADOS_OBJETO_PERDIDO_AR,
} = require('../../src/features/games/objeto-perdido-ar/objetoPerdidoAr.constants.js');
const {
  normalizarConfiguracionObjetoPerdidoAr,
} = require('../../src/features/games/objeto-perdido-ar/objetoPerdidoArConfiguracion.js');
const {
  crearRondaObjetoPerdidoAr,
} = require('../../src/features/games/objeto-perdido-ar/objetoPerdidoArMotor.js');

const createPlayingState = () => {
  const configuracion = normalizarConfiguracionObjetoPerdidoAr({ dificultad: 3 });

  return {
    fase: ESTADOS_OBJETO_PERDIDO_AR.jugando,
    rondaActual: crearRondaObjetoPerdidoAr({ configuracion, numeroRonda: 2 }),
    numeroRonda: 2,
    tiempoRestanteMs: 8340,
    ayudasRestantes: 1,
    resumenRonda: null,
    resultado: null,
    aciertos: 1,
    errores: 2,
    ayudasUsadas: 1,
    comboActual: 0,
    comboMaximo: 1,
  };
};

test('checkpoint de Objeto Perdido conserva la ronda y posiciones relativas', () => {
  const estado = createPlayingState();
  const checkpoint = createObjetoPerdidoArCheckpointState({
    estado,
    tiempoTranscurridoMs: 12660,
  });
  const parsed = parseObjetoPerdidoArCheckpointState(checkpoint);

  assert.deepEqual(parsed, checkpoint);
  assert.equal(parsed.requiereRelocalizarSuperficie, true);
  assert.deepEqual(
    parsed.ronda.objetos.map((object) => object.posicion),
    estado.rondaActual.objetos.map((object) => object.posicion),
  );
  assert.equal(Object.hasOwn(parsed, 'camera'), false);
  assert.equal(Object.hasOwn(parsed, 'anchor'), false);
});

test('restaurar checkpoint obliga a relocalizar antes de reanudar el cronometro', () => {
  const checkpoint = createObjetoPerdidoArCheckpointState({
    estado: createPlayingState(),
    tiempoTranscurridoMs: 5000,
  });
  const restored = restoreObjetoPerdidoArLogicalState(checkpoint);

  assert.equal(restored.fase, ESTADOS_OBJETO_PERDIDO_AR.buscandoSuperficie);
  assert.equal(restored.faseReanudacion, ESTADOS_OBJETO_PERDIDO_AR.jugando);
  assert.equal(restored.tiempoRestanteMs, 8340);
  assert.equal(restored.tiempoTranscurridoMs, 5000);
});

test('checkpoint reconstruye objetos del catalogo e ignora datos fisicos inyectados', () => {
  const checkpoint = createObjetoPerdidoArCheckpointState({
    estado: createPlayingState(),
  });
  checkpoint.ronda.objetos[0] = {
    ...checkpoint.ronda.objetos[0],
    anchor: { id: 'device-anchor' },
    cameraPosition: [99, 99, 99],
    material: 'material-no-confiable',
  };

  const parsed = parseObjetoPerdidoArCheckpointState(checkpoint);
  const restoredObject = restoreObjetoPerdidoArLogicalState(parsed).rondaActual.objetos[0];

  assert.equal(Object.hasOwn(restoredObject, 'anchor'), false);
  assert.equal(Object.hasOwn(restoredObject, 'cameraPosition'), false);
  assert.notEqual(restoredObject.material, 'material-no-confiable');
});

test('round-trip conserva una finalizacion idempotente pendiente', () => {
  const estado = {
    ...createPlayingState(),
    fase: ESTADOS_OBJETO_PERDIDO_AR.completado,
    resultado: { contrato: 'resultado-juego-v1' },
  };
  const pendingFinalization = {
    estado: 'completado',
    puntaje: 25,
    finalization_id: 'finalization-stable-id',
  };
  const checkpoint = createObjetoPerdidoArCheckpointState({
    estado,
    pendingFinalization,
  });

  const parsed = parseObjetoPerdidoArCheckpointState(checkpoint);

  assert.deepEqual(parsed.pendingFinalization, pendingFinalization);
});

test('checkpoint rechaza coordenadas que no son posiciones relativas seguras', () => {
  const checkpoint = createObjetoPerdidoArCheckpointState({
    estado: createPlayingState(),
  });
  checkpoint.ronda.objetos[0].posicion = [120, 0, 0];

  assert.equal(parseObjetoPerdidoArCheckpointState(checkpoint), null);
});
