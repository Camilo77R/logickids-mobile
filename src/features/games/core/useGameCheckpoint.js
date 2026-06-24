import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createGameCheckpoint,
  GAME_CHECKPOINT_STATE_VERSION,
  parseGameCheckpoint,
} from './gameCheckpoint.contract';

export const GAME_CHECKPOINT_PHASES = Object.freeze({
  idle: 'idle',
  hydrating: 'hydrating',
  ready: 'ready',
  saving: 'saving',
  error: 'error',
  terminal: 'terminal',
});

const CHECKPOINT_VERSION_CONFLICT = 'CHECKPOINT_VERSION_CONFLICT';
const NO_PENDING_CHECKPOINT = Symbol('no-pending-checkpoint');

const canUseCheckpointClient = ({
  client,
  enabled,
  gameSlug,
  sessionId,
  studentToken,
}) => Boolean(
  enabled &&
  gameSlug &&
  sessionId &&
  studentToken &&
  typeof client?.obtenerCheckpoint === 'function' &&
  typeof client?.guardarCheckpoint === 'function'
);

const normalizeRevision = (revision, fallback = 0) => {
  const numericRevision = Number(revision);
  return Number.isInteger(numericRevision) && numericRevision >= 0
    ? numericRevision
    : fallback;
};

const isVersionConflict = (error) =>
  error?.status === 409 && error?.code === CHECKPOINT_VERSION_CONFLICT;

// A rejected public promise remains awaitable, but this handler prevents a
// fire-and-forget caller from creating an unhandled rejection.
const observeRejection = (promise) => {
  promise.catch(() => {});
  return promise;
};

export const createGameCheckpointController = ({
  client,
  enabled = true,
  gameSlug,
  sessionId,
  stateVersion = GAME_CHECKPOINT_STATE_VERSION,
  studentToken,
}) => {
  const configuration = {
    client,
    enabled,
    gameSlug,
    sessionId,
    studentToken,
  };
  const listeners = new Set();
  const canRequest = canUseCheckpointClient(configuration);

  let checkpointState = null;
  let drainPromise = null;
  let error = null;
  let generation = 0;
  let hasHydrated = false;
  let hydrationPromise = null;
  let pendingCheckpoint = NO_PENDING_CHECKPOINT;
  let phase = GAME_CHECKPOINT_PHASES.idle;
  let revision = 0;
  let terminal = false;
  let snapshot;

  const buildSnapshot = () => Object.freeze({
    checkpointState,
    error,
    hasPendingCheckpoint: pendingCheckpoint !== NO_PENDING_CHECKPOINT,
    isHydrating: phase === GAME_CHECKPOINT_PHASES.hydrating,
    isTerminal: terminal,
    phase,
    revision,
    sessionId,
  });

  const publish = (nextPhase = phase, nextError = error) => {
    phase = nextPhase;
    error = nextError;
    snapshot = buildSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  };

  const isCurrentGeneration = (operationGeneration) =>
    !terminal && operationGeneration === generation;

  const readServerCheckpoint = async (operationGeneration) => {
    const response = await client.obtenerCheckpoint({
      tokenEstudiante: studentToken,
      sesionId: sessionId,
    });

    if (!isCurrentGeneration(operationGeneration)) {
      return checkpointState;
    }

    const checkpoint = parseGameCheckpoint(
      response?.checkpoint,
      gameSlug,
      stateVersion,
    );
    revision = normalizeRevision(response?.revision);
    checkpointState = checkpoint?.state ?? null;
    hasHydrated = true;
    publish(GAME_CHECKPOINT_PHASES.ready, null);
    return checkpointState;
  };

  const hydrateCheckpoint = ({ discardPending = false } = {}) => {
    if (!canRequest || terminal) {
      return Promise.resolve(null);
    }

    if (discardPending) {
      pendingCheckpoint = NO_PENDING_CHECKPOINT;
    }

    if (hydrationPromise) {
      return hydrationPromise;
    }

    const operationGeneration = generation;
    publish(GAME_CHECKPOINT_PHASES.hydrating, null);

    const hydration = readServerCheckpoint(operationGeneration).catch((cause) => {
      if (isCurrentGeneration(operationGeneration)) {
        publish(GAME_CHECKPOINT_PHASES.error, cause);
      }
      throw cause;
    });
    hydrationPromise = observeRejection(hydration);
    hydration.then(
      () => { if (hydrationPromise === hydration) hydrationPromise = null; },
      () => { if (hydrationPromise === hydration) hydrationPromise = null; },
    );
    return hydrationPromise;
  };

  const ensureHydrated = () => hasHydrated
    ? Promise.resolve(checkpointState)
    : hydrateCheckpoint();

  const saveNextCheckpoint = async () => {
    const queuedCheckpoint = pendingCheckpoint;
    pendingCheckpoint = NO_PENDING_CHECKPOINT;
    const operationGeneration = generation;
    publish(GAME_CHECKPOINT_PHASES.saving, null);

    try {
      const response = await client.guardarCheckpoint({
        tokenEstudiante: studentToken,
        sesionId: sessionId,
        revision,
        checkpoint: createGameCheckpoint({
          gameSlug,
          state: queuedCheckpoint,
          stateVersion,
        }),
      });

      if (isCurrentGeneration(operationGeneration)) {
        revision = normalizeRevision(response?.revision, revision + 1);
        checkpointState = queuedCheckpoint;
        publish(GAME_CHECKPOINT_PHASES.ready, null);
      }
    } catch (cause) {
      if (!isCurrentGeneration(operationGeneration)) {
        return checkpointState;
      }

      if (isVersionConflict(cause)) {
        pendingCheckpoint = NO_PENDING_CHECKPOINT;
        return hydrateCheckpoint({ discardPending: true });
      }

      // A newer full snapshot supersedes the failed one; otherwise restore it.
      if (pendingCheckpoint === NO_PENDING_CHECKPOINT) {
        pendingCheckpoint = queuedCheckpoint;
      }
      publish(GAME_CHECKPOINT_PHASES.error, cause);
      throw cause;
    }

    return checkpointState;
  };

  const drainPendingCheckpoints = async () => {
    await ensureHydrated();

    while (!terminal && pendingCheckpoint !== NO_PENDING_CHECKPOINT) {
      await saveNextCheckpoint();
    }

    return checkpointState;
  };

  const startDrain = () => {
    if (!canRequest || terminal) {
      return Promise.resolve(checkpointState);
    }

    if (drainPromise) {
      return drainPromise;
    }

    const drain = drainPendingCheckpoints();
    drainPromise = observeRejection(drain);
    drain.then(
      () => { if (drainPromise === drain) drainPromise = null; },
      () => { if (drainPromise === drain) drainPromise = null; },
    );
    return drainPromise;
  };

  const restoreCheckpoint = () => hydrateCheckpoint();

  const saveCheckpoint = (state) => {
    if (!canRequest || terminal) {
      return false;
    }

    // Validate before queueing so malformed state cannot poison a later flush.
    createGameCheckpoint({ gameSlug, state, stateVersion });
    pendingCheckpoint = state;
    publish();
    startDrain();
    return true;
  };

  const flushCheckpoint = () => {
    if (drainPromise) {
      return drainPromise;
    }
    if (pendingCheckpoint !== NO_PENDING_CHECKPOINT) {
      return startDrain();
    }
    return Promise.resolve(checkpointState);
  };

  const retryCheckpoint = () => {
    if (!drainPromise) {
      return flushCheckpoint();
    }

    const currentDrain = drainPromise;
    const retry = currentDrain.then(
      () => flushCheckpoint(),
      () => startDrain(),
    );
    return observeRejection(retry);
  };

  const markTerminal = () => {
    if (terminal) {
      return snapshot;
    }

    terminal = true;
    generation += 1;
    pendingCheckpoint = NO_PENDING_CHECKPOINT;
    publish(GAME_CHECKPOINT_PHASES.terminal, null);
    return snapshot;
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    listener(snapshot);
    return () => listeners.delete(listener);
  };

  snapshot = buildSnapshot();

  return {
    flushCheckpoint,
    getSnapshot: () => snapshot,
    markTerminal,
    restoreCheckpoint,
    retryCheckpoint,
    saveCheckpoint,
    subscribe,
  };
};

const deferTerminalCleanup = (callback) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }
  Promise.resolve().then(callback).catch(() => {});
};

export const useGameCheckpoint = ({
  autoHydrate = true,
  client,
  enabled,
  gameSlug,
  sessionId,
  stateVersion = GAME_CHECKPOINT_STATE_VERSION,
  studentToken,
}) => {
  const controller = useMemo(() => createGameCheckpointController({
    client,
    enabled,
    gameSlug,
    sessionId,
    stateVersion,
    studentToken,
  }), [client, enabled, gameSlug, sessionId, stateVersion, studentToken]);
  const activeControllerRef = useRef(null);
  const [observed, setObserved] = useState(() => ({
    controller,
    snapshot: controller.getSnapshot(),
  }));

  useEffect(() => {
    activeControllerRef.current = controller;
    const unsubscribe = controller.subscribe((nextSnapshot) => {
      setObserved({ controller, snapshot: nextSnapshot });
    });

    if (autoHydrate) {
      controller.restoreCheckpoint();
    }

    return () => {
      unsubscribe();
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }

      // Deferring distinguishes a real replacement from Strict Mode replay.
      deferTerminalCleanup(() => {
        if (activeControllerRef.current !== controller) {
          controller.markTerminal();
        }
      });
    };
  }, [autoHydrate, controller]);

  const snapshot = observed.controller === controller
    ? observed.snapshot
    : controller.getSnapshot();

  return {
    ...snapshot,
    flushCheckpoint: controller.flushCheckpoint,
    markTerminal: controller.markTerminal,
    restoreCheckpoint: controller.restoreCheckpoint,
    retryCheckpoint: controller.retryCheckpoint,
    saveCheckpoint: controller.saveCheckpoint,
  };
};
