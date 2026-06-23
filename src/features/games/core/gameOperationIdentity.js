const resolveDefaultIdFactory = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return () => globalThis.crypto.randomUUID();
  }

  throw new Error('Se requiere un generador criptografico de identificadores.');
};

/**
 * Mantiene identidad estable durante un intento y ordena sus escrituras.
 * El backend sigue siendo la autoridad; este tracker solo hace seguros los reintentos.
 */
export const createGameOperationTracker = ({ createId = resolveDefaultIdFactory() } = {}) => {
  let attemptId = createId();
  let nextSequence = 1;
  let finalizationId = null;

  return Object.freeze({
    getAttemptId() {
      return attemptId;
    },

    decorateEvent(event) {
      const decoratedEvent = {
        ...event,
        event_id: createId(),
        sequence: nextSequence,
      };
      nextSequence += 1;
      return decoratedEvent;
    },

    decorateFinalization(finalization) {
      finalizationId ??= createId();
      return {
        ...finalization,
        finalization_id: finalizationId,
      };
    },

    clearFinalization() {
      finalizationId = null;
    },

    resetAttempt() {
      attemptId = createId();
      nextSequence = 1;
      finalizationId = null;
    },
  });
};
