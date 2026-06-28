import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useObjetoPerdidoArControlador } from './useObjetoPerdidoArControlador';
import { useSesionObjetoPerdidoAr } from './aplicacion/useSesionObjetoPerdidoAr';
import { resolverConfiguracionObjetoPerdidoArDesdeBackend } from './objetoPerdidoArConfiguracion';
import ObjetoPerdidoArVistaViro from './presentacion/ObjetoPerdidoArVistaViro';

export default function ObjetoPerdidoARScreen({
  onSalir,
  onResultadoVisible,
  configuracionInicial,
  contextoSesion,
}) {
  const [preparandoPartida, setPreparandoPartida] = useState(false);
  const inicioPendienteRef = useRef(false);
  const tableroDisponibleRef = useRef(() => false);
  const checkpointReintentadoRef = useRef(false);
  const sesionObjetoPerdido = useSesionObjetoPerdidoAr({
    configuracion: configuracionInicial,
    contextoSesion,
  });
  const configuracionEfectiva = useMemo(
    () =>
      resolverConfiguracionObjetoPerdidoArDesdeBackend({
        configuracionLocal: configuracionInicial,
        respuestaInicioSesion: sesionObjetoPerdido.respuestaInicio,
      }),
    [configuracionInicial, sesionObjetoPerdido.respuestaInicio],
  );
  const controlador = useObjetoPerdidoArControlador(
    configuracionEfectiva,
    sesionObjetoPerdido.observadoresJuego,
    {
      phase: sesionObjetoPerdido.checkpoint.phase,
      sessionId: sesionObjetoPerdido.persistencia.sesionId,
      state: sesionObjetoPerdido.checkpoint.checkpointState,
    },
  );

  const iniciarActividad = useCallback(async ({ tableroDisponible } = {}) => {
    const tableroSigueListo =
      typeof tableroDisponible === 'function' ? tableroDisponible : () => true;

    if (preparandoPartida || !tableroSigueListo()) {
      return;
    }

    setPreparandoPartida(true);
    tableroDisponibleRef.current = tableroSigueListo;
    checkpointReintentadoRef.current = false;

    try {
      const partidaLista = await sesionObjetoPerdido.prepararRonda(
        configuracionInicial.dificultad,
      );

      if (!partidaLista || !tableroSigueListo()) {
        return;
      }

      if (sesionObjetoPerdido.persistenciaRemotaHabilitada) {
        inicioPendienteRef.current = true;
        return;
      }

      controlador.iniciarPartida();
    } finally {
      if (!inicioPendienteRef.current) {
        setPreparandoPartida(false);
      }
    }
  }, [
    configuracionInicial.dificultad,
    controlador,
    preparandoPartida,
    sesionObjetoPerdido,
  ]);

  useEffect(() => {
    if (!inicioPendienteRef.current) {
      return;
    }

    if (sesionObjetoPerdido.checkpoint.phase === 'error') {
      if (!checkpointReintentadoRef.current) {
        checkpointReintentadoRef.current = true;
        void sesionObjetoPerdido.checkpoint.retryCheckpoint();
        return;
      }

      inicioPendienteRef.current = false;
      setPreparandoPartida(false);
      return;
    }

    if (sesionObjetoPerdido.checkpoint.phase !== 'ready') {
      return;
    }

    inicioPendienteRef.current = false;
    if (tableroDisponibleRef.current()) {
      controlador.iniciarPartida();
    }
    setPreparandoPartida(false);
  }, [controlador, sesionObjetoPerdido.checkpoint.phase]);

  const reiniciarActividad = useCallback(async ({ tableroDisponible } = {}) => {
    const tableroSigueListo =
      typeof tableroDisponible === 'function' ? tableroDisponible : () => true;

    sesionObjetoPerdido.prepararNuevaRonda();
    controlador.reiniciarPartida();

    if (!tableroSigueListo()) {
      return;
    }

    await iniciarActividad({ tableroDisponible });
  }, [controlador, iniciarActividad, sesionObjetoPerdido]);

  useEffect(() => {
    if (controlador.estado.resultado) {
      onResultadoVisible?.();
    }
  }, [controlador.estado.resultado, onResultadoVisible]);

  return (
    <ObjetoPerdidoArVistaViro
      onSalir={onSalir}
      contextoSesion={contextoSesion}
      respuestaInicioSesion={sesionObjetoPerdido.respuestaInicio}
      persistenciaSesion={sesionObjetoPerdido.persistencia}
      respuestaFinalizacionSesion={sesionObjetoPerdido.respuestaFinalizacion}
      preparandoPartida={preparandoPartida}
      iniciarActividad={iniciarActividad}
      reiniciarActividad={reiniciarActividad}
      {...controlador}
    />
  );
}
