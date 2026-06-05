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
  HABILIDAD_MERCADO_AR,
  MODOS_OBJETIVO_MERCADO_AR,
  PRODUCTOS_BASE_MERCADO_AR,
} from './mercadoAr.constants';

const normalizarEnteroNoNegativo = (valor) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return 0;
  }

  return Math.round(numero);
};

const obtenerCatalogoPermitido = (categoriasPermitidas = []) => {
  const catalogo = PRODUCTOS_BASE_MERCADO_AR.filter((producto) =>
    categoriasPermitidas.includes(producto.categoria),
  );

  return catalogo.length > 0 ? catalogo : PRODUCTOS_BASE_MERCADO_AR;
};

const rotarCatalogo = (catalogo, desplazamiento) => {
  if (catalogo.length === 0) {
    return [];
  }

  const offset = ((desplazamiento % catalogo.length) + catalogo.length) % catalogo.length;
  return [...catalogo.slice(offset), ...catalogo.slice(0, offset)];
};

const asignarPrecioDeterminista = ({ indiceProducto, indiceRonda, precioMin, precioMax }) => {
  const rango = precioMax - precioMin + 1;
  return precioMin + ((indiceProducto + indiceRonda) % rango);
};

export const generarOfertaMercado = ({ configuracion, indiceRonda = 0 }) => {
  const {
    categoriasPermitidas,
    cantidadProductosVisibles,
    precioMin,
    precioMax,
  } = configuracion.configuracion;
  const catalogo = rotarCatalogo(
    obtenerCatalogoPermitido(categoriasPermitidas),
    indiceRonda,
  );

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

  switch (modoObjetivo) {
    case MODOS_OBJETIVO_MERCADO_AR.presupuestoExacto:
      return {
        modo: modoObjetivo,
        cantidadObjetivos,
        presupuestoObjetivo: Math.min(presupuestoMonedas, totalSugerido),
        categoriaObjetivo: null,
        textoGuia: `Compra ${cantidadObjetivos} productos y usa exactamente ${Math.min(
          presupuestoMonedas,
          totalSugerido,
        )} monedas.`,
      };
    case MODOS_OBJETIVO_MERCADO_AR.categoriaObjetivo:
      return {
        modo: modoObjetivo,
        cantidadObjetivos,
        presupuestoObjetivo: presupuestoMonedas,
        categoriaObjetivo,
        textoGuia: `Compra ${cantidadObjetivos} productos de ${categoriaObjetivo} sin pasar ${presupuestoMonedas} monedas.`,
      };
    case MODOS_OBJETIVO_MERCADO_AR.cantidadYCategoria:
      return {
        modo: modoObjetivo,
        cantidadObjetivos,
        presupuestoObjetivo: presupuestoMonedas,
        categoriaObjetivo,
        textoGuia: `Compra ${cantidadObjetivos} productos de ${categoriaObjetivo}.`,
      };
    case MODOS_OBJETIVO_MERCADO_AR.presupuestoMaximo:
    default:
      return {
        modo: MODOS_OBJETIVO_MERCADO_AR.presupuestoMaximo,
        cantidadObjetivos,
        presupuestoObjetivo: presupuestoMonedas,
        categoriaObjetivo: null,
        textoGuia: `Compra ${cantidadObjetivos} productos sin pasar ${presupuestoMonedas} monedas.`,
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
    ronda.objetivo.modo !== MODOS_OBJETIVO_MERCADO_AR.presupuestoExacto ||
    totalGastado === ronda.objetivo.presupuestoObjetivo;

  const exito =
    coincideCantidad &&
    coincideCategoria &&
    dentroDelPresupuesto &&
    coincidePresupuestoExacto;

  let motivoError = null;

  if (!coincideCantidad) {
    motivoError = 'cantidad_incorrecta';
  } else if (!coincideCategoria) {
    motivoError = 'categoria_incorrecta';
  } else if (!dentroDelPresupuesto) {
    motivoError = 'presupuesto_excedido';
  } else if (!coincidePresupuestoExacto) {
    motivoError = 'presupuesto_no_exacto';
  }

  return {
    exito,
    totalGastado,
    cantidadSeleccionada,
    presupuestoRestante: ronda.objetivo.presupuestoObjetivo - totalGastado,
    motivoError,
    productosSeleccionados,
  };
};

export const construirEventoMercadoAr = ({
  tipoEvento,
  tiempoReaccionMs,
  puntos = 0,
  comboEnEvento = 0,
  metadata,
}) =>
  crearEventoSesion({
    tipoEvento,
    habilidad: HABILIDAD_MERCADO_AR,
    tiempoReaccionMs,
    puntos,
    comboEnEvento,
    metadata,
  });

export const calcularPuntajeMercadoAr = ({
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

export const construirResumenPartidaMercadoAr = ({
  configuracion,
  aciertos,
  errores,
  comboMaximo,
  rondasCompletadas,
  tiempoTotalMs,
  ayudasUsadas = 0,
  estado = ESTADOS_FINALIZACION_SESION.completado,
}) => {
  const puntaje = calcularPuntajeMercadoAr({ aciertos, errores, ayudasUsadas });
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
      habilidad: HABILIDAD_MERCADO_AR,
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
