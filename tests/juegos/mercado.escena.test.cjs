const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarConfiguracionMercado,
} = require('../../src/features/games/mercado-inteligente/mercadoConfiguracion.js');
const {
  construirResumenPartidaMercado,
  generarRondaMercado,
} = require('../../src/features/games/mercado-inteligente/mercadoMotor.js');
const {
  crearModeloVisualNivelMercado,
} = require('../../src/features/games/mercado-inteligente/aplicacion/mercadoPremiumPresentacion.js');
const {
  generarDocumentoMercadoPremium,
} = require('../../src/features/games/mercado-inteligente/presentacion/premium/mercadoPremiumDocumento.js');
const {
  crearEstadoUiMercadoPremium,
} = require('../../src/features/games/mercado-inteligente/presentacion/premium/mercadoPremiumEstadoUi.js');
const {
  ACCIONES_INTERFAZ_MERCADO,
  crearEstilosMercado,
} = require('../../src/features/games/mercado-inteligente/presentacion/premium/interfaz/crearInterfazMercado.js');

test('generarDocumentoMercadoPremium crea la Pantalla 1 premium con UI y bridge explicitos', () => {
  const configuracion = normalizarConfiguracionMercado({
    configuracion: {
      cantidadProductosVisibles: 3,
      categoriasPermitidas: ['frutas', 'verduras', 'panaderia'],
    },
  });
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const modeloVisual = crearModeloVisualNivelMercado({
    ronda,
    nivel: 1,
    totalNiveles: 3,
    seleccionadosIds: [],
    mensaje: ronda.objetivo.textoGuia,
    estrellas: 0,
    combo: 0,
  });
  const estadoUi = crearEstadoUiMercadoPremium({
    modeloVisual,
    nombreJugador: 'Estudiante',
  });
  const html = generarDocumentoMercadoPremium({
    modeloVisual,
    estadoUi,
    assets: {
      productos: {
        [ronda.oferta[0].id]: ['file:///producto.glb'],
      },
      escena: {
        escenario: ['file:///escenario-mercado-premium.png'],
      },
    },
  });

  assert.doesNotMatch(html, /cdn\.babylonjs\.com/);
  assert.doesNotMatch(html, /BABYLON/);
  assert.match(html, /escenario-mercado-premium\.png/);
  assert.match(html, /MERCADO_READY/);
  assert.match(html, /PRODUCT_TOGGLED/);
  assert.match(html, /UPDATE_GAME_STATE/);
  assert.match(html, /PURCHASE_REQUESTED/);
  assert.match(html, /HINT_REQUESTED/);
  assert.match(html, /mercado-mision/);
  assert.match(html, /mercado-mochila/);
  assert.match(html, /mercado-escaparate/);
  assert.match(html, new RegExp(ronda.oferta[0].nombre));
});

test('generarDocumentoMercadoPremium crea la Pantalla 2 con el resultado real del nivel', () => {
  const configuracion = normalizarConfiguracionMercado();
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const modeloVisual = crearModeloVisualNivelMercado({
    ronda,
    nivel: 1,
    totalNiveles: 2,
    seleccionadosIds: ronda.oferta.slice(0, 2).map(({ id }) => id),
    mensaje: 'Compra completada.',
    estrellas: 2,
    combo: 1,
    aciertos: 1,
    errores: 1,
  });
  const resultado = construirResumenPartidaMercado({
    configuracion,
    aciertos: 1,
    errores: 1,
    comboMaximo: 1,
    rondasCompletadas: 1,
    tiempoTotalMs: 1250,
  });
  const estadoUi = crearEstadoUiMercadoPremium({
    modeloVisual,
    nombreJugador: 'Santiago',
    completado: true,
    tieneSiguienteNivel: true,
    resultado,
  });
  const html = generarDocumentoMercadoPremium({
    estadoUi,
    assets: {
      productos: {},
      escena: {
        escenario: ['file:///escenario-mercado-premium.png'],
      },
    },
  });

  assert.equal(estadoUi.screen, 'result');
  assert.equal(estadoUi.result.stats.correctProducts, 2);
  assert.equal(estadoUi.result.stats.successfulPurchases, 1);
  assert.equal(estadoUi.result.stats.errors, 1);
  assert.equal(estadoUi.result.stars, 2);
  assert.match(html, /Misión de nivel completada/i);
  assert.match(html, /Siguiente nivel/i);
  assert.match(html, /Aciertos/i);
  assert.match(html, /Intentos fallidos/i);
  assert.equal(ACCIONES_INTERFAZ_MERCADO.CONTINUE, 'continue');
  assert.match(html, /data-mercado-action="continue"/);
  assert.doesNotMatch(html, /data-mercado-action="buy"/);
  assert.match(html, /mercado-resultado-babylon/);
  assert.match(html, /cdn\.babylonjs\.com\/babylon\.js/);
});

test('Pantalla 2 protege layout y safe-area en 640x360 y 667x375', () => {
  const estilos = crearEstilosMercado();

  assert.match(estilos, /@media\(max-width:700px\) and \(max-height:430px\)/);
  assert.match(
    estilos,
    /grid-template-columns:minmax\(108px,24%\) minmax\(0,1fr\) minmax\(112px,25%\)/,
  );
  assert.match(estilos, /grid-template-rows:48px minmax\(0,1fr\) 56px/);
  assert.match(
    estilos,
    /padding:max\(4px,env\(safe-area-inset-top\)\) max\(4px,env\(safe-area-inset-right\)\) max\(4px,env\(safe-area-inset-bottom\)\) max\(4px,env\(safe-area-inset-left\)\)/,
  );
  assert.match(
    estilos,
    /\.mercado-resultado__recompensa\{width:100%;max-height:100%;min-height:0/,
  );
});

test('Pantalla 2 no afirma guardado exitoso cuando la persistencia falla', () => {
  const configuracion = normalizarConfiguracionMercado();
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const modeloVisual = crearModeloVisualNivelMercado({
    ronda,
    nivel: 1,
    totalNiveles: 2,
    seleccionadosIds: ronda.oferta.slice(0, 2).map(({ id }) => id),
    mensaje: 'Compra completada.',
    estrellas: 2,
    combo: 1,
    aciertos: 1,
    errores: 0,
  });
  const estadoUi = crearEstadoUiMercadoPremium({
    modeloVisual,
    nombreJugador: 'Santiago',
    completado: true,
    tieneSiguienteNivel: true,
    errorSincronizacionResultado: 'Sin conexión.',
  });
  const html = generarDocumentoMercadoPremium({
    estadoUi,
    assets: { productos: {}, escena: {} },
  });

  assert.equal(estadoUi.result.primaryAction, 'retry-save');
  assert.equal(estadoUi.result.primaryDisabled, false);
  assert.match(html, /Reintentar guardado/i);
  assert.match(html, /No pudimos guardar todavía/i);
  assert.match(html, /data-mercado-action="retry-save"/);
  assert.doesNotMatch(html, /Tu progreso quedó guardado\./i);
});

test('Mercado 3D trata cada compra correcta como un nivel oficial del backend', () => {
  assert.equal(normalizarConfiguracionMercado().modoPresentacion, 'babylon-3d');
  assert.equal(normalizarConfiguracionMercado().rondasPorPartida, 1);

  const configuracion = normalizarConfiguracionMercado({
    dificultad: 3,
    rondasPorPartida: 99,
  });
  const resultado = construirResumenPartidaMercado({
    configuracion,
    aciertos: 1,
    errores: 0,
    comboMaximo: 1,
    rondasCompletadas: 1,
    tiempoTotalMs: 1250,
  });

  assert.equal(configuracion.rondasPorPartida, 99);
  assert.equal(resultado.detalles.rondasCompletadas, 1);
  assert.equal(resultado.estadisticas.nivelAlcanzado, 1);
});
