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
const {
  shouldCloseActiveGame,
} = require('../../src/features/games/core/activeGameLifecycle.js');
const {
  resolvePostGameNavigation,
} = require('../../src/features/games/core/postGameFlow.js');
const {
  resolveStudentAvatarUri,
} = require('../../src/services/studentAvatar.service.js');

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

test('login por QR reutiliza la sesion local si la misma instalacion ya sigue activa', async () => {
  const authentication = createStudentAuthenticationService({
    baseUrl: 'https://api.logickids.test/api',
    accessService: {
      loginByQr: async () => {
        throw new HttpRequestError('Ya existe una sesion activa', {
          status: 409,
          code: 'STUDENT_SESSION_ACTIVE',
        });
      },
      fetchProfile: async () => ({ id: 8, nombre: 'Perfil restaurado' }),
    },
    credentialStorage: {
      load: async () => ({
        version: STUDENT_CREDENTIAL_SCHEMA_VERSION,
        token: 'jwt-restaurable',
        apiBaseUrl: 'https://api.logickids.test/api',
        deviceSessionId: 'device-session-8',
        expiresAt: '2030-01-01T12:00:00.000Z',
      }),
      save: async () => {},
      clear: async () => {},
    },
    installationStorage: { getOrCreate: async () => 'installation-8' },
    appVersion: '1.0.0',
  });

  const session = await authentication.loginByQr('qr-valido');

  assert.equal(session.token, 'jwt-restaurable');
  assert.equal(session.studentProfile.nombre, 'Perfil restaurado');
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

test('resultado visible permanece hasta que el estudiante decide continuar la ruta', () => {
  assert.equal(shouldCloseActiveGame({
    accessState: ESTADOS_ACCESO_JUEGO.bloqueado,
    participantState: 'activo',
    resultVisible: true,
    sessionActive: true,
  }), false);

  assert.equal(shouldCloseActiveGame({
    accessState: ESTADOS_ACCESO_JUEGO.bloqueado,
    participantState: 'activo',
    resultVisible: false,
    sessionActive: true,
  }), true);
});

test('cierre del tutor prevalece sobre una pantalla de resultado visible', () => {
  assert.equal(shouldCloseActiveGame({
    accessState: ESTADOS_ACCESO_JUEGO.bloqueado,
    participantState: 'cerrado',
    resultVisible: true,
    sessionActive: true,
  }), true);

  assert.equal(shouldCloseActiveGame({
    accessState: ESTADOS_ACCESO_JUEGO.bloqueado,
    participantState: 'activo',
    resultVisible: true,
    sessionActive: false,
  }), false);
});

test('navegacion post-resultado solo deja continuar cuando backend confirma el mismo juego', () => {
  const sameGameStep = resolvePostGameNavigation({
    sessionContext: { sesionModo: 'single', sesionTotalPasos: 3, sesionNivelEnBloque: 1 },
    responseStartSession: {
      sesion: { minijuego_id: 7, nivel_en_bloque: 1, total_pasos: 3 },
    },
    responseFinalizationSession: {
      progreso_ruta: {
        haySiguientePaso: true,
        participanteEstado: 'activo',
        siguientePaso: { minijuego_id: 7 },
      },
    },
  });

  assert.equal(sameGameStep.mode, 'single');
  assert.equal(sameGameStep.currentStep, 1);
  assert.equal(sameGameStep.totalSteps, 3);
  assert.equal(sameGameStep.shouldContinue, true);
  assert.equal(sameGameStep.shouldExit, false);
  assert.equal(sameGameStep.participanteEstado, 'activo');
  assert.deepEqual(sameGameStep.siguientePaso, { minijuego_id: 7 });

  assert.equal(
    resolvePostGameNavigation({
      sessionContext: { sesionModo: 'path' },
      responseStartSession: {
        sesion: { minijuego_id: 7 },
      },
      responseFinalizationSession: {
        progreso_ruta: {
          haySiguientePaso: true,
          participanteEstado: 'activo',
          siguientePaso: { minijuego_id: 9 },
        },
      },
    }).shouldExit,
    true,
  );
});

test('avatar movil usa la misma semilla estable que el frontend', () => {
  assert.equal(
    resolveStudentAvatarUri({ nombre: 'Ana Maria' }),
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ana%20Maria',
  );
  assert.equal(
    resolveStudentAvatarUri({ id: 42 }),
    'https://api.dicebear.com/7.x/adventurer/svg?seed=42',
  );
});
