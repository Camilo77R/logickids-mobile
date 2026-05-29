import { API_BASE_URL } from '../config/api';

export class HttpError extends Error {
  constructor(message, status = 0, details = []) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

const parsePayload = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
};

export const request = async (path, { method = 'GET', body, token } = {}) => {
  let response;

  if (!API_BASE_URL) {
    throw new HttpError(
      'No hay URL de backend configurada. Compila la APK con EXPO_PUBLIC_API_URL apuntando al servidor real.',
      0
    );
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new HttpError(`No fue posible conectar con el backend en ${API_BASE_URL}.`, 0);
  }

  const payload = await parsePayload(response);

  if (!response.ok || payload?.success === false) {
    throw new HttpError(
      payload?.message || 'No fue posible completar la solicitud.',
      response.status,
      payload?.errors || []
    );
  }

  return payload;
};
