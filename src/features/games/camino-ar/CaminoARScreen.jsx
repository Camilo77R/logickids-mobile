import React, { useCallback, useMemo, useState } from 'react';
import { useCaminoArControlador } from './useCaminoArControlador';
import { construirEscenaCaminoAr } from './caminoArEscena';
import { construirEscenaEspacialCaminoAr } from './caminoArEscenaEspacial';
import { useSesionCaminoAr } from './aplicacion/useSesionCaminoAr';
import { resolverConfiguracionCaminoArDesdeBackend } from './caminoArConfiguracion';
import CaminoArVistaArViro from './presentacion/CaminoArVistaArViro';
import { ESTADOS_CAMINO_AR } from './caminoAr.constants';

export default function CaminoARScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const [preparandoRonda, setPreparandoRonda] = useState(false);
  const [guiaInicialVisible, setGuiaInicialVisible] = useState(true);
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
    sesionCaminoAr.prepararNuevaRonda();
  }, [controlador, sesionCaminoAr]);

  const solicitarInicioRonda = useCallback(async ({ tableroDisponible } = {}) => {
    const tableroSigueListo =
      typeof tableroDisponible === 'function' ? tableroDisponible : () => true;

    if (
      preparandoRonda ||
      controlador.estado.fase !== ESTADOS_CAMINO_AR.listo ||
      controlador.estado.resultado ||
      !tableroSigueListo()
    ) {
      return;
    }

    setPreparandoRonda(true);

    try {
      const rondaLista = await sesionCaminoAr.prepararRonda(configuracionInicial.dificultad);

      if (!rondaLista) {
        return;
      }

      if (!tableroSigueListo()) {
        cancelarRondaTecnica('El tablero se movio antes de empezar. Vamos a buscarlo de nuevo.');
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
    preparandoRonda,
    sesionCaminoAr,
  ]);

  const continuarActividad = useCallback(async ({ tableroDisponible } = {}) => {
    const tableroSigueListo =
      typeof tableroDisponible === 'function' ? tableroDisponible : () => true;

    if (preparandoRonda) {
      return;
    }

    if (!tableroSigueListo()) {
      sesionCaminoAr.prepararNuevaRonda();
      controlador.reiniciarPartida();
      return;
    }

    setPreparandoRonda(true);
    sesionCaminoAr.prepararNuevaRonda();
    controlador.reiniciarPartida();

    try {
      const rondaLista = await sesionCaminoAr.prepararRonda(configuracionInicial.dificultad);

      if (!rondaLista) {
        return;
      }

      if (!tableroSigueListo()) {
        cancelarRondaTecnica('El tablero se movio antes del siguiente reto. Vamos a buscarlo de nuevo.');
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
    preparandoRonda,
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
        preparandoRonda,
      }),
    [
      continuarActividad,
      controlador,
      onSalir,
      preparandoRonda,
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
