export const ESTADOS_ROBOT_TALLER = Object.freeze({
  listo: 'listo',
  mostrandoPatron: 'mostrandoPatron',
  esperandoRespuesta: 'esperandoRespuesta',
  completado: 'completado',
  fallido: 'fallido',
});

export const MODO_PRESENTACION_ROBOT_TALLER = 'logica-2d';

export const PIEZAS_ROBOT = Object.freeze([
  { id: 'cabeza', etiqueta: 'Cabeza', icono: 'hardware-chip' },
  { id: 'torso', etiqueta: 'Torso', icono: 'cube' },
  { id: 'brazo_izq', etiqueta: 'Brazo izquierdo', icono: 'git-branch' },
  { id: 'brazo_der', etiqueta: 'Brazo derecho', icono: 'git-branch' },
  { id: 'antena', etiqueta: 'Antena', icono: 'flash' },
  { id: 'piernas', etiqueta: 'Piernas', icono: 'walk' },
]);

export const TOTAL_PIEZAS = PIEZAS_ROBOT.length;
