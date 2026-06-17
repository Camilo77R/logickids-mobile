import React, { useMemo } from 'react';
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

  const escena = useMemo(
    () =>
      construirEscenaRobotTaller({
        configuracion: configuracionEfectiva,
        estado: controlador.estado,
        respuestaInicioSesion: sesionRobotTaller.respuestaInicio,
        respuestaFinalizacionSesion: sesionRobotTaller.respuestaFinalizacion,
        continuarActividad: controlador.reiniciarPartida,
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
    />
  );
}
