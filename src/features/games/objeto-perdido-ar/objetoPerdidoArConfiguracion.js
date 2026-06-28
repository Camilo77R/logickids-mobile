import { MODO_PRESENTACION_OBJETO_PERDIDO_AR, SLUG_OBJETO_PERDIDO_AR } from './objetoPerdidoAr.constants';

const CONFIGURACION_NIVELES = Object.freeze({
  1: Object.freeze({
    rondasPorPartida: 3,
    objetosPorRonda: 3,
    tiempoLimiteMs: 26000,
    ayudasDisponibles: 2,
    escalaObjeto: 1.12,
    tipoMision: 'figura',
    zonaBusqueda: {
      ancho: 3,
      profundidad: 3,
      alturaMaxima: 0.85,
      margen: 0.28,
      separacionMinima: 0.58,
      distanciaMinimaCentro: 0.75,
    },
  }),
  2: Object.freeze({
    rondasPorPartida: 3,
    objetosPorRonda: 4,
    tiempoLimiteMs: 22000,
    ayudasDisponibles: 1,
    escalaObjeto: 1,
    tipoMision: 'figura-color',
    zonaBusqueda: {
      ancho: 3.2,
      profundidad: 3.2,
      alturaMaxima: 0.95,
      margen: 0.28,
      separacionMinima: 0.56,
      distanciaMinimaCentro: 0.82,
    },
  }),
  3: Object.freeze({
    rondasPorPartida: 4,
    objetosPorRonda: 5,
    tiempoLimiteMs: 17000,
    ayudasDisponibles: 1,
    escalaObjeto: 0.94,
    tipoMision: 'color-forma',
    zonaBusqueda: {
      ancho: 3.4,
      profundidad: 3.4,
      alturaMaxima: 1.05,
      margen: 0.3,
      separacionMinima: 0.52,
      distanciaMinimaCentro: 0.88,
    },
  }),
  4: Object.freeze({
    rondasPorPartida: 5,
    objetosPorRonda: 6,
    tiempoLimiteMs: 13000,
    ayudasDisponibles: 0,
    escalaObjeto: 0.86,
    tipoMision: 'color-forma',
    zonaBusqueda: {
      ancho: 3.6,
      profundidad: 3.6,
      alturaMaxima: 1.15,
      margen: 0.32,
      separacionMinima: 0.48,
      distanciaMinimaCentro: 0.95,
    },
  }),
});

const CONFIGURACION_BASE = Object.freeze({
  slug: SLUG_OBJETO_PERDIDO_AR,
  titulo: 'Encuentra el Objeto Perdido',
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

  return {
    ancho: asegurarNumeroPositivo(entrada.ancho, respaldo.ancho),
    profundidad: asegurarNumeroPositivo(entrada.profundidad, respaldo.profundidad),
    alturaMaxima: asegurarNumeroPositivo(entrada.alturaMaxima, respaldo.alturaMaxima),
    margen: asegurarNumeroPositivo(entrada.margen, respaldo.margen),
    separacionMinima: asegurarNumeroPositivo(
      entrada.separacionMinima,
      respaldo.separacionMinima,
    ),
    distanciaMinimaCentro: asegurarNumeroPositivo(
      entrada.distanciaMinimaCentro,
      respaldo.distanciaMinimaCentro,
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
      escalaObjeto: gameConfig.escala_objeto,
      tipoMision: gameConfig.tipo_mision,
      zonaBusqueda: gameConfig.zona_busqueda,
    },
  });
};
