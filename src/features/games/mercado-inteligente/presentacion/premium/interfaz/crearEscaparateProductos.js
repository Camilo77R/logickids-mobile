import { atributoSeguro, monedasSeguras, textoSeguro } from './mercadoInterfazUtils';

const claseProducto = (producto) =>
  [
    'mercado-producto',
    `mercado-producto--${atributoSeguro(producto.visualClass ?? producto.id)}`,
    producto.selected ? 'mercado-producto--seleccionado' : '',
  ]
    .filter(Boolean)
    .join(' ');

const crearProducto = (producto) => `
  <button
    class="${claseProducto(producto)}"
    type="button"
    data-mercado-action="toggle-product"
    data-product-id="${atributoSeguro(producto.id)}"
    aria-pressed="${producto.selected ? 'true' : 'false'}"
    aria-label="${textoSeguro(producto.name, 'Producto')} por ${monedasSeguras(producto.price)} monedas"
  >
    <span class="mercado-producto__figura" aria-hidden="true">
      <span class="mercado-producto__fallback">${textoSeguro(producto.shortLabel, '•')}</span>
    </span>
    <span class="mercado-producto__etiqueta">
      <strong>${textoSeguro(producto.name, 'Producto')}</strong>
      <span><i aria-hidden="true"></i>${monedasSeguras(producto.price)} monedas</span>
    </span>
    <span class="mercado-producto__check" aria-hidden="true">✓</span>
  </button>
`;

export function crearEscaparateProductos({ products = [] } = {}) {
  const productos = Array.isArray(products) ? products.slice(0, 6) : [];
  const claseCantidad = `mercado-escaparate--${productos.length}`;

  return `
    <section class="mercado-escaparate ${claseCantidad}" aria-label="Productos del mercado">
      ${productos.map(crearProducto).join('')}
    </section>
  `;
}
