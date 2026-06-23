import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { crearClienteSesionesJuego } from '../../core/clienteSesionesJuego';
import { createMobileGameOperationTracker } from '../../core/gameOperationIdentity.runtime';
import { useGameCheckpoint } from '../../core/useGameCheckpoint';
import { SLUG_OBJETO_PERDIDO_AR } from '../objetoPerdidoAr.constants';
import { parseObjetoPerdidoArCheckpointState } from './objetoPerdidoArCheckpoint';

export const MODOS_PERSISTENCIA_OBJETO_PERDIDO_AR = Object.freeze({
  local: 'local',
  remota: 'remota',
});

export const ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR = Object.freeze({
  inactiva: 'inactiva',
  iniciando: 'iniciando',
  activa: 'activa',
  sincronizando: 'sincronizando',
  finalizando: 'finalizando',
  finalizada: 'finalizada',
  error: 'error',
});

const normalizarTextoOpcional = (valor) => {
  if (typeof valor !== 'string') {
    return null;
  }

  const texto = valor.trim();
  return texto.length > 0 ? texto : null;
};

const normalizarContextoSesion = (contextoSesion = {}) => {
  const minijuegoId = Number(contextoSesion.minijuegoId);

  return {
    tokenEstudiante: normalizarTextoOpcional(contextoSesion.tokenEstudiante),
    baseUrlApi: normalizarTextoOpcional(contextoSesion.baseUrlApi),
    minijuegoId: Number.isInteger(minijuegoId) && minijuegoId > 0 ? minijuegoId : null,
  };
};

const construirPersistenciaInicial = (modo) => ({
  modo,
  estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.inactiva,
  sesionId: null,
  eventosPendientes: 0,
  error: null,
  respuestaInicio: null,
  respuestaFinalizacion: null,
});

const resolverMensajeError = (error) =>
  error instanceof Error ? error.message : 'Ocurrio un error al persistir la sesion.';

export const useSesionObjetoPerdidoAr = ({ configuracion, contextoSesion }) => {
  const contextoNormalizado = useMemo(
    () => normalizarContextoSesion(contextoSesion),
    [contextoSesion],
  );

  const persistenciaRemotaHabilitada = Boolean(
    contextoNormalizado.tokenEstudiante &&
      contextoNormalizado.baseUrlApi &&
      contextoNormalizado.minijuegoId,
  );

  const modoPersistencia = persistenciaRemotaHabilitada
    ? MODOS_PERSISTENCIA_OBJETO_PERDIDO_AR.remota
    : MODOS_PERSISTENCIA_OBJETO_PERDIDO_AR.local;

  const clienteSesionesJuego = useMemo(() => {
    if (!persistenciaRemotaHabilitada) {
      return null;
    }

    return crearClienteSesionesJuego(contextoNormalizado.baseUrlApi);
  }, [contextoNormalizado.baseUrlApi, persistenciaRemotaHabilitada]);

  const [persistencia, setPersistencia] = useState(() =>
    construirPersistenciaInicial(modoPersistencia),
  );

  const sesionIdRef = useRef(null);
  const respuestaInicioRef = useRef(null);
  const finalizacionPendienteRef = useRef(null);
  const checkpointReanudadoRef = useRef(null);
  const colaOperacionesRef = useRef(Promise.resolve());
  const operationTrackerRef = useRef(null);
  operationTrackerRef.current ??= createMobileGameOperationTracker();
  const checkpoint = useGameCheckpoint({
    client: clienteSesionesJuego,
    enabled: persistenciaRemotaHabilitada,
    gameSlug: SLUG_OBJETO_PERDIDO_AR,
    sessionId: persistencia.sesionId,
    studentToken: contextoNormalizado.tokenEstudiante,
  });

  useEffect(() => {
    sesionIdRef.current = null;
    respuestaInicioRef.current = null;
    finalizacionPendienteRef.current = null;
    checkpointReanudadoRef.current = null;
    colaOperacionesRef.current = Promise.resolve();
    operationTrackerRef.current.resetAttempt();
    setPersistencia(construirPersistenciaInicial(modoPersistencia));
  }, [
    modoPersistencia,
    contextoNormalizado.baseUrlApi,
    contextoNormalizado.minijuegoId,
    contextoNormalizado.tokenEstudiante,
  ]);

  const encadenarOperacion = (operacion) => {
    colaOperacionesRef.current = colaOperacionesRef.current
      .catch(() => null)
      .then(operacion);

    return colaOperacionesRef.current;
  };

  const iniciarSesionRemota = useCallback(async (dificultadSolicitada) => {
    if (!clienteSesionesJuego || !persistenciaRemotaHabilitada) {
      return null;
    }

    if (sesionIdRef.current) {
      return respuestaInicioRef.current ?? { sesion: { id: sesionIdRef.current } };
    }

    setPersistencia((previo) => ({
      ...previo,
      estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.iniciando,
      error: null,
      respuestaFinalizacion: null,
    }));

    try {
      const respuestaInicio = await clienteSesionesJuego.iniciarSesion({
        tokenEstudiante: contextoNormalizado.tokenEstudiante,
        minijuegoId: contextoNormalizado.minijuegoId,
        dificultad: dificultadSolicitada,
        attemptId: operationTrackerRef.current.getAttemptId(),
      });

      const sesionId = respuestaInicio?.sesion?.id ?? null;
      sesionIdRef.current = sesionId;
      respuestaInicioRef.current = respuestaInicio;

      setPersistencia((previo) => ({
        ...previo,
        estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.activa,
        sesionId,
        respuestaInicio,
        respuestaFinalizacion: null,
        error: null,
      }));

      return respuestaInicio;
    } catch (error) {
      setPersistencia((previo) => ({
        ...previo,
        estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.error,
        error: resolverMensajeError(error),
      }));

      return null;
    }
  }, [
    clienteSesionesJuego,
    contextoNormalizado.minijuegoId,
    contextoNormalizado.tokenEstudiante,
    persistenciaRemotaHabilitada,
  ]);

  const registrarEventoRemoto = (evento) => {
    if (!clienteSesionesJuego || !persistenciaRemotaHabilitada) {
      return Promise.resolve();
    }

    const eventoIdentificado = operationTrackerRef.current.decorateEvent(evento);
    return encadenarOperacion(async () => {
      setPersistencia((previo) => ({
        ...previo,
        estado:
          previo.estado === ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.iniciando
            ? previo.estado
            : ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.sincronizando,
        eventosPendientes: previo.eventosPendientes + 1,
        error: null,
      }));

      try {
        await checkpoint.flushCheckpoint();
        const respuestaInicio = await iniciarSesionRemota(configuracion.dificultad);
        const sesionId = respuestaInicio?.sesion?.id ?? sesionIdRef.current;

        if (!sesionId) {
          return;
        }

        await clienteSesionesJuego.registrarEvento({
          tokenEstudiante: contextoNormalizado.tokenEstudiante,
          sesionId,
          evento: eventoIdentificado,
        });

        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.activa,
          eventosPendientes: Math.max(0, previo.eventosPendientes - 1),
          error: null,
        }));
      } catch (error) {
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.error,
          eventosPendientes: Math.max(0, previo.eventosPendientes - 1),
          error: resolverMensajeError(error),
        }));
      }
    });
  };

  const prepararFinalizacionIdempotente = (finalizacionSesion) => {
    if (normalizarTextoOpcional(finalizacionSesion?.finalization_id)) {
      return finalizacionSesion;
    }

    return operationTrackerRef.current.decorateFinalization(finalizacionSesion);
  };

  const finalizarSesionRemota = (finalizacionSesion) => {
    if (!clienteSesionesJuego || !persistenciaRemotaHabilitada) {
      return Promise.resolve();
    }

    const finalizacionIdentificada = prepararFinalizacionIdempotente(finalizacionSesion);
    finalizacionPendienteRef.current = finalizacionIdentificada;
    return encadenarOperacion(async () => {
      setPersistencia((previo) => ({
        ...previo,
        estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.finalizando,
        error: null,
      }));

      try {
        const respuestaInicio = await iniciarSesionRemota(configuracion.dificultad);
        const sesionId = respuestaInicio?.sesion?.id ?? sesionIdRef.current;

        if (!sesionId) {
          return;
        }

        const respuestaFinalizacion = await clienteSesionesJuego.finalizarSesion({
          tokenEstudiante: contextoNormalizado.tokenEstudiante,
          sesionId,
          finalizacion: finalizacionIdentificada,
        });

        sesionIdRef.current = null;
        finalizacionPendienteRef.current = null;
        operationTrackerRef.current.clearFinalization();
        checkpoint.markTerminal();

        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.finalizada,
          respuestaFinalizacion,
          error: null,
        }));
      } catch (error) {
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.error,
          error: resolverMensajeError(error),
        }));
      }
    });
  };

  const persistirYFinalizar = ({ checkpointState, resultado }) => {
    const finalizacion = prepararFinalizacionIdempotente(resultado.finalizacionSesion);
    const checkpointFinal = {
      ...checkpointState,
      pendingFinalization: finalizacion,
    };

    checkpoint.saveCheckpoint(checkpointFinal);
    return checkpoint.flushCheckpoint().then(() => finalizarSesionRemota(finalizacion));
  };

  useEffect(() => {
    const sessionId = persistencia.sesionId;
    if (
      !sessionId ||
      checkpoint.phase !== 'ready' ||
      checkpointReanudadoRef.current === sessionId
    ) {
      return;
    }

    checkpointReanudadoRef.current = sessionId;
    const restored = parseObjetoPerdidoArCheckpointState(checkpoint.checkpointState);
    if (restored?.pendingFinalization) {
      finalizacionPendienteRef.current = restored.pendingFinalization;
      void finalizarSesionRemota(restored.pendingFinalization);
    }
  }, [
    checkpoint.checkpointState,
    checkpoint.phase,
    persistencia.sesionId,
  ]);

  const observadoresJuego = {
    alIniciarPartida: () => {
      // La ronda local debe arrancar solo cuando el backend ya preparo la sesion.
    },
    alRegistrarEvento: (evento) => {
      if (!persistenciaRemotaHabilitada) {
        return;
      }

      void registrarEventoRemoto(evento);
    },
    alGuardarCheckpoint: (checkpointState) => {
      if (!persistenciaRemotaHabilitada || !persistencia.sesionId) {
        return false;
      }

      return checkpoint.saveCheckpoint(checkpointState);
    },
    alFinalizarPartida: (cierre) => {
      if (!persistenciaRemotaHabilitada) {
        return;
      }

      void persistirYFinalizar(cierre);
    },
  };

  const prepararRonda = useCallback(async (dificultadSolicitada) => {
    if (!persistenciaRemotaHabilitada) {
      return true;
    }

    const respuestaInicio = await iniciarSesionRemota(dificultadSolicitada);
    return Boolean(respuestaInicio?.sesion?.id ?? sesionIdRef.current);
  }, [iniciarSesionRemota, persistenciaRemotaHabilitada]);

  const prepararNuevaRonda = useCallback(() => {
    checkpoint.markTerminal();
    sesionIdRef.current = null;
    respuestaInicioRef.current = null;
    finalizacionPendienteRef.current = null;
    checkpointReanudadoRef.current = null;
    operationTrackerRef.current.resetAttempt();
    setPersistencia((previo) => ({
      ...previo,
      estado: ESTADOS_PERSISTENCIA_OBJETO_PERDIDO_AR.inactiva,
      sesionId: null,
      eventosPendientes: 0,
      error: null,
      respuestaInicio: null,
      respuestaFinalizacion: null,
    }));
  }, [checkpoint]);

  return {
    persistencia,
    observadoresJuego,
    persistenciaRemotaHabilitada,
    respuestaInicio: persistencia.respuestaInicio ?? respuestaInicioRef.current,
    respuestaFinalizacion: persistencia.respuestaFinalizacion,
    prepararRonda,
    prepararNuevaRonda,
    checkpoint,
  };
};
