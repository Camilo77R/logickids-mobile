import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildRandomMeteor,
  CODIGO_ESTELAR_SLUG,
  CODIGO_ESTELAR_SOCKET_EVENTS,
  DEFAULT_API_BASE_URL,
  DEFAULT_DIFFICULTY,
  GAME_STATUS,
} from './codigoEstelar.constants';
import { createCodigoEstelarApi } from './services/codigoEstelarApi';
import { createCodigoEstelarSocketClient } from './services/codigoEstelarSocket';

const buildInitialForm = (studentSession) => ({
  apiBaseUrl: studentSession?.apiBaseUrl ?? DEFAULT_API_BASE_URL,
  qrToken: '',
  dificultad: String(DEFAULT_DIFFICULTY),
});

const buildInitialRuntime = () => ({
  studentToken: '',
  studentProfile: null,
  minigame: null,
  session: null,
  realtime: null,
  gameConfig: null,
  leaderboard: [],
  currentMeteor: null,
  lastFeedback: null,
  gameOver: null,
  finalization: null,
});

const toDifficultyNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_DIFFICULTY;
  }
  return parsed;
};

const pickNextMeteor = (gameConfig) =>
  buildRandomMeteor({
    min: gameConfig?.rango_numeros?.min,
    max: gameConfig?.rango_numeros?.max,
    fallback: gameConfig?.numero_objetivo ?? 0,
  });

/**
 * Orquesta todo el flujo del cliente sin mezclar UI, HTTP y sockets.
 */
export const useCodigoEstelarController = ({ studentSession } = {}) => {
  const [status, setStatus] = useState(GAME_STATUS.setup);
  const [errorMessage, setErrorMessage] = useState('');
  const [connectionStep, setConnectionStep] = useState('Esperando inicio.');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(studentSession));
  const [runtime, setRuntime] = useState(buildInitialRuntime);
  const socketRef = useRef(null);

  const api = useMemo(() => createCodigoEstelarApi(form.apiBaseUrl), [form.apiBaseUrl]);

  useEffect(() => {
    if (!studentSession?.apiBaseUrl) {
      return;
    }

    setForm((prev) => ({ ...prev, apiBaseUrl: studentSession.apiBaseUrl }));
  }, [studentSession]);

  const teardownSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  useEffect(() => () => teardownSocket(), []);

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocketError = (payload) => {
    setErrorMessage(payload?.message ?? 'Fallo realtime en Código Estelar.');
    setConnectionStep(
      `Error realtime: ${payload?.code ?? 'SIN_CODIGO'} - ${payload?.message ?? 'sin detalle'}`
    );
    setStatus(GAME_STATUS.error);
  };

  const finalizeOfficialSession = async ({ studentToken, sesionId }) => {
    if (!studentToken || !sesionId) {
      return;
    }

    setIsFinalizing(true);
    setConnectionStep('Guardando resultados oficiales...');

    try {
      const finalization = await api.finalizeSession(studentToken, sesionId);
      setRuntime((prev) => ({ ...prev, finalization }));
      setErrorMessage('');
      setConnectionStep(
        finalization.finalizacion_idempotente
          ? 'Los resultados ya estaban guardados.'
          : 'Resultados y logros guardados correctamente.'
      );
    } catch (error) {
      setErrorMessage(error.message);
      setConnectionStep(`No pudimos guardar la partida: ${error.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  const connectSocketFlow = ({ studentToken, sessionStartData }) => {
    const socketClient = createCodigoEstelarSocketClient({
      apiBaseUrl: form.apiBaseUrl,
      studentToken,
    });

    teardownSocket();
    socketRef.current = socketClient;
    setConnectionStep('Abriendo canal realtime...');

    socketClient.on('connect_error', (error) => {
      const detailedMessage =
        error?.data?.message ??
        error?.description?.message ??
        error?.message ??
        'No se pudo abrir el socket.';

      setErrorMessage(detailedMessage);
      setConnectionStep(`Fallo al conectar socket: ${detailedMessage}`);
      setStatus(GAME_STATUS.error);
    });

    socketClient.on('connect', () => {
      setConnectionStep(`Socket conectado. Uniendo sesión ${sessionStartData.sesion.id}...`);
      socketClient.joinSession(sessionStartData.sesion.id);
    });

    socketClient.on(CODIGO_ESTELAR_SOCKET_EVENTS.error, handleSocketError);

    socketClient.on(CODIGO_ESTELAR_SOCKET_EVENTS.joined, (payload) => {
      setConnectionStep(`Sala unida: ${payload.room.key}`);
      setRuntime((prev) => ({
        ...prev,
        leaderboard: payload.gameState.leaderboard,
        currentMeteor: pickNextMeteor(sessionStartData.game_config),
      }));
      setStatus(GAME_STATUS.playing);
    });

    socketClient.on(CODIGO_ESTELAR_SOCKET_EVENTS.leaderboard, (payload) => {
      setRuntime((prev) => {
        const isLocalPlayerUpdate =
          payload.resultadoJugador?.estudianteId != null &&
          payload.resultadoJugador.estudianteId === prev.studentProfile?.id;

        return {
          ...prev,
          leaderboard: payload.leaderboard,
          lastFeedback: isLocalPlayerUpdate
            ? payload.resultadoJugador
            : prev.lastFeedback,
          currentMeteor: isLocalPlayerUpdate
            ? pickNextMeteor(prev.gameConfig)
            : prev.currentMeteor,
        };
      });
    });

    socketClient.on(CODIGO_ESTELAR_SOCKET_EVENTS.gameOver, async (payload) => {
      setConnectionStep('Juego terminado. Solicitando cierre oficial...');
      setRuntime((prev) => ({
        ...prev,
        gameOver: payload,
        leaderboard: payload.rankingFinal ?? prev.leaderboard,
        currentMeteor: null,
      }));
      setStatus(GAME_STATUS.finished);

      await finalizeOfficialSession({
        studentToken,
        sesionId: sessionStartData.sesion.id,
      });
    });

    socketClient.connect();
  };

  const startGame = async () => {
    try {
      setStatus(GAME_STATUS.connecting);
      setErrorMessage('');
      setIsFinalizing(false);
      let loginData = null;

      if (studentSession?.token && studentSession?.studentProfile) {
        loginData = {
          token: studentSession.token,
          estudiante: studentSession.studentProfile,
        };
        setConnectionStep(
          `Piloto ${loginData.estudiante.nombre} listo. Cargando catálogo...`
        );
      } else {
        setConnectionStep('Validando QR del estudiante...');
        loginData = await api.loginStudent(form.qrToken);
        setConnectionStep(
          `QR validado para ${loginData.estudiante.nombre}. Cargando catálogo...`
        );
      }

      const minigame = await api.resolveMinigameBySlug(CODIGO_ESTELAR_SLUG);
      setConnectionStep(`Minijuego ${minigame.titulo} resuelto. Creando sesión HTTP...`);
      const sessionStartData = await api.startSession(loginData.token, {
        minijuegoId: minigame.id,
        dificultad: toDifficultyNumber(form.dificultad),
      });
      setConnectionStep(
        `Sesión HTTP #${sessionStartData.sesion.id} creada. Preparando entrada realtime...`
      );

      setRuntime({
        studentToken: loginData.token,
        studentProfile: loginData.estudiante,
        minigame,
        session: sessionStartData.sesion,
        realtime: sessionStartData.realtime,
        gameConfig: sessionStartData.game_config,
        leaderboard: [],
        currentMeteor: null,
        lastFeedback: null,
        gameOver: null,
        finalization: null,
      });

      connectSocketFlow({
        studentToken: loginData.token,
        sessionStartData,
      });
    } catch (error) {
      teardownSocket();
      setErrorMessage(error.message);
      setConnectionStep(`Fallo en arranque: ${error.message}`);
      setStatus(GAME_STATUS.error);
    }
  };

  const submitClassification = (clasificacionElegida) => {
    const socketClient = socketRef.current;
    if (!socketClient || !runtime.session || runtime.currentMeteor == null) {
      return;
    }

    socketClient.submitAnswer({
      sesionId: runtime.session.id,
      numeroMeteorito: runtime.currentMeteor,
      clasificacionElegida,
      tiempoReaccionMs: 1000,
    });
  };

  const retryFinalization = async () => {
    if (!runtime.studentToken || !runtime.session?.id) {
      return;
    }

    await finalizeOfficialSession({
      studentToken: runtime.studentToken,
      sesionId: runtime.session.id,
    });
  };

  const resetFlow = () => {
    teardownSocket();
    setRuntime(buildInitialRuntime());
    setErrorMessage('');
    setConnectionStep('Esperando inicio.');
    setStatus(GAME_STATUS.setup);
    setIsFinalizing(false);
    setForm(buildInitialForm(studentSession));
  };

  return {
    form,
    runtime,
    status,
    errorMessage,
    connectionStep,
    updateFormField,
    startGame,
    submitClassification,
    retryFinalization,
    resetFlow,
    isBusy: status === GAME_STATUS.connecting,
    isFinalizing,
  };
};
