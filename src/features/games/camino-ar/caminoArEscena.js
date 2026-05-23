import { ESTADOS_CAMINO_AR } from './caminoAr.constants';

const resolverDescripcionEstado = (fase) =>
  ({
    [ESTADOS_CAMINO_AR.listo]: 'Prepara al estudiante para memorizar el recorrido base.',
    [ESTADOS_CAMINO_AR.mostrandoPatron]:
      'El sistema esta mostrando el patron que luego se debe repetir.',
    [ESTADOS_CAMINO_AR.esperandoRespuesta]:
      'Es turno del estudiante: debe tocar las baldosas en el mismo orden.',
    [ESTADOS_CAMINO_AR.completado]:
      'La ronda cerro bien y quedo lista para persistir sus resultados.',
    [ESTADOS_CAMINO_AR.fallido]:
      'La ronda cerro con error o tiempo agotado. Puede reiniciarse sin ruido.',
  })[fase] ?? 'Estado del juego no reconocido.';

const construirMetricasSesion = ({ configuracion, persistenciaSesion }) => [
  { etiqueta: 'Dificultad', valor: configuracion.dificultad },
  { etiqueta: 'Patron', valor: configuracion.configuracion.longitudPatron },
  { etiqueta: 'Baldosas', valor: configuracion.configuracion.cantidadBaldosas },
  { etiqueta: 'Fuente', valor: configuracion.fuenteAdaptacion },
  { etiqueta: 'Persistencia', valor: persistenciaSesion?.modo ?? 'local' },
  { etiqueta: 'Sync', valor: persistenciaSesion?.estado ?? 'inactiva' },
];

const construirMetricasEstado = ({ estado }) => [
  { etiqueta: 'Tiempo', valor: `${Math.ceil(estado.tiempoRestanteMs / 1000)} s` },
  { etiqueta: 'Aciertos', valor: estado.aciertos },
  { etiqueta: 'Errores', valor: estado.errores },
  { etiqueta: 'Pistas', valor: estado.ayudasRestantes },
];

const construirMetricasResultado = ({ resultado }) => [
  { etiqueta: 'Nivel', valor: resultado.estadisticas.nivelAlcanzado },
  {
    etiqueta: 'Tiempo',
    valor: `${Math.ceil(resultado.estadisticas.tiempoTotalMs / 1000)} s`,
  },
  {
    etiqueta: 'Precision',
    valor: `${resultado.estadisticas.precisionPct}%`,
  },
  { etiqueta: 'Patron', valor: resultado.detalles.patronLongitud },
];

const construirBaldosasEscena = ({ configuracion, estado, columnasTablero }) =>
  Array.from({ length: configuracion.configuracion.cantidadBaldosas }).map((_, indice) => ({
    id: `baldosa-${indice}`,
    indice,
    numeroVisible: indice + 1,
    activa: estado.baldosaActiva === indice,
    deshabilitada: estado.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta,
    varianteColumna: columnasTablero === 2 ? 'dos' : 'tres',
  }));

const construirAccionesEscena = ({
  iniciarPartida,
  usarPista,
  reiniciarPartida,
  puedePedirPista,
}) => ({
  iniciar: {
    etiqueta: 'Iniciar ronda',
    accion: iniciarPartida,
  },
  pista: {
    etiqueta: 'Usar pista',
    accion: usarPista,
    deshabilitada: !puedePedirPista,
  },
  reiniciar: {
    etiqueta: 'Reiniciar',
    accion: reiniciarPartida,
  },
});

/**
 * Traduce el estado interno del juego a un modelo de escena reutilizable.
 *
 * POR QUÉ:
 * la vista 2D y la vista AR no deberían reconstruir reglas visuales cada una
 * por su cuenta. Ambas leen el mismo "mapa de escena".
 */
export const construirEscenaCaminoAr = ({
  configuracion,
  estado,
  columnasTablero,
  persistenciaSesion,
  iniciarPartida,
  reiniciarPartida,
  seleccionarBaldosa,
  usarPista,
  puedePedirPista,
}) => ({
  encabezado: {
    ceja: 'Primer juego real del proyecto',
    titulo: 'Camino AR',
    subtitulo:
      'El nucleo de memoria secuencial ya queda listo en React Native puro. La escena AR se conecta despues.',
  },
  sesion: {
    titulo: 'Sesion base del juego',
    descripcion:
      'Todos empiezan en nivel 1. Mas adelante otra capa podra adaptar esta configuracion con IA sin reescribir el juego.',
    metricas: construirMetricasSesion({ configuracion, persistenciaSesion }),
    errorPersistencia: persistenciaSesion?.error ?? null,
  },
  estadoActual: {
    titulo: 'Estado actual',
    mensaje: estado.mensaje,
    descripcion: resolverDescripcionEstado(estado.fase),
    metricas: construirMetricasEstado({ estado }),
  },
  tablero: {
    titulo: 'Tablero base',
    descripcion:
      'Este tablero ya representa el corazon del juego: mostrar una secuencia y pedirle al nino que la repita en orden.',
    columnas: columnasTablero,
    baldosas: construirBaldosasEscena({ configuracion, estado, columnasTablero }),
    alSeleccionarBaldosa: seleccionarBaldosa,
  },
  acciones: construirAccionesEscena({
    iniciarPartida,
    usarPista,
    reiniciarPartida,
    puedePedirPista,
  }),
  resultado: estado.resultado
    ? {
        visible: true,
        titulo: estado.resultado.detalles.patronResuelto
          ? 'Actividad completada'
          : 'Actividad terminada',
        descripcion: `Contrato comun listo: puntaje ${estado.resultado.estadisticas.puntaje}, ${estado.resultado.estadisticas.aciertos} aciertos, ${estado.resultado.estadisticas.errores} errores y ${estado.resultado.estadisticas.pistasUsadas} pistas usadas.`,
        metricas: construirMetricasResultado({
          resultado: estado.resultado,
        }),
      }
    : {
        visible: false,
      },
});
