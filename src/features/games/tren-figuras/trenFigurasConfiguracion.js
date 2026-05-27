import {
  COLORES_ORDENADOS,
  FIGURAS_ORDENADAS,
  NIVELES_POR_PARTIDA,
  SLUG_TREN_FIGURAS,
  TITULO_TREN_FIGURAS,
  VAGONES_POR_NIVEL,
} from './trenFiguras.constants';

const DIFICULTAD_MINIMA = 1;
const DIFICULTAD_MAXIMA = 4;

const TABLA_DIFICULTAD = Object.freeze([
  Object.freeze({
    dificultad: 1,
    velocidadTren: 1,
    longitudSecuencia: 2,
    usaColores: false,
    descripcion: 'Patron AB con dos figuras y tren lento',
  }),
  Object.freeze({
    dificultad: 2,
    velocidadTren: 1.25,
    longitudSecuencia: 3,
    usaColores: false,
    descripcion: 'Patron ABC con tres figuras y velocidad media',
  }),
  Object.freeze({
    dificultad: 3,
    velocidadTren: 1.5,
    longitudSecuencia: 4,
    usaColores: true,
    paresConsecutivos: true,
    descripcion: 'Patron AABB con figuras y colores alternados',
  }),
  Object.freeze({
    dificultad: 4,
    velocidadTren: 1.8,
    longitudSecuencia: 7,
    usaColores: true,
    descripcion: 'Patron largo de siete pasos con figura y color',
  }),
]);

const CONFIGURACION_BASE = Object.freeze({
  slug: SLUG_TREN_FIGURAS,
  titulo: TITULO_TREN_FIGURAS,
  dificultad: 1,
  fuenteAdaptacion: 'base',
  versionAdaptacion: 'v1-tren-figuras',
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

export const clampDificultadTrenFiguras = (valor) => {
  const numero = Number(valor);
  const dificultad = Number.isFinite(numero) ? Math.round(numero) : DIFICULTAD_MINIMA;

  return Math.min(DIFICULTAD_MAXIMA, Math.max(DIFICULTAD_MINIMA, dificultad));
};

export const obtenerParametrosDificultad = (dificultad) => {
  const nivel = clampDificultadTrenFiguras(dificultad);

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

export const generarPatronNivel = (dificultad, vagonesPorNivel = VAGONES_POR_NIVEL) => {
  const params = obtenerParametrosDificultad(dificultad);
  const totalVagones = asegurarEnteroPositivo(vagonesPorNivel, VAGONES_POR_NIVEL);
  const secuenciaBase = construirSecuenciaBase(params);

  return Array.from({ length: totalVagones }, (_, indice) => {
    const indicePatron = params.paresConsecutivos
      ? Math.floor(indice / 2) % secuenciaBase.length
      : indice % secuenciaBase.length;

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
}) => {
  const dificultadBase = clampDificultadTrenFiguras(dificultadActual);
  const aciertosNormalizados = Math.max(0, Math.round(Number(aciertos) || 0));
  const erroresNormalizados = Math.max(0, Math.round(Number(errores) || 0));
  const totalIntentos = aciertosNormalizados + erroresNormalizados;
  const precisionPct = totalIntentos > 0 ? (aciertosNormalizados / totalIntentos) * 100 : 0;

  let nuevaDificultad = dificultadBase;
  let ajusteVelocidad = 1;

  if (precisionPct >= 85) {
    nuevaDificultad = Math.min(dificultadBase + 1, DIFICULTAD_MAXIMA);
  } else if (precisionPct >= 60) {
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
    patronNuevo: generarPatronNivel(nuevaDificultad),
    descripcionNivel: paramsNuevos.descripcion,
    subioNivel: nuevaDificultad > dificultadBase,
    bajoNivel: nuevaDificultad < dificultadBase,
  };
};

export const normalizarConfiguracionTrenFiguras = (entrada = {}) => ({
  slug: entrada.slug ?? CONFIGURACION_BASE.slug,
  titulo: entrada.titulo ?? CONFIGURACION_BASE.titulo,
  dificultad: clampDificultadTrenFiguras(entrada.dificultad ?? CONFIGURACION_BASE.dificultad),
  fuenteAdaptacion: entrada.fuenteAdaptacion ?? CONFIGURACION_BASE.fuenteAdaptacion,
  versionAdaptacion: entrada.versionAdaptacion ?? CONFIGURACION_BASE.versionAdaptacion,
  nivelesPorPartida: asegurarEnteroPositivo(
    entrada.nivelesPorPartida,
    CONFIGURACION_BASE.nivelesPorPartida,
  ),
  vagonesPorNivel: asegurarEnteroPositivo(
    entrada.vagonesPorNivel,
    CONFIGURACION_BASE.vagonesPorNivel,
  ),
});

export const obtenerConfiguracionBaseTrenFiguras = (sobrescrituras = {}) =>
  normalizarConfiguracionTrenFiguras(sobrescrituras);
