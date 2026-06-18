import { atributoSeguro, textoSeguro } from './mercadoInterfazUtils';

const crearMiniatura = (producto) => {
  const contenido = producto.thumbnailUrl
    ? `<img src="${atributoSeguro(producto.thumbnailUrl)}" alt="">`
    : `<span aria-hidden="true">${textoSeguro(producto.shortLabel, '•')}</span>`;

  return `
    <button
      class="mercado-mochila__producto"
      type="button"
      data-mercado-action="remove-product"
      data-product-id="${atributoSeguro(producto.id)}"
      aria-label="Retirar ${textoSeguro(producto.name, 'producto')}"
    >
      ${contenido}
      <span class="mercado-mochila__retirar" aria-hidden="true">×</span>
    </button>
  `;
};

export function crearPanelMochila({ selectedProducts = [], backpack = {} } = {}) {
  const productos = Array.isArray(selectedProducts) ? selectedProducts : [];
  const contenido = productos.length
    ? productos.map(crearMiniatura).join('')
    : `<p class="mercado-mochila__vacia">${textoSeguro(backpack.emptyText, 'Tu mochila está vacía')}</p>`;

  return `
    <section class="mercado-panel mercado-mochila" aria-label="Mochila">
      <header class="mercado-panel__titulo">
        <span class="mercado-icono mercado-icono--mochila" aria-hidden="true"></span>
        <span>${textoSeguro(backpack.title, 'Mochila')}</span>
      </header>
      <div class="mercado-mochila__contenido">${contenido}</div>
    </section>
  `;
}
