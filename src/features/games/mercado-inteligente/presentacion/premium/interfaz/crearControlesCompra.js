import { claseTotal, monedasSeguras, textoSeguro } from './mercadoInterfazUtils';

export function crearControlesCompra({ actions = {} } = {}) {
  return `
    <section class="mercado-acciones" aria-label="Acciones">
      <div class="mercado-acciones__principales">
        <button class="mercado-boton mercado-boton--pista" type="button" data-mercado-action="hint">
          Pista
        </button>
        <button class="mercado-boton mercado-boton--comprar" type="button" data-mercado-action="buy" ${actions.buyDisabled ? 'disabled' : ''}>
          ${textoSeguro(actions.buyLabel, 'Comprar')}
        </button>
      </div>
      <div class="mercado-acciones__secundarias">
        <button class="mercado-boton mercado-boton--secundario" type="button" data-mercado-action="reset" ${actions.resetDisabled ? 'disabled' : ''}>
          ↻ <span>${textoSeguro(actions.resetLabel, 'Reiniciar')}</span>
        </button>
        <button class="mercado-boton mercado-boton--secundario" type="button" data-mercado-action="menu" ${actions.menuDisabled ? 'disabled' : ''}>
          ☰ <span>${textoSeguro(actions.menuLabel, 'Menú')}</span>
        </button>
      </div>
    </section>
  `;
}

export function crearTotalCompra({ total = {} } = {}) {
  return `
    <section class="mercado-total ${claseTotal(total.status)}" aria-label="Total actual" aria-live="polite">
      <span class="mercado-total__etiqueta">${textoSeguro(total.label, 'Total')}</span>
      <strong class="mercado-moneda mercado-moneda--grande"><i aria-hidden="true"></i>${monedasSeguras(total.amount)}</strong>
      <span class="mercado-total__ayuda">${textoSeguro(total.helperText, 'Sigue comprando')}</span>
    </section>
  `;
}
