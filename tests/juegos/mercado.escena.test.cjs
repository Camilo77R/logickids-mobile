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
  generarHtmlMercado3D,
} = require('../../src/features/games/mercado-inteligente/presentacion/mercado3dMotorBabylon.js');

test('generarHtmlMercado3D crea una escena Babylon con bridge explicito', () => {
  const configuracion = normalizarConfiguracionMercado({
    configuracion: {
      cantidadProductosVisibles: 3,
      categoriasPermitidas: ['frutas', 'verduras', 'panaderia'],
    },
  });
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const html = generarHtmlMercado3D({
    ronda,
    assetsPorProducto: {
      [ronda.oferta[0].id]: 'file:///producto.glb',
    },
    assetsDecoracion: {
      canasta: 'file:///canasta.glb',
      carrito: 'file:///carrito.glb',
      caja: 'file:///caja.glb',
    },
  });

  assert.match(html, /cdn\.babylonjs\.com\/babylon\.js/);
  assert.match(html, /babylonjs\.loaders\.min\.js/);
  assert.match(html, /new BABYLON\.ArcRotateCamera/);
  assert.match(html, /BABYLON\.SceneLoader\.ImportMesh/);
  assert.match(html, /SCENE_READY/);
  assert.match(html, /PRODUCT_TOGGLED/);
  assert.match(html, /SET_CART/);
  assert.match(html, /SHOW_RESULT/);
  assert.match(html, /carrito-deco/);
  assert.match(html, /caja-deco/);
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
