import {
  createStudentSessionRecoveryRequiredError,
  isAuthenticationError,
  isStudentSessionActiveError,
  resolveStudentSessionConflictReason,
  STUDENT_SESSION_CONFLICT_REASONS,
} from './http.service';
import { isStudentCredentialExpired } from './studentCredential.model';

const normalizeBaseUrl = (baseUrl) => String(baseUrl ?? '').trim().replace(/\/+$/, '');
export const STUDENT_DEVICE_CONFLICT_STRATEGIES = Object.freeze({
  replaceExistingDeviceSession: 'replace_existing_device_session',
});

const buildSessionRecoveryMessage = (conflictReason) => {
  if (conflictReason === STUDENT_SESSION_CONFLICT_REASONS.studentActiveElsewhere) {
    return 'Este estudiante ya tiene una sesion infantil activa en otro dispositivo y no pudimos recuperarla automaticamente desde aqui.';
  }

  if (conflictReason === STUDENT_SESSION_CONFLICT_REASONS.deviceOccupied) {
    return 'Este dispositivo ya esta en uso con otra sesion infantil activa. Cierra esa sesion o pide al tutor que libere el dispositivo correcto antes de continuar.';
  }

  return 'Este dispositivo ya tiene una sesion infantil activa y no pudimos recuperarla automaticamente.';
};

const buildStudentSession = ({
  token,
  profile,
  apiBaseUrl,
  deviceSessionId,
  expiresAt,
}) => ({
  token,
  studentProfile: profile,
  apiBaseUrl: normalizeBaseUrl(apiBaseUrl),
  deviceSessionId,
  expiresAt,
  authenticatedAt: new Date().toISOString(),
});

export const createStudentAuthenticationService = ({
  baseUrl,
  accessService,
  credentialStorage,
  installationStorage,
  appVersion,
}) => {
  const apiBaseUrl = normalizeBaseUrl(baseUrl);

  if (!apiBaseUrl || !accessService || !credentialStorage || !installationStorage) {
    throw new Error('Autenticacion estudiantil requiere API, instalacion y almacenamiento seguro.');
  }

  const restoreStoredSession = async () => {
    const credential = await credentialStorage.load();

    if (!credential) {
      return null;
    }

    if (isStudentCredentialExpired(credential)) {
      await credentialStorage.clear();
      return null;
    }

    if (normalizeBaseUrl(credential.apiBaseUrl) !== apiBaseUrl) {
      await credentialStorage.clear();
      return null;
    }

    try {
      const profile = await accessService.fetchProfile(credential.token);
      return buildStudentSession({
        token: credential.token,
        profile,
        apiBaseUrl,
        deviceSessionId: credential.deviceSessionId,
        expiresAt: credential.expiresAt,
      });
    } catch (error) {
      if (isAuthenticationError(error)) {
        await credentialStorage.clear();
        return null;
      }

      throw error;
    }
  };

  return Object.freeze({
    async loginByQr(qrToken, { deviceConflictStrategy } = {}) {
      const installationId = await installationStorage.getOrCreate();
      let loginData;

      try {
        loginData = await accessService.loginByQr(qrToken, {
          installationId,
          appVersion,
          deviceConflictStrategy,
        });
      } catch (error) {
        if (isStudentSessionActiveError(error)) {
          const restoredSession = await restoreStoredSession();

          if (restoredSession) {
            return restoredSession;
          }

          const conflictReason = resolveStudentSessionConflictReason(error);

          throw createStudentSessionRecoveryRequiredError(
            buildSessionRecoveryMessage(conflictReason),
            error,
            conflictReason,
          );
        }

        throw error;
      }
      const session = buildStudentSession({
        token: loginData.token,
        profile: loginData.estudiante,
        apiBaseUrl,
        deviceSessionId: loginData.device_session?.id,
        expiresAt: loginData.expires_at,
      });

      await credentialStorage.save(session);
      return session;
    },

    async restore() {
      return restoreStoredSession();
    },

    async refresh(session) {
      const profile = await accessService.fetchProfile(session.token);
      return {
        ...session,
        studentProfile: profile,
      };
    },

    async logout(session = null) {
      const credential = session ?? await credentialStorage.load();

      if (credential?.token) {
        try {
          await accessService.logout(credential.token);
        } catch (error) {
          if (!isAuthenticationError(error)) {
            throw error;
          }
        }
      }

      await credentialStorage.clear();
    },

    async clearLocalCredential() {
      await credentialStorage.clear();
    },
  });
};
