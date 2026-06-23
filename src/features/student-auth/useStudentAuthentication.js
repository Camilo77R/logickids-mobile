import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';

import { createStudentAccessService } from '../../services/studentAccess.service';
import { createStudentAuthenticationService } from '../../services/studentAuthentication.service';
import { studentCredentialStorage } from '../../services/studentCredentialStorage.service';
import { studentInstallationStorage } from '../../services/studentInstallation.service';
import { isAuthenticationError } from '../../services/http.service';

export const STUDENT_AUTH_STATES = Object.freeze({
  anonymous: 'anonymous',
  authenticated: 'authenticated',
  recovery: 'recovery',
  restoring: 'restoring',
});

export const useStudentAuthentication = ({ apiBaseUrl, ready }) => {
  const [session, setSession] = useState(null);
  const [state, setState] = useState(STUDENT_AUTH_STATES.restoring);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const logoutInFlightRef = useRef(false);
  const revalidationInFlightRef = useRef(false);
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
    } catch (restoreError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSession(null);
      setError(restoreError.message || 'No pudimos verificar tu sesion guardada.');
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

    const authenticatedSession = await service.loginByQr(qrToken);
    setSession(authenticatedSession);
    setError('');
    setState(STUDENT_AUTH_STATES.authenticated);
    return authenticatedSession;
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
      setState(STUDENT_AUTH_STATES.anonymous);
      return true;
    } catch (logoutError) {
      setSession(null);
      setError(logoutError.message || 'No pudimos cerrar la sesion de forma segura.');
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
    setState(STUDENT_AUTH_STATES.anonymous);
  }, [service, session]);

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
        setState(STUDENT_AUTH_STATES.anonymous);
      } else {
        setSession(null);
        setError(refreshError.message || 'Sin conexion. Reconecta para continuar jugando.');
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
    error,
    loginByQr,
    logout,
    restore,
    session,
    state,
  };
};
