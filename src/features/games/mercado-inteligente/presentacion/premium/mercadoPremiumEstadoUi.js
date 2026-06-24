import { crearResultadoUiMercadoPremium } from '../../aplicacion/mercadoPremiumResultado.mapper';
import { crearSesionFinalUiMercadoPremium } from '../../aplicacion/mercadoPremiumSesion.mapper';

const ETIQUETAS_PRODUCTO = Object.freeze({
  manzana: '🍎',
  banano: '🍌',
  pera: '🍐',
  zanahoria: '🥕',
  tomate: '🍅',
  lechuga: '🥬',
  leche: '🥛',
  yogur: '🥛',
  queso: '🧀',
  pan: '🥖',
  galleta: '🍪',
  muffin: '🧁',
});

const resolverEstadoTotal = ({ total, presupuesto }) => {
  if (total > presupuesto) {
    return 'over';
  }

  if (total === presupuesto) {
    return 'exact';
  }

  return 'under';
};

const crearProductoMochila = (producto) => ({
  id: producto.id,
  name: producto.nombre,
  shortLabel: ETIQUETAS_PRODUCTO[producto.id] ?? producto.nombre.slice(0, 1),
});

const crearProductoEscaparate = (producto) => ({
  id: producto.id,
  name: producto.nombre,
  price: producto.precio,
  selected: producto.seleccionado,
  visualClass: producto.id,
  shortLabel: ETIQUETAS_PRODUCTO[producto.id] ?? producto.nombre.slice(0, 1),
});

export const crearEstadoUiMercadoPremium = ({
  modeloVisual,
  nombreJugador = 'Estudiante',
  bloqueado = false,
  completado = false,
  tieneSiguienteNivel = false,
  mostrarResultadoNivel = tieneSiguienteNivel,
  etiquetaAccionResultado = null,
  resultado = null,
  resumenActividad = null,
  sincronizandoResultado = false,
  errorSincronizacionResultado = null,
}) => {
  const result = completado && mostrarResultadoNivel
    ? crearResultadoUiMercadoPremium({
        modeloVisual,
        resultado,
        nombreJugador,
        tieneSiguienteNivel,
        etiquetaAccionResultado,
        sincronizandoResultado,
        errorSincronizacionResultado,
      })
    : null;
  const sessionResult = completado && !mostrarResultadoNivel
    ? crearSesionFinalUiMercadoPremium({
        resumenActividad,
        nombreJugador,
        totalNiveles: modeloVisual.totalNiveles,
        sincronizandoResultado,
        errorSincronizacionResultado,
      })
    : null;

  return {
    screen: sessionResult ? 'session-result' : result ? 'result' : 'game',
    level: {
      current: modeloVisual.nivel,
      total: modeloVisual.totalNiveles,
    },
    missionText: modeloVisual.mision.texto,
    task: {
      title: 'Tarea',
      completedCount: modeloVisual.mochila.length,
      requiredCount: modeloVisual.mision.cantidadObjetivo,
      budget: modeloVisual.mision.presupuesto,
      statusText: modeloVisual.feedback.mensaje,
    },
    products: modeloVisual.productos.map(crearProductoEscaparate),
    selectedProducts: modeloVisual.mochila.map(crearProductoMochila),
    backpack: {
      title: 'Mochila',
      emptyText: 'Toca productos del mercado.',
    },
    player: {
      name: nombreJugador,
      levelLabel: `Mision ${modeloVisual.nivel} de ${modeloVisual.totalNiveles} · Dificultad ${modeloVisual.dificultad}`,
      coins: modeloVisual.mision.presupuesto,
      avatarLabel: nombreJugador.slice(0, 1).toUpperCase(),
    },
    reward: {
      stars: modeloVisual.feedback.estrellas,
      combo: modeloVisual.feedback.combo,
    },
    result,
    sessionResult,
    actions: {
      buyDisabled:
        bloqueado ||
        sincronizandoResultado ||
        (!completado && !modeloVisual.compra.puedeComprar),
      buyLabel: result?.primaryLabel ?? 'Comprar',
      resetDisabled: bloqueado || completado || modeloVisual.mochila.length === 0,
      resetLabel: 'Reiniciar',
      menuDisabled: false,
      menuLabel: 'Menú',
    },
    total: {
      label: 'Total',
      amount: modeloVisual.compra.total,
      status: resolverEstadoTotal(modeloVisual.compra),
      helperText: `${modeloVisual.compra.monedasRestantes} monedas disponibles`,
    },
  };
};
