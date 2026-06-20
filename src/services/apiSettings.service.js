import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resolveConfiguredApiBaseUrl,
  resolveDefaultApiBaseUrl,
} from '../config/api';

const API_BASE_URL_STORAGE_KEY = 'logickids.mobile.apiBaseUrl';

export const normalizeApiBaseUrl = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/+$/, '');
};

export const isValidApiBaseUrl = (value) => {
  const normalizedValue = normalizeApiBaseUrl(value);

  if (!normalizedValue) {
    return false;
  }

  try {
    const url = new URL(normalizedValue);
    return ['http:', 'https:'].includes(url.protocol) && url.pathname.replace(/\/$/, '').endsWith('/api');
  } catch (_error) {
    return false;
  }
};

export const isLoopbackApiBaseUrl = (value) => {
  const normalizedValue = normalizeApiBaseUrl(value);

  if (!normalizedValue) {
    return false;
  }

  const configuredValue = resolveConfiguredApiBaseUrl();

  if (configuredValue && normalizedValue === normalizeApiBaseUrl(configuredValue)) {
    return false;
  }

  try {
    const { hostname } = new URL(normalizedValue);
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch (_error) {
    return false;
  }
};

export const loadApiBaseUrlSetting = async () => {
  const configuredValue = resolveConfiguredApiBaseUrl();

  if (configuredValue) {
    return configuredValue;
  }

  const storedValue = normalizeApiBaseUrl(
    await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY),
  );

  if (storedValue) {
    return storedValue;
  }

  return resolveDefaultApiBaseUrl();
};

export const saveApiBaseUrlSetting = async (value) => {
  const normalizedValue = normalizeApiBaseUrl(value);

  if (!isValidApiBaseUrl(normalizedValue)) {
    throw new Error('La URL debe iniciar con http:// o https:// y terminar en /api.');
  }

  await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, normalizedValue);
  return normalizedValue;
};
