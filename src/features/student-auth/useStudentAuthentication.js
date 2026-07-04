import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';

import { createStudentAccessService } from '../../services/studentAccess.service';
import { createStudentAuthenticationService } from '../../services/studentAuthentication.service';
import { studentCredentialStorage } from '../../services/studentCredentialStorage.service';
import { studentInstallationStorage } from '../../services/studentInstallation.service';
import {
  isAuthenticationError,
  isStudentSessionRecoveryRequiredError,
  STUDENT_SESSION_CONFLICT_REASONS,
} from '../../services/http.service';
import {
  STUDENT_AUTH_RECOVERY_REASONS,
  STUDENT_AUTH_STATES,
} from './studentAuthState';
import {
  dismissStudentRecoverySession,
  retryStudentRecoverySession,
} from './studentSessionRecovery';

export const useStudentAuthentication = ({ apiBaseUrl, ready }) => {
  const [session, setSession] = useState(null);
  const [state, setState] = useState(STUDENT_AUTH_STATES.restoring);
  const [error, setError] = useState('');
  const [recoveryReason, setRecoveryReason] = useState(
    STUDENT_AUTH_RECOVERY_REASONS.unknown,
  );
  const requestIdRef = useRef(0);
  const logoutInFlightRef = useRef(false);
  const revalidationInFlightRef = useRef(false);
  const recoveryQrTokenRef = useRef('');
  const previousAppStateRef = useRef(AppState.currentState);
  const service = useMemo(() => {
    if (!apiBaseUrl) {
      return null;
    }

    const accessService = createStudentAccessService(apiBaseUrl);
    return createStudentAuthenticationService({
      baseUrl: apiBaseUrl,
      accessService,
      credentialStorage: studentCredentialStorage,
      installationStorage: studentInstallationStorage,
      appVersion: Constants.expoConfig?.version ?? null,
    });
  }, [apiBaseUrl]);

  const restore = useCallback(async () => {
    if (!ready) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setState(STUDENT_AUTH_STATES.restoring);
    setError('');
    setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.unknown);

    if (!service) {
      setSession(null);
      setState(STUDENT_AUTH_STATES.anonymous);
      return;
    }

    try {
      const restoredSession = await service.restore();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSession(restoredSession);
      setState(
        restoredSession
          ? STUDENT_AUTH_STATES.authenticated
          : STUDENT_AUTH_STATES.anonymous,
      );
      setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.unknown);
    } catch (restoreError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSession(null);
      setError(restoreError.message || 'No pudimos verificar tu sesion guardada.');
      setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.connectivity);
      setState(STUDENT_AUTH_STATES.recovery);
    }
  }, [ready, service]);

  useEffect(() => {
    void restore();

    return () => {
      requestIdRef.current += 1;
    };
  }, [restore]);

  const loginByQr = useCallback(async (qrToken) => {
    if (!service) {
      throw new Error('La conexion segura con el colegio no esta disponible.');
    }

    try {
      recoveryQrTokenRef.current = qrToken;
      const authenticatedSession = await service.loginByQr(qrToken);
      setSession(authenticatedSession);
      setError('');
      setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.unknown);
      setState(STUDENT_AUTH_STATES.authenticated);
      recoveryQrTokenRef.current = '';
      return authenticatedSession;
    } catch (loginError) {
      if (isStudentSessionRecoveryRequiredError(loginError)) {
        setSession(null);
        setError(loginError.message);
        setRecoveryReason(
          loginError.recoveryReason === STUDENT_SESSION_CONFLICT_REASONS.deviceOccupied
            ? STUDENT_AUTH_RECOVERY_REASONS.deviceOccupied
            : STUDENT_AUTH_RECOVERY_REASONS.studentSessionActive,
        );
        setState(STUDENT_AUTH_STATES.recovery);
        return null;
      }

      recoveryQrTokenRef.current = '';
      throw loginError;
    }
  }, [service]);

  const logout = useCallback(async () => {
    if (logoutInFlightRef.current) {
      return false;
    }

    logoutInFlightRef.current = true;
    requestIdRef.current += 1;

    try {
      if (service) {
        await service.logout(session);
      } else {
        await studentCredentialStorage.clear();
      }

      setSession(null);
      setError('');
      setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.unknown);
      setState(STUDENT_AUTH_STATES.anonymous);
      recoveryQrTokenRef.current = '';
      return true;
    } catch (logoutError) {
      setSession(null);
      setError(logoutError.message || 'No pudimos cerrar la sesion de forma segura.');
      setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.connectivity);
      setState(STUDENT_AUTH_STATES.recovery);
      return false;
    } finally {
      logoutInFlightRef.current = false;
    }
  }, [service, session]);

  const clearForApiChange = useCallback(async () => {
    requestIdRef.current += 1;

    if (service) {
      await service.logout(session);
    } else {
      await studentCredentialStorage.clear();
    }

    setSession(null);
    setError('');
    setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.unknown);
    setState(STUDENT_AUTH_STATES.anonymous);
    recoveryQrTokenRef.current = '';
  }, [service, session]);

  const retryRecovery = useCallback(async () => {
    setState(STUDENT_AUTH_STATES.restoring);
    setError('');
    const resolution = await retryStudentRecoverySession({
      service,
      recoveryReason,
      recoveryQrToken: recoveryQrTokenRef.current,
    });

    if (resolution.clearQrToken) {
      recoveryQrTokenRef.current = '';
    }

    setSession(resolution.session);
    setError(resolution.errorMessage);
    setRecoveryReason(resolution.recoveryReason);
    setState(resolution.nextState);

    return resolution.success;
  }, [recoveryReason, service]);

  const dismissRecovery = useCallback(() => {
    const resolution = dismissStudentRecoverySession();

    if (resolution.clearQrToken) {
      recoveryQrTokenRef.current = '';
    }

    setSession(resolution.session);
    setError(resolution.errorMessage);
    setRecoveryReason(resolution.recoveryReason);
    setState(resolution.nextState);
  }, []);

  const revalidate = useCallback(async () => {
    if (!session || !service || revalidationInFlightRef.current) {
      return;
    }

    revalidationInFlightRef.current = true;

    try {
      const refreshedSession = await service.refresh(session);
      setSession((currentSession) =>
        currentSession?.token === refreshedSession.token
          ? refreshedSession
          : currentSession,
      );
    } catch (refreshError) {
      if (isAuthenticationError(refreshError)) {
        await service.clearLocalCredential();
        setSession(null);
        setError('');
        setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.unknown);
        setState(STUDENT_AUTH_STATES.anonymous);
        recoveryQrTokenRef.current = '';
      } else {
        setSession(null);
        setError(refreshError.message || 'Sin conexion. Reconecta para continuar jugando.');
        setRecoveryReason(STUDENT_AUTH_RECOVERY_REASONS.connectivity);
        setState(STUDENT_AUTH_STATES.recovery);
      }
    } finally {
      revalidationInFlightRef.current = false;
    }
  }, [service, session]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = previousAppStateRef.current;
      previousAppStateRef.current = nextAppState;

      if (
        nextAppState === 'active' &&
        previousAppState &&
        previousAppState !== 'active'
      ) {
        void revalidate();
      }
    });

    return () => subscription.remove();
  }, [revalidate]);

  return {
    clearForApiChange,
    dismissRecovery,
    error,
    loginByQr,
    logout,
    recoveryReason,
    retryRecovery,
    restore,
    session,
    state,
  };
};
