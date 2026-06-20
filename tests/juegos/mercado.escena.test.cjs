const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
  acumularNivelEnResumenMercado,
  crearResumenActividadMercado,
  resolverResultadoNivelParaResumenMercado,
} = require('../../src/features/games/mercado-inteligente/aplicacion/mercadoPremiumSesion.mapper.js');
const {
  ACCIONES_INTERFAZ_MERCADO,
  crearEstilosMercado,
} = require('../../src/features/games/mercado-inteligente/presentacion/premium/interfaz/crearInterfazMercado.js');
const {
  SESION_FINAL_ASSET_KIT,
} = require('../../src/features/games/mercado-inteligente/presentacion/premium/interfaz/crearAssetsSesionFinal.js');
test('Mercado conserva los fondos aprobados para juego y cierre de sesión', () => {
  const fondosPath = path.resolve(
    __dirname,
    '../../src/features/games/mercado-inteligente/presentacion/premium/mercadoPremiumFondos.js',
  );
  const webViewPath = path.resolve(
    __dirname,
    '../../src/features/games/mercado-inteligente/presentacion/premium/MercadoPremiumWebView.jsx',
  );
  const fondosSource = fs.readFileSync(fondosPath, 'utf8');
  const webViewSource = fs.readFileSync(webViewPath, 'utf8');

  assert.match(fondosSource, /escenario-mercado-premium\.png/);
  assert.match(fondosSource, /session-final-background-source\.png/);
  assert.match(webViewSource, /<ImageBackground/);
  assert.match(webViewSource, /FONDOS_MERCADO_PREMIUM\.sesionFinal/);
  assert.match(webViewSource, /backgroundColor: 'transparent'/);
});

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
    assets: { productos: {}, escena: {} },
  });

  assert.doesNotMatch(html, /cdn\.babylonjs\.com/);
  assert.doesNotMatch(html, /BABYLON/);
  assert.match(html, /html,body\{background:transparent!important\}/);
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

test('Pantalla 2 oculta la accion principal mientras guarda el resultado', () => {
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
    sincronizandoResultado: true,
  });
  const html = generarDocumentoMercadoPremium({
    estadoUi,
    assets: { productos: {}, escena: {} },
  });

  assert.equal(estadoUi.result.primaryVisible, false);
  assert.match(html, /Guardamos tu progreso en segundo plano/i);
  assert.doesNotMatch(html, /data-mercado-action="continue"/);
  assert.doesNotMatch(html, /Volver al tablero/i);
  assert.doesNotMatch(html, /¡Siguiente nivel!/i);
});

test('Pantalla 3 acumula resultados reales de los niveles completados', () => {
  const primerNivel = {
    estadisticas: {
      aciertos: 1,
      errores: 2,
      comboMaximo: 1,
      puntaje: 25,
    },
  };
  const segundoNivel = {
    estadisticas: {
      aciertos: 2,
      errores: 0,
      comboMaximo: 3,
      puntaje: 50,
    },
  };

  const despuesDelPrimerNivel = acumularNivelEnResumenMercado({
    resumen: crearResumenActividadMercado(),
    resultado: primerNivel,
    estrellas: 1,
  });
  const resumenFinal = acumularNivelEnResumenMercado({
    resumen: despuesDelPrimerNivel,
    resultado: segundoNivel,
    estrellas: 3,
  });

  assert.deepEqual(resumenFinal, {
    nivelesCompletados: 2,
    estrellasObtenidas: 4,
    aciertos: 3,
    errores: 2,
    comboMaximo: 3,
    puntaje: 75,
  });
});

test('Pantalla 3 prioriza el resumen oficial del backend sobre métricas locales', () => {
  const resultado = resolverResultadoNivelParaResumenMercado({
    resultadoLocal: {
      estadisticas: {
        aciertos: 99,
        errores: 99,
        comboMaximo: 99,
        puntaje: 999,
      },
    },
    respuestaFinalizacion: {
      resumen_oficial: {
        aciertos: 2,
        errores: 1,
        combo_maximo: 2,
        puntaje: 25,
        estrellas_obtenidas: 2,
      },
    },
  });

  assert.deepEqual(resultado, {
    estadisticas: {
      aciertos: 2,
      errores: 1,
      comboMaximo: 2,
      puntaje: 25,
    },
  });
});

test('generarDocumentoMercadoPremium crea la Pantalla 3 al finalizar la actividad', () => {
  const configuracion = normalizarConfiguracionMercado();
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 1 });
  const modeloVisual = crearModeloVisualNivelMercado({
    ronda,
    nivel: 2,
    totalNiveles: 2,
    seleccionadosIds: ronda.oferta.slice(0, 2).map(({ id }) => id),
    mensaje: 'Actividad completada.',
    estrellas: 3,
    combo: 2,
    aciertos: 1,
    errores: 0,
  });
  const estadoUi = crearEstadoUiMercadoPremium({
    modeloVisual,
    nombreJugador: 'Santiago',
    completado: true,
    tieneSiguienteNivel: false,
    resumenActividad: {
      nivelesCompletados: 2,
      estrellasObtenidas: 5,
      aciertos: 4,
      errores: 1,
      comboMaximo: 2,
      puntaje: 90,
    },
  });
  const html = generarDocumentoMercadoPremium({
    estadoUi,
    assets: { productos: {}, escena: {}, sesionFinal: {} },
  });

  assert.equal(estadoUi.screen, 'session-result');
  assert.equal(estadoUi.result, null);
  assert.equal(estadoUi.sessionResult.completedMissions, 2);
  assert.equal(estadoUi.sessionResult.earnedStars, 5);
  assert.equal(estadoUi.sessionResult.correctAnswers, 4);
  assert.equal(estadoUi.sessionResult.errors, 1);
  assert.equal(estadoUi.sessionResult.maxCombo, 2);
  assert.match(html, /Sesión de clase finalizada/i);
  assert.match(html, /2\/2/);
  assert.match(html, /5\/6/);
  assert.match(html, /Aciertos: 4/i);
  assert.match(html, /Fallos: 1/i);
  assert.match(html, /Combo máx: x2/i);
  assert.match(html, /Finalizar y volver al tablero/i);
  assert.match(html, /mercado-sesion-final__trofeo-svg/);
  assert.match(html, /mercado-sesion-final__avatar-svg/);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /alt="Sin datos"/);
  assert.match(html, /data-mercado-action="continue"/);
  assert.doesNotMatch(html, /data-mercado-action="history"/);
  assert.doesNotMatch(html, /Siguiente nivel/i);
});

test('Pantalla 3 permite volver al tablero aunque falle la sincronización', () => {
  const configuracion = normalizarConfiguracionMercado();
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const modeloVisual = crearModeloVisualNivelMercado({
    ronda,
    nivel: 1,
    totalNiveles: 1,
    seleccionadosIds: ronda.oferta.slice(0, 2).map(({ id }) => id),
    mensaje: 'Actividad completada.',
    estrellas: 2,
    combo: 1,
    aciertos: 1,
    errores: 0,
  });
  const estadoUi = crearEstadoUiMercadoPremium({
    modeloVisual,
    nombreJugador: 'Luna',
    completado: true,
    tieneSiguienteNivel: false,
    errorSincronizacionResultado: 'Sin conexión.',
    resumenActividad: {
      nivelesCompletados: 1,
      estrellasObtenidas: 2,
      aciertos: 1,
      errores: 0,
      comboMaximo: 1,
      puntaje: 20,
    },
  });
  const html = generarDocumentoMercadoPremium({
    estadoUi,
    assets: { productos: {}, escena: {} },
  });

  assert.equal(estadoUi.sessionResult.primaryAction, 'continue');
  assert.equal(estadoUi.sessionResult.primaryDisabled, false);
  assert.match(html, /Finalizar y volver al tablero/i);
  assert.match(html, /No pudimos guardar todavía/i);
  assert.match(html, /data-mercado-action="continue"/);
  assert.doesNotMatch(html, /data-mercado-action="retry-save"/);
});

test('Pantalla 3 oculta volver al tablero mientras guarda el cierre final', () => {
  const configuracion = normalizarConfiguracionMercado();
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const modeloVisual = crearModeloVisualNivelMercado({
    ronda,
    nivel: 1,
    totalNiveles: 1,
    seleccionadosIds: ronda.oferta.slice(0, 2).map(({ id }) => id),
    mensaje: 'Actividad completada.',
    estrellas: 2,
    combo: 1,
    aciertos: 1,
    errores: 0,
  });
  const estadoUi = crearEstadoUiMercadoPremium({
    modeloVisual,
    nombreJugador: 'Luna',
    completado: true,
    tieneSiguienteNivel: false,
    sincronizandoResultado: true,
    resumenActividad: {
      nivelesCompletados: 1,
      estrellasObtenidas: 2,
      aciertos: 1,
      errores: 0,
      comboMaximo: 1,
      puntaje: 20,
    },
  });
  const html = generarDocumentoMercadoPremium({
    estadoUi,
    assets: { productos: {}, escena: {} },
  });

  assert.equal(estadoUi.sessionResult.primaryVisible, false);
  assert.match(html, /Guardamos tu progreso en segundo plano/i);
  assert.doesNotMatch(html, /data-mercado-action="continue"/);
  assert.doesNotMatch(html, /Finalizar y volver al tablero/i);
});

test('Salir de Mercado desmonta el juego antes de refrescar el tablero', () => {
  const dashboardPath = path.resolve(__dirname, '../../src/screens/DashboardScreen.jsx');
  const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
  const exitGameBody = dashboardSource.match(
    /const exitGame = \(\) => \{([\s\S]*?)\n  \};/,
  )?.[1];

  assert.ok(exitGameBody, 'Debe existir el flujo explicito exitGame.');
  assert.ok(
    exitGameBody.indexOf('setActiveGame(null)') <
      exitGameBody.indexOf('void reloadDashboard()'),
    'El juego debe desmontarse antes de iniciar la recarga remota.',
  );
});

test('Pantalla 3 protege su composición en pantallas móviles horizontales', () => {
  const estilos = crearEstilosMercado();

  assert.match(estilos, /\.mercado-sesion-final\{/);
  assert.match(estilos, /\.mercado-sesion-final__stage\{position:absolute;inset:0;width:100%;height:100%/);
  assert.match(estilos, /--safe-left:max\(22px,env\(safe-area-inset-left\)\)/);
  assert.match(estilos, /--safe-right:max\(22px,env\(safe-area-inset-right\)\)/);
  assert.match(estilos, /\.mercado-sesion-final__historial\{left:calc\(var\(--safe-left\) \+ 3%\)/);
  assert.match(estilos, /\.mercado-sesion-final__tablero\{right:calc\(var\(--safe-right\) \+ 3%\)/);
  assert.match(estilos, /@media\(max-width:760px\) and \(max-height:430px\)/);
  assert.match(
    estilos,
    /\.mercado-sesion-final__celebracion\{left:20%;right:17%\}/,
  );
});

test('Pantalla 3 usa kit modular y sanea acciones finales', () => {
  const configuracion = normalizarConfiguracionMercado();
  const ronda = generarRondaMercado({ configuracion, indiceRonda: 0 });
  const modeloVisual = crearModeloVisualNivelMercado({
    ronda,
    nivel: 1,
    totalNiveles: 1,
    seleccionadosIds: ronda.oferta.slice(0, 2).map(({ id }) => id),
    mensaje: 'Actividad completada.',
    estrellas: 3,
    combo: 1,
    aciertos: 1,
    errores: 0,
  });
  const estadoUi = crearEstadoUiMercadoPremium({
    modeloVisual,
    nombreJugador: 'Luna',
    completado: true,
    tieneSiguienteNivel: false,
    resumenActividad: {
      nivelesCompletados: 1,
      estrellasObtenidas: 3,
      aciertos: 1,
      errores: 0,
      comboMaximo: 1,
      puntaje: 30,
    },
  });
  const estadoConAccionLibre = {
    ...estadoUi,
    sessionResult: {
      ...estadoUi.sessionResult,
      primaryAction: '<script>alert(1)</script>',
    },
  };
  const html = generarDocumentoMercadoPremium({
    estadoUi: estadoConAccionLibre,
    assets: { productos: {}, escena: {} },
  });

  assert.equal(SESION_FINAL_ASSET_KIT.banner, 'sesion-final/banner');
  assert.equal(SESION_FINAL_ASSET_KIT.trofeo, 'sesion-final/trofeo');
  assert.match(html, /mercado-sesion-final__trofeo-svg/);
  assert.match(html, /mercado-sesion-final__avatar-svg/);
  assert.match(html, /data-mercado-action="continue"/);
  assert.doesNotMatch(html, /data-mercado-action="&lt;script&gt;/);
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
