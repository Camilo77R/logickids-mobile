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
  isStudentSessionRecoveryRequiredError,
  STUDENT_SESSION_CONFLICT_REASONS,
} = require('../../src/services/http.service.js');
const {
  parseStudentCredential,
  STUDENT_CREDENTIAL_SCHEMA_VERSION,
} = require('../../src/services/studentCredential.model.js');
const {
  createStudentAuthenticationService,
} = require('../../src/services/studentAuthentication.service.js');
const {
  STUDENT_AUTH_RECOVERY_REASONS,
  STUDENT_AUTH_STATES,
} = require('../../src/features/student-auth/studentAuthState.js');
const {
  dismissStudentRecoverySession,
  resolveStudentRecoveryScreenCopy,
  retryStudentRecoverySession,
  STUDENT_DEVICE_OCCUPIED_RECOVERY_MESSAGE,
  STUDENT_RECOVERY_ACTIONS,
  STUDENT_SESSION_ACTIVE_RECOVERY_MESSAGE,
} = require('../../src/features/student-auth/studentSessionRecovery.js');
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

test('login por QR pide recuperacion si la sesion activa no tiene credencial local recuperable', async () => {
  const authentication = createStudentAuthenticationService({
    baseUrl: 'https://api.logickids.test/api',
    accessService: {
      loginByQr: async () => {
        throw new HttpRequestError('El dispositivo ya tiene una sesion infantil activa', {
          status: 409,
          code: 'STUDENT_SESSION_ACTIVE',
        });
      },
      fetchProfile: async () => ({ id: 9, nombre: 'No deberia restaurarse' }),
    },
    credentialStorage: {
      load: async () => null,
      save: async () => {},
      clear: async () => {},
    },
    installationStorage: { getOrCreate: async () => 'installation-9' },
    appVersion: '1.0.0',
  });

  await assert.rejects(
    () => authentication.loginByQr('qr-valido'),
    (error) => {
      assert.equal(isStudentSessionRecoveryRequiredError(error), true);
      assert.match(error.message, /sesion infantil activa/i);
      assert.equal(
        error.recoveryReason,
        STUDENT_SESSION_CONFLICT_REASONS.deviceOccupied,
      );
      return true;
    },
  );
});

test('login por QR limpia credencial expirada y pide recuperacion cuando backend mantiene sesion activa', async () => {
  let cleared = false;
  const authentication = createStudentAuthenticationService({
    baseUrl: 'https://api.logickids.test/api',
    accessService: {
      loginByQr: async () => {
        throw new HttpRequestError('El dispositivo ya tiene una sesion infantil activa', {
          status: 409,
          code: 'STUDENT_SESSION_ACTIVE',
        });
      },
      fetchProfile: async () => ({ id: 10, nombre: 'No deberia restaurarse' }),
    },
    credentialStorage: {
      load: async () => ({
        version: STUDENT_CREDENTIAL_SCHEMA_VERSION,
        token: 'jwt-expirado',
        apiBaseUrl: 'https://api.logickids.test/api',
        deviceSessionId: 'device-session-10',
        expiresAt: '2020-01-01T12:00:00.000Z',
      }),
      save: async () => {},
      clear: async () => { cleared = true; },
    },
    installationStorage: { getOrCreate: async () => 'installation-10' },
    appVersion: '1.0.0',
  });

  await assert.rejects(
    () => authentication.loginByQr('qr-valido'),
    (error) => {
      assert.equal(isStudentSessionRecoveryRequiredError(error), true);
      assert.equal(cleared, true);
      assert.equal(
        error.recoveryReason,
        STUDENT_SESSION_CONFLICT_REASONS.deviceOccupied,
      );
      return true;
    },
  );
});

test('login por QR distingue cuando el estudiante ya esta activo en otro dispositivo', async () => {
  const authentication = createStudentAuthenticationService({
    baseUrl: 'https://api.logickids.test/api',
    accessService: {
      loginByQr: async () => {
        throw new HttpRequestError('El estudiante ya tiene una sesion activa en otro dispositivo', {
          status: 409,
          code: 'STUDENT_SESSION_ACTIVE',
        });
      },
      fetchProfile: async () => ({ id: 11, nombre: 'No deberia restaurarse' }),
    },
    credentialStorage: {
      load: async () => null,
      save: async () => {},
      clear: async () => {},
    },
    installationStorage: { getOrCreate: async () => 'installation-11' },
    appVersion: '1.0.0',
  });

  await assert.rejects(
    () => authentication.loginByQr('qr-valido'),
    (error) => {
      assert.equal(isStudentSessionRecoveryRequiredError(error), true);
      assert.equal(
        error.recoveryReason,
        STUDENT_SESSION_CONFLICT_REASONS.studentActiveElsewhere,
      );
      assert.match(error.message, /otro dispositivo/i);
      return true;
    },
  );
});

test('copy de recovery distingue sesion activa de problemas de conectividad', () => {
  assert.deepEqual(
    resolveStudentRecoveryScreenCopy({
      recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.studentSessionActive,
      errorMessage: 'No deberia verse este mensaje',
    }),
    {
      title: 'Sesion activa detectada',
      message: STUDENT_SESSION_ACTIVE_RECOVERY_MESSAGE,
      primaryActionLabel: 'Reintentar recuperacion',
      secondaryActionLabel: 'Volver al escaner',
      primaryActionKind: STUDENT_RECOVERY_ACTIONS.retry,
      secondaryActionKind: STUDENT_RECOVERY_ACTIONS.scan,
    },
  );

  assert.deepEqual(
    resolveStudentRecoveryScreenCopy({
      recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.deviceOccupied,
      errorMessage: 'No deberia verse este mensaje tampoco',
    }),
    {
      title: 'Dispositivo en uso',
      message: STUDENT_DEVICE_OCCUPIED_RECOVERY_MESSAGE,
      primaryActionLabel: 'Liberar dispositivo y entrar',
      secondaryActionLabel: 'Volver al escaner',
      primaryActionKind: STUDENT_RECOVERY_ACTIONS.retry,
      secondaryActionKind: STUDENT_RECOVERY_ACTIONS.scan,
    },
  );

  assert.deepEqual(
    resolveStudentRecoveryScreenCopy({
      recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.connectivity,
      errorMessage: 'Sin conexion',
    }),
    {
      title: 'Estamos reconectando',
      message: 'Sin conexion',
      primaryActionLabel: 'Intentar de nuevo',
      secondaryActionLabel: 'Volver al escaner',
      primaryActionKind: STUDENT_RECOVERY_ACTIONS.retry,
      secondaryActionKind: STUDENT_RECOVERY_ACTIONS.scan,
    },
  );
});

test('reintento de recovery reutiliza el mismo QR cuando la sesion activa sigue bloqueada', async () => {
  let receivedOptions = null;
  const resolution = await retryStudentRecoverySession({
    service: {
      loginByQr: async (_qrToken, options) => {
        receivedOptions = options;
        throw Object.assign(new Error('Sigue activa y aun no se puede recuperar'), {
          code: 'STUDENT_SESSION_RECOVERY_REQUIRED',
          recoveryReason: STUDENT_SESSION_CONFLICT_REASONS.deviceOccupied,
        });
      },
      restore: async () => null,
    },
    recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.deviceOccupied,
    recoveryQrToken: 'qr-reusable',
  });

  assert.equal(resolution.success, false);
  assert.equal(resolution.nextState, STUDENT_AUTH_STATES.recovery);
  assert.equal(
    resolution.recoveryReason,
    STUDENT_AUTH_RECOVERY_REASONS.deviceOccupied,
  );
  assert.equal(resolution.clearQrToken, false);
  assert.deepEqual(receivedOptions, {
    deviceConflictStrategy: 'replace_existing_device_session',
  });
});

test('reintento de recovery restaura sesion valida y limpia el QR retenido', async () => {
  const resolution = await retryStudentRecoverySession({
    service: {
      loginByQr: async () => {
        throw new Error('No deberia intentar login por QR');
      },
      restore: async () => ({ token: 'jwt', studentProfile: { id: 1 } }),
    },
    recoveryReason: STUDENT_AUTH_RECOVERY_REASONS.connectivity,
    recoveryQrToken: '',
  });

  assert.equal(resolution.success, true);
  assert.equal(resolution.nextState, STUDENT_AUTH_STATES.authenticated);
  assert.equal(resolution.clearQrToken, true);
  assert.equal(resolution.session.token, 'jwt');
});

test('salir de recovery hacia el escaner limpia el estado atrapado', () => {
  const resolution = dismissStudentRecoverySession();

  assert.equal(resolution.success, false);
  assert.equal(resolution.nextState, STUDENT_AUTH_STATES.anonymous);
  assert.equal(resolution.recoveryReason, STUDENT_AUTH_RECOVERY_REASONS.unknown);
  assert.equal(resolution.errorMessage, '');
  assert.equal(resolution.clearQrToken, true);
  assert.equal(resolution.session, null);
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
