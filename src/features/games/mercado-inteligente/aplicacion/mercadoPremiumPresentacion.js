const MENSAJES_EXITO = Object.freeze([
  'Compra perfecta. El mercadito celebra contigo.',
  'Gran calculo. Tu canasta quedo lista.',
  'Super compra. Elegiste con cabeza.',
  'Excelente ajuste. Ese total funciona muy bien.',
]);

const normalizarEnteroPositivo = (valor, respaldo = 1) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : respaldo;
};

export const obtenerCantidadObjetivoMercado = (ronda) =>
  normalizarEnteroPositivo(ronda?.objetivo?.cantidadObjetivos, 2);

export const calcularTotalSeleccionMercado = ({ ronda, seleccionadosIds }) =>
  seleccionadosIds.reduce((total, productoId) => {
    const producto = ronda.oferta.find((item) => item.id === productoId);
    return total + (producto?.precio ?? 0);
  }, 0);

export const crearResumenMochilaMercado = ({ ronda, seleccionadosIds }) =>
  seleccionadosIds
    .map((productoId) => ronda.oferta.find((producto) => producto.id === productoId))
    .filter(Boolean)
    .map(({ id, nombre, precio }) => ({ id, nombre, precio }));

export const calcularEstrellasVisualesMercado = ({ aciertos = 0, errores = 0 }) => {
  if (aciertos <= 0) {
    return 0;
  }

  if (errores === 0) {
    return 3;
  }

  if (errores <= 2) {
    return 2;
  }

  return 1;
};

export const resolverMensajeSeleccionMercado = ({ ronda, seleccionadosIds }) => {
  if (seleccionadosIds.length === 0) {
    return 'Toca un producto para empezar.';
  }

  const cantidadObjetivo = obtenerCantidadObjetivoMercado(ronda);
  const total = calcularTotalSeleccionMercado({ ronda, seleccionadosIds });
  const presupuesto = ronda.objetivo.presupuestoObjetivo;
  const diferencia = presupuesto - total;

  if (seleccionadosIds.length < cantidadObjetivo) {
    return `Llevas ${seleccionadosIds.length}/${cantidadObjetivo} productos. Sigue eligiendo.`;
  }

  if (diferencia < 0) {
    return `Casi. Te pasaste por ${Math.abs(diferencia)} monedas. Cambia un producto.`;
  }

  if (diferencia === 0) {
    return 'Total exacto. Compra cuando estes listo.';
  }

  return `Vas en ${total} de ${presupuesto} monedas.`;
};

export const resolverMensajeEvaluacionMercado = (evaluacion) => {
  if (evaluacion.exito) {
    return MENSAJES_EXITO[evaluacion.totalGastado % MENSAJES_EXITO.length];
  }

  if (evaluacion.excesoPresupuesto > 0) {
    return `Casi. Te pasaste por ${evaluacion.excesoPresupuesto} monedas. Quita o cambia un producto.`;
  }

  if (evaluacion.motivoError === 'cantidad_incorrecta') {
    return `Casi. Elegiste ${evaluacion.cantidadSeleccionada} productos. Revisa la tarea.`;
  }

  if (evaluacion.motivoError === 'categoria_incorrecta') {
    return 'Casi. Revisa la categoria que pide la mision.';
  }

  if (evaluacion.faltantePresupuesto > 0) {
    return `Casi. Te faltan ${evaluacion.faltantePresupuesto} monedas. Cambia tu eleccion.`;
  }

  return 'Casi. Ajusta la mochila y prueba de nuevo.';
};

export const resolverEstadoVisualEvaluacionMercado = (evaluacion) => {
  if (evaluacion.exito) {
    return 'success';
  }

  if (evaluacion.excesoPresupuesto > 0) {
    return 'over_budget';
  }

  if (evaluacion.faltantePresupuesto > 0) {
    return 'under_budget';
  }

  return 'adjust';
};

export const crearModeloVisualNivelMercado = ({
  ronda,
  nivel,
  totalNiveles,
  seleccionadosIds,
  mensaje,
  estrellas,
  combo,
}) => {
  const presupuesto = ronda.objetivo.presupuestoObjetivo;
  const total = calcularTotalSeleccionMercado({ ronda, seleccionadosIds });

  return {
    nivel,
    totalNiveles,
    mision: {
      texto: ronda.objetivo.textoGuia,
      cantidadObjetivo: obtenerCantidadObjetivoMercado(ronda),
      presupuesto,
    },
    productos: ronda.oferta.map(({ id, nombre, precio, categoria }) => ({
      id,
      nombre,
      precio,
      categoria,
      seleccionado: seleccionadosIds.includes(id),
    })),
    mochila: crearResumenMochilaMercado({ ronda, seleccionadosIds }),
    compra: {
      total,
      presupuesto,
      monedasRestantes: Math.max(0, presupuesto - total),
      exceso: Math.max(0, total - presupuesto),
      puedeComprar: seleccionadosIds.length > 0,
    },
    feedback: {
      mensaje,
      estrellas,
      combo,
    },
  };
};
