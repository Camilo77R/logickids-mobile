import {
  CATEGORIAS_MERCADO_AR,
  MODO_PRESENTACION_MERCADO_AR,
  MODOS_OBJETIVO_MERCADO_AR,
  SLUG_MERCADO_AR,
  TITULO_MERCADO_AR,
} from './mercadoAr.constants';

const DIFICULTAD_MINIMA = 1;
const DIFICULTAD_MAXIMA = 4;

const CONFIGURACION_BASE = Object.freeze({
  slug: SLUG_MERCADO_AR,
  titulo: TITULO_MERCADO_AR,
  dificultad: 1,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v1-mercado-ar-mvp',
  modoPresentacion: MODO_PRESENTACION_MERCADO_AR,
  rondasPorPartida: 3,
  configuracion: Object.freeze({
    presupuestoMonedas: 8,
    cantidadProductosVisibles: 4,
    cantidadObjetivos: 2,
    precioMin: 1,
    precioMax: 4,
    categoriasPermitidas: CATEGORIAS_MERCADO_AR,
    modoObjetivo: MODOS_OBJETIVO_MERCADO_AR.presupuestoMaximo,
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

export const clampDificultadMercadoAr = (valor) => {
  const numero = Number(valor);
  const dificultad = Number.isFinite(numero) ? Math.round(numero) : DIFICULTAD_MINIMA;

  return Math.min(DIFICULTAD_MAXIMA, Math.max(DIFICULTAD_MINIMA, dificultad));
};

const normalizarCategorias = (categorias, respaldo) => {
  if (!Array.isArray(categorias)) {
    return [...respaldo];
  }

  const permitidas = categorias.filter((categoria) => CATEGORIAS_MERCADO_AR.includes(categoria));
  return permitidas.length > 0 ? permitidas : [...respaldo];
};

const normalizarModoObjetivo = (valor, respaldo) =>
  Object.values(MODOS_OBJETIVO_MERCADO_AR).includes(valor) ? valor : respaldo;

export const normalizarConfiguracionMercadoAr = (entrada = {}) => {
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
    dificultad: clampDificultadMercadoAr(entrada.dificultad ?? CONFIGURACION_BASE.dificultad),
    fuenteAdaptacion: entrada.fuenteAdaptacion ?? CONFIGURACION_BASE.fuenteAdaptacion,
    versionAdaptacion: entrada.versionAdaptacion ?? CONFIGURACION_BASE.versionAdaptacion,
    modoPresentacion: entrada.modoPresentacion ?? CONFIGURACION_BASE.modoPresentacion,
    rondasPorPartida: asegurarEnteroPositivo(
      entrada.rondasPorPartida,
      CONFIGURACION_BASE.rondasPorPartida,
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

export const obtenerConfiguracionBaseMercadoAr = (sobrescrituras = {}) =>
  normalizarConfiguracionMercadoAr(sobrescrituras);

export const resolverConfiguracionMercadoArDesdeBackend = ({
  configuracionLocal = {},
  respuestaInicioSesion = null,
}) => {
  const gameConfig = respuestaInicioSesion?.game_config;

  if (!gameConfig || typeof gameConfig !== 'object' || Array.isArray(gameConfig)) {
    return normalizarConfiguracionMercadoAr(configuracionLocal);
  }

  return normalizarConfiguracionMercadoAr({
    ...configuracionLocal,
    dificultad: gameConfig.dificultad ?? respuestaInicioSesion?.sesion?.dificultad,
    rondasPorPartida: gameConfig.rondas_por_partida,
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
