import Constants from 'expo-constants';

const configuredApiUrl = Constants.expoConfig?.extra?.apiBaseUrl;
const configuredQrLoginPath = Constants.expoConfig?.extra?.qrLoginPath;
const configuredStudentProfilePath = Constants.expoConfig?.extra?.studentProfilePath;

const getExpoDevHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0];
};

const expoDevHost = getExpoDevHost();
const localNetworkApiUrl = expoDevHost ? `http://${expoDevHost}:3000/api` : null;
const localFallbackApiUrl = __DEV__ ? 'http://localhost:3000/api' : '';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  configuredApiUrl ||
  localNetworkApiUrl ||
  localFallbackApiUrl;

export const QR_LOGIN_PATH =
  process.env.EXPO_PUBLIC_QR_LOGIN_PATH || configuredQrLoginPath || '/estudiantes/login';

export const STUDENT_PROFILE_PATH =
  process.env.EXPO_PUBLIC_STUDENT_PROFILE_PATH ||
  configuredStudentProfilePath ||
  '/estudiantes/mi-perfil';
