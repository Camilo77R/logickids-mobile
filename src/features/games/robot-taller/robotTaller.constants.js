export const FASES_ENSAMBLAGE = Object.freeze({
  explotado: 'explotado',
  ensamblando: 'ensamblando',
  completado: 'completado',
});

export const MODO_PRESENTACION_ROBOT_TALLER = 'logica-3d';

export const PARTES_ROBOT = Object.freeze([
  {
    id: 'cabeza',
    nombre: 'Cabeza',
    forma: 'sphere',
    color: '#FF6B35',
    tamanio: [0.7, 0.7, 0.7],
    posicionExplotada: [-2.5, 1.2, 0],
    posicionObjetivo: [0, 1.6, 0],
    rotacionObjetivo: [0, 0, 0],
  },
  {
    id: 'torso',
    nombre: 'Torso',
    forma: 'box',
    color: '#004E89',
    tamanio: [1.4, 1.2, 0.7],
    posicionExplotada: [2.5, -0.8, 0],
    posicionObjetivo: [0, 0.1, 0],
    rotacionObjetivo: [0, 0, 0],
  },
  {
    id: 'brazo_izq',
    nombre: 'Brazo Izquierdo',
    forma: 'cylinder',
    color: '#1A659E',
    tamanio: [0.25, 0.9, 0.25],
    posicionExplotada: [-3.5, -0.5, 0],
    posicionObjetivo: [-1.2, 0.4, 0],
    rotacionObjetivo: [0, 0, 0.3],
  },
  {
    id: 'brazo_der',
    nombre: 'Brazo Derecho',
    forma: 'cylinder',
    color: '#1A659E',
    tamanio: [0.25, 0.9, 0.25],
    posicionExplotada: [3.5, -0.5, 0],
    posicionObjetivo: [1.2, 0.4, 0],
    rotacionObjetivo: [0, 0, -0.3],
  },
  {
    id: 'pierna_izq',
    nombre: 'Pierna Izquierda',
    forma: 'cylinder',
    color: '#1A659E',
    tamanio: [0.3, 0.8, 0.3],
    posicionExplotada: [-2, -3, 0],
    posicionObjetivo: [-0.4, -1.0, 0],
    rotacionObjetivo: [0, 0, 0],
  },
  {
    id: 'pierna_der',
    nombre: 'Pierna Derecha',
    forma: 'cylinder',
    color: '#1A659E',
    tamanio: [0.3, 0.8, 0.3],
    posicionExplotada: [2, -3, 0],
    posicionObjetivo: [0.4, -1.0, 0],
    rotacionObjetivo: [0, 0, 0],
  },
  {
    id: 'antena',
    nombre: 'Antena',
    forma: 'cone',
    color: '#FFD166',
    tamanio: [0.12, 0.35, 0.12],
    posicionExplotada: [0, 3, 0.5],
    posicionObjetivo: [0, 2.2, 0.2],
    rotacionObjetivo: [0, 0, 0],
  },
]);

export const UMBRAL_SNAP = 0.6;
export const RADIO_SNAP_SUAVE = 1.2;
export const DISTANCIA_MAX_ENSAMBLAR = 0.3;
