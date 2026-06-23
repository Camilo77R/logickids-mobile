const assert = require('node:assert/strict');
const test = require('node:test');

const {
  APP_ENVIRONMENTS,
  canConfigureApiAtRuntime,
  requiresHttpsApi,
  resolveAppEnvironment,
} = require('../../src/config/runtimeEnvironment.js');
const {
  HttpRequestError,
} = require('../../src/services/http.service.js');
const {
  parseStudentCredential,
  STUDENT_CREDENTIAL_SCHEMA_VERSION,
} = require('../../src/services/studentCredential.model.js');
const {
  createStudentAuthenticationService,
} = require('../../src/services/studentAuthentication.service.js');
const {
  ESTADOS_ACCESO_JUEGO,
  resolverAccesoJuegoDesdePerfil,
} = require('../../src/features/games/core/resolverAccesoJuego.js');

test('entorno desconocido falla cerrado como produccion', () => {
  assert.equal(resolveAppEnvironment('preview'), APP_ENVIRONMENTS.preview);
  assert.equal(resolveAppEnvironment('valor-invalido'), APP_ENVIRONMENTS.production);
  assert.equal(canConfigureApiAtRuntime('development'), true);
  assert.equal(canConfigureApiAtRuntime('preview'), false);
  assert.equal(canConfigureApiAtRuntime('production'), false);
  assert.equal(requiresHttpsApi('development'), false);
  assert.equal(requiresHttpsApi('production'), true);
});

test('credencial persistida conserva solo token y origen normalizados', () => {
  assert.deepEqual(
    parseStudentCredential(JSON.stringify({
      version: STUDENT_CREDENTIAL_SCHEMA_VERSION,
      token: ' token-estudiante ',
      apiBaseUrl: 'https://api.logickids.test/api/',
      deviceSessionId: 'device-session-7',
      expiresAt: '2030-01-01T12:00:00.000Z',
      studentProfile: { nombre: 'No debe persistirse' },
      qrToken: 'No debe persistirse',
    })),
    {
      version: STUDENT_CREDENTIAL_SCHEMA_VERSION,
      token: 'token-estudiante',
      apiBaseUrl: 'https://api.logickids.test/api',
      deviceSessionId: 'device-session-7',
      expiresAt: '2030-01-01T12:00:00.000Z',
    },
  );
  assert.equal(parseStudentCredential('{invalido'), null);
  assert.equal(parseStudentCredential(JSON.stringify({ version: 99 })), null);
});

test('restauracion usa perfil fresco validado por backend', async () => {
  let savedCredential = {
    version: STUDENT_CREDENTIAL_SCHEMA_VERSION,
    token: 'jwt-valido',
    apiBaseUrl: 'https://api.logickids.test/api',
    deviceSessionId: 'device-session-7',
    expiresAt: '2030-01-01T12:00:00.000Z',
  };
  const authentication = createStudentAuthenticationService({
    baseUrl: 'https://api.logickids.test/api',
    accessService: {
      fetchProfile: async (token) => ({ id: 7, nombre: 'Perfil fresco', token }),
    },
    credentialStorage: {
      load: async () => savedCredential,
      save: async (credential) => { savedCredential = credential; },
      clear: async () => { savedCredential = null; },
    },
    installationStorage: { getOrCreate: async () => 'installation-7' },
    appVersion: '1.0.0',
  });

  const session = await authentication.restore();

  assert.equal(session.token, 'jwt-valido');
  assert.equal(session.studentProfile.nombre, 'Perfil fresco');
  assert.equal(session.apiBaseUrl, 'https://api.logickids.test/api');
});

test('restauracion elimina token rechazado pero conserva token ante red caida', async () => {
  let clearCount = 0;
  const credentialStorage = {
    load: async () => ({
      version: STUDENT_CREDENTIAL_SCHEMA_VERSION,
      token: 'jwt',
      apiBaseUrl: 'https://api.logickids.test/api',
      deviceSessionId: 'device-session-7',
      expiresAt: '2030-01-01T12:00:00.000Z',
    }),
    save: async () => {},
    clear: async () => { clearCount += 1; },
  };
  const rejectedAuthentication = createStudentAuthenticationService({
    baseUrl: 'https://api.logickids.test/api',
    accessService: {
      fetchProfile: async () => {
        throw new HttpRequestError('Token invalido', { status: 401 });
      },
    },
    credentialStorage,
    installationStorage: { getOrCreate: async () => 'installation-7' },
    appVersion: '1.0.0',
  });

  assert.equal(await rejectedAuthentication.restore(), null);
  assert.equal(clearCount, 1);

  const offlineAuthentication = createStudentAuthenticationService({
    baseUrl: 'https://api.logickids.test/api',
    accessService: {
      fetchProfile: async () => {
        throw new HttpRequestError('Sin red', { code: 'NETWORK_ERROR' });
      },
    },
    credentialStorage,
    installationStorage: { getOrCreate: async () => 'installation-7' },
    appVersion: '1.0.0',
  });

  await assert.rejects(() => offlineAuthentication.restore(), /Sin red/);
  assert.equal(clearCount, 1);
});

test('participante terminal sigue bloqueado aunque la sesion de clase este activa', () => {
  const access = resolverAccesoJuegoDesdePerfil({
    perfilEstudiante: {
      grupo_id: 57,
      grupo_activo: true,
      sesion_activa: true,
      sesion_participante_estado: 'completado',
      sesion_minijuego_slug: 'robot-logico',
    },
    slugJuego: 'robot-logico',
  });

  assert.equal(access.estado, ESTADOS_ACCESO_JUEGO.bloqueado);
  assert.match(access.motivo, /completaste/i);
});
