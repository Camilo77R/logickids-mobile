import { resolverTemaCategoriaMercado } from './mercadoArTheme';

const redondear = (valor) => Number(valor.toFixed(3));

const construirPosicionProducto = ({ indice, columnas = 3, anchoCelda = 0.22, profundidadCelda = 0.18 }) => {
  const fila = Math.floor(indice / columnas);
  const columna = indice % columnas;
  const offsetX = (columna - (columnas - 1) / 2) * anchoCelda;
  const offsetZ = fila * profundidadCelda;

  return [redondear(offsetX), 0.06, redondear(offsetZ)];
};

export const construirEscenaEspacialMercado = ({
  ronda,
  seleccionadosIds = [],
  objetivoTexto,
  modoPresentacion = 'ar-superficie',
}) => {
  const productos = (ronda?.oferta ?? []).map((producto, indice) => {
    const tema = resolverTemaCategoriaMercado(producto.categoria);
    const seleccionado = seleccionadosIds.includes(producto.id);

    return {
      id: producto.id,
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: producto.precio,
      seleccionado,
      posicion: construirPosicionProducto({ indice }),
      escala: seleccionado ? [0.13, 0.13, 0.13] : [0.11, 0.11, 0.11],
      colores: tema,
      elevacion: seleccionado ? 0.025 : 0,
      numeroVisible: indice + 1,
    };
  });

  return {
    modoPresentacion,
    plano: {
      ancho: 0.9,
      profundo: 0.62,
      altoMostrador: 0.18,
    },
    puesto: {
      titulo: 'Mercado Inteligente',
      subtitulo: objetivoTexto ?? ronda?.objetivo?.textoGuia ?? '',
      cartelPosicion: [0, 0.46, -0.03],
      toldoColor: '#FF9F43',
    },
    productos,
    canasta: {
      posicion: [0.28, 0.08, 0.22],
      seleccionados: productos.filter((producto) => producto.seleccionado).length,
    },
  };
};
