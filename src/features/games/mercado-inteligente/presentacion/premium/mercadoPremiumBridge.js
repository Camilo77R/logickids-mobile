export const EVENTOS_DESDE_MERCADO_PREMIUM = Object.freeze({
  listo: 'MERCADO_READY',
  productoAlternado: 'PRODUCT_TOGGLED',
  comprar: 'PURCHASE_REQUESTED',
  reiniciar: 'RESET_REQUESTED',
  pista: 'HINT_REQUESTED',
  salir: 'EXIT_REQUESTED',
  error: 'MERCADO_VISUAL_ERROR',
});

export const COMANDOS_HACIA_MERCADO_PREMIUM = Object.freeze({
  iniciar: 'START_GAME_SESSION',
  actualizar: 'UPDATE_GAME_STATE',
  mostrarFeedback: 'SHOW_FEEDBACK',
});

export const interpretarMensajeMercadoPremium = (contenido) => {
  try {
    const mensaje = typeof contenido === 'string' ? JSON.parse(contenido) : contenido;

    if (!mensaje || typeof mensaje.type !== 'string') {
      return null;
    }

    return mensaje;
  } catch {
    return null;
  }
};

export const crearComandoInicioMercadoPremium = ({ modeloVisual, assets }) => ({
  type: COMANDOS_HACIA_MERCADO_PREMIUM.iniciar,
  payload: {
    ...modeloVisual,
    assets,
  },
});

export const crearComandoEstadoMercadoPremium = ({ modeloVisual, feedbackEscena }) => ({
  type: COMANDOS_HACIA_MERCADO_PREMIUM.actualizar,
  payload: {
    modeloVisual,
    feedbackEscena,
  },
});

export const serializarComandoMercadoPremium = (comando) =>
  `window.MercadoPremium && window.MercadoPremium.receive(${JSON.stringify(
    JSON.stringify(comando),
  )}); true;`;
