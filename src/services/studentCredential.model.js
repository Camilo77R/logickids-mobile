export const STUDENT_CREDENTIAL_SCHEMA_VERSION = 2;

export const parseStudentCredential = (serializedCredential) => {
  if (!serializedCredential) {
    return null;
  }

  try {
    const credential = JSON.parse(serializedCredential);

    if (
      credential?.version !== STUDENT_CREDENTIAL_SCHEMA_VERSION ||
      typeof credential.token !== 'string' ||
      !credential.token.trim() ||
      typeof credential.apiBaseUrl !== 'string' ||
      !credential.apiBaseUrl.trim() ||
      typeof credential.deviceSessionId !== 'string' ||
      !credential.deviceSessionId.trim() ||
      typeof credential.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(credential.expiresAt))
    ) {
      return null;
    }

    return {
      version: STUDENT_CREDENTIAL_SCHEMA_VERSION,
      token: credential.token.trim(),
      apiBaseUrl: credential.apiBaseUrl.trim().replace(/\/+$/, ''),
      deviceSessionId: credential.deviceSessionId.trim(),
      expiresAt: new Date(credential.expiresAt).toISOString(),
    };
  } catch {
    return null;
  }
};

export const isStudentCredentialExpired = (credential, now = Date.now()) =>
  !credential || Date.parse(credential.expiresAt) <= Number(now);
