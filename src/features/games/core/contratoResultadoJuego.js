import { ESTADOS_FINALIZACION_SESION } from './contratoSesionJuego';

const normalizarEnteroNoNegativo = (valor, respaldo = 0) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return respaldo;
  }

  return Math.round(numero);
};

const normalizarTextoOpcional = (valor, respaldo = null) => {
  if (typeof valor !== 'string') {
    return respaldo;
  }

  const texto = valor.trim();
  return texto.length > 0 ? texto : respaldo;
};

const calcularPrecisionPct = ({ aciertos, errores }) => {
  const totalIntentos = aciertos + errores;

  if (totalIntentos <= 0) {
    return 0;
  }

  return Number(((aciertos / totalIntentos) * 100).toFixed(2));
};

/**
 * Contrato comun de estadisticas para todos los juegos.
 *
 * POR QUÉ:
 * - el backend hoy persiste una parte del resultado final
 * - la app movil y la capa de adaptacion necesitan una forma comun de leer
 *   resultados sin importar si el juego es Camino AR, tren, mercado, etc.
 */
export const crearEstadisticasJuegoComun = ({
  puntaje = 0,
  aciertos = 0,
  errores = 0,
  comboMaximo = 0,
  tiempoTotalMs = 0,
  pistasUsadas = 0,
  nivelAlcanzado = 1,
  dificultad = 1,
  estadoSesion = ESTADOS_FINALIZACION_SESION.completado,
}) => {
  const aciertosNormalizados = normalizarEnteroNoNegativo(aciertos);
  const erroresNormalizados = normalizarEnteroNoNegativo(errores);

  return {
    puntaje: normalizarEnteroNoNegativo(puntaje),
    aciertos: aciertosNormalizados,
    errores: erroresNormalizados,
    totalIntentos: aciertosNormalizados + erroresNormalizados,
    precisionPct: calcularPrecisionPct({
      aciertos: aciertosNormalizados,
      errores: erroresNormalizados,
    }),
    comboMaximo: normalizarEnteroNoNegativo(comboMaximo),
    tiempoTotalMs: normalizarEnteroNoNegativo(tiempoTotalMs),
    pistasUsadas: normalizarEnteroNoNegativo(pistasUsadas),
    nivelAlcanzado: normalizarEnteroNoNegativo(nivelAlcanzado, 1),
    dificultad: normalizarEnteroNoNegativo(dificultad, 1),
    estadoSesion,
  };
};

export const crearResultadoJuegoComun = ({
  juego,
  finalizacionSesion,
  estadisticas,
  detalles = {},
}) => ({
  contrato: 'resultado-juego-v1',
  juego: {
    slug: normalizarTextoOpcional(juego?.slug),
    titulo: normalizarTextoOpcional(juego?.titulo),
    habilidad: normalizarTextoOpcional(juego?.habilidad),
    fuenteAdaptacion: normalizarTextoOpcional(juego?.fuenteAdaptacion, 'base'),
    versionAdaptacion: normalizarTextoOpcional(juego?.versionAdaptacion),
  },
  finalizacionSesion,
  estadisticas,
  detalles,
});
