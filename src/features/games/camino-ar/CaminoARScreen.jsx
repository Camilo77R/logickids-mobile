import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCaminoArControlador } from './useCaminoArControlador';
import { construirEscenaCaminoAr } from './caminoArEscena';
import { construirEscenaEspacialCaminoAr } from './caminoArEscenaEspacial';
import { useSesionCaminoAr } from './aplicacion/useSesionCaminoAr';
import { resolverConfiguracionCaminoArDesdeBackend } from './caminoArConfiguracion';
import CaminoArVistaArViro from './presentacion/CaminoArVistaArViro';
import { ESTADOS_CAMINO_AR } from './caminoAr.constants';
import { parseCaminoArCheckpointState } from './aplicacion/caminoArCheckpoint';

export default function CaminoARScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const [preparandoRonda, setPreparandoRonda] = useState(false);
  const [guiaInicialVisible, setGuiaInicialVisible] = useState(true);
  const [inicioPendienteSesionId, setInicioPendienteSesionId] = useState(null);
  const tableroDisponibleRef = useRef(() => true);
  const checkpointAplicadoRef = useRef(null);
  const checkpointReintentadoRef = useRef(false);
  const sesionCaminoAr = useSesionCaminoAr({
    configuracion: configuracionInicial,
    contextoSesion,
  });
  const configuracionEfectiva = useMemo(
    () =>
      resolverConfiguracionCaminoArDesdeBackend({
        configuracionLocal: configuracionInicial,
        respuestaInicioSesion: sesionCaminoAr.respuestaInicio,
      }),
    [configuracionInicial, sesionCaminoAr.respuestaInicio],
  );
  const controlador = useCaminoArControlador(
    configuracionEfectiva,
    sesionCaminoAr.observadoresJuego,
  );
  const cancelarRondaTecnica = useCallback((motivo) => {
    controlador.cancelarPartidaTecnica(motivo);
    setInicioPendienteSesionId(null);
  }, [controlador]);
  const rondaEnPreparacion = preparandoRonda || Boolean(inicioPendienteSesionId);

  useEffect(() => {
    if (!inicioPendienteSesionId) {
      return;
    }

    const checkpoint = sesionCaminoAr.checkpoint;
    const sesionIdActual = sesionCaminoAr.persistencia.sesionId;

    if (String(sesionIdActual ?? '') !== String(inicioPendienteSesionId)) {
      return;
    }

    if (checkpoint.phase === 'error') {
      if (!checkpointReintentadoRef.current) {
        checkpointReintentadoRef.current = true;
        void checkpoint.retryCheckpoint();
        return;
      }

      setInicioPendienteSesionId(null);
      return;
    }

    if (checkpoint.phase !== 'ready') {
      return;
    }

    if (!tableroDisponibleRef.current()) {
      setInicioPendienteSesionId(null);
      return;
    }

    const estadoRestaurado = parseCaminoArCheckpointState(checkpoint.checkpointState);
    checkpointAplicadoRef.current = String(sesionIdActual);
    setInicioPendienteSesionId(null);

    if (!estadoRestaurado) {
      controlador.iniciarPartida();
      return;
    }

    controlador.restaurarPartida(estadoRestaurado);

    if (estadoRestaurado.pendingFinalization) {
      void sesionCaminoAr.reanudarFinalizacion(estadoRestaurado.pendingFinalization);
    }
  }, [
    controlador,
    inicioPendienteSesionId,
    sesionCaminoAr.checkpoint,
    sesionCaminoAr.persistencia.sesionId,
    sesionCaminoAr.reanudarFinalizacion,
  ]);

  const solicitarInicioRonda = useCallback(async ({ tableroDisponible } = {}) => {
    const tableroSigueListo =
      typeof tableroDisponible === 'function' ? tableroDisponible : () => true;
    tableroDisponibleRef.current = tableroSigueListo;

    if (
      rondaEnPreparacion ||
      controlador.estado.fase !== ESTADOS_CAMINO_AR.listo ||
      controlador.estado.resultado ||
      !tableroSigueListo()
    ) {
      return;
    }

    setPreparandoRonda(true);

    try {
      const preparacion = await sesionCaminoAr.prepararRonda(configuracionInicial.dificultad);

      if (!preparacion.lista) {
        return;
      }

      if (!tableroSigueListo()) {
        cancelarRondaTecnica('El tablero se movio antes de empezar. Vamos a buscarlo de nuevo.');
        return;
      }

      const sesionId = preparacion.respuestaInicio?.sesion?.id;
      const requiereHidratacion =
        sesionCaminoAr.persistenciaRemotaHabilitada &&
        sesionId &&
        checkpointAplicadoRef.current !== String(sesionId);

      if (requiereHidratacion) {
        checkpointReintentadoRef.current = false;
        setInicioPendienteSesionId(String(sesionId));
        return;
      }

      controlador.iniciarPartida();
    } finally {
      setPreparandoRonda(false);
    }
  }, [
    configuracionInicial.dificultad,
    cancelarRondaTecnica,
    controlador,
    rondaEnPreparacion,
    sesionCaminoAr,
  ]);

  const continuarActividad = useCallback(async ({ tableroDisponible } = {}) => {
    const tableroSigueListo =
      typeof tableroDisponible === 'function' ? tableroDisponible : () => true;
    tableroDisponibleRef.current = tableroSigueListo;

    if (rondaEnPreparacion) {
      return;
    }

    if (!tableroSigueListo()) {
      sesionCaminoAr.prepararNuevaRonda();
      controlador.reiniciarPartida();
      return;
    }

    setPreparandoRonda(true);
    checkpointAplicadoRef.current = null;
    sesionCaminoAr.prepararNuevaRonda();
    controlador.reiniciarPartida();

    try {
      const preparacion = await sesionCaminoAr.prepararRonda(configuracionInicial.dificultad);

      if (!preparacion.lista) {
        return;
      }

      if (!tableroSigueListo()) {
        cancelarRondaTecnica('El tablero se movio antes del siguiente reto. Vamos a buscarlo de nuevo.');
        return;
      }

      const sesionId = preparacion.respuestaInicio?.sesion?.id;

      if (sesionCaminoAr.persistenciaRemotaHabilitada && sesionId) {
        checkpointReintentadoRef.current = false;
        setInicioPendienteSesionId(String(sesionId));
        return;
      }

      controlador.iniciarPartida();
    } finally {
      setPreparandoRonda(false);
    }
  }, [
    configuracionInicial.dificultad,
    cancelarRondaTecnica,
    controlador,
    rondaEnPreparacion,
    sesionCaminoAr,
  ]);

  const escena = useMemo(
    () =>
      construirEscenaCaminoAr({
        ...controlador,
        iniciarPartida: solicitarInicioRonda,
        persistenciaSesion: sesionCaminoAr.persistencia,
        respuestaInicioSesion: sesionCaminoAr.respuestaInicio,
        respuestaFinalizacionSesion: sesionCaminoAr.respuestaFinalizacion,
        continuarActividad,
        salirActividad: onSalir,
        puedePedirPista: controlador.puedePedirPista,
        preparandoRonda: rondaEnPreparacion,
      }),
    [
      continuarActividad,
      controlador,
      onSalir,
      rondaEnPreparacion,
      solicitarInicioRonda,
      sesionCaminoAr.persistencia,
      sesionCaminoAr.respuestaFinalizacion,
      sesionCaminoAr.respuestaInicio,
    ],
  );
  const escenaEspacial = useMemo(
    () =>
      construirEscenaEspacialCaminoAr({
        escena,
        configuracion: controlador.configuracion,
      }),
    [
      controlador.configuracion,
      controlador.columnasTablero,
      controlador.estado.baldosaActiva,
      controlador.estado.fase,
      controlador.estado.mensaje,
      controlador.configuracion.configuracion.cantidadBaldosas,
    ],
  );

  return (
    <CaminoArVistaArViro
      onSalir={onSalir}
      guiaInicialVisible={guiaInicialVisible}
      onCerrarGuiaInicial={() => setGuiaInicialVisible(false)}
      escena={escena}
      escenaEspacial={escenaEspacial}
      persistenciaSesion={sesionCaminoAr.persistencia}
      respuestaInicioSesion={sesionCaminoAr.respuestaInicio}
      cancelarPartidaTecnica={cancelarRondaTecnica}
      {...controlador}
    />
  );
}
