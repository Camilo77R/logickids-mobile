import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resolveConfiguredApiBaseUrl,
  resolveDefaultApiBaseUrl,
} from '../config/api';
import {
  canConfigureApiAtRuntime,
  requiresHttpsApi,
} from '../config/runtimeEnvironment';

const API_BASE_URL_STORAGE_KEY = 'logickids.mobile.apiBaseUrl';

export const normalizeApiBaseUrl = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/+$/, '');
};

export const isValidApiBaseUrl = (
  value,
  { requireHttps = requiresHttpsApi() } = {},
) => {
  const normalizedValue = normalizeApiBaseUrl(value);

  if (!normalizedValue) {
    return false;
  }

  try {
    const url = new URL(normalizedValue);
    const allowedProtocol = requireHttps
      ? url.protocol === 'https:'
      : ['http:', 'https:'].includes(url.protocol);

    return allowedProtocol && url.pathname.replace(/\/$/, '').endsWith('/api');
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
    if (!isValidApiBaseUrl(configuredValue)) {
      throw new Error('La build no tiene configurada una URL HTTPS valida para la API.');
    }

    return configuredValue;
  }

  if (!canConfigureApiAtRuntime()) {
    return '';
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
  if (!canConfigureApiAtRuntime()) {
    throw new Error('La conexion del servidor no se puede modificar en esta version.');
  }

  const normalizedValue = normalizeApiBaseUrl(value);

  if (!isValidApiBaseUrl(normalizedValue, { requireHttps: false })) {
    throw new Error('La URL debe iniciar con http:// o https:// y terminar en /api.');
  }

  await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, normalizedValue);
  return normalizedValue;
};
