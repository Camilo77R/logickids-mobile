const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clampDificultadMercadoAr,
  normalizarConfiguracionMercadoAr,
  resolverConfiguracionMercadoArDesdeBackend,
} = require('../../src/features/games/mercado-ar/mercadoArConfiguracion.js');
const {
  HABILIDAD_MERCADO_AR,
  MODOS_OBJETIVO_MERCADO_AR,
  SLUG_MERCADO_AR,
} = require('../../src/features/games/mercado-ar/mercadoAr.constants.js');
const {
  calcularPuntajeMercadoAr,
  construirEventoMercadoAr,
  construirResumenPartidaMercadoAr,
  evaluarSeleccionMercado,
  generarOfertaMercado,
  generarRondaMercado,
} = require('../../src/features/games/mercado-ar/mercadoArMotor.js');
const {
  ESTADOS_FINALIZACION_SESION,
  TIPOS_EVENTO_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');

test('normalizarConfiguracionMercadoAr conserva defaults seguros y limita dificultad', () => {
  assert.equal(clampDificultadMercadoAr(0), 1);
  assert.equal(clampDificultadMercadoAr(99), 4);

  const configuracion = normalizarConfiguracionMercadoAr({
    dificultad: 7,
    configuracion: {
      precioMin: 5,
      precioMax: 2,
      categoriasPermitidas: ['frutas', 'fantasia'],
    },
  });

  assert.equal(configuracion.slug, SLUG_MERCADO_AR);
  assert.equal(configuracion.dificultad, 4);
  assert.equal(configuracion.configuracion.precioMin, 5);
  assert.equal(configuracion.configuracion.precioMax, 5);
  assert.deepEqual(configuracion.configuracion.categoriasPermitidas, ['frutas']);
});

test('resolverConfiguracionMercadoArDesdeBackend adapta game_config al formato local', () => {
  const configuracion = resolverConfiguracionMercadoArDesdeBackend({
    respuestaInicioSesion: {
      sesion: { dificultad: 3 },
      game_config: {
        rondas_por_partida: 4,
        presupuesto_monedas: 12,
        cantidad_productos_visibles: 5,
        cantidad_objetivos: 3,
        precio_min: 2,
        precio_max: 7,
        categorias_permitidas: ['verduras', 'lacteos'],
        modo_objetivo: MODOS_OBJETIVO_MERCADO_AR.categoriaObjetivo,
        ayudas_disponibles: 2,
      },
    },
  });

  assert.equal(configuracion.dificultad, 3);
  assert.equal(configuracion.rondasPorPartida, 4);
  assert.equal(configuracion.configuracion.presupuestoMonedas, 12);
  assert.deepEqual(configuracion.configuracion.categoriasPermitidas, ['verduras', 'lacteos']);
});

test('generarOfertaMercado y generarRondaMercado producen estructuras deterministas', () => {
  const configuracion = normalizarConfiguracionMercadoAr({
    configuracion: {
      categoriasPermitidas: ['frutas', 'verduras'],
      cantidadProductosVisibles: 4,
      precioMin: 1,
      precioMax: 4,
      cantidadObjetivos: 2,
    },
  });

  const oferta = generarOfertaMercado({ configuracion, indiceRonda: 1 });
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 1 });

  assert.equal(oferta.length, 4);
  assert.deepEqual(
    oferta.map((producto) => producto.id),
    ['banano', 'pera', 'zanahoria', 'tomate'],
  );
  assert.deepEqual(
    oferta.map((producto) => producto.precio),
    [2, 3, 4, 1],
  );
  assert.equal(ronda.objetivo.cantidadObjetivos, 2);
  assert.match(ronda.objetivo.textoGuia, /Compra 2 productos/i);
});

test('evaluarSeleccionMercado valida cantidad, categoria y presupuesto', () => {
  const configuracion = normalizarConfiguracionMercadoAr({
    configuracion: {
      presupuestoMonedas: 6,
      cantidadProductosVisibles: 4,
      cantidadObjetivos: 2,
      categoriasPermitidas: ['frutas', 'verduras'],
      precioMin: 1,
      precioMax: 4,
      modoObjetivo: MODOS_OBJETIVO_MERCADO_AR.presupuestoMaximo,
    },
  });

  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const exito = evaluarSeleccionMercado({
    ronda,
    productosSeleccionadosIds: [ronda.oferta[0].id, ronda.oferta[1].id],
  });
  const error = evaluarSeleccionMercado({
    ronda,
    productosSeleccionadosIds: [ronda.oferta[0].id],
  });

  assert.equal(exito.exito, true);
  assert.equal(exito.motivoError, null);
  assert.equal(error.exito, false);
  assert.equal(error.motivoError, 'cantidad_incorrecta');
});

test('evaluarSeleccionMercado valida presupuesto exacto y categoria objetivo', () => {
  const configuracionExacta = normalizarConfiguracionMercadoAr({
    configuracion: {
      presupuestoMonedas: 5,
      cantidadProductosVisibles: 4,
      cantidadObjetivos: 2,
      categoriasPermitidas: ['frutas'],
      precioMin: 2,
      precioMax: 3,
      modoObjetivo: MODOS_OBJETIVO_MERCADO_AR.presupuestoExacto,
    },
  });
  const rondaExacta = generarRondaMercado({ configuracion: configuracionExacta, indiceRonda: 0 });
  const validacionExacta = evaluarSeleccionMercado({
    ronda: rondaExacta,
    productosSeleccionadosIds: [rondaExacta.oferta[0].id, rondaExacta.oferta[1].id],
  });

  assert.equal(validacionExacta.exito, true);

  const configuracionCategoria = normalizarConfiguracionMercadoAr({
    configuracion: {
      presupuestoMonedas: 9,
      cantidadProductosVisibles: 4,
      cantidadObjetivos: 2,
      categoriasPermitidas: ['frutas', 'verduras'],
      precioMin: 1,
      precioMax: 4,
      modoObjetivo: MODOS_OBJETIVO_MERCADO_AR.categoriaObjetivo,
    },
  });
  const rondaCategoria = generarRondaMercado({ configuracion: configuracionCategoria, indiceRonda: 1 });
  const categoriaIncorrecta = evaluarSeleccionMercado({
    ronda: rondaCategoria,
    productosSeleccionadosIds: [rondaCategoria.oferta[0].id, rondaCategoria.oferta[2].id],
  });

  assert.equal(categoriaIncorrecta.exito, false);
  assert.equal(categoriaIncorrecta.motivoError, 'categoria_incorrecta');
});

test('construirEventoMercadoAr respeta el contrato de sesion compartido', () => {
  const evento = construirEventoMercadoAr({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    tiempoReaccionMs: 1200,
    puntos: 10,
    comboEnEvento: 2,
    metadata: { ronda: 1, productoId: 'manzana' },
  });

  assert.deepEqual(evento, {
    tipo_evento: 'acierto',
    habilidad: HABILIDAD_MERCADO_AR,
    tiempo_reaccion_ms: 1200,
    puntos: 10,
    combo_en_evento: 2,
    metadata: { ronda: 1, productoId: 'manzana' },
  });
});

test('construirResumenPartidaMercadoAr devuelve resultado-juego-v1 consistente', () => {
  const configuracion = normalizarConfiguracionMercadoAr({
    dificultad: 2,
    rondasPorPartida: 3,
  });
  const resultado = construirResumenPartidaMercadoAr({
    configuracion,
    aciertos: 5,
    errores: 1,
    comboMaximo: 3,
    rondasCompletadas: 3,
    tiempoTotalMs: 18000,
    ayudasUsadas: 1,
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, SLUG_MERCADO_AR);
  assert.equal(resultado.juego.habilidad, HABILIDAD_MERCADO_AR);
  assert.equal(resultado.estadisticas.puntaje, 54);
  assert.equal(resultado.estadisticas.precisionPct, 83.33);
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.detalles.rondasCompletadas, 3);
});

test('calcularPuntajeMercadoAr nunca retorna negativo', () => {
  assert.equal(calcularPuntajeMercadoAr({ aciertos: 0, errores: 10, ayudasUsadas: 5 }), 0);
});

test('la identidad base del juego queda alineada con el catalogo real del backend', () => {
  const configuracion = normalizarConfiguracionMercadoAr({});

  assert.equal(configuracion.slug, 'mercado-inteligente');
  assert.equal(configuracion.titulo, 'Mercado Inteligente');
});
