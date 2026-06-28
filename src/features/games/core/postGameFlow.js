const SESSION_MODES = Object.freeze({
  path: 'path',
  single: 'single',
});

const normalizePositiveInt = (value, fallback = 1) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : fallback;
};

export const resolveSessionMode = ({
  sessionContext = null,
  responseStartSession = null,
} = {}) =>
  responseStartSession?.sesion?.modo ??
  responseStartSession?.sesion?.sesion_modo ??
  sessionContext?.sesionModo ??
  SESSION_MODES.single;

export const resolveSessionProgress = ({
  sessionContext = null,
  responseStartSession = null,
} = {}) => ({
  currentStep: normalizePositiveInt(
    responseStartSession?.sesion?.nivel_en_bloque ??
      responseStartSession?.sesion?.paso_actual ??
      sessionContext?.sesionNivelEnBloque ??
      sessionContext?.sesionPasoActual,
    1,
  ),
  totalSteps: normalizePositiveInt(
    responseStartSession?.sesion?.total_pasos ??
      responseStartSession?.sesion?.sesion_total_pasos ??
      sessionContext?.sesionTotalPasos,
    1,
  ),
});

export const resolveSessionClosure = ({
  responseStartSession = null,
  responseFinalizationSession = null,
} = {}) => {
  if (!responseFinalizationSession) {
    return {
      closureAvailable: false,
      achievements: [],
      hasNextStep: false,
      nextStep: null,
      nextIsSameGame: false,
      participantState: null,
      officialSummary: null,
    };
  }

  const achievements = Array.isArray(responseFinalizationSession.logros_desbloqueados)
    ? responseFinalizationSession.logros_desbloqueados
    : [];
  const progress = responseFinalizationSession.progreso_ruta ?? null;
  const nextStep = progress?.siguientePaso ?? null;
  const currentGameId = Number(responseStartSession?.sesion?.minijuego_id ?? 0);
  const nextGameId = Number(nextStep?.minijuego_id ?? 0);

  return {
    closureAvailable: true,
    achievements,
    hasNextStep: Boolean(progress?.haySiguientePaso),
    nextStep,
    nextIsSameGame:
      Boolean(nextStep) &&
      currentGameId > 0 &&
      nextGameId > 0 &&
      currentGameId === nextGameId,
    participantState: progress?.participanteEstado ?? null,
    officialSummary: responseFinalizationSession.resumen_oficial ?? null,
    logros: achievements,
    haySiguientePaso: Boolean(progress?.haySiguientePaso),
    siguientePaso: nextStep,
    siguienteEsMismoJuego:
      Boolean(nextStep) &&
      currentGameId > 0 &&
      nextGameId > 0 &&
      currentGameId === nextGameId,
    participanteEstado: progress?.participanteEstado ?? null,
    resumenOficial: responseFinalizationSession.resumen_oficial ?? null,
  };
};

export const resolvePostGameNavigation = ({
  sessionContext = null,
  responseStartSession = null,
  responseFinalizationSession = null,
} = {}) => {
  const mode = resolveSessionMode({ sessionContext, responseStartSession });
  const progress = resolveSessionProgress({ sessionContext, responseStartSession });
  const closure = resolveSessionClosure({
    responseStartSession,
    responseFinalizationSession,
  });

  if (!closure.closureAvailable) {
    return {
      mode,
      ...progress,
      ...closure,
      shouldContinue: false,
      shouldExit: false,
      syncingClosure: true,
    };
  }

  if (closure.hasNextStep && closure.nextIsSameGame) {
    return {
      mode,
      ...progress,
      ...closure,
      shouldContinue: true,
      shouldExit: false,
      syncingClosure: false,
    };
  }

  return {
    mode,
    ...progress,
    ...closure,
    shouldContinue: false,
    shouldExit: true,
    syncingClosure: false,
  };
};

export { SESSION_MODES };
