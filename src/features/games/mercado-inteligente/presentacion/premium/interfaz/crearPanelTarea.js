import { monedasSeguras, numeroSeguro, textoSeguro } from './mercadoInterfazUtils';

export function crearPanelTarea({ task = {} } = {}) {
  const completados = Math.max(0, numeroSeguro(task.completedCount));
  const requeridos = Math.max(0, numeroSeguro(task.requiredCount));
  const presupuesto = monedasSeguras(task.budget);

  return `
    <section class="mercado-panel mercado-tarea" aria-label="Tarea">
      <header class="mercado-panel__titulo">
        <span class="mercado-icono mercado-icono--check" aria-hidden="true">✓</span>
        <span>${textoSeguro(task.title, 'Tu tarea')}</span>
      </header>
      <div class="mercado-tarea__fila">
        <span class="mercado-tarea__etiqueta">Objetos</span>
        <strong class="mercado-tarea__valor">${completados}/${requeridos}</strong>
      </div>
      <div class="mercado-tarea__fila">
        <span class="mercado-tarea__etiqueta">Máximo</span>
        <strong class="mercado-moneda"><i aria-hidden="true"></i>${presupuesto}</strong>
      </div>
      <p class="mercado-tarea__estado" aria-live="polite">${textoSeguro(task.statusText, 'Elige tus productos')}</p>
    </section>
  `;
}
