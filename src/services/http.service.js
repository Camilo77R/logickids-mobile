export const normalizeBaseUrl = (baseUrl) => baseUrl.trim().replace(/\/+$/, '');

export class HttpRequestError extends Error {
  constructor(message, { status = null, code = null, data = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'HttpRequestError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export const createNetworkError = (message, cause) =>
  new HttpRequestError(message, { code: 'NETWORK_ERROR', cause });

const AUTHENTICATION_ERROR_CODES = new Set([
  'INSTITUTION_INACTIVE',
  'SESSION_REVOKED',
  'STUDENT_INACTIVE',
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
]);

export const STUDENT_SESSION_ACTIVE_ERROR_CODE = 'STUDENT_SESSION_ACTIVE';
export const STUDENT_SESSION_RECOVERY_REQUIRED_ERROR_CODE =
  'STUDENT_SESSION_RECOVERY_REQUIRED';
export const STUDENT_SESSION_CONFLICT_REASONS = Object.freeze({
  studentActiveElsewhere: 'student_active_elsewhere',
  deviceOccupied: 'device_occupied',
  unknown: 'unknown',
});

const normalizeErrorMessage = (message) =>
  String(message ?? '').trim().toLowerCase();

export const resolveStudentSessionConflictReason = (error) => {
  const normalizedMessage = normalizeErrorMessage(error?.message);

  if (normalizedMessage.includes('otro dispositivo')) {
    return STUDENT_SESSION_CONFLICT_REASONS.studentActiveElsewhere;
  }

  if (normalizedMessage.includes('dispositivo ya tiene una sesion infantil activa')) {
    return STUDENT_SESSION_CONFLICT_REASONS.deviceOccupied;
  }

  return STUDENT_SESSION_CONFLICT_REASONS.unknown;
};

export const createStudentSessionRecoveryRequiredError = (
  message = 'Este dispositivo ya tiene una sesion infantil activa y no pudimos recuperarla automaticamente.',
  cause = null,
  recoveryReason = STUDENT_SESSION_CONFLICT_REASONS.unknown,
) => {
  const error = new Error(message, cause ? { cause } : undefined);
  error.name = 'StudentSessionRecoveryRequiredError';
  error.code = STUDENT_SESSION_RECOVERY_REQUIRED_ERROR_CODE;
  error.recoveryReason = recoveryReason;
  return error;
};

export const isAuthenticationError = (error) =>
  error instanceof HttpRequestError &&
  (error.status === 401 || AUTHENTICATION_ERROR_CODES.has(error.code));

export const isNetworkError = (error) =>
  error instanceof HttpRequestError && error.code === 'NETWORK_ERROR';

export const isStudentSessionActiveError = (error) =>
  error instanceof HttpRequestError &&
  error.code === STUDENT_SESSION_ACTIVE_ERROR_CODE;

export const isStudentSessionRecoveryRequiredError = (error) =>
  error instanceof Error &&
  error.code === STUDENT_SESSION_RECOVERY_REQUIRED_ERROR_CODE;

export const buildJsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const parseJsonResponse = async (response) => {
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const message = json?.message ?? `Fallo HTTP ${response.status}`;
    throw new HttpRequestError(message, {
      status: response.status,
      code: json?.code ?? json?.error?.code ?? null,
      data: json,
    });
  }

  return json.data;
};
