const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarConfiguracionRobotTaller,
} = require('../../src/features/games/robot-taller/robotTallerConfiguracion.js');
const {
  MODO_PRESENTACION_ROBOT_TALLER,
  PARTES_ROBOT,
} = require('../../src/features/games/robot-taller/robotTaller.constants.js');
const {
  TIPOS_EVENTO_SESION,
  ESTADOS_FINALIZACION_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');
const {
  construirResumenPartidaEnsamblaje,
  construirEventoEnsamblaje,
  detectarSnap,
} = require('../../src/features/games/robot-taller/robotTallerMotor.js');

test('normalizarConfiguracionRobotTaller usa defaults seguros y valida modo de presentacion', () => {
  const configuracion = normalizarConfiguracionRobotTaller({
    dificultad: 0,
    modoPresentacion: 'modo-raro',
    configuracion: {
      tiempoLimiteMs: -5000,
    },
  });

  assert.equal(configuracion.dificultad, 2);
  assert.equal(configuracion.modoPresentacion, MODO_PRESENTACION_ROBOT_TALLER);
  assert.equal(configuracion.configuracion.tiempoLimiteMs, 120000);
  assert.equal(configuracion.habilidad, 'Lógica');
  assert.equal(configuracion.slug, 'robot-logico');
});

test('PARTES_ROBOT define 7 piezas con formas y posiciones', () => {
  assert.equal(PARTES_ROBOT.length, 7);
  const ids = PARTES_ROBOT.map((p) => p.id);
  assert.ok(ids.includes('cabeza'));
  assert.ok(ids.includes('torso'));
  assert.ok(ids.includes('brazo_izq'));
  assert.ok(ids.includes('brazo_der'));
  assert.ok(ids.includes('pierna_izq'));
  assert.ok(ids.includes('pierna_der'));
  assert.ok(ids.includes('antena'));
  PARTES_ROBOT.forEach((parte) => {
    assert.ok(Array.isArray(parte.posicionExplotada));
    assert.ok(Array.isArray(parte.posicionObjetivo));
    assert.equal(parte.posicionExplotada.length, 3);
    assert.equal(parte.posicionObjetivo.length, 3);
  });
});

test('detectarSnap reconoce pieza cerca de su objetivo', () => {
  const resultado = detectarSnap(PARTES_ROBOT[0].posicionObjetivo);
  assert.ok(resultado);
  assert.equal(resultado.ensamblada, true);
  assert.equal(resultado.distancia, 0);
});

test('detectarSnap retorna null para posicion lejana', () => {
  const resultado = detectarSnap([100, 100, 100]);
  assert.equal(resultado, null);
});

test('construirResumenPartidaEnsamblaje devuelve contrato comun con slug robot-logico', () => {
  const configuracion = normalizarConfiguracionRobotTaller({ dificultad: 2 });
  const resultado = construirResumenPartidaEnsamblaje({
    exito: true,
    configuracion,
    partesEnsambladas: 7,
    tiempoTranscurridoMs: 45000,
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, 'robot-logico');
  assert.equal(resultado.juego.habilidad, 'Lógica');
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.estadisticas.totalIntentos, 7);
});

test('construirEventoEnsamblaje respeta el contrato de sesion', () => {
  const evento = construirEventoEnsamblaje({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    puntos: 15,
    comboEnEvento: 3,
    metadata: { parte_id: 'cabeza' },
  });

  assert.equal(evento.tipo_evento, 'acierto');
  assert.equal(evento.habilidad, 'Lógica');
  assert.equal(evento.puntos, 15);
  assert.equal(evento.combo_en_evento, 3);
  assert.deepEqual(evento.metadata, { parte_id: 'cabeza' });
});

test('construirResumenPartidaEnsamblaje penaliza partes faltantes', () => {
  const configuracion = normalizarConfiguracionRobotTaller({ dificultad: 1 });
  const resultado = construirResumenPartidaEnsamblaje({
    exito: false,
    configuracion,
    partesEnsambladas: 3,
    tiempoTranscurridoMs: 60000,
  });

  assert.equal(resultado.estadisticas.aciertos, 3);
  assert.equal(resultado.estadisticas.errores, 4);
  assert.equal(resultado.detalles.totalPartes, 7);
  assert.equal(resultado.detalles.ensamblajeCompleto, false);
});
