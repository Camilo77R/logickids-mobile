import { io } from 'socket.io-client';
import { normalizeBaseUrl } from './http.service';

export const STUDENT_REALTIME_EVENTS = Object.freeze({
  classSessionChanged: 'class_session:changed',
  rankingUpdated: 'ranking:updated',
  studentAccessChanged: 'student_access:changed',
});

const resolveSocketBaseUrl = (baseUrl) =>
  normalizeBaseUrl(baseUrl).replace(/\/api\/?$/, '');

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
} = {}) => {
  if (!baseUrl || !token) {
    return () => {};
  }

  const socket = io(resolveSocketBaseUrl(baseUrl), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  if (onClassSessionChanged) {
    socket.on(STUDENT_REALTIME_EVENTS.classSessionChanged, onClassSessionChanged);
  }

  if (onRankingUpdated) {
    socket.on(STUDENT_REALTIME_EVENTS.rankingUpdated, onRankingUpdated);
  }

  if (onStudentAccessChanged) {
    socket.on(STUDENT_REALTIME_EVENTS.studentAccessChanged, onStudentAccessChanged);
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
