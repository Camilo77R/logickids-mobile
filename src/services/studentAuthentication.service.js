import { isAuthenticationError } from './http.service';
import { isStudentCredentialExpired } from './studentCredential.model';

const normalizeBaseUrl = (baseUrl) => String(baseUrl ?? '').trim().replace(/\/+$/, '');

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

  return Object.freeze({
    async loginByQr(qrToken) {
      const installationId = await installationStorage.getOrCreate();
      const loginData = await accessService.loginByQr(qrToken, {
        installationId,
        appVersion,
      });
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
