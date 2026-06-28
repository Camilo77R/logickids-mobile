const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calcularAdaptacionInterNivel,
  generarPatronNivel,
  normalizarConfiguracionTren3D,
  resolverNivelesPorPartidaTren3D,
  resolverConfiguracionTren3DDesdeBackend,
} = require('../../src/features/games/tren-3d/tren3dConfiguracion.js');
const {
  calcularPuntaje,
  construirEventoTren3D,
  construirResumenPartidaTren3D,
} = require('../../src/features/games/tren-3d/tren3dMotor.js');
const {
  SLUG_TREN_3D,
} = require('../../src/features/games/tren-3d/tren3d.constants.js');
const {
  generarHtmlMotorBabylon,
} = require('../../src/features/games/tren-3d/presentacion/tren3dMotorBabylon.js');
const {
  ESTADOS_FINALIZACION_SESION,
  TIPOS_EVENTO_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');

test('normalizarConfiguracionTren3D limita dificultad y conserva defaults seguros', () => {
  assert.equal(normalizarConfiguracionTren3D({ dificultad: 0 }).dificultad, 1);
  assert.equal(normalizarConfiguracionTren3D({ dificultad: -4 }).dificultad, 1);
  assert.equal(normalizarConfiguracionTren3D({ dificultad: 'abc' }).dificultad, 1);
  assert.equal(normalizarConfiguracionTren3D({ dificultad: 99 }).dificultad, 4);

  const configuracion = normalizarConfiguracionTren3D({});
  assert.equal(configuracion.slug, SLUG_TREN_3D);
  assert.equal(configuracion.nivelesPorPartida, 4);
  assert.equal(configuracion.vagonesPorNivel, 10);
});

test('resolverNivelesPorPartidaTren3D limita Tren a un tramo en ruta pedagogica', () => {
  assert.equal(
    resolverNivelesPorPartidaTren3D({
      nivelesPorPartida: 4,
      contextoSesion: { sesionModo: 'path' },
    }),
    1,
  );

  assert.equal(
    resolverNivelesPorPartidaTren3D({
      nivelesPorPartida: 3,
      contextoSesion: { sesionModo: 'single' },
    }),
    3,
  );
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

  assert.equal(nivel4.length, 12);
  assert.equal(new Set(nivel4.slice(0, 4).map((paso) => paso.clave)).size, 4);
  assert.equal(new Set(nivel4.map((paso) => paso.figuraId)).size, 4);
  assert.equal(new Set(nivel4.map((paso) => paso.colorId)).size, 4);
  assert.notDeepEqual(
    nivel4.slice(4, 8).map((paso) => paso.clave),
    nivel4.slice(0, 4).map((paso) => paso.clave),
  );
});

test('calcularAdaptacionInterNivel ajusta dificultad y velocidad por precision', () => {
  assert.deepEqual(
    calcularAdaptacionInterNivel({ aciertos: 9, errores: 1, dificultadActual: 1 }),
    {
      precisionPct: 90,
      nuevaDificultad: 2,
      nuevaVelocidad: 0.85,
      vueltasMaximas: 5,
      vagonesPorNivel: 10,
      maxOpcionesFiguras: 4,
      opacidadFiguraGuia: 0.86,
      patronNuevo: generarPatronNivel(2),
      descripcionNivel: 'Patron ABC con tres figuras y velocidad tranquila',
      subioNivel: true,
      bajoNivel: false,
      misionCompletada: true,
    },
  );

  const mantiene = calcularAdaptacionInterNivel({ aciertos: 7, errores: 3, dificultadActual: 2 });
  assert.equal(mantiene.precisionPct, 70);
  assert.equal(mantiene.nuevaDificultad, 2);
  assert.equal(mantiene.nuevaVelocidad, 0.81);

  const baja = calcularAdaptacionInterNivel({ aciertos: 4, errores: 6, dificultadActual: 3 });
  assert.equal(baja.precisionPct, 40);
  assert.equal(baja.nuevaDificultad, 2);
  assert.equal(baja.nuevaVelocidad, 0.77);

  const maximo = calcularAdaptacionInterNivel({ aciertos: 10, errores: 0, dificultadActual: 4 });
  assert.equal(maximo.nuevaDificultad, 4);
  assert.equal(maximo.nuevaVelocidad, 1.18);
  assert.equal(maximo.vagonesPorNivel, 12);

  const minimo = calcularAdaptacionInterNivel({ aciertos: 0, errores: 10, dificultadActual: 1 });
  assert.equal(minimo.nuevaDificultad, 1);

  const sinVueltas = calcularAdaptacionInterNivel({
    aciertos: 9,
    errores: 1,
    dificultadActual: 3,
    misionCompletada: false,
  });
  assert.equal(sinVueltas.nuevaDificultad, 2);
  assert.equal(sinVueltas.vueltasMaximas, 5);
});

test('resolverConfiguracionTren3DDesdeBackend aplica velocidad y vueltas oficiales', () => {
  const configuracion = resolverConfiguracionTren3DDesdeBackend({
    configuracionLocal: normalizarConfiguracionTren3D({ dificultad: 1 }),
    respuestaInicioSesion: {
      sesion: { dificultad: 3 },
      game_config: {
        dificultad: 3,
        velocidad_tren: 0.95,
        vueltas_maximas: 4,
        longitud_secuencia: 4,
        usa_colores: true,
        pares_consecutivos: true,
        opacidad_figura_guia: 0.86,
        adaptacion: { fuente: 'reglas' },
      },
    },
  });

  assert.equal(configuracion.dificultad, 3);
  assert.equal(configuracion.fuenteAdaptacion, 'reglas');
  assert.equal(configuracion.parametrosNivel.velocidadTren, 0.95);
  assert.equal(configuracion.parametrosNivel.vueltasMaximas, 4);
  assert.equal(configuracion.parametrosNivel.maxOpcionesFiguras, 4);
  assert.equal(configuracion.parametrosNivel.paresConsecutivos, true);
});

test('construirEventoTren3D respeta el contrato de sesion', () => {
  const evento = construirEventoTren3D({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    tiempoReaccionMs: 980,
    puntos: 10,
    comboEnEvento: 3,
    metadata: { vagonIndex: 2 },
  });

  assert.deepEqual(evento, {
    tipo_evento: 'acierto',
    habilidad: 'Patrones',
    tiempo_reaccion_ms: 980,
    puntos: 10,
    combo_en_evento: 3,
    metadata: { vagonIndex: 2 },
  });

  assert.throws(
    () =>
      construirEventoTren3D({
        tipoEvento: 'figura_errada',
      }),
    /no soportado/i,
  );
});

test('construirResumenPartidaTren3D devuelve resultado-juego-v1 consistente', () => {
  const configuracion = normalizarConfiguracionTren3D({
    dificultad: 2,
    fuenteAdaptacion: 'base',
    versionAdaptacion: 'v1',
  });
  const resultado = construirResumenPartidaTren3D({
    configuracion,
    aciertos: 8,
    errores: 2,
    comboMaximo: 4,
    nivelAlcanzado: 2,
    tiempoTotalMs: 12000,
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, SLUG_TREN_3D);
  assert.equal(resultado.juego.habilidad, 'Patrones');
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

test('motor Babylon V2 expone selector nativo y movimiento continuo del tren', () => {
  const html = generarHtmlMotorBabylon({
    dificultad: 1,
    velocidadTren: 1,
    vueltasMaximas: 3,
    opacidadFiguraGuia: 0.86,
    patron: generarPatronNivel(1),
  });

  assert.match(html, /window\.establecerSeleccion/);
  assert.match(html, /grupoTren/);
  assert.match(html, /estadoTren === 'jugando'/);
  assert.doesNotMatch(html, /data:image/);
  assert.match(html, /inicioRecorridoX/);
  assert.match(html, /finRecorridoX/);
  assert.match(html, /resolverJugada\(picked\.metadata\.indice\)/);
  assert.match(html, /function reportarNivelCompletado/);
  assert.match(html, /function reportarNivelFallido/);
  assert.match(html, /vueltasRestantes/);
  assert.match(html, /estado\.opacidadFiguraGuia/);
  assert.match(html, /engine\.getDeltaTime\(\)/);
  assert.match(html, /1\.68 \* estado\.velocidadTren \* deltaSegundos/);
  assert.match(html, /nivelCompletado: nivelCompletado/);
  assert.match(html, /estado\.nivelReportado = true/);
  assert.match(html, /esperado\.metadata = \{ tipo: 'vagon', decoracion: true/);
  assert.match(html, /ruedaA\.metadata = \{ tipo: 'vagon'/);
  assert.doesNotMatch(html, /function crearOpciones/);
  assert.doesNotMatch(html, /PointerDragBehavior/);
  assert.doesNotMatch(html, /direccionMovimiento/);
});

