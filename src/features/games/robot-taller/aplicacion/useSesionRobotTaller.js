import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { crearClienteSesionesJuego } from '../../core/clienteSesionesJuego';

export const MODOS_PERSISTENCIA_ROBOT_TALLER = Object.freeze({
  local: 'local',
  remota: 'remota',
});

export const ESTADOS_PERSISTENCIA_ROBOT_TALLER = Object.freeze({
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
  estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.inactiva,
  sesionId: null,
  eventosPendientes: 0,
  error: null,
  respuestaInicio: null,
  respuestaFinalizacion: null,
});

const resolverMensajeError = (error) =>
  error instanceof Error ? error.message : 'Ocurrio un error al persistir la sesion.';

export const useSesionRobotTaller = ({ configuracion, contextoSesion }) => {
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
    ? MODOS_PERSISTENCIA_ROBOT_TALLER.remota
    : MODOS_PERSISTENCIA_ROBOT_TALLER.local;

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
  const colaOperacionesRef = useRef(Promise.resolve());

  useEffect(() => {
    sesionIdRef.current = null;
    respuestaInicioRef.current = null;
    colaOperacionesRef.current = Promise.resolve();
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
      estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.iniciando,
      error: null,
      respuestaFinalizacion: null,
    }));

    try {
      const respuestaInicio = await clienteSesionesJuego.iniciarSesion({
        tokenEstudiante: contextoNormalizado.tokenEstudiante,
        minijuegoId: contextoNormalizado.minijuegoId,
        dificultad: dificultadSolicitada,
      });
      const sesionId = respuestaInicio?.sesion?.id ?? null;
      sesionIdRef.current = sesionId;
      respuestaInicioRef.current = respuestaInicio;

      setPersistencia((previo) => ({
        ...previo,
        estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.activa,
        sesionId,
        respuestaInicio,
        respuestaFinalizacion: null,
        error: null,
      }));
      return respuestaInicio;
    } catch (error) {
      setPersistencia((previo) => ({
        ...previo,
        estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.error,
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
    return encadenarOperacion(async () => {
      setPersistencia((previo) => ({
        ...previo,
        estado:
          previo.estado === ESTADOS_PERSISTENCIA_ROBOT_TALLER.iniciando
            ? previo.estado
            : ESTADOS_PERSISTENCIA_ROBOT_TALLER.sincronizando,
        eventosPendientes: previo.eventosPendientes + 1,
        error: null,
      }));

      try {
        const respuestaInicio = await iniciarSesionRemota(configuracion.dificultad);
        const sesionId = respuestaInicio?.sesion?.id ?? sesionIdRef.current;
        if (!sesionId) {
          return;
        }
        await clienteSesionesJuego.registrarEvento({
          tokenEstudiante: contextoNormalizado.tokenEstudiante,
          sesionId,
          evento,
        });
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.activa,
          eventosPendientes: Math.max(0, previo.eventosPendientes - 1),
          error: null,
        }));
      } catch (error) {
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.error,
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
    return encadenarOperacion(async () => {
      setPersistencia((previo) => ({
        ...previo,
        estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.finalizando,
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
          finalizacion: finalizacionSesion,
        });
        sesionIdRef.current = null;
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.finalizada,
          respuestaFinalizacion,
          error: null,
        }));
      } catch (error) {
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.error,
          error: resolverMensajeError(error),
        }));
      }
    });
  };

  const observadoresJuego = {
    alIniciarPartida: () => {},
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
      return true;
    }
    const respuestaInicio = await iniciarSesionRemota(dificultadSolicitada);
    return Boolean(respuestaInicio?.sesion?.id ?? sesionIdRef.current);
  }, [iniciarSesionRemota, persistenciaRemotaHabilitada]);

  const prepararNuevaRonda = useCallback(() => {
    sesionIdRef.current = null;
    respuestaInicioRef.current = null;
    setPersistencia((previo) => ({
      ...previo,
      estado: ESTADOS_PERSISTENCIA_ROBOT_TALLER.inactiva,
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
