import { crearControlesCompra, crearTotalCompra } from './crearControlesCompra';
import { crearEscaparateProductos } from './crearEscaparateProductos';
import { crearEstilosMercado } from './crearEstilosMercado';
import { crearPanelJugador } from './crearPanelJugador';
import { crearPanelMision } from './crearPanelMision';
import { crearPanelMochila } from './crearPanelMochila';
import { crearPanelTarea } from './crearPanelTarea';
import { crearPantallaResultado } from './crearPantallaResultado';
import { crearPantallaSesionFinal } from './crearPantallaSesionFinal';
import { atributoSeguro, textoSeguro } from './mercadoInterfazUtils';

export const ACCIONES_INTERFAZ_MERCADO = Object.freeze({
  BUY: 'buy',
  CONTINUE: 'continue',
  MENU: 'menu',
  REMOVE_PRODUCT: 'remove-product',
  RESET: 'reset',
  RETRY_SAVE: 'retry-save',
});

const normalizarEstado = (estado = {}) => ({
  screen: estado.screen ?? 'game',
  missionText: estado.missionText,
  level: estado.level ?? {},
  task: estado.task ?? {},
  products: Array.isArray(estado.products) ? estado.products : [],
  selectedProducts: Array.isArray(estado.selectedProducts) ? estado.selectedProducts : [],
  backpack: estado.backpack ?? {},
  player: estado.player ?? {},
  reward: estado.reward ?? {},
  result: estado.result ?? null,
  sessionResult: estado.sessionResult ?? null,
  actions: estado.actions ?? {},
  total: estado.total ?? {},
});

const combinarEstado = (actual, cambio = {}) => ({
  ...actual,
  ...cambio,
  level: { ...actual.level, ...cambio.level },
  task: { ...actual.task, ...cambio.task },
  backpack: { ...actual.backpack, ...cambio.backpack },
  player: { ...actual.player, ...cambio.player },
  reward: { ...actual.reward, ...cambio.reward },
  result:
    cambio.result === null
      ? null
      : { ...(actual.result ?? {}), ...(cambio.result ?? {}) },
  sessionResult:
    cambio.sessionResult === null
      ? null
      : { ...(actual.sessionResult ?? {}), ...(cambio.sessionResult ?? {}) },
  actions: { ...actual.actions, ...cambio.actions },
  total: { ...actual.total, ...cambio.total },
  products: cambio.products ?? actual.products,
  selectedProducts: cambio.selectedProducts ?? actual.selectedProducts,
});

export function crearHtmlInterfazMercado(estado, opciones = {}) {
  const datos = normalizarEstado(estado);

  if (datos.screen === 'result' && datos.result) {
    return crearPantallaResultado(datos);
  }

  if (datos.screen === 'session-result' && datos.sessionResult) {
    return crearPantallaSesionFinal(datos, {
      assets: opciones.assets?.sesionFinal,
    });
  }

  return `
    <main class="mercado-hud" data-mercado-hud>
      ${crearPanelMision(datos)}
      <aside class="mercado-hud__izquierda">
        ${crearPanelTarea(datos)}
        ${crearPanelMochila(datos)}
      </aside>
      <div class="mercado-hud__centro">
        ${crearEscaparateProductos(datos)}
      </div>
      <aside class="mercado-hud__derecha">
        ${crearPanelJugador(datos)}
        ${crearControlesCompra(datos)}
      </aside>
      ${crearTotalCompra(datos)}
    </main>
  `;
}

export function crearDocumentoInterfazMercado(estado, opciones = {}) {
  const idioma = opciones.language ?? 'es';
  const titulo = opciones.title ?? 'Mercado Inteligente';

  return `<!doctype html>
    <html lang="${atributoSeguro(idioma)}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
        <title>${textoSeguro(titulo, 'Mercado Inteligente')}</title>
        <style>${crearEstilosMercado()}</style>
      </head>
      <body>${crearHtmlInterfazMercado(estado, opciones)}</body>
    </html>`;
}

export function crearInterfazMercado({ root, initialState, onAction } = {}) {
  if (!root || typeof root.addEventListener !== 'function') {
    throw new Error('crearInterfazMercado requiere un elemento root válido.');
  }

  let estado = normalizarEstado(initialState);
  let bloqueada = false;

  const renderizar = () => {
    root.innerHTML = crearHtmlInterfazMercado(estado);
  };

  const manejarClick = (evento) => {
    const control = evento.target.closest('[data-mercado-action]');
    if (!control || bloqueada || control.disabled) {
      return;
    }

    onAction?.({
      type: control.dataset.mercadoAction,
      payload: control.dataset.productId
        ? { productId: control.dataset.productId }
        : undefined,
    });
  };

  root.addEventListener('click', manejarClick);
  renderizar();

  return Object.freeze({
    actualizarEstado(nuevoEstado = {}) {
      estado = normalizarEstado(combinarEstado(estado, nuevoEstado));
      renderizar();
    },
    establecerBloqueo(valor) {
      bloqueada = Boolean(valor);
      root.toggleAttribute('aria-busy', bloqueada);
    },
    obtenerEstado() {
      return estado;
    },
    destruir() {
      root.removeEventListener('click', manejarClick);
      root.innerHTML = '';
    },
  });
}

export { crearEstilosMercado };
