import { textoSeguro } from './mercadoInterfazUtils';

export function crearPanelMision({ missionText } = {}) {
  return `
    <section class="mercado-mision" aria-label="Misión actual">
      <p class="mercado-mision__texto">
        <span>Misión:</span>
        ${textoSeguro(missionText, 'Misión por cargar')}
      </p>
    </section>
  `;
}
