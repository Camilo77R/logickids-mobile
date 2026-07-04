export const STUDENT_AUTH_STATES = Object.freeze({
  anonymous: 'anonymous',
  authenticated: 'authenticated',
  recovery: 'recovery',
  restoring: 'restoring',
});

export const STUDENT_AUTH_RECOVERY_REASONS = Object.freeze({
  connectivity: 'connectivity',
  studentSessionActive: 'student_session_active',
  deviceOccupied: 'device_occupied',
  unknown: 'unknown',
});
