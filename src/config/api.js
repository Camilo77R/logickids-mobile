import { NativeModules, Platform } from 'react-native';
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

export const resolveDefaultApiBaseUrl = () => {
  const configuredApiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  const bundleHost = resolveBundleHost();

  if (bundleHost) {
    return `http://${bundleHost}:${API_PORT}/api`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
};
