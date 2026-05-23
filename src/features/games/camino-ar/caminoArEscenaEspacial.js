const PARAMETROS_ESCENA_ESPACIAL = Object.freeze({
  separacionBaldosas: 0.28,
  tamanoBaldosa: 0.18,
  alturaBase: 0.01,
  elevacionActiva: 0.025,
});

const calcularDimensionPlano = (cantidadElementos, separacionBaldosas, tamanoBaldosa) =>
  Number((cantidadElementos * separacionBaldosas + tamanoBaldosa).toFixed(3));

const calcularPosicionBaldosa = ({
  indice,
  columnas,
  totalFilas,
  separacionBaldosas,
}) => {
  const fila = Math.floor(indice / columnas);
  const columna = indice % columnas;
  const centroColumnas = (columnas - 1) / 2;
  const centroFilas = (totalFilas - 1) / 2;

  const x = Number(((columna - centroColumnas) * separacionBaldosas).toFixed(3));
  const z = Number(((fila - centroFilas) * separacionBaldosas).toFixed(3));

  return [x, 0, z];
};

const resolverEstadoVisual = (baldosa) => {
  if (baldosa.activa) {
    return 'activa';
  }

  if (baldosa.deshabilitada) {
    return 'bloqueada';
  }

  return 'lista';
};

/**
 * Construye un modelo espacial agnostico al renderer.
 *
 * POR QUÉ:
 * React Vision / Viro es infraestructura nativa. El juego no debería saber
 * nada de ViroARSceneNavigator ni de ARKit/ARCore. Solo necesita un modelo
 * espacial puro que cualquier renderer pueda interpretar.
 */
export const construirEscenaEspacialCaminoAr = ({
  escena,
  configuracion,
  parametros = PARAMETROS_ESCENA_ESPACIAL,
}) => {
  const columnas = escena.tablero.columnas;
  const totalBaldosas = escena.tablero.baldosas.length;
  const totalFilas = Math.ceil(totalBaldosas / columnas);
  const anchoPlano = calcularDimensionPlano(
    columnas,
    parametros.separacionBaldosas,
    parametros.tamanoBaldosa,
  );
  const profundoPlano = calcularDimensionPlano(
    totalFilas,
    parametros.separacionBaldosas,
    parametros.tamanoBaldosa,
  );

  return {
    plano: {
      tipo: 'horizontal',
      ancho: anchoPlano,
      profundo: profundoPlano,
      posicion: [0, 0, 0],
    },
    hud: {
      titulo: escena.encabezado.titulo,
      subtitulo: escena.estadoActual.mensaje,
      estado: escena.estadoActual.descripcion,
    },
    parametrosMundo: {
      tamanoBaldosa: parametros.tamanoBaldosa,
      separacionBaldosas: parametros.separacionBaldosas,
      alturaBase: parametros.alturaBase,
      elevacionActiva: parametros.elevacionActiva,
    },
    baldosas: escena.tablero.baldosas.map((baldosa) => {
      const estadoVisual = resolverEstadoVisual(baldosa);
      const altura =
        estadoVisual === 'activa'
          ? parametros.alturaBase + parametros.elevacionActiva
          : parametros.alturaBase;

      return {
        id: baldosa.id,
        indice: baldosa.indice,
        numeroVisible: baldosa.numeroVisible,
        estadoVisual,
        interactiva: !baldosa.deshabilitada,
        posicion: calcularPosicionBaldosa({
          indice: baldosa.indice,
          columnas,
          totalFilas,
          separacionBaldosas: parametros.separacionBaldosas,
        }),
        escala: [
          parametros.tamanoBaldosa,
          Number(altura.toFixed(3)),
          parametros.tamanoBaldosa,
        ],
      };
    }),
    adaptacion: {
      dificultad: configuracion.dificultad,
      fuente: configuracion.fuenteAdaptacion,
      modoPresentacion: configuracion.modoPresentacion,
    },
  };
};

