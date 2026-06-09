import { MODO_PRESENTACION_ROBOT_TALLER } from './robotTaller.constants';

const CONFIGURACION_BASE = Object.freeze({
  slug: 'robot-logico',
  titulo: 'Robot Lógico',
  dificultad: 2,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v1-base',
  modoPresentacion: MODO_PRESENTACION_ROBOT_TALLER,
  habilidad: 'Lógica',
  configuracion: Object.freeze({
    tiempoLimiteMs: 120000,
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
  if (valor !== MODO_PRESENTACION_ROBOT_TALLER) {
    return respaldo;
  }
  return valor;
};

export const normalizarConfiguracionRobotTaller = (entrada = {}) => {
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
    habilidad: entrada.habilidad ?? CONFIGURACION_BASE.habilidad,
    configuracion: {
      tiempoLimiteMs: asegurarEnteroPositivo(
        configuracionEntrada.tiempoLimiteMs,
        configuracionBase.tiempoLimiteMs,
      ),
    },
  };
};

export const obtenerConfiguracionBaseRobotTaller = (sobrescrituras = {}) =>
  normalizarConfiguracionRobotTaller(sobrescrituras);

export const resolverConfiguracionRobotTallerDesdeBackend = ({
  configuracionLocal = {},
  respuestaInicioSesion = null,
}) => {
  const gameConfig = respuestaInicioSesion?.game_config;

  if (!gameConfig || typeof gameConfig !== 'object' || Array.isArray(gameConfig)) {
    return normalizarConfiguracionRobotTaller(configuracionLocal);
  }

  return normalizarConfiguracionRobotTaller({
    ...configuracionLocal,
    dificultad: gameConfig.dificultad ?? respuestaInicioSesion?.sesion?.dificultad,
    configuracion: {
      ...configuracionLocal.configuracion,
      tiempoLimiteMs: gameConfig.tiempo_limite_ms,
    },
  });
};
