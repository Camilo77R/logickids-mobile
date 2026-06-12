import { monedasSeguras, numeroSeguro, textoSeguro } from './mercadoInterfazUtils';

const ICONOS_PRODUCTO = Object.freeze({
  manzana: '🍎',
  banano: '🍌',
  pera: '🍐',
  zanahoria: '🥕',
  tomate: '🍅',
  lechuga: '🥬',
  pan: '🥖',
  galleta: '🍪',
  queso: '🧀',
  leche: '🥛',
});

const crearEstrellas = (cantidad = 0) =>
  Array.from({ length: 3 }, (_, indice) => {
    const activa = indice < numeroSeguro(cantidad);
    return `
      <span
        class="mercado-resultado__estrella ${activa ? 'mercado-resultado__estrella--activa' : ''}"
        aria-hidden="true"
      >★</span>
    `;
  }).join('');

const crearMetrica = ({ clase, icono, titulo, valor }) => `
  <article class="mercado-resultado__metrica mercado-resultado__metrica--${clase}">
    <span class="mercado-resultado__metrica-icono" aria-hidden="true">${icono}</span>
    <span class="mercado-resultado__metrica-texto">
      <strong>${textoSeguro(titulo)}</strong>
      <span>${textoSeguro(valor)}</span>
    </span>
  </article>
`;

const crearInventario = (productos = []) => {
  const items = productos.length
    ? productos
        .slice(0, 4)
        .map(
          (producto) => `
            <span class="mercado-resultado__inventario-producto" title="${textoSeguro(producto.nombre ?? producto.name, 'Producto')}">
              ${textoSeguro(ICONOS_PRODUCTO[producto.id] ?? producto.shortLabel, '•')}
            </span>
          `,
        )
        .join('')
    : '<span class="mercado-resultado__inventario-vacio">Misión completada</span>';

  return `
    <aside class="mercado-resultado__inventario" aria-label="Productos de la misión">
      <span class="mercado-resultado__inventario-icono" aria-hidden="true">🎒</span>
      <span class="mercado-resultado__inventario-titulo">Inventario</span>
      <span class="mercado-resultado__inventario-productos">${items}</span>
    </aside>
  `;
};

const crearConfeti = () =>
  Array.from({ length: 22 }, (_, indice) => {
    const variante = (indice % 5) + 1;
    return `<i class="mercado-resultado__confeti mercado-resultado__confeti--${variante}" aria-hidden="true"></i>`;
  }).join('');

export function crearPantallaResultado({ result = {}, reward = {}, player = {}, actions = {} } = {}) {
  const estadisticas = result.stats ?? {};
  const estrellas = numeroSeguro(result.stars, reward.stars);
  const etiquetaPrincipal = result.primaryLabel ?? actions.continueLabel ?? '¡Siguiente nivel!';
  const accionPrincipal = result.primaryAction ?? 'continue';
  const accionDeshabilitada = Boolean(result.primaryDisabled ?? actions.continueDisabled);

  return `
    <main class="mercado-resultado" data-mercado-screen="result">
      <div class="mercado-resultado__velo" aria-hidden="true"></div>
      <div class="mercado-resultado__confeti-capa" aria-hidden="true">${crearConfeti()}</div>

      <section class="mercado-resultado__jugador" aria-label="Jugador">
        <div class="mercado-resultado__avatar">${textoSeguro(player.avatarLabel, '?')}</div>
        <div class="mercado-resultado__jugador-datos">
          <strong>${textoSeguro(player.name, 'Jugador')}</strong>
          <span>${textoSeguro(player.levelLabel, 'Nivel completado')}</span>
        </div>
        <span class="mercado-resultado__medalla" aria-hidden="true">★</span>
      </section>

      <section class="mercado-resultado__monedas" aria-label="${monedasSeguras(player.coins)} monedas">
        <span class="mercado-resultado__bolsa" aria-hidden="true">💰</span>
        <strong>${monedasSeguras(player.coins)}</strong>
        <span>Monedas</span>
      </section>

      <header class="mercado-resultado__banner">
        <h1>${textoSeguro(result.title, '¡Misión de nivel completada!')}</h1>
      </header>

      <section class="mercado-resultado__recompensa" aria-live="polite">
        <div class="mercado-resultado__pergamino">
          <p>${textoSeguro(result.subtitle, '¡Genial! Completaste la misión')}</p>
          <div class="mercado-resultado__estrellas" aria-label="${estrellas} de 3 estrellas">
            ${crearEstrellas(estrellas)}
          </div>
        </div>

        <div class="mercado-resultado__metricas">
          ${crearMetrica({
            clase: 'aciertos',
            icono: '✓',
            titulo: 'Aciertos',
            valor: `${numeroSeguro(estadisticas.correctProducts)} productos`,
          })}
          ${crearMetrica({
            clase: 'errores',
            icono: '×',
            titulo: 'Intentos fallidos',
            valor: `${numeroSeguro(estadisticas.errors)} intentos`,
          })}
          ${crearMetrica({
            clase: 'combo',
            icono: '🔥',
            titulo: 'Combo actual',
            valor: `x${numeroSeguro(estadisticas.combo, reward.combo)}`,
          })}
          ${crearMetrica({
            clase: 'monedas',
            icono: '◉',
            titulo: 'Monedas totales',
            valor: `${monedasSeguras(estadisticas.coinsUsed)} monedas usadas`,
          })}
        </div>
      </section>

      <p class="mercado-resultado__mensaje">
        ${textoSeguro(result.message, '¡Excelente! Terminaste esta misión.')}
        <small>${textoSeguro(result.syncLabel, 'Tu progreso quedó guardado.')}</small>
      </p>

      ${crearInventario(result.selectedProducts ?? [])}

      <button
        class="mercado-resultado__continuar"
        type="button"
        data-mercado-action="${textoSeguro(accionPrincipal, 'continue')}"
        ${accionDeshabilitada ? 'disabled' : ''}
      >
        <span>${textoSeguro(etiquetaPrincipal, '¡Siguiente nivel!')}</span>
        <i aria-hidden="true">▶</i>
      </button>
    </main>
  `;
}
