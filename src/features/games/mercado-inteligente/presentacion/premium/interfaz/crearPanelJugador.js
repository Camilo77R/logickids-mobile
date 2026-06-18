import { atributoSeguro, monedasSeguras, textoSeguro } from './mercadoInterfazUtils';

export function crearPanelJugador({ player = {} } = {}) {
  const avatar = player.avatarUrl
    ? `<img src="${atributoSeguro(player.avatarUrl)}" alt="">`
    : `<span>${textoSeguro(player.avatarLabel, '?')}</span>`;

  return `
    <section class="mercado-panel mercado-jugador" aria-label="Jugador">
      <div class="mercado-jugador__avatar" aria-hidden="true">${avatar}</div>
      <div class="mercado-jugador__datos">
        <strong>${textoSeguro(player.name, 'Jugador')}</strong>
        <span>${textoSeguro(player.levelLabel, 'Nivel por cargar')}</span>
      </div>
      <div class="mercado-jugador__saldo" aria-label="${monedasSeguras(player.coins)} monedas">
        <span class="mercado-moneda"><i aria-hidden="true"></i>${monedasSeguras(player.coins)}</span>
      </div>
    </section>
  `;
}
