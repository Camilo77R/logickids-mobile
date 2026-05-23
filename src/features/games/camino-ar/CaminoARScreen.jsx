import React from 'react';
import { useCaminoArControlador } from './useCaminoArControlador';
import { MODOS_PRESENTACION_CAMINO_AR } from './caminoAr.constants';
import { construirEscenaCaminoAr } from './caminoArEscena';
import { construirEscenaEspacialCaminoAr } from './caminoArEscenaEspacial';
import { useSesionCaminoAr } from './aplicacion/useSesionCaminoAr';
import CaminoArVista2d from './presentacion/CaminoArVista2d';
import CaminoArVistaArPreview from './presentacion/CaminoArVistaArPreview';

const renderizadoresCaminoAr = Object.freeze({
  [MODOS_PRESENTACION_CAMINO_AR.tablero2d]: CaminoArVista2d,
  [MODOS_PRESENTACION_CAMINO_AR.realidadAumentada]: CaminoArVistaArPreview,
});

export default function CaminoARScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const sesionCaminoAr = useSesionCaminoAr({
    configuracion: configuracionInicial,
    contextoSesion,
  });
  const controlador = useCaminoArControlador(
    configuracionInicial,
    sesionCaminoAr.observadoresJuego,
  );
  const escena = construirEscenaCaminoAr({
    ...controlador,
    persistenciaSesion: sesionCaminoAr.persistencia,
  });
  const escenaEspacial = construirEscenaEspacialCaminoAr({
    escena,
    configuracion: controlador.configuracion,
  });
  const RenderizadorCaminoAr =
    renderizadoresCaminoAr[controlador.configuracion.modoPresentacion] ??
    CaminoArVista2d;

  return (
    <RenderizadorCaminoAr
      onSalir={onSalir}
      escena={escena}
      escenaEspacial={escenaEspacial}
      persistenciaSesion={sesionCaminoAr.persistencia}
      respuestaInicioSesion={sesionCaminoAr.respuestaInicio}
      {...controlador}
    />
  );
}
