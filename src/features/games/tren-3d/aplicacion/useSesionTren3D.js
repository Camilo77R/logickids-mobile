import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { crearClienteSesionesJuego } from '../../core/clienteSesionesJuego';
import { createMobileGameOperationTracker } from '../../core/gameOperationIdentity.runtime';

export const MODOS_PERSISTENCIA_TREN_3D = Object.freeze({
  local: 'local',
  remota: 'remota',
});

export const ESTADOS_PERSISTENCIA_TREN_3D = Object.freeze({
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
  estado: ESTADOS_PERSISTENCIA_TREN_3D.inactiva,
  sesionId: null,
  eventosPendientes: 0,
  error: null,
  respuestaInicio: null,
  respuestaFinalizacion: null,
});

const resolverMensajeError = (error) =>
  error instanceof Error ? error.message : 'Ocurrio un error al persistir la sesion del tren.';

export const useSesionTren3D = ({ configuracion, contextoSesion }) => {
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
    ? MODOS_PERSISTENCIA_TREN_3D.remota
    : MODOS_PERSISTENCIA_TREN_3D.local;

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
  const inicioSesionPromiseRef = useRef(null);
  const respuestaInicioRef = useRef(null);
  const finalizacionPendienteRef = useRef(null);
  const colaOperacionesRef = useRef(Promise.resolve());
  const operationTrackerRef = useRef(null);
  operationTrackerRef.current ??= createMobileGameOperationTracker();

  useEffect(() => {
    sesionIdRef.current = null;
    inicioSesionPromiseRef.current = null;
    respuestaInicioRef.current = null;
    finalizacionPendienteRef.current = null;
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

    if (inicioSesionPromiseRef.current) {
      return inicioSesionPromiseRef.current;
    }

    setPersistencia((previo) => ({
      ...previo,
      estado: ESTADOS_PERSISTENCIA_TREN_3D.iniciando,
      error: null,
    }));

    inicioSesionPromiseRef.current = (async () => {
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
        estado: ESTADOS_PERSISTENCIA_TREN_3D.activa,
        sesionId,
        respuestaInicio,
        error: null,
      }));

      return respuestaInicio;
    })();

    try {
      return await inicioSesionPromiseRef.current;
    } catch (error) {
      setPersistencia((previo) => ({
        ...previo,
        estado: ESTADOS_PERSISTENCIA_TREN_3D.error,
        error: resolverMensajeError(error),
      }));

      return null;
    } finally {
      inicioSesionPromiseRef.current = null;
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
          previo.estado === ESTADOS_PERSISTENCIA_TREN_3D.iniciando
            ? previo.estado
            : ESTADOS_PERSISTENCIA_TREN_3D.sincronizando,
        eventosPendientes: previo.eventosPendientes + 1,
        error: null,
      }));

      try {
        const respuestaInicio = await iniciarSesionRemota(configuracion.dificultad);
        const sesionId = respuestaInicio?.sesion?.id ?? sesionIdRef.current;

        if (!sesionId) {
          setPersistencia((previo) => ({
            ...previo,
            eventosPendientes: Math.max(0, previo.eventosPendientes - 1),
          }));
          return;
        }

        await clienteSesionesJuego.registrarEvento({
          tokenEstudiante: contextoNormalizado.tokenEstudiante,
          sesionId,
          evento: eventoIdentificado,
        });

        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_TREN_3D.activa,
          eventosPendientes: Math.max(0, previo.eventosPendientes - 1),
          error: null,
        }));
      } catch (error) {
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_TREN_3D.error,
          eventosPendientes: Math.max(0, previo.eventosPendientes - 1),
          error: resolverMensajeError(error),
        }));
      }
    });
  };

  const finalizarSesionRemota = (finalizacionSesion) => {
    if (!clienteSesionesJuego || !persistenciaRemotaHabilitada) {
      return Promise.resolve();
    }

    const finalizacionIdentificada =
      typeof finalizacionSesion?.finalization_id === 'string'
        ? finalizacionSesion
        : operationTrackerRef.current.decorateFinalization(finalizacionSesion);
    finalizacionPendienteRef.current = finalizacionIdentificada;
    setPersistencia((previo) => ({
      ...previo,
      estado: ESTADOS_PERSISTENCIA_TREN_3D.finalizando,
      error: null,
    }));

    return encadenarOperacion(async () => {
      try {
        const respuestaInicio = await iniciarSesionRemota(configuracion.dificultad);
        const sesionId = respuestaInicio?.sesion?.id ?? sesionIdRef.current;

        if (!sesionId) {
          setPersistencia((previo) => ({
            ...previo,
            estado: ESTADOS_PERSISTENCIA_TREN_3D.error,
            error: 'No fue posible iniciar la sesion del juego para finalizarla.',
          }));
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

        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_TREN_3D.finalizada,
          respuestaFinalizacion,
          error: null,
        }));
      } catch (error) {
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_TREN_3D.error,
          error: resolverMensajeError(error),
        }));
      }
    });
  };

  const observadoresJuego = {
    alIniciarPartida: ({ configuracionPartida }) => {
      if (!persistenciaRemotaHabilitada) {
        return;
      }

      void iniciarSesionRemota(configuracionPartida.dificultad);
    },
    alRegistrarEvento: (evento) => {
      if (!persistenciaRemotaHabilitada) {
        return;
      }

      void registrarEventoRemoto(evento);
    },
    alFinalizarPartida: (resultado) => {
      if (!persistenciaRemotaHabilitada) {
        return;
      }

      void finalizarSesionRemota(resultado.finalizacionSesion);
    },
  };

  const prepararRonda = useCallback(async (dificultadSolicitada) => {
    if (!persistenciaRemotaHabilitada) {
      return { lista: true, respuestaInicio: null };
    }

    const respuestaInicio = await iniciarSesionRemota(dificultadSolicitada);
    return {
      lista: Boolean(respuestaInicio?.sesion?.id ?? sesionIdRef.current),
      respuestaInicio,
    };
  }, [iniciarSesionRemota, persistenciaRemotaHabilitada]);

  const prepararNuevaRonda = useCallback(() => {
    sesionIdRef.current = null;
    inicioSesionPromiseRef.current = null;
    respuestaInicioRef.current = null;
    finalizacionPendienteRef.current = null;
    operationTrackerRef.current.resetAttempt();
    setPersistencia((previo) => ({
      ...previo,
      estado: ESTADOS_PERSISTENCIA_TREN_3D.inactiva,
      sesionId: null,
      eventosPendientes: 0,
      error: null,
      respuestaInicio: null,
      respuestaFinalizacion: null,
    }));
  }, []);

  return {
    persistencia,
    observadoresJuego,
    persistenciaRemotaHabilitada,
    respuestaInicio: persistencia.respuestaInicio ?? respuestaInicioRef.current,
    respuestaFinalizacion: persistencia.respuestaFinalizacion,
    prepararRonda,
    prepararNuevaRonda,
  };
};
