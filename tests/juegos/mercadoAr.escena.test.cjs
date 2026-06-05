const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarConfiguracionMercadoAr,
} = require('../../src/features/games/mercado-ar/mercadoArConfiguracion.js');
const {
  construirEscenaEspacialMercado,
} = require('../../src/features/games/mercado-ar/mercadoArEscenaEspacial.js');
const {
  generarRondaMercado,
} = require('../../src/features/games/mercado-ar/mercadoArMotor.js');

test('construirEscenaEspacialMercado prepara un puesto coherente para AR o preview', () => {
  const configuracion = normalizarConfiguracionMercadoAr({
    configuracion: {
      cantidadProductosVisibles: 5,
      categoriasPermitidas: ['frutas', 'verduras', 'lacteos'],
    },
  });
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const escena = construirEscenaEspacialMercado({
    ronda,
    seleccionadosIds: [ronda.oferta[1].id],
    objetivoTexto: ronda.objetivo.textoGuia,
  });

  assert.equal(escena.puesto.titulo, 'Mercado Inteligente');
  assert.equal(escena.productos.length, 5);
  assert.equal(escena.productos[1].seleccionado, true);
  assert.deepEqual(escena.productos[0].posicion, [-0.22, 0.06, 0]);
  assert.equal(escena.canasta.seleccionados, 1);
});
