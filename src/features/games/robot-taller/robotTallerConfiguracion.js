import {
  MODO_PRESENTACION_ROBOT_TALLER,
  NIVELES,
  SLUG_ROBOT_TALLER,
} from './robotTaller.constants';

const CONFIGURACION_BASE = Object.freeze({
  slug: SLUG_ROBOT_TALLER,
  titulo: 'Robot Lógico',
  dificultad: 2,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v1-base',
  modoPresentacion: MODO_PRESENTACION_ROBOT_TALLER,
  habilidad: 'Lógica',
  configuracion: Object.freeze({
    tiempoLimiteMs: 120000,
  }),
  nivel: 1,
  idMision: null,
});

const asegurarEnteroPositivo = (valor, respaldo) => {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    return respaldo;
  }
  return numero;
};

const normalizarNivel = (valor, respaldo) => {
  const nivel = asegurarEnteroPositivo(valor, respaldo);
  if (!NIVELES[nivel]) return respaldo;
  return nivel;
};

const normalizarModoPresentacion = (valor, respaldo) => {
  if (valor !== MODO_PRESENTACION_ROBOT_TALLER) {
    return respaldo;
  }
  return valor;
};

const normalizarBooleano = (valor, respaldo) =>
  typeof valor === 'boolean' ? valor : respaldo;

const normalizarNumeroPositivo = (valor, respaldo) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : respaldo;
};

export const normalizarConfiguracionRobotTaller = (entrada = {}) => {
  const configuracionEntrada = entrada.configuracion ?? {};
  const configuracionBase = CONFIGURACION_BASE.configuracion;
  const nivel = normalizarNivel(entrada.nivel, CONFIGURACION_BASE.nivel);
  const nivelConfigBase = NIVELES[nivel];
  const nivelConfig = {
    ...nivelConfigBase,
    mostrarSiluetas: normalizarBooleano(
      configuracionEntrada.mostrarSiluetas,
      nivelConfigBase.mostrarSiluetas,
    ),
    ordenSecuencial: normalizarBooleano(
      configuracionEntrada.ordenSecuencial,
      nivelConfigBase.ordenSecuencial,
    ),
    usarAlternativas: normalizarBooleano(
      configuracionEntrada.usarAlternativas,
      nivelConfigBase.usarAlternativas,
    ),
    colocacionAsistida: normalizarBooleano(
      configuracionEntrada.colocacionAsistida,
      nivelConfigBase.colocacionAsistida,
    ),
    umbralSnap: normalizarNumeroPositivo(
      configuracionEntrada.umbralSnap,
      nivelConfigBase.umbralSnap,
    ),
  };

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
        configuracionEntrada.tiempoLimiteMs ?? nivelConfig.tiempoLimiteMs,
        configuracionBase.tiempoLimiteMs,
      ),
      mostrarSiluetas: nivelConfig.mostrarSiluetas,
      ordenSecuencial: nivelConfig.ordenSecuencial,
      usarAlternativas: nivelConfig.usarAlternativas,
      colocacionAsistida: nivelConfig.colocacionAsistida,
      umbralSnap: nivelConfig.umbralSnap,
    },
    nivelConfig,
    nivel,
    idMision: entrada.idMision ?? CONFIGURACION_BASE.idMision,
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
      mostrarSiluetas: gameConfig.mostrar_siluetas,
      ordenSecuencial: gameConfig.orden_secuencial,
      usarAlternativas: gameConfig.usar_alternativas,
      colocacionAsistida: gameConfig.colocacion_asistida,
      umbralSnap: gameConfig.umbral_snap,
    },
    nivel: gameConfig.nivel,
    idMision: gameConfig.id_mision,
  });
};

