const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clampDificultadMercado,
  normalizarConfiguracionMercado,
  resolverConfiguracionMercadoDesdeBackend,
} = require('../../src/features/games/mercado-inteligente/mercadoConfiguracion.js');
const {
  HABILIDAD_MERCADO,
  MODOS_OBJETIVO_MERCADO,
  SLUG_MERCADO,
} = require('../../src/features/games/mercado-inteligente/mercado.constants.js');
const {
  calcularPuntajeMercado,
  construirEventoMercado,
  construirResumenPartidaMercado,
  evaluarSeleccionMercado,
  generarOfertaMercado,
  generarRondaMercado,
} = require('../../src/features/games/mercado-inteligente/mercadoMotor.js');
const {
  ESTADOS_FINALIZACION_SESION,
  TIPOS_EVENTO_SESION,
} = require('../../src/features/games/core/contratoSesionJuego.js');

test('normalizarConfiguracionMercado conserva defaults seguros y limita dificultad', () => {
  assert.equal(clampDificultadMercado(0), 1);
  assert.equal(clampDificultadMercado(99), 4);

  const configuracion = normalizarConfiguracionMercado({
    dificultad: 7,
    configuracion: {
      precioMin: 5,
      precioMax: 2,
      categoriasPermitidas: ['frutas', 'fantasia'],
    },
  });

  assert.equal(configuracion.slug, SLUG_MERCADO);
  assert.equal(configuracion.dificultad, 4);
  assert.equal(configuracion.configuracion.precioMin, 5);
  assert.equal(configuracion.configuracion.precioMax, 5);
  assert.deepEqual(configuracion.configuracion.categoriasPermitidas, ['frutas']);
});

test('resolverConfiguracionMercadoDesdeBackend adapta game_config al formato local', () => {
  const configuracion = resolverConfiguracionMercadoDesdeBackend({
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
        modo_objetivo: MODOS_OBJETIVO_MERCADO.categoriaObjetivo,
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
  const configuracion = normalizarConfiguracionMercado({
    configuracion: {
      categoriasPermitidas: ['frutas', 'verduras'],
      cantidadProductosVisibles: 4,
      precioMin: 1,
      precioMax: 4,
      cantidadObjetivos: 2,
    },
  });

  const oferta = generarOfertaMercado({ configuracion, indiceRonda: 1 });
  const ofertaSiguienteNivel = generarOfertaMercado({ configuracion, indiceRonda: 2 });
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 1 });

  assert.equal(oferta.length, 4);
  assert.notDeepEqual(
    oferta.map((producto) => producto.id),
    ofertaSiguienteNivel.map((producto) => producto.id),
  );
  assert.deepEqual(oferta.map((producto) => producto.id), [
    'tomate',
    'banano',
    'lechuga',
    'pera',
  ]);
  assert.deepEqual(oferta.map((producto) => producto.categoria), [
    'verduras',
    'frutas',
    'verduras',
    'frutas',
  ]);
  assert.deepEqual(oferta.map((producto) => producto.precio), [4, 2, 4, 2]);
  assert.equal(ronda.objetivo.cantidadObjetivos, 2);
  assert.match(ronda.objetivo.textoGuia, /Elige 2 productos/i);
});

test('generarRondaMercado garantiza objetivos de categoria alcanzables', () => {
  const configuracion = normalizarConfiguracionMercado({
    configuracion: {
      presupuestoMonedas: 9,
      cantidadProductosVisibles: 6,
      cantidadObjetivos: 3,
      categoriasPermitidas: ['frutas', 'verduras', 'lacteos', 'panaderia'],
      precioMin: 2,
      precioMax: 6,
      modoObjetivo: MODOS_OBJETIVO_MERCADO.categoriaObjetivo,
    },
  });

  const ronda = generarRondaMercado({ configuracion, indiceRonda: 3 });
  const productosCategoria = ronda.oferta.filter(
    (producto) => producto.categoria === ronda.objetivo.categoriaObjetivo,
  );
  const seleccion = productosCategoria.slice(0, ronda.objetivo.cantidadObjetivos);
  const evaluacion = evaluarSeleccionMercado({
    ronda,
    productosSeleccionadosIds: seleccion.map(({ id }) => id),
  });

  assert.equal(ronda.objetivo.categoriaObjetivo, 'panaderia');
  assert.equal(productosCategoria.length >= ronda.objetivo.cantidadObjetivos, true);
  assert.equal(evaluacion.exito, true);
});

test('evaluarSeleccionMercado valida cantidad, categoria y presupuesto', () => {
  const configuracion = normalizarConfiguracionMercado({
    configuracion: {
      presupuestoMonedas: 6,
      cantidadProductosVisibles: 4,
      cantidadObjetivos: 2,
      categoriasPermitidas: ['frutas', 'verduras'],
      precioMin: 1,
      precioMax: 4,
      modoObjetivo: MODOS_OBJETIVO_MERCADO.presupuestoMaximo,
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
  const errorPorExceso = evaluarSeleccionMercado({
    ronda,
    productosSeleccionadosIds: [
      ronda.oferta[0].id,
      ronda.oferta[1].id,
      ronda.oferta[2].id,
    ],
  });

  assert.equal(exito.exito, true);
  assert.equal(exito.motivoError, null);
  assert.equal(error.exito, false);
  assert.equal(error.motivoError, 'cantidad_incorrecta');
  assert.equal(errorPorExceso.exito, false);
  assert.equal(errorPorExceso.motivoError, 'cantidad_incorrecta');
});

test('evaluarSeleccionMercado prioriza presupuesto excedido y nunca muestra monedas negativas', () => {
  const configuracion = normalizarConfiguracionMercado({
    configuracion: {
      presupuestoMonedas: 5,
      cantidadProductosVisibles: 4,
      cantidadObjetivos: 2,
      categoriasPermitidas: ['frutas', 'verduras'],
      precioMin: 4,
      precioMax: 4,
      modoObjetivo: MODOS_OBJETIVO_MERCADO.presupuestoMaximo,
    },
  });
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const evaluacion = evaluarSeleccionMercado({
    ronda,
    productosSeleccionadosIds: [
      ronda.oferta[0].id,
      ronda.oferta[1].id,
      ronda.oferta[2].id,
    ],
  });

  assert.equal(evaluacion.exito, false);
  assert.equal(evaluacion.motivoError, 'presupuesto_excedido');
  assert.equal(evaluacion.presupuestoRestante, 0);
  assert.equal(evaluacion.excesoPresupuesto, 7);
});

test('generarRondaMercado garantiza presupuesto exacto alcanzable', () => {
  const configuracion = normalizarConfiguracionMercado({
    configuracion: {
      presupuestoMonedas: 14,
      cantidadProductosVisibles: 6,
      cantidadObjetivos: 3,
      categoriasPermitidas: ['frutas', 'verduras', 'lacteos', 'panaderia'],
      precioMin: 2,
      precioMax: 6,
      modoObjetivo: MODOS_OBJETIVO_MERCADO.presupuestoExacto,
    },
  });

  const ronda = generarRondaMercado({ configuracion, indiceRonda: 2 });
  const solucionGarantizada = ronda.oferta.slice(0, ronda.objetivo.cantidadObjetivos);
  const totalSolucion = solucionGarantizada.reduce(
    (acumulado, producto) => acumulado + producto.precio,
    0,
  );
  const evaluacion = evaluarSeleccionMercado({
    ronda,
    productosSeleccionadosIds: solucionGarantizada.map(({ id }) => id),
  });

  assert.equal(ronda.objetivo.presupuestoObjetivo, totalSolucion);
  assert.match(ronda.objetivo.textoGuia, new RegExp(`exactamente ${totalSolucion} monedas`, 'i'));
  assert.equal(evaluacion.exito, true);
});

test('evaluarSeleccionMercado valida presupuesto exacto y categoria objetivo', () => {
  const configuracionExacta = normalizarConfiguracionMercado({
    configuracion: {
      presupuestoMonedas: 5,
      cantidadProductosVisibles: 4,
      cantidadObjetivos: 2,
      categoriasPermitidas: ['frutas'],
      precioMin: 2,
      precioMax: 3,
      modoObjetivo: MODOS_OBJETIVO_MERCADO.presupuestoExacto,
    },
  });
  const rondaExacta = generarRondaMercado({ configuracion: configuracionExacta, indiceRonda: 0 });
  const validacionExacta = evaluarSeleccionMercado({
    ronda: rondaExacta,
    productosSeleccionadosIds: [rondaExacta.oferta[0].id, rondaExacta.oferta[1].id],
  });

  assert.equal(validacionExacta.exito, true);

  const configuracionCategoria = normalizarConfiguracionMercado({
    configuracion: {
      presupuestoMonedas: 9,
      cantidadProductosVisibles: 4,
      cantidadObjetivos: 2,
      categoriasPermitidas: ['frutas', 'verduras'],
      precioMin: 1,
      precioMax: 4,
      modoObjetivo: MODOS_OBJETIVO_MERCADO.categoriaObjetivo,
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

test('construirEventoMercado respeta el contrato de sesion compartido', () => {
  const evento = construirEventoMercado({
    tipoEvento: TIPOS_EVENTO_SESION.acierto,
    tiempoReaccionMs: 1200,
    puntos: 10,
    comboEnEvento: 2,
    metadata: { ronda: 1, productoId: 'manzana' },
  });

  assert.deepEqual(evento, {
    tipo_evento: 'acierto',
    habilidad: HABILIDAD_MERCADO,
    tiempo_reaccion_ms: 1200,
    puntos: 10,
    combo_en_evento: 2,
    metadata: { ronda: 1, productoId: 'manzana' },
  });
});

test('construirResumenPartidaMercado devuelve resultado-juego-v1 consistente', () => {
  const configuracion = normalizarConfiguracionMercado({
    dificultad: 2,
    rondasPorPartida: 3,
  });
  const resultado = construirResumenPartidaMercado({
    configuracion,
    aciertos: 5,
    errores: 1,
    comboMaximo: 3,
    rondasCompletadas: 3,
    tiempoTotalMs: 18000,
    ayudasUsadas: 1,
  });

  assert.equal(resultado.contrato, 'resultado-juego-v1');
  assert.equal(resultado.juego.slug, SLUG_MERCADO);
  assert.equal(resultado.juego.habilidad, HABILIDAD_MERCADO);
  assert.equal(resultado.estadisticas.puntaje, 54);
  assert.equal(resultado.estadisticas.precisionPct, 83.33);
  assert.equal(resultado.finalizacionSesion.estado, ESTADOS_FINALIZACION_SESION.completado);
  assert.equal(resultado.detalles.rondasCompletadas, 3);
});

test('calcularPuntajeMercado nunca retorna negativo', () => {
  assert.equal(calcularPuntajeMercado({ aciertos: 0, errores: 10, ayudasUsadas: 5 }), 0);
});

test('la identidad base del juego queda alineada con el catalogo real del backend', () => {
  const configuracion = normalizarConfiguracionMercado({});

  assert.equal(configuracion.slug, 'mercado-inteligente');
  assert.equal(configuracion.titulo, 'Mercado Inteligente');
});
