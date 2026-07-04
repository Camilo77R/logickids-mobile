import {
  isNetworkError,
  isStudentSessionRecoveryRequiredError,
  STUDENT_SESSION_CONFLICT_REASONS,
} from '../../services/http.service';
import {
  STUDENT_AUTH_RECOVERY_REASONS,
  STUDENT_AUTH_STATES,
} from './studentAuthState';

export const STUDENT_SESSION_ACTIVE_RECOVERY_MESSAGE =
  'Este estudiante ya tiene una sesion infantil activa en otro dispositivo. Si continua igual, el tutor o el colegio deben liberarla o recuperarla desde el panel de ese estudiante.';

export const STUDENT_DEVICE_OCCUPIED_RECOVERY_MESSAGE =
  'Este dispositivo ya esta en uso con otra sesion infantil activa. Si este mismo celular va a cambiar de estudiante, puedes liberar el dispositivo y continuar con este codigo QR.';

export const STUDENT_RECOVERY_ACTIONS = Object.freeze({
  home: 'home',
  retry: 'retry',
  scan: 'scan',
});

export const resolveStudentRecoveryScreenCopy = ({
  recoveryReason,
  errorMessage,
}) => {
  const isStudentSessionActive =
    recoveryReason === STUDENT_AUTH_RECOVERY_REASONS.studentSessionActive;
  const isDeviceOccupied =
    recoveryReason === STUDENT_AUTH_RECOVERY_REASONS.deviceOccupied;

  return {
    title: isStudentSessionActive
      ? 'Sesion activa detectada'
      : isDeviceOccupied
        ? 'Dispositivo en uso'
        : 'Estamos reconectando',
    message: isStudentSessionActive
      ? STUDENT_SESSION_ACTIVE_RECOVERY_MESSAGE
      : isDeviceOccupied
        ? STUDENT_DEVICE_OCCUPIED_RECOVERY_MESSAGE
      : errorMessage,
    primaryActionLabel: isStudentSessionActive
      ? 'Reintentar recuperacion'
      : isDeviceOccupied
        ? 'Liberar dispositivo y entrar'
      : 'Intentar de nuevo',
    secondaryActionLabel: isDeviceOccupied
      ? 'Volver al escaner'
      : 'Volver al escaner',
    primaryActionKind: STUDENT_RECOVERY_ACTIONS.retry,
    secondaryActionKind: STUDENT_RECOVERY_ACTIONS.scan,
  };
};

const buildRecoveryResolution = ({
  errorMessage = '',
  nextState,
  recoveryReason,
  session = null,
  clearQrToken = false,
}) => ({
  clearQrToken,
  errorMessage,
  nextState,
  recoveryReason,
  session,
  success: Boolean(session),
});

export const retryStudentRecoverySession = async ({
  service,
  recoveryReason,
  recoveryQrToken,
}) => {
  if (!service) {
    return buildRecoveryResolution({
      nextState: STUDENT_AUTH_STATES.anonymous,
      recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.unknown,
      clearQrToken: true,
    });
  }

  if (
    [
      STUDENT_AUTH_RECOVERY_REASONS.studentSessionActive,
      STUDENT_AUTH_RECOVERY_REASONS.deviceOccupied,
    ].includes(recoveryReason) &&
    recoveryQrToken
  ) {
    try {
      const session = await service.loginByQr(recoveryQrToken, {
        deviceConflictStrategy:
          recoveryReason === STUDENT_AUTH_RECOVERY_REASONS.deviceOccupied
            ? 'replace_existing_device_session'
            : undefined,
      });
      return buildRecoveryResolution({
        session,
        nextState: STUDENT_AUTH_STATES.authenticated,
        recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.unknown,
        clearQrToken: true,
      });
    } catch (error) {
      if (isStudentSessionRecoveryRequiredError(error)) {
        return buildRecoveryResolution({
          errorMessage: error.message,
          nextState: STUDENT_AUTH_STATES.recovery,
          recoveryReason:
            error.recoveryReason === STUDENT_SESSION_CONFLICT_REASONS.deviceOccupied
              ? STUDENT_AUTH_RECOVERY_REASONS.deviceOccupied
              : STUDENT_AUTH_RECOVERY_REASONS.studentSessionActive,
        });
      }

      return buildRecoveryResolution({
        errorMessage:
          error.message ||
          'No pudimos reconectar tu sesion infantil desde el mismo codigo.',
        nextState: STUDENT_AUTH_STATES.recovery,
        recoveryReason: isNetworkError(error)
          ? STUDENT_AUTH_RECOVERY_REASONS.connectivity
          : STUDENT_AUTH_RECOVERY_REASONS.unknown,
      });
    }
  }

  try {
    const session = await service.restore();

    if (session) {
      return buildRecoveryResolution({
        session,
        nextState: STUDENT_AUTH_STATES.authenticated,
        recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.unknown,
        clearQrToken: true,
      });
    }

    return buildRecoveryResolution({
      errorMessage:
        'Tu sesion sigue activa en el dispositivo, pero todavia no pudimos recuperarla.',
      nextState: STUDENT_AUTH_STATES.recovery,
      recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.studentSessionActive,
    });
  } catch (error) {
    return buildRecoveryResolution({
      errorMessage:
        error.message || 'No pudimos reconectar tu sesion infantil.',
      nextState: STUDENT_AUTH_STATES.recovery,
      recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.connectivity,
    });
  }
};

export const dismissStudentRecoverySession = () =>
  buildRecoveryResolution({
    errorMessage: '',
    nextState: STUDENT_AUTH_STATES.anonymous,
    recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.unknown,
    session: null,
    clearQrToken: true,
  });
