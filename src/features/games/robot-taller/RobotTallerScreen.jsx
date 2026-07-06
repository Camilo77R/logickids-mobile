import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRobotTallerControlador } from './useRobotTallerControlador';
import { construirEscenaRobotTaller } from './robotTallerEscena';
import { useSesionRobotTaller } from './aplicacion/useSesionRobotTaller';
import { resolverConfiguracionRobotTallerDesdeBackend } from './robotTallerConfiguracion';
import RobotTallerVista from './presentacion/RobotTallerVista';
import { useRobotTallerAudio } from './useRobotTallerAudio';

export default function RobotTallerScreen({
  onSalir,
  onResultadoVisible,
  configuracionInicial,
  contextoSesion,
}) {
  const [preparandoPartida, setPreparandoPartida] = useState(false);
  const [rondaVersion, setRondaVersion] = useState(0);
  const [reinicioPendiente, setReinicioPendiente] = useState(false);
  const sesionRobotTaller = useSesionRobotTaller({
    configuracion: configuracionInicial,
    contextoSesion,
  });

  const configuracionEfectiva = useMemo(
    () =>
      resolverConfiguracionRobotTallerDesdeBackend({
        configuracionLocal: configuracionInicial,
        respuestaInicioSesion: sesionRobotTaller.respuestaInicio,
      }),
    [configuracionInicial, sesionRobotTaller.respuestaInicio],
  );

  const controlador = useRobotTallerControlador(
    configuracionEfectiva,
    sesionRobotTaller.observadoresJuego,
    sesionRobotTaller.checkpoint,
  );

  const prepararPartida = useCallback(async () => {
    if (preparandoPartida) {
      return false;
    }

    setPreparandoPartida(true);
    try {
      return await sesionRobotTaller.prepararRonda(configuracionEfectiva.dificultad);
    } finally {
      setPreparandoPartida(false);
    }
  }, [configuracionEfectiva.dificultad, preparandoPartida, sesionRobotTaller]);

  const audioRobot = useRobotTallerAudio({
    estado: controlador.estado,
    mostrarModalMatematica: controlador.mostrarModalMatematica,
    problemaMatematico: controlador.problemaMatematico,
    resultadoVisible: Boolean(controlador.estado.resultado),
    mostrarCelebracion: Boolean(controlador.estado.resultado?.detalles?.ensamblajeCompleto),
  });

  const manejarSalir = useCallback(() => {
    audioRobot.reproducirSeleccion();
    onSalir?.();
  }, [audioRobot, onSalir]);

  const continuarActividad = useCallback(async () => {
    if (preparandoPartida) {
      return;
    }

    audioRobot.reproducirSeleccion();
    setPreparandoPartida(true);
    try {
      sesionRobotTaller.prepararNuevaRonda();
      const partidaLista = await sesionRobotTaller.prepararRonda(
        configuracionEfectiva.dificultad,
      );

      if (partidaLista) {
        setReinicioPendiente(true);
      }
    } finally {
      setPreparandoPartida(false);
    }
  }, [
    audioRobot,
    configuracionEfectiva.dificultad,
    controlador,
    preparandoPartida,
    sesionRobotTaller,
  ]);

  useEffect(() => {
    if (!reinicioPendiente || preparandoPartida) {
      return;
    }

    controlador.reiniciarPartida();
    setRondaVersion((actual) => actual + 1);
    setReinicioPendiente(false);
  }, [
    controlador,
    preparandoPartida,
    reinicioPendiente,
    configuracionEfectiva.idMision,
    configuracionEfectiva.nivel,
  ]);

  const escena = useMemo(
    () =>
      construirEscenaRobotTaller({
        configuracion: configuracionEfectiva,
        estado: controlador.estado,
        respuestaInicioSesion: sesionRobotTaller.respuestaInicio,
        respuestaFinalizacionSesion: sesionRobotTaller.respuestaFinalizacion,
        continuarActividad,
        salirActividad: manejarSalir,
        reiniciarPartida: controlador.reiniciarPartida,
        contextoSesion,
      }),
    [
      configuracionEfectiva,
      continuarActividad,
      controlador.estado,
      controlador.reiniciarPartida,
      contextoSesion,
      manejarSalir,
      sesionRobotTaller.respuestaInicio,
      sesionRobotTaller.respuestaFinalizacion,
    ],
  );

  useEffect(() => {
    if (controlador.estado.resultado) {
      onResultadoVisible?.();
    }
  }, [controlador.estado.resultado, onResultadoVisible]);

  return (
    <RobotTallerVista
      onSalir={manejarSalir}
      escena={escena}
      estado={controlador.estado}
      configuracion={controlador.configuracion}
      agarrarParte={controlador.agarrarParte}
      moverParte={controlador.moverParte}
      soltarParte={controlador.soltarParte}
      reiniciarPartida={controlador.reiniciarPartida}
      finalizarPorTiempo={controlador.finalizarPorTiempo}
      permitirReinicioManual={!sesionRobotTaller.persistenciaRemotaHabilitada}
      prepararPartida={prepararPartida}
      preparandoPartida={preparandoPartida}
      tiempoRestanteInicialMs={controlador.tiempoRestanteRestauradoMs}
      rondaVersion={rondaVersion}
      modoQuiz={controlador.modoQuiz}
      preguntaActual={controlador.preguntaActual}
      feedbackQuiz={controlador.feedbackQuiz}
      responderQuiz={controlador.responderQuiz}
      problemaMatematico={controlador.problemaMatematico}
      mostrarModalMatematica={controlador.mostrarModalMatematica}
      manejarCorrectaMatematica={controlador.manejarCorrectaMatematica}
      manejarIncorrectaMatematica={controlador.manejarIncorrectaMatematica}
      setMostrarModalMatematica={controlador.setMostrarModalMatematica}
      temaNombre={controlador.temaNombre}
      uiAudio={audioRobot}
    />
  );
}
