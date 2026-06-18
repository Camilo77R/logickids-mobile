import { MODO_PRESENTACION_OBJETO_PERDIDO_AR, SLUG_OBJETO_PERDIDO_AR } from './objetoPerdidoAr.constants';

const CONFIGURACION_NIVELES = Object.freeze({
  1: Object.freeze({
    rondasPorPartida: 3,
    objetosPorRonda: 3,
    tiempoLimiteMs: 25000,
    ayudasDisponibles: 2,
    escalaObjeto: 1,
    tipoMision: 'nombre-color',
    zonaBusqueda: {
      modo: 'envolvente-360',
      radioMinimo: 1.6,
      radioMaximo: 4.2,
      alturaMinima: -1.05,
      alturaMaxima: -0.3,
      separacionMinima: 1.25,
      coberturaGrados: 360,
    },
  }),
  2: Object.freeze({
    rondasPorPartida: 3,
    objetosPorRonda: 4,
    tiempoLimiteMs: 20000,
    ayudasDisponibles: 1,
    escalaObjeto: 1,
    tipoMision: 'nombre-color',
    zonaBusqueda: {
      modo: 'envolvente-360',
      radioMinimo: 1.6,
      radioMaximo: 4.6,
      alturaMinima: -1.05,
      alturaMaxima: -0.28,
      separacionMinima: 1.2,
      coberturaGrados: 360,
    },
  }),
  3: Object.freeze({
    rondasPorPartida: 4,
    objetosPorRonda: 5,
    tiempoLimiteMs: 16000,
    ayudasDisponibles: 1,
    escalaObjeto: 1,
    tipoMision: 'caracteristica',
    zonaBusqueda: {
      modo: 'envolvente-360',
      radioMinimo: 1.65,
      radioMaximo: 5,
      alturaMinima: -1.05,
      alturaMaxima: -0.25,
      separacionMinima: 1.15,
      coberturaGrados: 360,
    },
  }),
  4: Object.freeze({
    rondasPorPartida: 5,
    objetosPorRonda: 6,
    tiempoLimiteMs: 12000,
    ayudasDisponibles: 1,
    escalaObjeto: 1,
    tipoMision: 'condicion',
    zonaBusqueda: {
      modo: 'envolvente-360',
      radioMinimo: 1.65,
      radioMaximo: 5.4,
      alturaMinima: -1.05,
      alturaMaxima: -0.25,
      separacionMinima: 1.1,
      coberturaGrados: 360,
    },
  }),
});

const CONFIGURACION_BASE = Object.freeze({
  slug: SLUG_OBJETO_PERDIDO_AR,
  titulo: 'Encuentra el Objeto Perdido AR',
  dificultad: 1,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v1-base',
  modoPresentacion: MODO_PRESENTACION_OBJETO_PERDIDO_AR,
  configuracion: CONFIGURACION_NIVELES[1],
});

const asegurarEnteroEnRango = (valor, respaldo, minimo, maximo) => {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    return respaldo;
  }

  return numero;
};

const asegurarEnteroPositivo = (valor, respaldo) => {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    return respaldo;
  }

  return numero;
};

const normalizarModoPresentacion = (valor, respaldo) =>
  valor === MODO_PRESENTACION_OBJETO_PERDIDO_AR ? valor : respaldo;

const normalizarZonaBusqueda = (entrada = {}, respaldo = {}) => {
  const asegurarNumeroPositivo = (valor, valorRespaldo) => {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? numero : valorRespaldo;
  };
  const asegurarNumero = (valor, valorRespaldo) => {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : valorRespaldo;
  };

  return {
    modo: entrada.modo ?? respaldo.modo ?? 'envolvente-360',
    radioMinimo: asegurarNumeroPositivo(entrada.radioMinimo, respaldo.radioMinimo),
    radioMaximo: asegurarNumeroPositivo(entrada.radioMaximo, respaldo.radioMaximo),
    alturaMinima: asegurarNumero(entrada.alturaMinima, respaldo.alturaMinima),
    alturaMaxima: asegurarNumero(entrada.alturaMaxima, respaldo.alturaMaxima),
    separacionMinima: asegurarNumeroPositivo(
      entrada.separacionMinima,
      respaldo.separacionMinima,
    ),
    coberturaGrados: asegurarNumeroPositivo(
      entrada.coberturaGrados,
      respaldo.coberturaGrados,
    ),
  };
};

export const obtenerConfiguracionNivelObjetoPerdidoAr = (dificultad = 1) => {
  const nivel = asegurarEnteroEnRango(dificultad, CONFIGURACION_BASE.dificultad, 1, 4);
  return CONFIGURACION_NIVELES[nivel] ?? CONFIGURACION_NIVELES[1];
};

export const normalizarConfiguracionObjetoPerdidoAr = (entrada = {}) => {
  const dificultad = asegurarEnteroEnRango(entrada.dificultad, CONFIGURACION_BASE.dificultad, 1, 4);
  const configuracionNivel = obtenerConfiguracionNivelObjetoPerdidoAr(dificultad);
  const configuracionEntrada = entrada.configuracion ?? {};

  return {
    slug: entrada.slug ?? CONFIGURACION_BASE.slug,
    titulo: entrada.titulo ?? CONFIGURACION_BASE.titulo,
    dificultad,
    fuenteAdaptacion: entrada.fuenteAdaptacion ?? CONFIGURACION_BASE.fuenteAdaptacion,
    versionAdaptacion: entrada.versionAdaptacion ?? CONFIGURACION_BASE.versionAdaptacion,
    modoPresentacion: normalizarModoPresentacion(
      entrada.modoPresentacion,
      CONFIGURACION_BASE.modoPresentacion,
    ),
    configuracion: {
      rondasPorPartida: asegurarEnteroPositivo(
        configuracionEntrada.rondasPorPartida,
        configuracionNivel.rondasPorPartida,
      ),
      objetosPorRonda: asegurarEnteroPositivo(
        configuracionEntrada.objetosPorRonda,
        configuracionNivel.objetosPorRonda,
      ),
      tiempoLimiteMs: asegurarEnteroPositivo(
        configuracionEntrada.tiempoLimiteMs,
        configuracionNivel.tiempoLimiteMs,
      ),
      ayudasDisponibles: asegurarEnteroPositivo(
        configuracionEntrada.ayudasDisponibles,
        configuracionNivel.ayudasDisponibles,
      ),
      escalaObjeto: Number.isFinite(Number(configuracionEntrada.escalaObjeto))
        ? Number(configuracionEntrada.escalaObjeto)
        : configuracionNivel.escalaObjeto,
      tipoMision: configuracionEntrada.tipoMision ?? configuracionNivel.tipoMision,
      usarTableroLimitado: configuracionEntrada.usarTableroLimitado ?? true,
      usarGuiaTemporal: configuracionEntrada.usarGuiaTemporal ?? true,
      zonaBusqueda: normalizarZonaBusqueda(
        configuracionEntrada.zonaBusqueda,
        configuracionNivel.zonaBusqueda,
      ),
    },
  };
};

export const obtenerConfiguracionBaseObjetoPerdidoAr = (sobrescrituras = {}) =>
  normalizarConfiguracionObjetoPerdidoAr(sobrescrituras);

export const resolverConfiguracionObjetoPerdidoArDesdeBackend = ({
  configuracionLocal = {},
  respuestaInicioSesion = null,
}) => {
  const gameConfig = respuestaInicioSesion?.game_config;

  if (!gameConfig || typeof gameConfig !== 'object' || Array.isArray(gameConfig)) {
    return normalizarConfiguracionObjetoPerdidoAr(configuracionLocal);
  }

  return normalizarConfiguracionObjetoPerdidoAr({
    ...configuracionLocal,
    dificultad: gameConfig.dificultad ?? respuestaInicioSesion?.sesion?.dificultad,
    configuracion: {
      ...configuracionLocal.configuracion,
      rondasPorPartida: gameConfig.rondas_por_partida,
      objetosPorRonda: gameConfig.objetos_por_ronda,
      tiempoLimiteMs: gameConfig.tiempo_limite_ms,
      ayudasDisponibles: gameConfig.ayudas_disponibles,
    },
  });
};
