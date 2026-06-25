import { MODO_PRESENTACION_CAMINO_AR } from './caminoAr.constants';

const CONFIGURACION_BASE = Object.freeze({
  slug: 'camino-ar',
  titulo: 'Camino AR',
  dificultad: 1,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v1-base',
  modoPresentacion: MODO_PRESENTACION_CAMINO_AR,
  configuracion: Object.freeze({
    cantidadBaldosas: 4,
    longitudPatron: 3,
    duracionDestelloMs: 900,
    pausaEntreDestellosMs: 350,
    tiempoLimiteMs: 18000,
    ayudasDisponibles: 1,
    erroresPermitidos: 2,
  }),
});

const asegurarEnteroPositivo = (valor, respaldo) => {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    return respaldo;
  }
  return numero;
};

const asegurarEnteroNoNegativo = (valor, respaldo) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 ? numero : respaldo;
};

const normalizarModoPresentacion = (valor, respaldo) => {
  if (valor !== MODO_PRESENTACION_CAMINO_AR) {
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
      ayudasDisponibles: asegurarEnteroNoNegativo(
        configuracionEntrada.ayudasDisponibles,
        configuracionBase.ayudasDisponibles,
      ),
      erroresPermitidos: asegurarEnteroPositivo(
        configuracionEntrada.erroresPermitidos,
        configuracionBase.erroresPermitidos,
      ),
    },
  };
};

export const obtenerConfiguracionBaseCaminoAr = (sobrescrituras = {}) =>
  normalizarConfiguracionCaminoAr(sobrescrituras);

export const resolverConfiguracionCaminoArDesdeBackend = ({
  configuracionLocal = {},
  respuestaInicioSesion = null,
}) => {
  const gameConfig = respuestaInicioSesion?.game_config;

  if (!gameConfig || typeof gameConfig !== 'object' || Array.isArray(gameConfig)) {
    return normalizarConfiguracionCaminoAr(configuracionLocal);
  }

  return normalizarConfiguracionCaminoAr({
    ...configuracionLocal,
    dificultad: gameConfig.dificultad ?? respuestaInicioSesion?.sesion?.dificultad,
    fuenteAdaptacion:
      gameConfig.adaptacion?.fuente ?? configuracionLocal.fuenteAdaptacion,
    versionAdaptacion:
      gameConfig.adaptacion?.version ?? configuracionLocal.versionAdaptacion,
    configuracion: {
      ...configuracionLocal.configuracion,
      cantidadBaldosas: gameConfig.cantidad_baldosas,
      longitudPatron: gameConfig.longitud_patron,
      duracionDestelloMs: gameConfig.duracion_destello_ms,
      pausaEntreDestellosMs: gameConfig.pausa_entre_destellos_ms,
      tiempoLimiteMs: gameConfig.tiempo_limite_ms,
      ayudasDisponibles: gameConfig.ayudas_disponibles,
      erroresPermitidos: gameConfig.errores_permitidos,
    },
  });
};
