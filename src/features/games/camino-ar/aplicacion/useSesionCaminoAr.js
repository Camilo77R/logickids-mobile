import { useEffect, useMemo, useRef, useState } from 'react';
import { crearClienteSesionesJuego } from '../../core/clienteSesionesJuego';

export const MODOS_PERSISTENCIA_CAMINO_AR = Object.freeze({
  local: 'local',
  remota: 'remota',
});

export const ESTADOS_PERSISTENCIA_CAMINO_AR = Object.freeze({
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
  estado: ESTADOS_PERSISTENCIA_CAMINO_AR.inactiva,
  sesionId: null,
  eventosPendientes: 0,
  error: null,
  respuestaInicio: null,
});

const resolverMensajeError = (error) =>
  error instanceof Error ? error.message : 'Ocurrio un error al persistir la sesion.';

export const useSesionCaminoAr = ({ configuracion, contextoSesion }) => {
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
    ? MODOS_PERSISTENCIA_CAMINO_AR.remota
    : MODOS_PERSISTENCIA_CAMINO_AR.local;

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

  const iniciarSesionRemota = async (dificultadSolicitada) => {
    if (!clienteSesionesJuego || !persistenciaRemotaHabilitada) {
      return null;
    }

    if (sesionIdRef.current) {
      return sesionIdRef.current;
    }

    setPersistencia((previo) => ({
      ...previo,
      estado: ESTADOS_PERSISTENCIA_CAMINO_AR.iniciando,
      error: null,
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
        estado: ESTADOS_PERSISTENCIA_CAMINO_AR.activa,
        sesionId,
        respuestaInicio,
        error: null,
      }));

      return sesionId;
    } catch (error) {
      setPersistencia((previo) => ({
        ...previo,
        estado: ESTADOS_PERSISTENCIA_CAMINO_AR.error,
        error: resolverMensajeError(error),
      }));

      return null;
    }
  };

  const registrarEventoRemoto = (evento) => {
    if (!clienteSesionesJuego || !persistenciaRemotaHabilitada) {
      return Promise.resolve();
    }

    return encadenarOperacion(async () => {
      setPersistencia((previo) => ({
        ...previo,
        estado:
          previo.estado === ESTADOS_PERSISTENCIA_CAMINO_AR.iniciando
            ? previo.estado
            : ESTADOS_PERSISTENCIA_CAMINO_AR.sincronizando,
        eventosPendientes: previo.eventosPendientes + 1,
        error: null,
      }));

      try {
        const sesionId = await iniciarSesionRemota(configuracion.dificultad);

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
          estado: ESTADOS_PERSISTENCIA_CAMINO_AR.activa,
          eventosPendientes: Math.max(0, previo.eventosPendientes - 1),
          error: null,
        }));
      } catch (error) {
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_CAMINO_AR.error,
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
        estado: ESTADOS_PERSISTENCIA_CAMINO_AR.finalizando,
        error: null,
      }));

      try {
        const sesionId = await iniciarSesionRemota(configuracion.dificultad);

        if (!sesionId) {
          return;
        }

        await clienteSesionesJuego.finalizarSesion({
          tokenEstudiante: contextoNormalizado.tokenEstudiante,
          sesionId,
          finalizacion: finalizacionSesion,
        });

        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_CAMINO_AR.finalizada,
          error: null,
        }));
      } catch (error) {
        setPersistencia((previo) => ({
          ...previo,
          estado: ESTADOS_PERSISTENCIA_CAMINO_AR.error,
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

  return {
    persistencia,
    observadoresJuego,
    persistenciaRemotaHabilitada,
    respuestaInicio: respuestaInicioRef.current,
  };
};
