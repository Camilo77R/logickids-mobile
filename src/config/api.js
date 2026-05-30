import { NativeModules } from 'react-native';
export { QR_LOGIN_PATH, STUDENT_PROFILE_PATH } from './apiContract';

const API_PORT = '3000';

const normalizeBaseUrl = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().replace(/\/+$/, '');
  return normalizedValue || null;
};

const resolveBundleHost = () => {
  const scriptUrl = NativeModules?.SourceCode?.scriptURL;

  if (typeof scriptUrl !== 'string' || !scriptUrl.startsWith('http')) {
    return null;
  }

  try {
    return new URL(scriptUrl).hostname;
  } catch (_error) {
    return null;
  }
};

export const resolveConfiguredApiBaseUrl = () =>
  normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);

export const resolveDefaultApiBaseUrl = () => {
  const configuredApiBaseUrl = resolveConfiguredApiBaseUrl();

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  const bundleHost = resolveBundleHost();

  if (bundleHost) {
    return `http://${bundleHost}:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
};
