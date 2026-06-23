const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createGameOperationTracker,
} = require('../../src/features/games/core/gameOperationIdentity.js');

const createDeterministicId = () => {
  let sequence = 0;
  return () => `operation-${++sequence}`;
};

test('un intento conserva identidad y ordena eventos de forma monotona', () => {
  const tracker = createGameOperationTracker({ createId: createDeterministicId() });

  assert.equal(tracker.getAttemptId(), 'operation-1');
  assert.deepEqual(tracker.decorateEvent({ tipo_evento: 'acierto' }), {
    tipo_evento: 'acierto',
    event_id: 'operation-2',
    sequence: 1,
  });
  assert.deepEqual(tracker.decorateEvent({ tipo_evento: 'error' }), {
    tipo_evento: 'error',
    event_id: 'operation-3',
    sequence: 2,
  });
});

test('la finalizacion conserva id durante reintentos y cambia al iniciar otro intento', () => {
  const tracker = createGameOperationTracker({ createId: createDeterministicId() });
  const first = tracker.decorateFinalization({ estado: 'completado' });
  const retry = tracker.decorateFinalization({ estado: 'completado' });

  assert.equal(first.finalization_id, retry.finalization_id);

  tracker.resetAttempt();

  assert.notEqual(tracker.getAttemptId(), 'operation-1');
  assert.notEqual(
    tracker.decorateFinalization({ estado: 'completado' }).finalization_id,
    first.finalization_id,
  );
});
