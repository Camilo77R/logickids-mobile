export const FASES_ENSAMBLAGE = Object.freeze({
  explotado: 'explotado',
  ensamblando: 'ensamblando',
  completado: 'completado',
});

export const MODO_PRESENTACION_ROBOT_TALLER = 'logica-3d';

export const PARTES_ROBOT = Object.freeze([
  {
    id: 'cabeza',
    nombre: 'Armadura de Cabeza',
    forma: 'sphere',
    color: '#FF6B35',
    tamanio: [0.5, 0.5, 0.5],
    posicionExplotada: [1.5, 2.5, 0],
    posicionObjetivo: [0, 1.4, 0],
    rotacionObjetivo: [0, 0, 0],
    detalle: [
      { forma: 'sphere', tamanio: [0.34, 0.3, 0.3], offset: [0, 0.12, 0], color: '#FF6B35' },
      { forma: 'box', tamanio: [0.32, 0.06, 0.04], offset: [0, 0.1, 0.28], color: '#00e5ff' },
      { forma: 'box', tamanio: [0.26, 0.1, 0.08], offset: [0, -0.14, 0.18], color: '#FF6B35' },
      { forma: 'cylinder', tamanio: [0.1, 0.25, 0.1], offset: [0, -0.4, 0], color: '#888' },
    ],
  },
  {
    id: 'torso',
    nombre: 'Coraza Principal',
    forma: 'box',
    color: '#004E89',
    tamanio: [1.4, 1.0, 0.6],
    posicionExplotada: [-1.5, 2.5, 0],
    posicionObjetivo: [0, 0.0, 0],
    rotacionObjetivo: [0, 0, 0],
    detalle: [
      { forma: 'box', tamanio: [1.4, 0.5, 0.5], offset: [0, 0.35, 0], color: '#004E89' },
      { forma: 'box', tamanio: [0.9, 0.28, 0.35], offset: [0, -0.18, 0], color: '#003366' },
      { forma: 'sphere', tamanio: [0.14, 0.14, 0.14], offset: [-0.65, 0.55, 0], color: '#1A659E' },
      { forma: 'sphere', tamanio: [0.14, 0.14, 0.14], offset: [0.65, 0.55, 0], color: '#1A659E' },
      { forma: 'sphere', tamanio: [0.09, 0.09, 0.04], offset: [0, 0.35, 0.27], color: '#00e5ff' },
      { forma: 'box', tamanio: [0.06, 0.3, 0.02], offset: [0, -0.35, 0.28], color: '#00e5ff' },
    ],
  },
  {
    id: 'brazo_izq',
    nombre: 'Brazo Mecánico Izq.',
    forma: 'cylinder',
    color: '#1A659E',
    tamanio: [0.2, 0.6, 0.2],
    posicionExplotada: [-1.8, 0.5, 0],
    posicionObjetivo: [-1.2, -0.2, 0],
    rotacionObjetivo: [0, 0, 0.3],
    detalle: [
      { forma: 'sphere', tamanio: [0.14, 0.14, 0.14], offset: [0, 0.35, 0], color: '#1A659E' },
      { forma: 'cylinder', tamanio: [0.13, 0.3, 0.13], offset: [0, 0.1, 0], color: '#1A659E' },
      { forma: 'sphere', tamanio: [0.08, 0.08, 0.08], offset: [0, -0.12, 0], color: '#888' },
      { forma: 'cylinder', tamanio: [0.1, 0.28, 0.1], offset: [0, -0.32, 0], color: '#1A659E' },
      { forma: 'box', tamanio: [0.08, 0.06, 0.1], offset: [0, -0.48, 0.05], color: '#888' },
    ],
  },
  {
    id: 'brazo_der',
    nombre: 'Brazo Mecánico Der.',
    forma: 'cylinder',
    color: '#1A659E',
    tamanio: [0.2, 0.6, 0.2],
    posicionExplotada: [1.8, 0.5, 0],
    posicionObjetivo: [1.2, -0.2, 0],
    rotacionObjetivo: [0, 0, -0.3],
    detalle: [
      { forma: 'sphere', tamanio: [0.14, 0.14, 0.14], offset: [0, 0.35, 0], color: '#1A659E' },
      { forma: 'cylinder', tamanio: [0.13, 0.3, 0.13], offset: [0, 0.1, 0], color: '#1A659E' },
      { forma: 'sphere', tamanio: [0.08, 0.08, 0.08], offset: [0, -0.12, 0], color: '#888' },
      { forma: 'cylinder', tamanio: [0.1, 0.28, 0.1], offset: [0, -0.32, 0], color: '#1A659E' },
      { forma: 'box', tamanio: [0.08, 0.06, 0.1], offset: [0, -0.48, 0.05], color: '#888' },
    ],
  },
  {
    id: 'pierna_izq',
    nombre: 'Bota Mecánica Izq.',
    forma: 'cylinder',
    color: '#1A659E',
    tamanio: [0.22, 0.7, 0.22],
    posicionExplotada: [-1.5, -2.5, 0],
    posicionObjetivo: [-0.4, -0.9, 0],
    rotacionObjetivo: [0, 0, 0],
    detalle: [
      { forma: 'sphere', tamanio: [0.14, 0.14, 0.14], offset: [0, 0.4, 0], color: '#1A659E' },
      { forma: 'cylinder', tamanio: [0.14, 0.35, 0.14], offset: [0, 0.08, 0], color: '#1A659E' },
      { forma: 'sphere', tamanio: [0.08, 0.08, 0.08], offset: [0, -0.18, 0], color: '#888' },
      { forma: 'cylinder', tamanio: [0.1, 0.3, 0.1], offset: [0, -0.4, 0], color: '#1A659E' },
      { forma: 'box', tamanio: [0.14, 0.06, 0.2], offset: [0, -0.58, 0.1], color: '#888' },
    ],
  },
  {
    id: 'pierna_der',
    nombre: 'Bota Mecánica Der.',
    forma: 'cylinder',
    color: '#1A659E',
    tamanio: [0.22, 0.7, 0.22],
    posicionExplotada: [1.5, -2.5, 0],
    posicionObjetivo: [0.4, -0.9, 0],
    rotacionObjetivo: [0, 0, 0],
    detalle: [
      { forma: 'sphere', tamanio: [0.14, 0.14, 0.14], offset: [0, 0.4, 0], color: '#1A659E' },
      { forma: 'cylinder', tamanio: [0.14, 0.35, 0.14], offset: [0, 0.08, 0], color: '#1A659E' },
      { forma: 'sphere', tamanio: [0.08, 0.08, 0.08], offset: [0, -0.18, 0], color: '#888' },
      { forma: 'cylinder', tamanio: [0.1, 0.3, 0.1], offset: [0, -0.4, 0], color: '#1A659E' },
      { forma: 'box', tamanio: [0.14, 0.06, 0.2], offset: [0, -0.58, 0.1], color: '#888' },
    ],
  },
  {
    id: 'antena',
    nombre: 'Módulo de Antena',
    forma: 'cone',
    color: '#FFD166',
    tamanio: [0.08, 0.25, 0.08],
    posicionExplotada: [0, 3.2, 0],
    posicionObjetivo: [0, 1.95, 0.15],
    rotacionObjetivo: [0, 0, 0],
    detalle: [
      { forma: 'cylinder', tamanio: [0.06, 0.03, 0.06], offset: [0, 0, 0], color: '#FFD166' },
      { forma: 'cylinder', tamanio: [0.02, 0.2, 0.02], offset: [0, 0.14, 0], color: '#FFD166' },
      { forma: 'sphere', tamanio: [0.04, 0.04, 0.04], offset: [0, 0.3, 0], color: '#FF6B35' },
    ],
  },
]);

export const UMBRAL_SNAP = 3.0;
export const RADIO_SNAP_SUAVE = 4.0;
export const DISTANCIA_MAX_ENSAMBLAR = 2.0;

export const NIVELES = Object.freeze({
  1: {
    id: 1,
    nombre: 'Principiante',
    descripcion: 'Coloca cada pieza en su lugar',
    tiempoLimiteMs: 300000,
    mostrarSiluetas: true,
    ordenSecuencial: false,
    usarAlternativas: false,
    umbralSnap: 2.0,
    mision: null,
  },
  2: {
    id: 2,
    nombre: 'Constructor',
    descripcion: 'Sigue el orden correcto',
    tiempoLimiteMs: 240000,
    mostrarSiluetas: false,
    ordenSecuencial: true,
    usarAlternativas: false,
    umbralSnap: 1.5,
    mision: null,
  },
  3: {
    id: 3,
    nombre: 'Ingeniero',
    descripcion: 'Elige la pieza correcta segun la funcion',
    tiempoLimiteMs: 180000,
    mostrarSiluetas: false,
    ordenSecuencial: false,
    usarAlternativas: true,
    umbralSnap: 1.5,
    mision: null,
  },
});

export const SECUENCIA_ENSAMBLADO = Object.freeze([
  'torso',
  'pierna_izq',
  'pierna_der',
  'brazo_izq',
  'brazo_der',
  'cabeza',
  'antena',
]);

export const PIEZAS_ALTERNATIVAS = Object.freeze([
  {
    id: 'brazo_pinza',
    nombre: 'Brazo Pinza',
    reemplaza: 'brazo_izq',
    forma: 'cylinder',
    color: '#E07A5F',
    tamanio: [0.25, 0.9, 0.25],
    posicionExplotada: [-1.8, 0.5, 1],
    posicionObjetivo: [-1.2, -0.2, 0],
    rotacionObjetivo: [0, 0, 0.3],
    funcion: 'agarrar',
    icono: 'pinza',
  },
  {
    id: 'brazo_mecanico',
    nombre: 'Brazo Mecánico',
    reemplaza: 'brazo_izq',
    forma: 'cylinder',
    color: '#81B29A',
    tamanio: [0.3, 1.0, 0.3],
    posicionExplotada: [-1.8, -0.5, 1.5],
    posicionObjetivo: [-1.2, -0.2, 0],
    rotacionObjetivo: [0, 0, 0.3],
    funcion: 'levantar',
    icono: 'mecanico',
  },
  {
    id: 'brazo_garra',
    nombre: 'Brazo Garra',
    reemplaza: 'brazo_der',
    forma: 'cylinder',
    color: '#E07A5F',
    tamanio: [0.25, 0.9, 0.25],
    posicionExplotada: [1.8, 0.5, 1],
    posicionObjetivo: [1.2, -0.2, 0],
    rotacionObjetivo: [0, 0, -0.3],
    funcion: 'sujetar',
    icono: 'garra',
  },
  {
    id: 'brazo_taladro',
    nombre: 'Brazo Taladro',
    reemplaza: 'brazo_der',
    forma: 'cylinder',
    color: '#81B29A',
    tamanio: [0.3, 1.0, 0.3],
    posicionExplotada: [1.8, -0.5, 1.5],
    posicionObjetivo: [1.2, -0.2, 0],
    rotacionObjetivo: [0, 0, -0.3],
    funcion: 'perforar',
    icono: 'taladro',
  },
  {
    id: 'pierna_rueda',
    nombre: 'Pierna Rueda',
    reemplaza: 'pierna_izq',
    forma: 'sphere',
    color: '#E07A5F',
    tamanio: [0.4, 0.4, 0.4],
    posicionExplotada: [-1.5, -3.0, 1],
    posicionObjetivo: [-0.4, -1.0, 0],
    rotacionObjetivo: [0, 0, 0],
    funcion: 'rodar',
    icono: 'rueda',
  },
  {
    id: 'pierna_oruga',
    nombre: 'Pierna Oruga',
    reemplaza: 'pierna_izq',
    forma: 'box',
    color: '#81B29A',
    tamanio: [0.3, 0.2, 0.5],
    posicionExplotada: [-1.5, -3.0, 1.5],
    posicionObjetivo: [-0.4, -1.0, 0],
    rotacionObjetivo: [0, 0, 0],
    funcion: 'trepar',
    icono: 'oruga',
  },
  {
    id: 'pierna_rueda_der',
    nombre: 'Pierna Rueda Dcha',
    reemplaza: 'pierna_der',
    forma: 'sphere',
    color: '#E07A5F',
    tamanio: [0.4, 0.4, 0.4],
    posicionExplotada: [1.5, -3.0, 1],
    posicionObjetivo: [0.4, -1.0, 0],
    rotacionObjetivo: [0, 0, 0],
    funcion: 'rodar',
    icono: 'rueda',
  },
  {
    id: 'pierna_oruga_der',
    nombre: 'Pierna Oruga Dcha',
    reemplaza: 'pierna_der',
    forma: 'box',
    color: '#81B29A',
    tamanio: [0.3, 0.2, 0.5],
    posicionExplotada: [1.5, -3.0, 1.5],
    posicionObjetivo: [0.4, -1.0, 0],
    rotacionObjetivo: [0, 0, 0],
    funcion: 'trepar',
    icono: 'oruga',
  },
]);

export const DATOS_FUNCION_PIEZA = Object.freeze({
  cabeza: { funcion: 'pensar', descripcion: 'contiene el cerebro del robot', icono: 'brain' },
  torso: { funcion: 'energia', descripcion: 'genera la energia del robot', icono: 'flash' },
  brazo_izq: { funcion: 'sujetar', descripcion: 'sujeta herramientas y objetos', icono: 'hand-left' },
  brazo_der: { funcion: 'manipular', descripcion: 'manipula piezas pequenas', icono: 'hand-right' },
  pierna_izq: { funcion: 'caminar', descripcion: 'da equilibrio al robot', icono: 'footsteps' },
  pierna_der: { funcion: 'moverse', descripcion: 'impulsa al robot hacia adelante', icono: 'walk' },
  antena: { funcion: 'comunicar', descripcion: 'recibe senales y comandos', icono: 'radio' },
  brazo_pinza: { funcion: 'agarrar', descripcion: 'agarra objetos con precision', icono: 'pinza' },
  brazo_mecanico: { funcion: 'levantar', descripcion: 'levanta cargas pesadas', icono: 'mecanico' },
  brazo_garra: { funcion: 'sujetar', descripcion: 'sujeta objetos firmemente', icono: 'garra' },
  brazo_taladro: { funcion: 'perforar', descripcion: 'perfora superficies duras', icono: 'taladro' },
  pierna_rueda: { funcion: 'rodar', descripcion: 'rueda sobre superficies planas', icono: 'rueda' },
  pierna_oruga: { funcion: 'trepar', descripcion: 'trepa por terrenos dificiles', icono: 'oruga' },
  pierna_rueda_der: { funcion: 'rodar', descripcion: 'rueda sobre superficies planas', icono: 'rueda' },
  pierna_oruga_der: { funcion: 'trepar', descripcion: 'trepa por terrenos dificiles', icono: 'oruga' },
});

export const DATOS_PROBLEMA_MATEMATICO = Object.freeze({
  cabeza: { operador: '+', a: 2, b: 3, resultado: 5 },
  torso: { operador: '-', a: 7, b: 3, resultado: 4 },
  brazo_izq: { operador: '+', a: 4, b: 2, resultado: 6 },
  brazo_der: { operador: '-', a: 9, b: 5, resultado: 4 },
  pierna_izq: { operador: '+', a: 3, b: 4, resultado: 7 },
  pierna_der: { operador: '-', a: 8, b: 2, resultado: 6 },
  antena: { operador: '+', a: 5, b: 1, resultado: 6 },
});

export const EXPLICACIONES_ERROR = Object.freeze({
  cabeza: 'La cabeza es para pensar, no para eso. Busca la pieza que va en esa posicion.',
  torso: 'El torso da energia al robot. Esa pieza no encaja ahi.',
  brazo_izq: 'El brazo izquierdo sujeta herramientas. Esa pieza no es la correcta.',
  brazo_der: 'El brazo derecho manipula piezas. Sigue buscando.',
  pierna_izq: 'La pierna izquierda da equilibrio. Prueba con otra pieza.',
  pierna_der: 'La pierna derecha impulsa el robot. Esa no es.',
  antena: 'La antena recibe senales. Busca la pieza correcta.',
});

export const MISIONES_NIVEL_3 = Object.freeze([
  {
    id: 'levantar',
    titulo: 'Robot de carga',
    descripcion: 'Este robot necesita levantar cajas pesadas',
    funcionRequerida: 'levantar',
    funcionRequeridaBrazoDer: 'sujetar',
    funcionRequeridaPiernas: 'rodar',
    alternativasCorrectas: ['brazo_mecanico', 'brazo_garra', 'pierna_rueda', 'pierna_rueda_der'],
  },
  {
    id: 'construir',
    titulo: 'Robot constructor',
    descripcion: 'Este robot va a perforar y agarrar materiales',
    funcionRequerida: 'agarrar',
    funcionRequeridaBrazoDer: 'perforar',
    funcionRequeridaPiernas: 'trepar',
    alternativasCorrectas: ['brazo_pinza', 'brazo_taladro', 'pierna_oruga', 'pierna_oruga_der'],
  },
]);

/* ─── Temas de Robot por nivel ─── */
function clonarPartes(base, cambios) {
  return base.map((p) => {
    const c = cambios[p.id] ?? {};
    const detalleNuevo = c.detalle
      ? p.detalle.map((d, i) => ({ ...d, ...((c.detalle && c.detalle[i]) ?? {}) }))
      : p.detalle;
    return { ...p, ...c, detalle: detalleNuevo };
  });
}

const ROBOT_ESPACIAL = Object.freeze(clonarPartes(PARTES_ROBOT, {
  cabeza: {
    nombre: 'Cúpula de Navegación',
    color: '#D0D0D0',
    detalle: [
      { color: '#D0D0D0' },
      { color: '#00E5FF' },
      { color: '#D0D0D0' },
      { color: '#888' },
    ],
  },
  torso: {
    nombre: 'Módulo de Propulsión',
    color: '#E8E8E8',
    detalle: [
      { color: '#E8E8E8' },
      { color: '#C0C0C0' },
      { color: '#00E5FF' },
      { color: '#00E5FF' },
      { color: '#00E5FF' },
      { color: '#00E5FF' },
    ],
  },
  brazo_izq: {
    nombre: 'Brazo Satelital Izq.',
    color: '#C0C0C0',
    detalle: [
      { color: '#C0C0C0' },
      { color: '#C0C0C0' },
      { color: '#888' },
      { color: '#C0C0C0' },
      { color: '#888' },
    ],
  },
  brazo_der: {
    nombre: 'Brazo Satelital Der.',
    color: '#C0C0C0',
    detalle: [
      { color: '#C0C0C0' },
      { color: '#C0C0C0' },
      { color: '#888' },
      { color: '#C0C0C0' },
      { color: '#888' },
    ],
  },
  pierna_izq: {
    nombre: 'Propulsor Izquierdo',
    color: '#E8E8E8',
    detalle: [
      { color: '#E8E8E8' },
      { color: '#E8E8E8' },
      { color: '#888' },
      { color: '#E8E8E8' },
      { color: '#888' },
    ],
  },
  pierna_der: {
    nombre: 'Propulsor Derecho',
    color: '#E8E8E8',
    detalle: [
      { color: '#E8E8E8' },
      { color: '#E8E8E8' },
      { color: '#888' },
      { color: '#E8E8E8' },
      { color: '#888' },
    ],
  },
  antena: {
    nombre: 'Antena de Largo Alcance',
    color: '#00E5FF',
    detalle: [
      { color: '#00E5FF' },
      { color: '#00E5FF' },
      { color: '#00E5FF' },
    ],
  },
}));

const ROBOT_GLACIAR = Object.freeze(clonarPartes(PARTES_ROBOT, {
  cabeza: {
    nombre: 'Casquete Glaciar',
    color: '#B8F2E6',
    detalle: [
      { color: '#B8F2E6' },
      { color: '#00F5D4' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
    ],
  },
  torso: {
    nombre: 'Núcleo de Hielo',
    color: '#7B2FF7',
    detalle: [
      { color: '#7B2FF7' },
      { color: '#5A1FBF' },
      { color: '#00F5D4' },
      { color: '#00F5D4' },
      { color: '#00F5D4' },
      { color: '#00F5D4' },
    ],
  },
  brazo_izq: {
    nombre: 'Pinza Criogénica Izq.',
    color: '#B8F2E6',
    detalle: [
      { color: '#B8F2E6' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
    ],
  },
  brazo_der: {
    nombre: 'Pinza Criogénica Der.',
    color: '#B8F2E6',
    detalle: [
      { color: '#B8F2E6' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
    ],
  },
  pierna_izq: {
    nombre: 'Raíl de Hielo Izq.',
    color: '#B8F2E6',
    detalle: [
      { color: '#B8F2E6' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
    ],
  },
  pierna_der: {
    nombre: 'Raíl de Hielo Der.',
    color: '#B8F2E6',
    detalle: [
      { color: '#B8F2E6' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
      { color: '#B8F2E6' },
      { color: '#7B2FF7' },
    ],
  },
  antena: {
    nombre: 'Cristal Sensor',
    color: '#00F5D4',
    detalle: [
      { color: '#00F5D4' },
      { color: '#00F5D4' },
      { color: '#7B2FF7' },
    ],
  },
}));

export const ROBOT_TEMAS = Object.freeze({
  1: {
    id: 'constructor',
    nombre: 'Robot Constructor',
    descripcion: 'Robot de construcción con brazos mecánicos',
    colorPrimario: '#FF6B35',
    colorSecundario: '#004E89',
    partes: PARTES_ROBOT,
  },
  2: {
    id: 'espacial',
    nombre: 'Robot Espacial',
    descripcion: 'Explorador espacial con propulsores de iones',
    colorPrimario: '#00E5FF',
    colorSecundario: '#E8E8E8',
    partes: ROBOT_ESPACIAL,
  },
  3: {
    id: 'glaciar',
    nombre: 'Robot Glaciar',
    descripcion: 'Robot de exploración en zonas heladas',
    colorPrimario: '#00F5D4',
    colorSecundario: '#7B2FF7',
    partes: ROBOT_GLACIAR,
  },
});

export function obtenerTemaRobot(nivel) {
  return ROBOT_TEMAS[nivel] ?? ROBOT_TEMAS[1];
}

export function obtenerPartesRobot(nivel) {
  return obtenerTemaRobot(nivel).partes;
}

export function obtenerNombreRobot(nivel) {
  return obtenerTemaRobot(nivel).nombre;
}
