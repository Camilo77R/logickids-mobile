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
