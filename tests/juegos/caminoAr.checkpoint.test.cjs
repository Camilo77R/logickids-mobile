const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createCaminoArCheckpointState,
  parseCaminoArCheckpointState,
} = require('../../src/features/games/camino-ar/aplicacion/caminoArCheckpoint.js');

test('checkpoint de Camino AR conserva progreso logico sin estado espacial', () => {
  const checkpoint = createCaminoArCheckpointState({
    estado: {
      fase: 'esperandoRespuesta',
      patron: [2, 0, 3, 1],
      indiceRespuesta: 2,
      tiempoRestanteMs: 8_450,
      ayudasRestantes: 0,
      aciertos: 2,
      errores: 0,
      ayudasUsadas: 1,
      resultado: null,
      baldosaActiva: 3,
      eventosSesion: [{ tipo_evento: 'acierto' }],
      camera: { position: [1, 2, 3] },
      anchor: 'plane-1',
    },
    pendingFinalization: null,
  });

  assert.deepEqual(parseCaminoArCheckpointState(checkpoint), checkpoint);
  assert.deepEqual(checkpoint.patron, [2, 0, 3, 1]);
  assert.equal(checkpoint.indiceRespuesta, 2);
  assert.equal(Object.hasOwn(checkpoint, 'camera'), false);
  assert.equal(Object.hasOwn(checkpoint, 'anchor'), false);
  assert.equal(Object.hasOwn(checkpoint, 'baldosaActiva'), false);
  assert.equal(Object.hasOwn(checkpoint, 'eventosSesion'), false);
});

test('checkpoint de Camino AR rechaza estados incompletos o no reanudables', () => {
  assert.equal(parseCaminoArCheckpointState({ version: 1 }), null);
  assert.equal(
    parseCaminoArCheckpointState({
      version: 1,
      fase: 'listo',
      patron: [0, 1],
    }),
    null,
  );
});

test('checkpoint de Camino AR conserva la identidad de una finalizacion pendiente', () => {
  const pendingFinalization = {
    finalization_id: 'finish-camino-1',
    estado: 'completado',
  };
  const checkpoint = createCaminoArCheckpointState({
    estado: {
      fase: 'completado',
      patron: [0, 1],
      indiceRespuesta: 2,
      tiempoRestanteMs: 2_000,
      ayudasRestantes: 1,
      aciertos: 2,
      errores: 0,
      ayudasUsadas: 0,
      resultado: { puntaje: 20 },
    },
    pendingFinalization,
  });

  assert.deepEqual(checkpoint.pendingFinalization, pendingFinalization);
  assert.deepEqual(parseCaminoArCheckpointState(checkpoint), checkpoint);
});
