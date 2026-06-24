export const GAME_CHECKPOINT_CONTRACT = 'game-checkpoint-v1';
export const GAME_CHECKPOINT_STATE_VERSION = 1;

const CHECKPOINT_KEYS = [
  'contract',
  'gameSlug',
  'state',
  'stateVersion',
];

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const hasExactCheckpointShape = (checkpoint) => {
  if (!isPlainObject(checkpoint)) {
    return false;
  }

  const keys = Object.keys(checkpoint).sort();
  return keys.length === CHECKPOINT_KEYS.length &&
    keys.every((key, index) => key === CHECKPOINT_KEYS[index]);
};

const isValidStateVersion = (stateVersion) =>
  Number.isInteger(stateVersion) && stateVersion > 0;

export const createGameCheckpoint = ({
  gameSlug,
  state,
  stateVersion = GAME_CHECKPOINT_STATE_VERSION,
}) => {
  const normalizedGameSlug = gameSlug?.trim();

  if (
    !normalizedGameSlug ||
    !isValidStateVersion(stateVersion) ||
    !isPlainObject(state)
  ) {
    throw new Error('Checkpoint requiere juego, version y estado validos.');
  }

  return {
    contract: GAME_CHECKPOINT_CONTRACT,
    gameSlug: normalizedGameSlug,
    stateVersion,
    state,
  };
};

export const parseGameCheckpoint = (
  checkpoint,
  expectedGameSlug,
  expectedStateVersion = GAME_CHECKPOINT_STATE_VERSION,
) => {
  if (
    !hasExactCheckpointShape(checkpoint) ||
    checkpoint.contract !== GAME_CHECKPOINT_CONTRACT ||
    checkpoint.gameSlug !== expectedGameSlug?.trim() ||
    checkpoint.stateVersion !== expectedStateVersion ||
    !isPlainObject(checkpoint.state)
  ) {
    return null;
  }

  return checkpoint;
};
