import {
  CATEGORIAS_MERCADO,
  MODO_PRESENTACION_MERCADO,
  MODOS_OBJETIVO_MERCADO,
  SLUG_MERCADO,
  TITULO_MERCADO,
} from './mercado.constants';

const DIFICULTAD_MINIMA = 1;
const DIFICULTAD_MAXIMA = 4;

const CONFIGURACION_BASE = Object.freeze({
  slug: SLUG_MERCADO,
  titulo: TITULO_MERCADO,
  dificultad: 1,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v2-mercado-3d-babylon',
  modoPresentacion: MODO_PRESENTACION_MERCADO,
  rondasPorPartida: 1,
  semillaRonda: 0,
  configuracion: Object.freeze({
    presupuestoMonedas: 8,
    cantidadProductosVisibles: 3,
    cantidadObjetivos: 2,
    precioMin: 1,
    precioMax: 4,
    categoriasPermitidas: CATEGORIAS_MERCADO,
    modoObjetivo: MODOS_OBJETIVO_MERCADO.presupuestoMaximo,
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

const normalizarEnteroNoNegativo = (valor, respaldo = 0) => {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero < 0) {
    return respaldo;
  }

  return numero;
};

export const clampDificultadMercado = (valor) => {
  const numero = Number(valor);
  const dificultad = Number.isFinite(numero) ? Math.round(numero) : DIFICULTAD_MINIMA;

  return Math.min(DIFICULTAD_MAXIMA, Math.max(DIFICULTAD_MINIMA, dificultad));
};

const normalizarCategorias = (categorias, respaldo) => {
  if (!Array.isArray(categorias)) {
    return [...respaldo];
  }

  const permitidas = categorias.filter((categoria) => CATEGORIAS_MERCADO.includes(categoria));
  return permitidas.length > 0 ? permitidas : [...respaldo];
};

const normalizarModoObjetivo = (valor, respaldo) =>
  Object.values(MODOS_OBJETIVO_MERCADO).includes(valor) ? valor : respaldo;

export const normalizarConfiguracionMercado = (entrada = {}) => {
  const configuracionEntrada = entrada.configuracion ?? {};
  const configuracionBase = CONFIGURACION_BASE.configuracion;
  const precioMin = asegurarEnteroPositivo(
    configuracionEntrada.precioMin,
    configuracionBase.precioMin,
  );
  const precioMaxCandidato = asegurarEnteroPositivo(
    configuracionEntrada.precioMax,
    configuracionBase.precioMax,
  );

  return {
    slug: entrada.slug ?? CONFIGURACION_BASE.slug,
    titulo: entrada.titulo ?? CONFIGURACION_BASE.titulo,
    dificultad: clampDificultadMercado(entrada.dificultad ?? CONFIGURACION_BASE.dificultad),
    fuenteAdaptacion: entrada.fuenteAdaptacion ?? CONFIGURACION_BASE.fuenteAdaptacion,
    versionAdaptacion: entrada.versionAdaptacion ?? CONFIGURACION_BASE.versionAdaptacion,
    modoPresentacion: entrada.modoPresentacion ?? CONFIGURACION_BASE.modoPresentacion,
    rondasPorPartida: asegurarEnteroPositivo(
      entrada.rondasPorPartida,
      CONFIGURACION_BASE.rondasPorPartida,
    ),
    semillaRonda: Math.max(
      0,
      normalizarEnteroNoNegativo(entrada.semillaRonda, CONFIGURACION_BASE.semillaRonda),
    ),
    configuracion: {
      presupuestoMonedas: asegurarEnteroPositivo(
        configuracionEntrada.presupuestoMonedas,
        configuracionBase.presupuestoMonedas,
      ),
      cantidadProductosVisibles: asegurarEnteroPositivo(
        configuracionEntrada.cantidadProductosVisibles,
        configuracionBase.cantidadProductosVisibles,
      ),
      cantidadObjetivos: asegurarEnteroPositivo(
        configuracionEntrada.cantidadObjetivos,
        configuracionBase.cantidadObjetivos,
      ),
      precioMin,
      precioMax: Math.max(precioMin, precioMaxCandidato),
      categoriasPermitidas: normalizarCategorias(
        configuracionEntrada.categoriasPermitidas,
        configuracionBase.categoriasPermitidas,
      ),
      modoObjetivo: normalizarModoObjetivo(
        configuracionEntrada.modoObjetivo,
        configuracionBase.modoObjetivo,
      ),
      ayudasDisponibles: asegurarEnteroPositivo(
        configuracionEntrada.ayudasDisponibles,
        configuracionBase.ayudasDisponibles,
      ),
    },
  };
};

export const obtenerConfiguracionBaseMercado = (sobrescrituras = {}) =>
  normalizarConfiguracionMercado(sobrescrituras);

export const resolverConfiguracionMercadoDesdeBackend = ({
  configuracionLocal = {},
  respuestaInicioSesion = null,
}) => {
  const gameConfig = respuestaInicioSesion?.game_config;

  if (!gameConfig || typeof gameConfig !== 'object' || Array.isArray(gameConfig)) {
    return normalizarConfiguracionMercado(configuracionLocal);
  }

  return normalizarConfiguracionMercado({
    ...configuracionLocal,
      dificultad: gameConfig.dificultad ?? respuestaInicioSesion?.sesion?.dificultad,
      rondasPorPartida: gameConfig.rondas_por_partida,
      semillaRonda: gameConfig.semilla_ronda,
      configuracion: {
      ...configuracionLocal.configuracion,
      presupuestoMonedas: gameConfig.presupuesto_monedas,
      cantidadProductosVisibles: gameConfig.cantidad_productos_visibles,
      cantidadObjetivos: gameConfig.cantidad_objetivos,
      precioMin: gameConfig.precio_min,
      precioMax: gameConfig.precio_max,
      categoriasPermitidas: gameConfig.categorias_permitidas,
      modoObjetivo: gameConfig.modo_objetivo,
      ayudasDisponibles: gameConfig.ayudas_disponibles,
    },
  });
};
