import { io } from 'socket.io-client';
import { normalizeBaseUrl } from './http.service';

export const STUDENT_REALTIME_EVENTS = Object.freeze({
  classSessionChanged: 'class_session:changed',
  rankingUpdated: 'ranking:updated',
  studentAccessChanged: 'student_access:changed',
});

const STUDENT_REALTIME_EVENT_ALIASES = Object.freeze({
  classSessionChanged: [
    STUDENT_REALTIME_EVENTS.classSessionChanged,
    'class-session:changed',
    'session:changed',
    'sesion_clase:changed',
  ],
  rankingUpdated: [
    STUDENT_REALTIME_EVENTS.rankingUpdated,
    'ranking:refresh',
    'leaderboard:updated',
    'leaderboard:refresh',
  ],
  studentAccessChanged: [
    STUDENT_REALTIME_EVENTS.studentAccessChanged,
    'student-access:changed',
    'access:changed',
  ],
});

const resolveSocketBaseUrl = (baseUrl) =>
  normalizeBaseUrl(baseUrl).replace(/\/api\/?$/, '');

const subscribeSocketEvents = (socket, eventNames = [], handler) => {
  if (!handler) {
    return;
  }

  eventNames.forEach((eventName) => {
    socket.on(eventName, handler);
  });
};

/**
 * Suscribe el dashboard del estudiante a invalidaciones en tiempo real.
 *
 * POR QUE:
 * - el backend sigue siendo la verdad del estado y del ranking
 * - el socket solo nos avisa "algo cambio"; luego recargamos por HTTP
 * - asi evitamos duplicar reglas de negocio en el cliente
 */
export const subscribeStudentRealtime = ({
  baseUrl,
  token,
  onAuthError,
  onClassSessionChanged,
  onRankingUpdated,
  onStudentAccessChanged,
  onConnected,
} = {}) => {
  if (!baseUrl || !token) {
    return () => {};
  }

  const socket = io(resolveSocketBaseUrl(baseUrl), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  subscribeSocketEvents(
    socket,
    STUDENT_REALTIME_EVENT_ALIASES.classSessionChanged,
    onClassSessionChanged,
  );
  subscribeSocketEvents(
    socket,
    STUDENT_REALTIME_EVENT_ALIASES.rankingUpdated,
    onRankingUpdated,
  );
  subscribeSocketEvents(
    socket,
    STUDENT_REALTIME_EVENT_ALIASES.studentAccessChanged,
    onStudentAccessChanged,
  );

  if (onConnected) {
    socket.on('connect', onConnected);
    socket.on('reconnect', onConnected);
  }

  socket.on('connect_error', (error) => {
    if (error?.data?.status === 401 && onAuthError) {
      socket.removeAllListeners();
      socket.disconnect();
      onAuthError(error);
    }
  });

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
};
