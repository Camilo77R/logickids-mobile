export const SLUG_TREN_3D = 'tren-figuras';
export const HABILIDAD_TREN_3D = 'Patrones';
export const TITULO_TREN_3D = 'Tren 3D de Patrones';
export const VAGONES_POR_NIVEL = 10;
export const NIVELES_POR_PARTIDA = 4;

export const ESTADOS_TREN_3D = Object.freeze({
  esperando: 'esperando',
  jugando: 'jugando',
  evaluando: 'evaluando',
  transicionNivel: 'transicionNivel',
  finalizado: 'finalizado',
});

export const FIGURAS_TREN = Object.freeze({
  circulo: Object.freeze({ id: 'circulo', label: 'Circulo', colorHex: '#82D7FF' }),
  cuadrado: Object.freeze({ id: 'cuadrado', label: 'Cuadrado', colorHex: '#FFD86B' }),
  triangulo: Object.freeze({ id: 'triangulo', label: 'Triangulo', colorHex: '#18C47A' }),
  estrella: Object.freeze({ id: 'estrella', label: 'Estrella', colorHex: '#FF8A8A' }),
});

export const COLORES_TREN = Object.freeze({
  cielo: Object.freeze({ id: 'cielo', label: 'Azul', colorHex: '#82D7FF' }),
  sol: Object.freeze({ id: 'sol', label: 'Amarillo', colorHex: '#FFD86B' }),
  hoja: Object.freeze({ id: 'hoja', label: 'Verde', colorHex: '#18C47A' }),
  coral: Object.freeze({ id: 'coral', label: 'Rojo', colorHex: '#FF8A8A' }),
});

export const FIGURAS_ORDENADAS = Object.freeze([
  FIGURAS_TREN.circulo,
  FIGURAS_TREN.cuadrado,
  FIGURAS_TREN.triangulo,
  FIGURAS_TREN.estrella,
]);

export const COLORES_ORDENADOS = Object.freeze([
  COLORES_TREN.cielo,
  COLORES_TREN.sol,
  COLORES_TREN.hoja,
  COLORES_TREN.coral,
]);
