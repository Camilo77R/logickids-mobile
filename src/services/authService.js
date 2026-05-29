import { QR_LOGIN_PATH } from '../config/api';
import { request } from './httpClient';
import { extractQrToken } from '../utils/qrToken';

const readSessionFromPayload = (payload) => {
  const data = payload?.data || payload || {};

  return {
    token: data.token || data.access_token || data.jwt || null,
    student: data.estudiante || data.student || data.usuario || data.user || null,
    raw: data,
  };
};

export const loginWithQr = async (qrValue) => {
  const qrToken = extractQrToken(qrValue);

  if (!qrToken) {
    throw new Error('El codigo QR no contiene un token valido.');
  }

  const payload = await request(QR_LOGIN_PATH, {
    method: 'POST',
    body: {
      qr_token: qrToken,
    },
  });

  const session = readSessionFromPayload(payload);

  if (!session.token) {
    throw new Error('El backend no devolvio un token de sesion.');
  }

  return session;
};
