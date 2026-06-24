const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createGameCheckpoint,
  GAME_CHECKPOINT_CONTRACT,
  parseGameCheckpoint,
} = require('../../src/features/games/core/gameCheckpoint.contract.js');
const {
  createGameCheckpointController,
  GAME_CHECKPOINT_PHASES,
} = require('../../src/features/games/core/useGameCheckpoint.js');

const createDeferred = () => {
  let reject;
  let resolve;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    reject = rejectPromise;
    resolve = resolvePromise;
  });
  return { promise, reject, resolve };
};

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

const checkpointResponse = (state, revision = 0) => ({
  checkpoint: state == null
    ? null
    : createGameCheckpoint({ gameSlug: 'robot-logico', state }),
  revision,
});

const createController = (client, sessionId = 'session-1') =>
  createGameCheckpointController({
    client,
    enabled: true,
    gameSlug: 'robot-logico',
    sessionId,
    studentToken: 'student-jwt',
  });

test('contrato emite y acepta exclusivamente game-checkpoint-v1', () => {
  const checkpoint = createGameCheckpoint({
    gameSlug: ' robot-logico ',
    state: { level: 2 },
  });

  assert.deepEqual(checkpoint, {
    contract: GAME_CHECKPOINT_CONTRACT,
    gameSlug: 'robot-logico',
    stateVersion: 1,
    state: { level: 2 },
  });
  assert.equal(parseGameCheckpoint(checkpoint, 'robot-logico'), checkpoint);
  assert.equal(parseGameCheckpoint({ ...checkpoint, extra: true }, 'robot-logico'), null);
  assert.equal(parseGameCheckpoint({ ...checkpoint, stateVersion: 2 }, 'robot-logico'), null);
});

test('restore expone hydrating hasta que termina la lectura', async () => {
  const getRequest = createDeferred();
  const controller = createController({
    obtenerCheckpoint: () => getRequest.promise,
    guardarCheckpoint: async () => ({ revision: 1 }),
  });

  const restore = controller.restoreCheckpoint();
  assert.equal(controller.getSnapshot().phase, GAME_CHECKPOINT_PHASES.hydrating);
  assert.equal(controller.getSnapshot().isHydrating, true);

  getRequest.resolve(checkpointResponse({ level: 4 }, 7));

  assert.deepEqual(await restore, { level: 4 });
  assert.equal(controller.getSnapshot().phase, GAME_CHECKPOINT_PHASES.ready);
  assert.equal(controller.getSnapshot().revision, 7);
});

test('coalescing envia solo el estado completo mas reciente y flush lo espera', async () => {
  const putRequests = [];
  const controller = createController({
    obtenerCheckpoint: async () => checkpointResponse(null, 3),
    guardarCheckpoint: async (request) => {
      putRequests.push(request);
      return { revision: 4 };
    },
  });
  await controller.restoreCheckpoint();

  controller.saveCheckpoint({ step: 1 });
  controller.saveCheckpoint({ step: 2 });
  controller.saveCheckpoint({ step: 3 });
  const flushedState = await controller.flushCheckpoint();

  assert.equal(putRequests.length, 1);
  assert.equal(putRequests[0].revision, 3);
  assert.deepEqual(putRequests[0].checkpoint.state, { step: 3 });
  assert.deepEqual(flushedState, { step: 3 });
  assert.equal(controller.getSnapshot().hasPendingCheckpoint, false);
});

test('retry conserva el ultimo estado cuando falla el PUT', async () => {
  const putRequests = [];
  const networkError = new Error('Sin red');
  let errorSnapshot;
  let retry;
  let shouldFail = true;
  const controller = createController({
    obtenerCheckpoint: async () => checkpointResponse(null, 5),
    guardarCheckpoint: async (request) => {
      putRequests.push(request);
      if (shouldFail) {
        shouldFail = false;
        throw networkError;
      }
      return { revision: 6 };
    },
  });
  await controller.restoreCheckpoint();
  const unsubscribe = controller.subscribe((snapshot) => {
    if (snapshot.phase === GAME_CHECKPOINT_PHASES.error && !retry) {
      errorSnapshot = snapshot;
      retry = controller.retryCheckpoint();
    }
  });

  controller.saveCheckpoint({ puzzle: 'latest' });
  await assert.rejects(controller.flushCheckpoint(), /Sin red/);

  assert.equal(errorSnapshot.error, networkError);
  assert.equal(errorSnapshot.hasPendingCheckpoint, true);
  await retry;
  unsubscribe();

  assert.equal(putRequests.length, 2);
  assert.deepEqual(putRequests[0].checkpoint.state, { puzzle: 'latest' });
  assert.deepEqual(putRequests[1].checkpoint.state, { puzzle: 'latest' });
  assert.equal(controller.getSnapshot().hasPendingCheckpoint, false);
});

test('409 descarta estado local y vuelve a hidratar con server-wins', async () => {
  let getCount = 0;
  let putCount = 0;
  const conflict = Object.assign(new Error('Revision obsoleta'), {
    status: 409,
    code: 'CHECKPOINT_VERSION_CONFLICT',
  });
  const controller = createController({
    obtenerCheckpoint: async () => {
      getCount += 1;
      return getCount === 1
        ? checkpointResponse({ source: 'initial-server' }, 2)
        : checkpointResponse({ source: 'server-wins' }, 9);
    },
    guardarCheckpoint: async () => {
      putCount += 1;
      throw conflict;
    },
  });
  await controller.restoreCheckpoint();

  controller.saveCheckpoint({ source: 'local-loses' });
  const stateAfterConflict = await controller.flushCheckpoint();

  assert.equal(putCount, 1);
  assert.equal(getCount, 2);
  assert.deepEqual(stateAfterConflict, { source: 'server-wins' });
  assert.deepEqual(controller.getSnapshot().checkpointState, { source: 'server-wins' });
  assert.equal(controller.getSnapshot().revision, 9);
  assert.equal(controller.getSnapshot().hasPendingCheckpoint, false);
});

test('cambiar de session invalida respuestas viejas sin contaminar la nueva', async () => {
  const oldGet = createDeferred();
  const requests = [];
  const client = {
    obtenerCheckpoint: ({ sesionId }) => {
      requests.push(sesionId);
      return sesionId === 'old-session'
        ? oldGet.promise
        : Promise.resolve(checkpointResponse({ owner: 'new-session' }, 11));
    },
    guardarCheckpoint: async () => ({ revision: 1 }),
  };
  const oldController = createController(client, 'old-session');
  const oldRestore = oldController.restoreCheckpoint();

  oldController.markTerminal();
  const newController = createController(client, 'new-session');
  await newController.restoreCheckpoint();
  oldGet.resolve(checkpointResponse({ owner: 'old-session' }, 99));
  await oldRestore;

  assert.deepEqual(requests, ['old-session', 'new-session']);
  assert.equal(oldController.getSnapshot().phase, GAME_CHECKPOINT_PHASES.terminal);
  assert.deepEqual(newController.getSnapshot().checkpointState, {
    owner: 'new-session',
  });
  assert.equal(newController.getSnapshot().revision, 11);
});

test('markTerminal elimina pendientes e impide un PUT tardio', async () => {
  const firstPut = createDeferred();
  const putRequests = [];
  const controller = createController({
    obtenerCheckpoint: async () => checkpointResponse(null, 1),
    guardarCheckpoint: (request) => {
      putRequests.push(request);
      return firstPut.promise;
    },
  });
  await controller.restoreCheckpoint();

  controller.saveCheckpoint({ step: 'in-flight' });
  const flush = controller.flushCheckpoint();
  await nextTurn();
  controller.saveCheckpoint({ step: 'must-not-be-sent' });
  controller.markTerminal();
  firstPut.resolve({ revision: 2 });
  await flush;

  assert.equal(putRequests.length, 1);
  assert.deepEqual(putRequests[0].checkpoint.state, { step: 'in-flight' });
  assert.equal(controller.getSnapshot().phase, GAME_CHECKPOINT_PHASES.terminal);
  assert.equal(controller.getSnapshot().hasPendingCheckpoint, false);
});

test('autosave publica errores sin producir unhandled rejection', async () => {
  const observedUnhandled = [];
  const onUnhandled = (error) => observedUnhandled.push(error);
  process.on('unhandledRejection', onUnhandled);

  try {
    const saveError = new Error('PUT rechazado');
    const controller = createController({
      obtenerCheckpoint: async () => checkpointResponse(null, 0),
      guardarCheckpoint: async () => { throw saveError; },
    });
    await controller.restoreCheckpoint();

    controller.saveCheckpoint({ safe: true });
    await nextTurn();
    await nextTurn();

    assert.equal(controller.getSnapshot().phase, GAME_CHECKPOINT_PHASES.error);
    assert.equal(controller.getSnapshot().error, saveError);
    assert.deepEqual(observedUnhandled, []);
    controller.markTerminal();
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});
