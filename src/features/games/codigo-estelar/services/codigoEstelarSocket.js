import { io } from 'socket.io-client';
import { CODIGO_ESTELAR_SOCKET_EVENTS } from '../codigoEstelar.constants';

const normalizeSocketUrl = (apiBaseUrl) =>
  apiBaseUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

/**
 * Envuelve Socket.IO para que el controller no dependa del cliente crudo.
 */
export const createCodigoEstelarSocketClient = ({ apiBaseUrl, studentToken }) => {
  const socket = io(normalizeSocketUrl(apiBaseUrl), {
    auth: { token: studentToken },
    // En React Native nos conviene ir directo a websocket:
    // el navegador debug ya demostro que este transporte funciona y evitamos
    // la capa de long-polling que es donde suelen aparecer los falsos
    // "Network request failed" en builds instaladas.
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    autoConnect: false,
    timeout: 10000,
  });

  return {
    raw: socket,
    connect() {
      socket.connect();
      return socket;
    },
    joinSession(sesionId) {
      socket.emit(CODIGO_ESTELAR_SOCKET_EVENTS.join, { sesionId });
    },
    submitAnswer(payload) {
      socket.emit(CODIGO_ESTELAR_SOCKET_EVENTS.submit, payload);
    },
    on(eventName, handler) {
      socket.on(eventName, handler);
    },
    off(eventName, handler) {
      socket.off(eventName, handler);
    },
    disconnect() {
      socket.disconnect();
    },
  };
};
