export const APP_ENVIRONMENTS = Object.freeze({
  development: 'development',
  preview: 'preview',
  production: 'production',
});

const KNOWN_ENVIRONMENTS = new Set(Object.values(APP_ENVIRONMENTS));

export const resolveAppEnvironment = (
  configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV,
) => {
  const normalizedEnvironment = String(configuredEnvironment ?? '')
    .trim()
    .toLowerCase();

  if (KNOWN_ENVIRONMENTS.has(normalizedEnvironment)) {
    return normalizedEnvironment;
  }

  return typeof __DEV__ !== 'undefined' && __DEV__
    ? APP_ENVIRONMENTS.development
    : APP_ENVIRONMENTS.production;
};

export const canConfigureApiAtRuntime = (configuredEnvironment) =>
  resolveAppEnvironment(configuredEnvironment) === APP_ENVIRONMENTS.development;

export const requiresHttpsApi = (configuredEnvironment) =>
  resolveAppEnvironment(configuredEnvironment) !== APP_ENVIRONMENTS.development;
