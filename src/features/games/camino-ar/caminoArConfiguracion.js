import { MODOS_PRESENTACION_CAMINO_AR } from './caminoAr.constants';

const CONFIGURACION_BASE = Object.freeze({
  slug: 'camino-ar',
  titulo: 'Camino AR',
  dificultad: 1,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v1-base',
  modoPresentacion: MODOS_PRESENTACION_CAMINO_AR.tablero2d,
  configuracion: Object.freeze({
    cantidadBaldosas: 6,
    longitudPatron: 3,
    duracionDestelloMs: 650,
    pausaEntreDestellosMs: 220,
    tiempoLimiteMs: 15000,
    ayudasDisponibles: 1,
  }),
});

const asegurarEnteroPositivo = (valor, respaldo) => {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    return respaldo;
  }
  return numero;
};

const normalizarModoPresentacion = (valor, respaldo) => {
  const modosValidos = new Set(Object.values(MODOS_PRESENTACION_CAMINO_AR));

  if (typeof valor !== 'string' || !modosValidos.has(valor)) {
    return respaldo;
  }

  return valor;
};

export const normalizarConfiguracionCaminoAr = (entrada = {}) => {
  const configuracionEntrada = entrada.configuracion ?? {};
  const configuracionBase = CONFIGURACION_BASE.configuracion;

  return {
    slug: entrada.slug ?? CONFIGURACION_BASE.slug,
    titulo: entrada.titulo ?? CONFIGURACION_BASE.titulo,
    dificultad: asegurarEnteroPositivo(entrada.dificultad, CONFIGURACION_BASE.dificultad),
    fuenteAdaptacion: entrada.fuenteAdaptacion ?? CONFIGURACION_BASE.fuenteAdaptacion,
    versionAdaptacion: entrada.versionAdaptacion ?? CONFIGURACION_BASE.versionAdaptacion,
    modoPresentacion: normalizarModoPresentacion(
      entrada.modoPresentacion,
      CONFIGURACION_BASE.modoPresentacion,
    ),
    configuracion: {
      cantidadBaldosas: asegurarEnteroPositivo(
        configuracionEntrada.cantidadBaldosas,
        configuracionBase.cantidadBaldosas,
      ),
      longitudPatron: asegurarEnteroPositivo(
        configuracionEntrada.longitudPatron,
        configuracionBase.longitudPatron,
      ),
      duracionDestelloMs: asegurarEnteroPositivo(
        configuracionEntrada.duracionDestelloMs,
        configuracionBase.duracionDestelloMs,
      ),
      pausaEntreDestellosMs: asegurarEnteroPositivo(
        configuracionEntrada.pausaEntreDestellosMs,
        configuracionBase.pausaEntreDestellosMs,
      ),
      tiempoLimiteMs: asegurarEnteroPositivo(
        configuracionEntrada.tiempoLimiteMs,
        configuracionBase.tiempoLimiteMs,
      ),
      ayudasDisponibles: asegurarEnteroPositivo(
        configuracionEntrada.ayudasDisponibles,
        configuracionBase.ayudasDisponibles,
      ),
    },
  };
};

export const obtenerConfiguracionBaseCaminoAr = (sobrescrituras = {}) =>
  normalizarConfiguracionCaminoAr(sobrescrituras);
