export const CODIGO_ESTELAR_SLUG = 'codigo-estelar';

export const CODIGO_ESTELAR_SOCKET_EVENTS = Object.freeze({
  join: 'codigo_estelar:join',
  joined: 'codigo_estelar:joined',
  submit: 'codigo_estelar:submit_answer',
  leaderboard: 'codigo_estelar:leaderboard_update',
  gameOver: 'codigo_estelar:game_over',
  error: 'codigo_estelar:error',
});

export const DEFAULT_API_BASE_URL = 'http://10.0.2.2:3000/api';
export const DEFAULT_DIFFICULTY = 2;

export const GAME_STATUS = Object.freeze({
  setup: 'setup',
  connecting: 'connecting',
  ready: 'ready',
  playing: 'playing',
  finished: 'finished',
  error: 'error',
});

export const buildRandomMeteor = ({ min, max, fallback = 0 }) => {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return fallback;
  }

  const span = max - min + 1;
  return min + Math.floor(Math.random() * span);
};
