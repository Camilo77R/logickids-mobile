import { crearHtmlInterfazMercado } from './interfaz/crearInterfazMercado';
import { crearEstilosMercado } from './interfaz/crearEstilosMercado';
import { crearScriptSincronizarCelebracionResultado } from './escena/mercadoResultadoBabylon';

const cssUrl = (valor) => JSON.stringify(String(valor ?? ''));

const esFuenteValida = (fuente) => typeof fuente === 'string' && fuente.length > 0;

const resolverFuentePreferida = (fuentes = []) => {
  if (!Array.isArray(fuentes)) {
    return '';
  }

  return fuentes.find((fuente) => esFuenteValida(fuente) && fuente.startsWith('data:')) ??
    fuentes.find(esFuenteValida) ??
    '';
};

const resolverFondoEscenario = (assets) =>
  resolverFuentePreferida(assets?.escena?.escenario);

const resolverFondoSesionFinal = (assets) =>
  resolverFuentePreferida(assets?.sesionFinal?.capas?.fondo?.fuentes);

const crearScriptBridgePremium = () => `
  (function () {
    const root = document.getElementById('mercado-ui');
    let actualizacionPendiente = null;
    let htmlPendiente = '';
    let ultimoHtmlAplicado = null;

    const enviar = (type, payload = {}) => {
      try {
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...payload }));
      } catch (error) {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'MERCADO_VISUAL_ERROR',
          message: String(error && error.message ? error.message : error),
        }));
      }
    };

    const acciones = {
      buy: 'PURCHASE_REQUESTED',
      continue: 'CONTINUE_REQUESTED',
      hint: 'HINT_REQUESTED',
      'retry-save': 'RETRY_SAVE_REQUESTED',
      reset: 'RESET_REQUESTED',
      menu: 'EXIT_REQUESTED',
      'remove-product': 'PRODUCT_TOGGLED',
      'toggle-product': 'PRODUCT_TOGGLED',
    };

    root.addEventListener('click', (evento) => {
      const control = evento.target.closest('[data-mercado-action]');
      if (!control || control.disabled) return;

      const type = acciones[control.dataset.mercadoAction];
      if (!type) return;

      enviar(type, control.dataset.productId ? { productId: control.dataset.productId } : {});
    });

    window.MercadoPremium = {
      receive(contenido) {
        // La lógica vive en React Native. La UI se actualiza por updateUi para evitar estados duplicados.
        try {
          const mensaje = typeof contenido === 'string' ? JSON.parse(contenido) : contenido;
          if (mensaje && mensaje.type === 'UPDATE_GAME_STATE') {
            document.body.dataset.feedback = mensaje.payload?.feedbackEscena?.state || '';
          }
        } catch (_) {}
      },
      updateUi(html) {
        const siguienteHtml = String(html ?? '');
        if (siguienteHtml === ultimoHtmlAplicado) return;

        htmlPendiente = siguienteHtml;
        if (actualizacionPendiente !== null) return;

        actualizacionPendiente = requestAnimationFrame(() => {
          actualizacionPendiente = null;
          if (htmlPendiente === ultimoHtmlAplicado) return;

          ultimoHtmlAplicado = htmlPendiente;
          root.innerHTML = htmlPendiente;
        });
      },
    };

    requestAnimationFrame(() => enviar('MERCADO_READY'));
  })();
`;

export const generarDocumentoMercadoPremium = ({
  estadoUi,
  assets,
}) => {
  const fondoEscenario = resolverFondoEscenario(assets);
  const fondoSesionFinal = resolverFondoSesionFinal(assets);
  const estiloFondo = fondoEscenario
    ? `background-image:url(${cssUrl(fondoEscenario)});`
    : 'background-image:linear-gradient(180deg,#8de5f6,#f8d49a);';
  const variableFondoEscenario = fondoEscenario
    ? `--mercado-escenario-fondo:url(${cssUrl(fondoEscenario)});`
    : '--mercado-escenario-fondo:none;';
  const variableFondoSesionFinal = fondoSesionFinal
    ? `--mercado-sesion-final-fondo:url(${cssUrl(fondoSesionFinal)});`
    : '--mercado-sesion-final-fondo:var(--mercado-escenario-fondo);';

  return `<!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
        <style>
          ${crearEstilosMercado()}
          html,body{background:#8de5f6}
          body::before{
            content:"";
            position:fixed;
            inset:0;
            z-index:0;
            ${estiloFondo}
            background-size:cover;
            background-position:center;
            background-repeat:no-repeat;
          }
          body::after{
            content:"";
            position:fixed;
            inset:0;
            z-index:1;
            background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,166,40,.07));
            pointer-events:none;
          }
          #mercado-ui{position:fixed;inset:0;z-index:20;${variableFondoEscenario}${variableFondoSesionFinal}}
        </style>
      </head>
      <body>
        <div id="mercado-ui">${crearHtmlInterfazMercado(estadoUi, { assets })}</div>
        <script>${crearScriptBridgePremium()}</script>
        <script>${crearScriptSincronizarCelebracionResultado(estadoUi)}</script>
      </body>
    </html>`;
};

export const crearScriptActualizarUiMercadoPremium = (estadoUi, assets) => {
  const fondoSesionFinal = resolverFondoSesionFinal(assets);
  const actualizarFondoSesionFinal = fondoSesionFinal
    ? `document.getElementById('mercado-ui')?.style.setProperty('--mercado-sesion-final-fondo', 'url(${cssUrl(fondoSesionFinal)})');`
    : '';

  return `${actualizarFondoSesionFinal}
  window.MercadoPremium && window.MercadoPremium.updateUi(${JSON.stringify(
    crearHtmlInterfazMercado(estadoUi, { assets }),
  )});
  ${crearScriptSincronizarCelebracionResultado(estadoUi)}
  true;`;
};
