import * as SecureStore from 'expo-secure-store';
import {
  parseStudentCredential,
  STUDENT_CREDENTIAL_SCHEMA_VERSION,
} from './studentCredential.model';

const STUDENT_CREDENTIAL_KEY = 'logickids.student.credential.v2';

export const studentCredentialStorage = Object.freeze({
  async load() {
    const serializedCredential = await SecureStore.getItemAsync(STUDENT_CREDENTIAL_KEY);
    const credential = parseStudentCredential(serializedCredential);

    if (!credential && serializedCredential) {
      await SecureStore.deleteItemAsync(STUDENT_CREDENTIAL_KEY);
    }

    return credential;
  },

  async save({ token, apiBaseUrl, deviceSessionId, expiresAt }) {
    const credential = parseStudentCredential(JSON.stringify({
      version: STUDENT_CREDENTIAL_SCHEMA_VERSION,
      token,
      apiBaseUrl,
      deviceSessionId,
      expiresAt,
    }));

    if (!credential) {
      throw new Error('No fue posible preparar una credencial estudiantil valida.');
    }

    await SecureStore.setItemAsync(
      STUDENT_CREDENTIAL_KEY,
      JSON.stringify(credential),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  },

  async clear() {
    await SecureStore.deleteItemAsync(STUDENT_CREDENTIAL_KEY);
  },
});
