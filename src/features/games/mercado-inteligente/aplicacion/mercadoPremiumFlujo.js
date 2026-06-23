export const MODOS_SESION_MERCADO = Object.freeze({
  ruta: 'path',
  single: 'single',
});

export const resolverContinuidadNivelMercado = ({
  modoSesion,
  cierreDisponible = false,
  haySiguientePaso = false,
  siguienteEsMismoJuego = false,
  nivel = 1,
  totalNiveles = 1,
}) => {
  if (modoSesion === MODOS_SESION_MERCADO.ruta) {
    return false;
  }

  return cierreDisponible
    ? Boolean(haySiguientePaso && siguienteEsMismoJuego)
    : Number(nivel) < Number(totalNiveles);
};

export const resolverFlujoResultadoMercado = ({
  modoSesion,
  puedeContinuarNivel = false,
  haySiguientePasoRuta = false,
}) => {
  const esRuta = modoSesion === MODOS_SESION_MERCADO.ruta;

  if (esRuta) {
    return {
      mostrarResultadoNivel: true,
      etiquetaAccionResultado: haySiguientePasoRuta
        ? 'Continuar ruta'
        : 'Finalizar ruta',
    };
  }

  return {
    mostrarResultadoNivel: Boolean(puedeContinuarNivel),
    etiquetaAccionResultado: puedeContinuarNivel
      ? '¡Siguiente nivel!'
      : null,
  };
};
