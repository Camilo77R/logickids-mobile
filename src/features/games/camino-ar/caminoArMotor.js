const enteroAleatorio = (minimo, maximo) =>
  minimo + Math.floor(Math.random() * (maximo - minimo + 1));

export const crearPatronAleatorio = ({ cantidadBaldosas, longitudPatron }) =>
  Array.from({ length: longitudPatron }, () => enteroAleatorio(0, cantidadBaldosas - 1));

export const resolverColumnasTablero = (cantidadBaldosas) => {
  if (cantidadBaldosas <= 4) {
    return 2;
  }

  if (cantidadBaldosas <= 6) {
    return 3;
  }

  return 3;
};

export const construirResumenPartida = ({
  exito,
  configuracion,
  aciertos,
  errores,
  ayudasUsadas,
  tiempoTranscurridoMs,
  patron,
}) => ({
  resultadoFinal: exito ? 'completado' : 'incompleto',
  dificultad: configuracion.dificultad,
  nivelAlcanzado: configuracion.dificultad,
  aciertos,
  errores,
  pistasUsadas: ayudasUsadas,
  comboMaximo: 0,
  tiempoTotalMs: tiempoTranscurridoMs,
  patronLongitud: patron.length,
  patronResuelto: exito,
  fuenteAdaptacion: configuracion.fuenteAdaptacion,
});
