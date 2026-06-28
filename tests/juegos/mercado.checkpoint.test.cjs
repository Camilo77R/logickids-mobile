const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createMercadoCheckpointHydrationBarrier,
  createMercadoCheckpointState,
  parseMercadoCheckpointState,
} = require('../../src/features/games/mercado-inteligente/aplicacion/mercadoCheckpoint.js');
const {
  finalizarMercadoTrasGuardarCheckpoint,
} = require('../../src/features/games/mercado-inteligente/aplicacion/mercadoFinalization.js');

const configuration = {
  slug: 'mercado-inteligente',
  dificultad: 2,
  configuracion: { ayudasDisponibles: 1 },
};
const round = {
  numeroRonda: 1,
  objetivoId: 'objetivo-1',
  objetivo: { textoGuia: 'Elige dos productos' },
  productos: [{ id: 'manzana', precio: 2 }],
};

test('checkpoint de Mercado conserva estado logico y finalizacion pendiente', () => {
  const checkpoint = createMercadoCheckpointState({
    configuracion: configuration,
    estado: {
      fase: 'completado',
      ronda: round,
      seleccionadosIds: ['manzana'],
      aciertos: 1,
      errores: 0,
      comboActual: 1,
      comboMaximo: 1,
      ayudasUsadas: 0,
      resultado: { puntaje: 30 },
      mensaje: 'No debe persistirse',
      feedbackEscena: { state: 'success' },
    },
    resumenActividad: { nivelesCompletados: 1 },
    pendingFinalization: {
      estado: 'completado',
      finalization_id: 'finalization-1',
    },
  });

  assert.deepEqual(parseMercadoCheckpointState(checkpoint), checkpoint);
  assert.deepEqual(checkpoint.pendingFinalization, {
    estado: 'completado',
    finalization_id: 'finalization-1',
  });
  assert.equal(Object.hasOwn(checkpoint, 'mensaje'), false);
  assert.equal(Object.hasOwn(checkpoint, 'feedbackEscena'), false);
});

test('barrera de hidratacion impide sobrescribir el checkpoint con estado fresco', () => {
  const barrier = createMercadoCheckpointHydrationBarrier();
  const restored = createMercadoCheckpointState({
    configuracion: configuration,
    estado: {
      fase: 'jugando',
      ronda: round,
      seleccionadosIds: ['manzana'],
      aciertos: 1,
    },
    pendingFinalization: {
      estado: 'completado',
      finalization_id: 'finalization-restore',
    },
  });
  const fresh = createMercadoCheckpointState({
    configuracion: configuration,
    estado: {
      fase: 'jugando',
      ronda: round,
      seleccionadosIds: [],
      aciertos: 0,
    },
  });

  barrier.begin({ sessionId: 'session-1', checkpointState: restored });

  assert.equal(
    barrier.blocksAutosave({ sessionId: 'session-1', checkpointState: fresh }),
    true,
  );
  assert.equal(
    barrier.blocksAutosave({ sessionId: 'session-1', checkpointState: restored }),
    true,
  );
  assert.equal(
    barrier.blocksAutosave({ sessionId: 'session-1', checkpointState: fresh }),
    false,
  );
  assert.equal(restored.pendingFinalization.finalization_id, 'finalization-restore');
});

test('finalizacion espera el flush y envia la misma identidad persistida', async () => {
  const calls = [];
  const finalizacion = {
    estado: 'completado',
    finalization_id: 'finalization-stable',
  };

  await finalizarMercadoTrasGuardarCheckpoint({
    finalizacion,
    flushCheckpoint: async () => {
      calls.push('flush');
    },
    postFinalizacion: async (payload) => {
      calls.push(`post:${payload.finalization_id}`);
      return { success: true };
    },
  });

  assert.deepEqual(calls, ['flush', 'post:finalization-stable']);
});

test('finalizacion prioriza el POST aunque falle el flush del checkpoint', async () => {
  let postEjecutado = false;

  const respuesta = await finalizarMercadoTrasGuardarCheckpoint({
    finalizacion: {
      estado: 'completado',
      finalization_id: 'finalization-posted',
    },
    flushCheckpoint: async () => {
      throw new Error('No se pudo guardar checkpoint');
    },
    postFinalizacion: async (payload) => {
      postEjecutado = true;
      return { finalization_id: payload.finalization_id };
    },
  });

  assert.equal(postEjecutado, true);
  assert.equal(respuesta.finalization_id, 'finalization-posted');
  assert.equal(respuesta.checkpoint_warning, 'No se pudo guardar checkpoint');
});

test('checkpoint de Mercado rechaza payloads que regenerarian la ronda', () => {
  assert.equal(parseMercadoCheckpointState({ version: 1, fase: 'jugando' }), null);
  assert.equal(
    parseMercadoCheckpointState({
      version: 1,
      fase: 'jugando',
      configuracion: configuration,
      ronda: round,
      seleccionadosIds: 'manzana',
    }),
    null,
  );
});
