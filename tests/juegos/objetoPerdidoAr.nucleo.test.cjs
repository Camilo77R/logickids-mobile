const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarConfiguracionObjetoPerdidoAr,
} = require('../../src/features/games/objeto-perdido-ar/objetoPerdidoArConfiguracion.js');
const {
  MODO_PRESENTACION_OBJETO_PERDIDO_AR,
  SLUG_OBJETO_PERDIDO_AR,
} = require('../../src/features/games/objeto-perdido-ar/objetoPerdidoAr.constants.js');
const {
  crearRondaObjetoPerdidoAr,
  construirEventoObjetoPerdidoAr,
  construirResumenObjetoPerdidoAr,
} = require('../../src/features/games/objeto-perdido-ar/objetoPerdidoArMotor.js');
const {
  ESTADOS_FINALIZACION_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');

test('normalizarConfiguracionObjetoPerdidoAr aplica dificultad segura y parametros por nivel', () => {
  const configuracion = normalizarConfiguracionObjetoPerdidoAr({
    dificultad: 4,
    modoPresentacion: 'modo-raro',
  });

  assert.equal(configuracion.slug, SLUG_OBJETO_PERDIDO_AR);
  assert.equal(configuracion.modoPresentacion, MODO_PRESENTACION_OBJETO_PERDIDO_AR);
  assert.equal(configuracion.dificultad, 4);
  assert.equal(configuracion.configuracion.objetosPorRonda, 6);
  assert.equal(configuracion.configuracion.tiempoLimiteMs, 13000);
  assert.equal(configuracion.configuracion.ayudasDisponibles, 0);
  assert.equal(configuracion.configuracion.tipoMision, 'color-forma');
  assert.equal(configuracion.configuracion.usarTableroLimitado, true);
  assert.equal(configuracion.configuracion.zonaBusqueda.ancho, 3.6);
  assert.equal(configuracion.configuracion.zonaBusqueda.profundidad, 3.6);
  assert.equal(configuracion.configuracion.zonaBusqueda.distanciaMinimaCentro, 0.95);
});

test('normalizarConfiguracionObjetoPerdidoAr cae a nivel 1 ante dificultad invalida', () => {
  const configuracion = normalizarConfiguracionObjetoPerdidoAr({
    dificultad: 9,
    configuracion: {
      objetosPorRonda: 0,
    },
  });

  assert.equal(configuracion.dificultad, 1);
  assert.equal(configuracion.configuracion.objetosPorRonda, 3);
});

test('crearRondaObjetoPerdidoAr genera objetivo, distractores y posiciones dentro de la zona AR', () => {
  const configuracion = normalizarConfiguracionObjetoPerdidoAr({
    dificultad: 2,
  });
  const ronda = crearRondaObjetoPerdidoAr({
    configuracion,
    numeroRonda: 1,
  });

  assert.equal(ronda.numeroRonda, 1);
  assert.equal(ronda.objetos.length, 4);
  assert.ok(ronda.objetos.some((objeto) => objeto.id === ronda.objetivoId));
  assert.match(ronda.mision, /Encuentra/i);
  assert.deepEqual(ronda.objetos[0].posicion.length, 3);
  ronda.objetos.forEach((objeto) => {
    const [x, y, z] = objeto.posicion;
    const zona = configuracion.configuracion.zonaBusqueda;
    assert.ok(Math.abs(x) <= zona.ancho / 2 - zona.margen);
    assert.ok(y >= 0.02 && y <= zona.alturaMaxima);
    assert.ok(Math.abs(z) <= zona.profundidad / 2 - zona.margen);
    assert.ok(Math.hypot(x, z) >= zona.distanciaMinimaCentro);
  });
});

test('construirEventoObjetoPerdidoAr respeta tipos del contrato de sesiones', () => {
  const evento = construirEventoObjetoPerdidoAr({
    tipoEvento: 'acierto',
    tiempoReaccionMs: 740,
    puntos: 10,
    comboEnEvento: 1,
    metadata: {
      ronda: 1,
      objetoObjetivo: 'pelota-azul',
      objetoTocado: 'pelota-azul',
    },
  });

  assert.equal(evento.tipo_evento, 'acierto');
  assert.equal(evento.habilidad, 'Atención');
  assert.equal(evento.tiempo_reaccion_ms, 740);
  assert.equal(evento.puntos, 10);
  assert.equal(evento.metadata.objetoObjetivo, 'pelota-azul');
});

test('crearRondaObjetoPerdidoAr evita distractores visualmente indistinguibles', () => {
  const configuracion = normalizarConfiguracionObjetoPerdidoAr({
    dificultad: 4,
    configuracion: {
      tipoMision: 'color-forma',
      objetosPorRonda: 6,
    },
  });
  const ronda = crearRondaObjetoPerdidoAr({
    configuracion,
    numeroRonda: 1,
  });
  const objetivo = ronda.objetivo;

  ronda.objetos
    .filter((objeto) => objeto.id !== objetivo.id)
    .forEach((objeto) => {
      assert.notEqual(`${objeto.forma}:${objeto.color}`, `${objetivo.forma}:${objetivo.color}`);
    });
});

test('construirResumenObjetoPerdidoAr devuelve contrato comun y finaliza como completado', () => {
  const configuracion = normalizarConfiguracionObjetoPerdidoAr({
    dificultad: 3,
  });
  const resultado = construirResumenObjetoPerdidoAr({
    configuracion,
    aciertos: 3,
    errores: 2,
    ayudasUsadas: 1,
    comboMaximo: 2,
    rondasCompletadas: 4,
    tiempoTranscurridoMs: 41000,
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, SLUG_OBJETO_PERDIDO_AR);
  assert.equal(resultado.juego.habilidad, 'Atención');
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.estadisticas.aciertos, 3);
  assert.equal(resultado.estadisticas.errores, 2);
  assert.equal(resultado.estadisticas.pistasUsadas, 1);
  assert.equal(resultado.detalles.tableroLimitado, true);
  assert.equal(resultado.detalles.zonaBusqueda.ancho, 3.4);
});
