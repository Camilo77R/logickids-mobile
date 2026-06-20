import React, { useCallback, useMemo, useState } from 'react';
import { useObjetoPerdidoArControlador } from './useObjetoPerdidoArControlador';
import { useSesionObjetoPerdidoAr } from './aplicacion/useSesionObjetoPerdidoAr';
import { resolverConfiguracionObjetoPerdidoArDesdeBackend } from './objetoPerdidoArConfiguracion';
import ObjetoPerdidoArVistaViro from './presentacion/ObjetoPerdidoArVistaViro';

export default function ObjetoPerdidoARScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const [preparandoPartida, setPreparandoPartida] = useState(false);
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
  );

  const iniciarActividad = useCallback(async ({ tableroDisponible } = {}) => {
    const tableroSigueListo =
      typeof tableroDisponible === 'function' ? tableroDisponible : () => true;

    if (preparandoPartida || !tableroSigueListo()) {
      return;
    }

    setPreparandoPartida(true);

    try {
      const partidaLista = await sesionObjetoPerdido.prepararRonda(
        configuracionInicial.dificultad,
      );

      if (!partidaLista || !tableroSigueListo()) {
        return;
      }

      controlador.iniciarPartida();
    } finally {
      setPreparandoPartida(false);
    }
  }, [
    configuracionInicial.dificultad,
    controlador,
    preparandoPartida,
    sesionObjetoPerdido,
  ]);

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

  return (
    <ObjetoPerdidoArVistaViro
      onSalir={onSalir}
      persistenciaSesion={sesionObjetoPerdido.persistencia}
      respuestaFinalizacionSesion={sesionObjetoPerdido.respuestaFinalizacion}
      preparandoPartida={preparandoPartida}
      iniciarActividad={iniciarActividad}
      reiniciarActividad={reiniciarActividad}
      {...controlador}
    />
  );
}
