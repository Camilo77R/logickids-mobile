const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarConfiguracionCaminoAr,
} = require('../../src/features/games/camino-ar/caminoArConfiguracion.js');
const {
  MODOS_PRESENTACION_CAMINO_AR,
} = require('../../src/features/games/camino-ar/caminoAr.constants.js');
const {
  TIPOS_EVENTO_SESION,
  crearEventoSesion,
  ESTADOS_FINALIZACION_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');
const {
  construirResumenPartida,
} = require('../../src/features/games/camino-ar/caminoArMotor.js');
const {
  construirEscenaCaminoAr,
} = require('../../src/features/games/camino-ar/caminoArEscena.js');
const {
  construirEscenaEspacialCaminoAr,
} = require('../../src/features/games/camino-ar/caminoArEscenaEspacial.js');

test('normalizarConfiguracionCaminoAr usa defaults seguros y valida modo de presentacion', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 0,
    modoPresentacion: 'modo-raro',
    configuracion: {
      cantidadBaldosas: -2,
      longitudPatron: 5,
    },
  });

  assert.equal(configuracion.dificultad, 1);
  assert.equal(
    configuracion.modoPresentacion,
    MODOS_PRESENTACION_CAMINO_AR.tablero2d,
  );
  assert.equal(configuracion.configuracion.cantidadBaldosas, 6);
  assert.equal(configuracion.configuracion.longitudPatron, 5);
});

test('crearEventoSesion rechaza tipos de evento no soportados por backend', () => {
  assert.throws(
    () =>
      crearEventoSesion({
        tipoEvento: 'pista_usada',
        habilidad: 'Memoria',
      }),
    /no soportado/i,
  );

  const eventoValido = crearEventoSesion({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    habilidad: 'Memoria',
    tiempoReaccionMs: 812,
    puntos: 10,
    comboEnEvento: 2,
  });

  assert.deepEqual(eventoValido, {
    tipo_evento: 'acierto',
    habilidad: 'Memoria',
    tiempo_reaccion_ms: 812,
    puntos: 10,
    combo_en_evento: 2,
  });
});

test('construirResumenPartida devuelve contrato comun con estadisticas consistentes', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 3,
    fuenteAdaptacion: 'base',
    versionAdaptacion: 'v1',
    configuracion: {
      cantidadBaldosas: 6,
      longitudPatron: 4,
      ayudasDisponibles: 1,
    },
  });

  const resultado = construirResumenPartida({
    exito: true,
    configuracion,
    aciertos: 4,
    errores: 1,
    ayudasUsadas: 1,
    tiempoTranscurridoMs: 9200,
    patron: [0, 2, 3, 1],
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, 'camino-ar');
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.estadisticas.puntaje, 35);
  assert.equal(resultado.estadisticas.totalIntentos, 5);
  assert.equal(resultado.estadisticas.precisionPct, 80);
  assert.equal(resultado.detalles.patronLongitud, 4);
  assert.equal(resultado.detalles.patronResuelto, true);
});

test('construirEscenaCaminoAr traduce el estado a una escena reusable para cualquier renderer', () => {
  const accionesInvocadas = [];
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 2,
    configuracion: {
      cantidadBaldosas: 4,
      longitudPatron: 3,
      tiempoLimiteMs: 15000,
      ayudasDisponibles: 1,
    },
  });

  const escena = construirEscenaCaminoAr({
    configuracion,
    estado: {
      fase: 'esperandoRespuesta',
      mensaje: 'Ahora repite el recorrido tocando cada baldosa en orden.',
      tiempoRestanteMs: 9100,
      ayudasRestantes: 1,
      aciertos: 2,
      errores: 0,
      baldosaActiva: 1,
      resultado: null,
    },
    columnasTablero: 2,
    persistenciaSesion: {
      modo: 'local',
      estado: 'inactiva',
      error: null,
    },
    iniciarPartida: () => accionesInvocadas.push('iniciar'),
    reiniciarPartida: () => accionesInvocadas.push('reiniciar'),
    seleccionarBaldosa: (indice) => accionesInvocadas.push(`baldosa:${indice}`),
    usarPista: () => accionesInvocadas.push('pista'),
    puedePedirPista: true,
  });

  assert.equal(escena.encabezado.titulo, 'Camino AR');
  assert.equal(escena.sesion.metricas[0].valor, 2);
  assert.equal(escena.estadoActual.metricas[0].valor, '10 s');
  assert.equal(escena.tablero.baldosas.length, 4);
  assert.equal(escena.tablero.baldosas[1].activa, true);
  assert.equal(escena.tablero.baldosas[0].varianteColumna, 'dos');
  assert.equal(escena.acciones.pista.deshabilitada, false);

  escena.acciones.iniciar.accion();
  escena.tablero.alSeleccionarBaldosa(3);
  escena.acciones.reiniciar.accion();

  assert.deepEqual(accionesInvocadas, ['iniciar', 'baldosa:3', 'reiniciar']);
});

test('construirEscenaEspacialCaminoAr deja listo un modelo AR agnostico al renderer', () => {
  const configuracion = normalizarConfiguracionCaminoAr({
    dificultad: 2,
    modoPresentacion: MODOS_PRESENTACION_CAMINO_AR.realidadAumentada,
    configuracion: {
      cantidadBaldosas: 4,
      longitudPatron: 3,
    },
  });

  const escena = construirEscenaCaminoAr({
    configuracion,
    estado: {
      fase: 'esperandoRespuesta',
      mensaje: 'Repite el recorrido tocando cada baldosa en orden.',
      tiempoRestanteMs: 8000,
      ayudasRestantes: 1,
      aciertos: 1,
      errores: 0,
      baldosaActiva: 2,
      resultado: null,
    },
    columnasTablero: 2,
    persistenciaSesion: {
      modo: 'local',
      estado: 'inactiva',
      error: null,
    },
    iniciarPartida: () => {},
    reiniciarPartida: () => {},
    seleccionarBaldosa: () => {},
    usarPista: () => {},
    puedePedirPista: true,
  });

  const escenaEspacial = construirEscenaEspacialCaminoAr({
    escena,
    configuracion,
  });

  assert.equal(escenaEspacial.plano.tipo, 'horizontal');
  assert.equal(escenaEspacial.baldosas.length, 4);
  assert.deepEqual(escenaEspacial.baldosas[0].posicion, [-0.14, 0, -0.14]);
  assert.deepEqual(escenaEspacial.baldosas[2].posicion, [-0.14, 0, 0.14]);
  assert.equal(escenaEspacial.baldosas[2].estadoVisual, 'activa');
  assert.equal(escenaEspacial.adaptacion.modoPresentacion, 'realidad-aumentada');
});
