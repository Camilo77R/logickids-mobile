import { SLUG_CAMINO_AR } from '../camino-ar/caminoAr.constants';
import { SLUG_MERCADO, TITULO_MERCADO } from '../mercado-inteligente/mercado.constants';
import {
  HABILIDAD_OBJETO_PERDIDO_AR,
  SLUG_OBJETO_PERDIDO_AR,
} from '../objeto-perdido-ar/objetoPerdidoAr.constants';
import { SLUG_TREN_3D, TITULO_TREN_3D } from '../tren-3d/tren3d.constants';

export const CATALOGO_JUEGOS = Object.freeze({
  caminoAr: Object.freeze({
    slug: SLUG_CAMINO_AR,
    titulo: 'Camino AR',
    habilidad: 'Memoria',
    icono: 'trail-sign',
  }),
  trenFiguras: Object.freeze({
    slug: SLUG_TREN_3D,
    titulo: TITULO_TREN_3D,
    habilidad: 'Patrones',
    icono: 'shapes',
  }),
  mercadoInteligente: Object.freeze({
    slug: SLUG_MERCADO,
    titulo: TITULO_MERCADO,
    habilidad: 'Razonamiento',
    icono: 'basket',
  }),
  robotLogico: Object.freeze({
    slug: 'robot-logico',
    titulo: 'Robot Logico',
    habilidad: 'Logica',
    icono: 'hardware-chip',
  }),
  objetoPerdido: Object.freeze({
    slug: SLUG_OBJETO_PERDIDO_AR,
    titulo: 'Encuentra el Objeto Perdido',
    habilidad: HABILIDAD_OBJETO_PERDIDO_AR,
    icono: 'search',
  }),
});

export const LISTA_JUEGOS_CATALOGO = Object.freeze([
  CATALOGO_JUEGOS.caminoAr,
  CATALOGO_JUEGOS.trenFiguras,
  CATALOGO_JUEGOS.robotLogico,
  CATALOGO_JUEGOS.mercadoInteligente,
  CATALOGO_JUEGOS.objetoPerdido,
]);

export const resolverJuegoPorSlug = (slug) =>
  LISTA_JUEGOS_CATALOGO.find((juego) => juego.slug === slug) ?? null;
