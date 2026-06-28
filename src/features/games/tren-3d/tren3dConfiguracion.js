import {
  COLORES_ORDENADOS,
  FIGURAS_ORDENADAS,
  NIVELES_POR_PARTIDA,
  SLUG_TREN_3D,
  TITULO_TREN_3D,
  VAGONES_POR_NIVEL,
} from './tren3d.constants';

const DIFICULTAD_MINIMA = 1;
const DIFICULTAD_MAXIMA = 4;
const MAX_OPCIONES_FIGURAS = 4;

const TABLA_DIFICULTAD = Object.freeze([
  Object.freeze({
    dificultad: 1,
    velocidadTren: 0.75,
    vueltasMaximas: 6,
    vagonesPorNivel: 10,
    longitudSecuencia: 2,
    maxOpcionesFiguras: MAX_OPCIONES_FIGURAS,
    usaColores: false,
    paresConsecutivos: false,
    variacionCiclica: false,
    opacidadFiguraGuia: 0.86,
    descripcion: 'Patron AB con dos figuras y tren lento',
  }),
  Object.freeze({
    dificultad: 2,
    velocidadTren: 0.85,
    vueltasMaximas: 5,
    vagonesPorNivel: 10,
    longitudSecuencia: 3,
    maxOpcionesFiguras: MAX_OPCIONES_FIGURAS,
    usaColores: false,
    paresConsecutivos: false,
    variacionCiclica: false,
    opacidadFiguraGuia: 0.86,
    descripcion: 'Patron ABC con tres figuras y velocidad tranquila',
  }),
  Object.freeze({
    dificultad: 3,
    velocidadTren: 0.95,
    vueltasMaximas: 4,
    vagonesPorNivel: 10,
    longitudSecuencia: 4,
    maxOpcionesFiguras: MAX_OPCIONES_FIGURAS,
    usaColores: true,
    paresConsecutivos: true,
    variacionCiclica: false,
    opacidadFiguraGuia: 0.86,
    descripcion: 'Patron AABB con figuras y colores alternados',
  }),
  Object.freeze({
    dificultad: 4,
    velocidadTren: 1.18,
    vueltasMaximas: 3,
    vagonesPorNivel: 12,
    longitudSecuencia: 4,
    maxOpcionesFiguras: MAX_OPCIONES_FIGURAS,
    usaColores: true,
    paresConsecutivos: false,
    variacionCiclica: true,
    opacidadFiguraGuia: 0.86,
    descripcion: 'Reto experto con mas vagones, colores y patron alternado',
  }),
]);

const CONFIGURACION_BASE = Object.freeze({
  slug: SLUG_TREN_3D,
  titulo: TITULO_TREN_3D,
  dificultad: 1,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v1-tren-3d-patrones',
  nivelesPorPartida: NIVELES_POR_PARTIDA,
  vagonesPorNivel: VAGONES_POR_NIVEL,
});

const asegurarEnteroPositivo = (valor, respaldo) => {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    return respaldo;
  }

  return numero;
};

const asegurarMaxOpcionesFiguras = (valor, respaldo = MAX_OPCIONES_FIGURAS) =>
  Math.max(1, Math.min(MAX_OPCIONES_FIGURAS, asegurarEnteroPositivo(valor, respaldo)));

const esRutaPedagogica = (contextoSesion = {}) =>
  contextoSesion?.sesionModo === 'path';

export const resolverNivelesPorPartidaTren3D = ({
  nivelesPorPartida,
  contextoSesion,
  respaldo = CONFIGURACION_BASE.nivelesPorPartida,
} = {}) => {
  if (esRutaPedagogica(contextoSesion)) {
    return 1;
  }

  const nivelesSesion = asegurarEnteroPositivo(
    contextoSesion?.sesionTotalPasos,
    null,
  );

  if (nivelesSesion != null) {
    return nivelesSesion;
  }

  return asegurarEnteroPositivo(nivelesPorPartida, respaldo);
};

export const clampDificultadTren3D = (valor) => {
  const numero = Number(valor);
  const dificultad = Number.isFinite(numero) ? Math.round(numero) : DIFICULTAD_MINIMA;

  return Math.min(DIFICULTAD_MAXIMA, Math.max(DIFICULTAD_MINIMA, dificultad));
};

export const obtenerParametrosDificultad = (dificultad) => {
  const nivel = clampDificultadTren3D(dificultad);

  return TABLA_DIFICULTAD.find((fila) => fila.dificultad === nivel) ?? TABLA_DIFICULTAD[0];
};

const construirPasoPatron = ({ indice, usaColores }) => {
  const figura = FIGURAS_ORDENADAS[indice % FIGURAS_ORDENADAS.length];
  const color = usaColores
    ? COLORES_ORDENADOS[(indice + Math.floor(indice / FIGURAS_ORDENADAS.length)) % COLORES_ORDENADOS.length]
    : {
        id: figura.id,
        label: figura.label,
        colorHex: figura.colorHex,
      };

  return {
    figuraId: figura.id,
    figuraLabel: figura.label,
    colorId: color.id,
    colorLabel: color.label,
    colorHex: color.colorHex,
    clave: `${figura.id}:${color.id}`,
  };
};

const construirSecuenciaBase = (params) =>
  Array.from({ length: params.longitudSecuencia }, (_, indice) =>
    construirPasoPatron({ indice, usaColores: params.usaColores }),
  );

export const generarPatronNivel = (
  dificultad,
  vagonesPorNivel = VAGONES_POR_NIVEL,
  parametrosPersonalizados = null,
) => {
  const params = parametrosPersonalizados ?? obtenerParametrosDificultad(dificultad);
  const totalVagones = asegurarEnteroPositivo(
    params.vagonesPorNivel ?? vagonesPorNivel,
    VAGONES_POR_NIVEL,
  );
  const secuenciaBase = construirSecuenciaBase(params);

  return Array.from({ length: totalVagones }, (_, indice) => {
    let indicePatron = indice % secuenciaBase.length;

    if (params.paresConsecutivos) {
      indicePatron = Math.floor(indice / 2) % secuenciaBase.length;
    } else if (params.variacionCiclica) {
      indicePatron = (indice + Math.floor(indice / secuenciaBase.length)) % secuenciaBase.length;
    }

    return {
      ...secuenciaBase[indicePatron],
      posicion: indice,
    };
  });
};

export const calcularAdaptacionInterNivel = ({
  aciertos = 0,
  errores = 0,
  dificultadActual = DIFICULTAD_MINIMA,
  misionCompletada = true,
}) => {
  const dificultadBase = clampDificultadTren3D(dificultadActual);
  const aciertosNormalizados = Math.max(0, Math.round(Number(aciertos) || 0));
  const erroresNormalizados = Math.max(0, Math.round(Number(errores) || 0));
  const totalIntentos = aciertosNormalizados + erroresNormalizados;
  const precisionPct = totalIntentos > 0 ? (aciertosNormalizados / totalIntentos) * 100 : 0;

  let nuevaDificultad = dificultadBase;
  let ajusteVelocidad = 1;

  if (!misionCompletada) {
    nuevaDificultad = Math.max(dificultadBase - 1, DIFICULTAD_MINIMA);
    ajusteVelocidad = 0.9;
  } else if (precisionPct >= 90) {
    nuevaDificultad = Math.min(dificultadBase + 1, DIFICULTAD_MAXIMA);
  } else if (precisionPct >= 70) {
    ajusteVelocidad = 0.95;
  } else {
    nuevaDificultad = Math.max(dificultadBase - 1, DIFICULTAD_MINIMA);
    ajusteVelocidad = 0.9;
  }

  const paramsNuevos = obtenerParametrosDificultad(nuevaDificultad);
  const nuevaVelocidad = Number((paramsNuevos.velocidadTren * ajusteVelocidad).toFixed(2));

  return {
    precisionPct: Number(precisionPct.toFixed(2)),
    nuevaDificultad,
    nuevaVelocidad,
    vueltasMaximas: paramsNuevos.vueltasMaximas,
    vagonesPorNivel: paramsNuevos.vagonesPorNivel,
    maxOpcionesFiguras: paramsNuevos.maxOpcionesFiguras,
    opacidadFiguraGuia: paramsNuevos.opacidadFiguraGuia,
    patronNuevo: generarPatronNivel(nuevaDificultad),
    descripcionNivel: paramsNuevos.descripcion,
    subioNivel: nuevaDificultad > dificultadBase,
    bajoNivel: nuevaDificultad < dificultadBase,
    misionCompletada,
  };
};

export const normalizarConfiguracionTren3D = (entrada = {}) => ({
  slug: entrada.slug ?? CONFIGURACION_BASE.slug,
  titulo: entrada.titulo ?? CONFIGURACION_BASE.titulo,
  dificultad: clampDificultadTren3D(entrada.dificultad ?? CONFIGURACION_BASE.dificultad),
  fuenteAdaptacion: entrada.fuenteAdaptacion ?? CONFIGURACION_BASE.fuenteAdaptacion,
  versionAdaptacion: entrada.versionAdaptacion ?? CONFIGURACION_BASE.versionAdaptacion,
  nivelesPorPartida: asegurarEnteroPositivo(
    entrada.nivelesPorPartida,
    CONFIGURACION_BASE.nivelesPorPartida,
  ),
  vagonesPorNivel: asegurarEnteroPositivo(
    entrada.vagonesPorNivel ?? entrada.parametrosNivel?.vagonesPorNivel,
    CONFIGURACION_BASE.vagonesPorNivel,
  ),
  parametrosNivel: entrada.parametrosNivel ?? obtenerParametrosDificultad(
    entrada.dificultad ?? CONFIGURACION_BASE.dificultad,
  ),
});

export const obtenerConfiguracionBaseTren3D = (sobrescrituras = {}) =>
  normalizarConfiguracionTren3D(sobrescrituras);

export const resolverConfiguracionTren3DDesdeBackend = ({
  configuracionLocal = {},
  respuestaInicioSesion = null,
}) => {
  const gameConfig = respuestaInicioSesion?.game_config;

  if (!gameConfig || typeof gameConfig !== 'object' || Array.isArray(gameConfig)) {
    return normalizarConfiguracionTren3D(configuracionLocal);
  }

  const dificultad = clampDificultadTren3D(
    gameConfig.dificultad ?? respuestaInicioSesion?.sesion?.dificultad,
  );
  const presetLocal = obtenerParametrosDificultad(dificultad);

  return normalizarConfiguracionTren3D({
    ...configuracionLocal,
    dificultad,
    fuenteAdaptacion:
      gameConfig.adaptacion?.fuente ?? configuracionLocal.fuenteAdaptacion,
    parametrosNivel: {
      ...presetLocal,
      dificultad,
      velocidadTren: Number(gameConfig.velocidad_tren ?? presetLocal.velocidadTren),
      vueltasMaximas: asegurarEnteroPositivo(
        gameConfig.vueltas_maximas,
        presetLocal.vueltasMaximas,
      ),
      vagonesPorNivel: asegurarEnteroPositivo(
        gameConfig.vagones_por_nivel,
        presetLocal.vagonesPorNivel,
      ),
      longitudSecuencia: asegurarEnteroPositivo(
        gameConfig.longitud_secuencia,
        presetLocal.longitudSecuencia,
      ),
      maxOpcionesFiguras: asegurarMaxOpcionesFiguras(
        gameConfig.max_opciones_figuras,
        presetLocal.maxOpcionesFiguras,
      ),
      usaColores: gameConfig.usa_colores ?? presetLocal.usaColores,
      paresConsecutivos:
        gameConfig.pares_consecutivos ?? presetLocal.paresConsecutivos,
      variacionCiclica:
        gameConfig.variacion_ciclica ?? presetLocal.variacionCiclica,
      opacidadFiguraGuia: Math.max(
        0.5,
        Math.min(1, Number(gameConfig.opacidad_figura_guia ?? presetLocal.opacidadFiguraGuia)),
      ),
    },
  });
};
