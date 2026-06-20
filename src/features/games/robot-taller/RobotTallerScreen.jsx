import React, { useCallback, useMemo, useState } from 'react';
import { useRobotTallerControlador } from './useRobotTallerControlador';
import { construirEscenaRobotTaller } from './robotTallerEscena';
import { useSesionRobotTaller } from './aplicacion/useSesionRobotTaller';
import { resolverConfiguracionRobotTallerDesdeBackend } from './robotTallerConfiguracion';
import RobotTallerVista from './presentacion/RobotTallerVista';

export default function RobotTallerScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const [preparandoPartida, setPreparandoPartida] = useState(false);
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

  const escena = useMemo(
    () =>
      construirEscenaRobotTaller({
        configuracion: configuracionEfectiva,
        estado: controlador.estado,
        respuestaInicioSesion: sesionRobotTaller.respuestaInicio,
        respuestaFinalizacionSesion: sesionRobotTaller.respuestaFinalizacion,
        continuarActividad: async () => {
          sesionRobotTaller.prepararNuevaRonda();
          const partidaLista = await sesionRobotTaller.prepararRonda(
            configuracionEfectiva.dificultad,
          );

          if (partidaLista) {
            controlador.reiniciarPartida();
          }
        },
        salirActividad: onSalir,
        reiniciarPartida: controlador.reiniciarPartida,
      }),
    [
      configuracionEfectiva,
      controlador.estado,
      controlador.reiniciarPartida,
      onSalir,
      sesionRobotTaller.respuestaInicio,
      sesionRobotTaller.respuestaFinalizacion,
      sesionRobotTaller,
    ],
  );

  return (
    <RobotTallerVista
      onSalir={onSalir}
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
    />
  );
}
