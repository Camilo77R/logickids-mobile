import React from 'react';
import { useCaminoArControlador } from './useCaminoArControlador';
import { MODOS_PRESENTACION_CAMINO_AR } from './caminoAr.constants';
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
  const RenderizadorCaminoAr =
    renderizadoresCaminoAr[controlador.configuracion.modoPresentacion] ??
    CaminoArVista2d;

  return (
    <RenderizadorCaminoAr
      onSalir={onSalir}
      persistenciaSesion={sesionCaminoAr.persistencia}
      respuestaInicioSesion={sesionCaminoAr.respuestaInicio}
      {...controlador}
    />
  );
}
