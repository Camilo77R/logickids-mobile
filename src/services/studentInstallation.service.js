import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STUDENT_INSTALLATION_KEY = 'logickids.student.installation.v1';

const isValidInstallationId = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const studentInstallationStorage = Object.freeze({
  async getOrCreate() {
    const storedInstallationId = await SecureStore.getItemAsync(STUDENT_INSTALLATION_KEY);

    if (isValidInstallationId(storedInstallationId)) {
      return storedInstallationId;
    }

    const installationId = Crypto.randomUUID();
    await SecureStore.setItemAsync(STUDENT_INSTALLATION_KEY, installationId, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return installationId;
  },
});
