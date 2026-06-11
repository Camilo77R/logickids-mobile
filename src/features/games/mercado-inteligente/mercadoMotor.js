import {
  crearEventoSesion,
  crearFinalizacionSesion,
  ESTADOS_FINALIZACION_SESION,
} from '../core/contratoSesionJuego';
import {
  crearEstadisticasJuegoComun,
  crearResultadoJuegoComun,
} from '../core/contratoResultadoJuego';
import {
  HABILIDAD_MERCADO,
  MODOS_OBJETIVO_MERCADO,
  PRODUCTOS_BASE_MERCADO,
} from './mercado.constants';

const normalizarEnteroNoNegativo = (valor) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return 0;
  }

  return Math.round(numero);
};

const obtenerCatalogoPermitido = (categoriasPermitidas = []) => {
  const catalogo = PRODUCTOS_BASE_MERCADO.filter((producto) =>
    categoriasPermitidas.includes(producto.categoria),
  );

  return catalogo.length > 0 ? catalogo : PRODUCTOS_BASE_MERCADO;
};

const rotarCatalogo = (catalogo, desplazamiento) => {
  if (catalogo.length === 0) {
    return [];
  }

  const offset = ((desplazamiento % catalogo.length) + catalogo.length) % catalogo.length;
  return [...catalogo.slice(offset), ...catalogo.slice(0, offset)];
};

const agruparCatalogoPorCategoria = (catalogo) =>
  catalogo.reduce((grupos, producto) => ({
    ...grupos,
    [producto.categoria]: [...(grupos[producto.categoria] ?? []), producto],
  }), {});

const construirCatalogoDiverso = ({ catalogo, categoriasPermitidas, indiceRonda }) => {
  const grupos = agruparCatalogoPorCategoria(catalogo);
  const categoriasDisponibles = categoriasPermitidas.filter(
    (categoria) => grupos[categoria]?.length > 0,
  );

  if (categoriasDisponibles.length <= 1) {
    return rotarCatalogo(catalogo, indiceRonda * 2);
  }

  const categoriasRotadas = rotarCatalogo(categoriasDisponibles, indiceRonda);
  const mayorCantidadPorCategoria = Math.max(
    ...categoriasRotadas.map((categoria) => grupos[categoria].length),
  );
  const catalogoDiverso = [];

  for (let vuelta = 0; vuelta < mayorCantidadPorCategoria; vuelta += 1) {
    categoriasRotadas.forEach((categoria) => {
      const productosCategoria = grupos[categoria];
      const producto = productosCategoria[(vuelta + indiceRonda) % productosCategoria.length];

      if (!catalogoDiverso.some((item) => item.id === producto.id)) {
        catalogoDiverso.push(producto);
      }
    });
  }

  return catalogoDiverso;
};

const asignarPrecioDeterminista = ({ indiceProducto, indiceRonda, precioMin, precioMax }) => {
  const rango = precioMax - precioMin + 1;
  return precioMin + ((indiceProducto * 2 + indiceRonda * 3) % rango);
};

const CLIENTES_MERCADO = Object.freeze([
  'Luna',
  'Mateo',
  'Sofi',
  'Leo',
]);

const obtenerClienteNivel = (indiceRonda) =>
  CLIENTES_MERCADO[((indiceRonda % CLIENTES_MERCADO.length) + CLIENTES_MERCADO.length) % CLIENTES_MERCADO.length];

export const generarOfertaMercado = ({ configuracion, indiceRonda = 0 }) => {
  const {
    categoriasPermitidas,
    cantidadProductosVisibles,
    precioMin,
    precioMax,
  } = configuracion.configuracion;
  const catalogoPermitido = obtenerCatalogoPermitido(categoriasPermitidas);
  const catalogo = construirCatalogoDiverso({
    catalogo: catalogoPermitido,
    categoriasPermitidas,
    indiceRonda,
  });

  return catalogo.slice(0, cantidadProductosVisibles).map((producto, indiceProducto) => ({
    ...producto,
    precio: asignarPrecioDeterminista({
      indiceProducto,
      indiceRonda,
      precioMin,
      precioMax,
    }),
  }));
};

const construirObjetivoPorModo = ({ configuracion, oferta, indiceRonda }) => {
  const {
    cantidadObjetivos,
    presupuestoMonedas,
    modoObjetivo,
  } = configuracion.configuracion;
  const productoObjetivo = oferta[indiceRonda % oferta.length];
  const categoriaObjetivo = productoObjetivo?.categoria ?? oferta[0]?.categoria ?? 'frutas';
  const seleccionSugerida = oferta.slice(0, cantidadObjetivos);
  const totalSugerido = seleccionSugerida.reduce((acumulado, producto) => acumulado + producto.precio, 0);
  const cliente = obtenerClienteNivel(indiceRonda);

  switch (modoObjetivo) {
    case MODOS_OBJETIVO_MERCADO.presupuestoExacto:
      return {
        modo: modoObjetivo,
        cantidadObjetivos,
        presupuestoObjetivo: Math.min(presupuestoMonedas, totalSugerido),
        categoriaObjetivo: null,
        textoGuia: `${cliente} necesita ${cantidadObjetivos} productos. Usa exactamente ${Math.min(
          presupuestoMonedas,
          totalSugerido,
        )} monedas.`,
      };
    case MODOS_OBJETIVO_MERCADO.categoriaObjetivo:
      return {
        modo: modoObjetivo,
        cantidadObjetivos,
        presupuestoObjetivo: presupuestoMonedas,
        categoriaObjetivo,
        textoGuia: `${cliente} quiere ${cantidadObjetivos} productos de ${categoriaObjetivo} sin pasar ${presupuestoMonedas} monedas.`,
      };
    case MODOS_OBJETIVO_MERCADO.cantidadYCategoria:
      return {
        modo: modoObjetivo,
        cantidadObjetivos,
        presupuestoObjetivo: presupuestoMonedas,
        categoriaObjetivo,
        textoGuia: `${cliente} esta buscando ${cantidadObjetivos} productos de ${categoriaObjetivo}.`,
      };
    case MODOS_OBJETIVO_MERCADO.presupuestoMaximo:
    default:
      return {
        modo: MODOS_OBJETIVO_MERCADO.presupuestoMaximo,
        cantidadObjetivos,
        presupuestoObjetivo: presupuestoMonedas,
        categoriaObjetivo: null,
        textoGuia: `${cliente} tiene ${presupuestoMonedas} monedas. Elige ${cantidadObjetivos} productos sin pasarte.`,
      };
  }
};

export const generarRondaMercado = ({ configuracion, indiceRonda = 0 }) => {
  const oferta = generarOfertaMercado({ configuracion, indiceRonda });
  const objetivo = construirObjetivoPorModo({ configuracion, oferta, indiceRonda });

  return {
    indiceRonda,
    presupuestoMonedas: configuracion.configuracion.presupuestoMonedas,
    oferta,
    objetivo,
  };
};

export const evaluarSeleccionMercado = ({
  ronda,
  productosSeleccionadosIds = [],
}) => {
  const productosSeleccionados = productosSeleccionadosIds
    .map((productoId) => ronda.oferta.find((producto) => producto.id === productoId))
    .filter(Boolean);
  const totalGastado = productosSeleccionados.reduce(
    (acumulado, producto) => acumulado + producto.precio,
    0,
  );
  const cantidadSeleccionada = productosSeleccionados.length;
  const coincideCantidad = cantidadSeleccionada === ronda.objetivo.cantidadObjetivos;
  const coincideCategoria =
    !ronda.objetivo.categoriaObjetivo ||
    productosSeleccionados.every(
      (producto) => producto.categoria === ronda.objetivo.categoriaObjetivo,
    );
  const dentroDelPresupuesto = totalGastado <= ronda.objetivo.presupuestoObjetivo;
  const coincidePresupuestoExacto =
    ronda.objetivo.modo !== MODOS_OBJETIVO_MERCADO.presupuestoExacto ||
    totalGastado === ronda.objetivo.presupuestoObjetivo;

  const exito =
    coincideCantidad &&
    coincideCategoria &&
    dentroDelPresupuesto &&
    coincidePresupuestoExacto;

  let motivoError = null;

  if (!dentroDelPresupuesto) {
    motivoError = 'presupuesto_excedido';
  } else if (!coincideCantidad) {
    motivoError = 'cantidad_incorrecta';
  } else if (!coincideCategoria) {
    motivoError = 'categoria_incorrecta';
  } else if (!coincidePresupuestoExacto) {
    motivoError = 'presupuesto_no_exacto';
  }

  return {
    exito,
    totalGastado,
    cantidadSeleccionada,
    presupuestoRestante: Math.max(0, ronda.objetivo.presupuestoObjetivo - totalGastado),
    faltantePresupuesto: Math.max(0, ronda.objetivo.presupuestoObjetivo - totalGastado),
    excesoPresupuesto: Math.max(0, totalGastado - ronda.objetivo.presupuestoObjetivo),
    motivoError,
    productosSeleccionados,
  };
};

export const construirEventoMercado = ({
  tipoEvento,
  tiempoReaccionMs,
  puntos = 0,
  comboEnEvento = 0,
  metadata,
}) =>
  crearEventoSesion({
    tipoEvento,
    habilidad: HABILIDAD_MERCADO,
    tiempoReaccionMs,
    puntos,
    comboEnEvento,
    metadata,
  });

export const calcularPuntajeMercado = ({
  aciertos = 0,
  errores = 0,
  ayudasUsadas = 0,
}) =>
  Math.max(
    normalizarEnteroNoNegativo(aciertos) * 12 -
      normalizarEnteroNoNegativo(errores) * 4 -
      normalizarEnteroNoNegativo(ayudasUsadas) * 2,
    0,
  );

export const construirResumenPartidaMercado = ({
  configuracion,
  aciertos,
  errores,
  comboMaximo,
  rondasCompletadas,
  tiempoTotalMs,
  ayudasUsadas = 0,
  estado = ESTADOS_FINALIZACION_SESION.completado,
}) => {
  const puntaje = calcularPuntajeMercado({ aciertos, errores, ayudasUsadas });
  const finalizacionSesion = crearFinalizacionSesion({
    puntaje,
    aciertos,
    errores,
    comboMaximo,
    dificultad: configuracion.dificultad,
    estado,
  });

  return crearResultadoJuegoComun({
    juego: {
      slug: configuracion.slug,
      titulo: configuracion.titulo,
      habilidad: HABILIDAD_MERCADO,
      fuenteAdaptacion: configuracion.fuenteAdaptacion,
      versionAdaptacion: configuracion.versionAdaptacion,
    },
    finalizacionSesion,
    estadisticas: crearEstadisticasJuegoComun({
      puntaje,
      aciertos,
      errores,
      comboMaximo,
      tiempoTotalMs,
      pistasUsadas: ayudasUsadas,
      nivelAlcanzado: rondasCompletadas,
      dificultad: configuracion.dificultad,
      estadoSesion: finalizacionSesion.estado,
    }),
    detalles: {
      rondasCompletadas,
      rondasPorPartida: configuracion.rondasPorPartida,
      presupuestoBase: configuracion.configuracion.presupuestoMonedas,
      modoObjetivo: configuracion.configuracion.modoObjetivo,
    },
  });
};
