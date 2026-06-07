import React, { useCallback, useMemo, useState } from 'react';
import { useRobotTallerControlador } from './useRobotTallerControlador';
import { construirEscenaRobotTaller } from './robotTallerEscena';
import { useSesionRobotTaller } from './aplicacion/useSesionRobotTaller';
import { resolverConfiguracionRobotTallerDesdeBackend } from './robotTallerConfiguracion';
import RobotTallerVista from './presentacion/RobotTallerVista';
import { ESTADOS_ROBOT_TALLER } from './robotTaller.constants';

export default function RobotTallerScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const [preparandoRonda, setPreparandoRonda] = useState(false);
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

  const cancelarRondaTecnica = useCallback(
    (motivo) => {
      controlador.reiniciarPartida();
      sesionRobotTaller.prepararNuevaRonda();
      void motivo;
    },
    [controlador, sesionRobotTaller],
  );

  const solicitarInicioRonda = useCallback(async () => {
    if (
      preparandoRonda ||
      controlador.estado.fase !== ESTADOS_ROBOT_TALLER.listo ||
      controlador.estado.resultado
    ) {
      return;
    }
    setPreparandoRonda(true);
    try {
      const rondaLista = await sesionRobotTaller.prepararRonda(
        configuracionInicial.dificultad,
      );
      if (!rondaLista) {
        return;
      }
      controlador.iniciarPartida();
    } finally {
      setPreparandoRonda(false);
    }
  }, [
    configuracionInicial.dificultad,
    controlador,
    preparandoRonda,
    sesionRobotTaller,
  ]);

  const continuarActividad = useCallback(async () => {
    if (preparandoRonda) {
      return;
    }
    setPreparandoRonda(true);
    sesionRobotTaller.prepararNuevaRonda();
    controlador.reiniciarPartida();
    try {
      const rondaLista = await sesionRobotTaller.prepararRonda(
        configuracionInicial.dificultad,
      );
      if (!rondaLista) {
        return;
      }
      controlador.iniciarPartida();
    } finally {
      setPreparandoRonda(false);
    }
  }, [
    configuracionInicial.dificultad,
    controlador,
    preparandoRonda,
    sesionRobotTaller,
  ]);

  const escena = useMemo(
    () =>
      construirEscenaRobotTaller({
        ...controlador,
        iniciarPartida: solicitarInicioRonda,
        persistenciaSesion: sesionRobotTaller.persistencia,
        respuestaInicioSesion: sesionRobotTaller.respuestaInicio,
        respuestaFinalizacionSesion: sesionRobotTaller.respuestaFinalizacion,
        continuarActividad,
        salirActividad: onSalir,
        preparandoRonda,
      }),
    [
      continuarActividad,
      controlador,
      onSalir,
      preparandoRonda,
      solicitarInicioRonda,
      sesionRobotTaller.persistencia,
      sesionRobotTaller.respuestaFinalizacion,
      sesionRobotTaller.respuestaInicio,
    ],
  );

  return (
    <RobotTallerVista
      onSalir={onSalir}
      escena={escena}
      persistenciaSesion={sesionRobotTaller.persistencia}
      respuestaInicioSesion={sesionRobotTaller.respuestaInicio}
      cancelarPartidaTecnica={cancelarRondaTecnica}
      {...controlador}
    />
  );
}
