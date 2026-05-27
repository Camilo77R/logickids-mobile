const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calcularAdaptacionInterNivel,
  generarPatronNivel,
  normalizarConfiguracionTrenFiguras,
} = require('../../src/features/games/tren-figuras/trenFigurasConfiguracion.js');
const {
  calcularPuntaje,
  construirEventoTrenFiguras,
  construirResumenPartidaTren,
} = require('../../src/features/games/tren-figuras/trenFigurasMotor.js');
const {
  SLUG_TREN_FIGURAS,
} = require('../../src/features/games/tren-figuras/trenFiguras.constants.js');
const {
  ESTADOS_FINALIZACION_SESION,
  TIPOS_EVENTO_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');

test('normalizarConfiguracionTrenFiguras limita dificultad y conserva defaults seguros', () => {
  assert.equal(normalizarConfiguracionTrenFiguras({ dificultad: 0 }).dificultad, 1);
  assert.equal(normalizarConfiguracionTrenFiguras({ dificultad: -4 }).dificultad, 1);
  assert.equal(normalizarConfiguracionTrenFiguras({ dificultad: 'abc' }).dificultad, 1);
  assert.equal(normalizarConfiguracionTrenFiguras({ dificultad: 99 }).dificultad, 4);

  const configuracion = normalizarConfiguracionTrenFiguras({});
  assert.equal(configuracion.slug, SLUG_TREN_FIGURAS);
  assert.equal(configuracion.nivelesPorPartida, 4);
  assert.equal(configuracion.vagonesPorNivel, 10);
});

test('generarPatronNivel crea patrones deterministas por dificultad', () => {
  const nivel1 = generarPatronNivel(1);
  const nivel2 = generarPatronNivel(2);
  const nivel3 = generarPatronNivel(3);
  const nivel4 = generarPatronNivel(4);

  assert.equal(nivel1.length, 10);
  assert.deepEqual([...new Set(nivel1.map((paso) => paso.figuraId))], ['circulo', 'cuadrado']);

  assert.deepEqual(
    [...new Set(nivel2.map((paso) => paso.figuraId))],
    ['circulo', 'cuadrado', 'triangulo'],
  );

  assert.equal(nivel3[0].clave, nivel3[1].clave);
  assert.equal(nivel3[2].clave, nivel3[3].clave);
  assert.notEqual(nivel3[0].clave, nivel3[2].clave);

  assert.equal(new Set(nivel4.slice(0, 7).map((paso) => paso.clave)).size, 7);
  assert.equal(new Set(nivel4.map((paso) => paso.figuraId)).size, 4);
  assert.equal(new Set(nivel4.map((paso) => paso.colorId)).size, 4);
});

test('calcularAdaptacionInterNivel ajusta dificultad y velocidad por precision', () => {
  assert.deepEqual(
    calcularAdaptacionInterNivel({ aciertos: 9, errores: 1, dificultadActual: 1 }),
    {
      precisionPct: 90,
      nuevaDificultad: 2,
      nuevaVelocidad: 1.25,
      patronNuevo: generarPatronNivel(2),
      descripcionNivel: 'Patron ABC con tres figuras y velocidad media',
      subioNivel: true,
      bajoNivel: false,
    },
  );

  const mantiene = calcularAdaptacionInterNivel({ aciertos: 7, errores: 3, dificultadActual: 2 });
  assert.equal(mantiene.precisionPct, 70);
  assert.equal(mantiene.nuevaDificultad, 2);
  assert.equal(mantiene.nuevaVelocidad, 1.19);

  const baja = calcularAdaptacionInterNivel({ aciertos: 4, errores: 6, dificultadActual: 3 });
  assert.equal(baja.precisionPct, 40);
  assert.equal(baja.nuevaDificultad, 2);
  assert.equal(baja.nuevaVelocidad, 1.13);

  const maximo = calcularAdaptacionInterNivel({ aciertos: 10, errores: 0, dificultadActual: 4 });
  assert.equal(maximo.nuevaDificultad, 4);

  const minimo = calcularAdaptacionInterNivel({ aciertos: 0, errores: 10, dificultadActual: 1 });
  assert.equal(minimo.nuevaDificultad, 1);
});

test('construirEventoTrenFiguras respeta el contrato de sesion', () => {
  const evento = construirEventoTrenFiguras({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    tiempoReaccionMs: 980,
    puntos: 10,
    comboEnEvento: 3,
    metadata: { vagonIndex: 2 },
  });

  assert.deepEqual(evento, {
    tipo_evento: 'acierto',
    habilidad: 'Lógica',
    tiempo_reaccion_ms: 980,
    puntos: 10,
    combo_en_evento: 3,
    metadata: { vagonIndex: 2 },
  });

  assert.throws(
    () =>
      construirEventoTrenFiguras({
        tipoEvento: 'figura_errada',
      }),
    /no soportado/i,
  );
});

test('construirResumenPartidaTren devuelve resultado-juego-v1 consistente', () => {
  const configuracion = normalizarConfiguracionTrenFiguras({
    dificultad: 2,
    fuenteAdaptacion: 'base',
    versionAdaptacion: 'v1',
  });
  const resultado = construirResumenPartidaTren({
    configuracion,
    aciertos: 8,
    errores: 2,
    comboMaximo: 4,
    nivelAlcanzado: 2,
    tiempoTotalMs: 12000,
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, 'tren-figuras');
  assert.equal(resultado.juego.habilidad, 'Lógica');
  assert.equal(resultado.estadisticas.puntaje, 74);
  assert.equal(resultado.estadisticas.precisionPct, 80);
  assert.equal(resultado.estadisticas.totalIntentos, 10);
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
});

test('calcularPuntaje nunca retorna valores negativos', () => {
  assert.equal(calcularPuntaje({ aciertos: 0, errores: 0 }), 0);
  assert.equal(calcularPuntaje({ aciertos: 0, errores: 10 }), 0);
  assert.equal(calcularPuntaje({ aciertos: 10, errores: 0 }), 100);
});
