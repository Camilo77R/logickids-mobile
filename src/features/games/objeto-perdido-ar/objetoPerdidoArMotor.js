import {
  crearEventoSesion,
  crearFinalizacionSesion,
  ESTADOS_FINALIZACION_SESION,
} from '../core/contratoSesionJuego';
import {
  crearEstadisticasJuegoComun,
  crearResultadoJuegoComun,
} from '../core/contratoResultadoJuego';
import { HABILIDAD_OBJETO_PERDIDO_AR } from './objetoPerdidoAr.constants';
import { obtenerObjetosDisponiblesPorDificultad } from './objetoPerdidoArObjetos';

const ZONA_BUSQUEDA_RESPALDO = Object.freeze({
  modo: 'envolvente-360',
  radioMinimo: 1.6,
  radioMaximo: 4.2,
  alturaMinima: -1.05,
  alturaMaxima: -0.3,
  separacionMinima: 1.25,
  coberturaGrados: 360,
});

const mezclar = (elementos) => {
  const copia = [...elementos];

  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const indiceAleatorio = Math.floor(Math.random() * (indice + 1));
    [copia[indice], copia[indiceAleatorio]] = [copia[indiceAleatorio], copia[indice]];
  }

  return copia;
};

const seleccionarObjetivo = (objetosDisponibles) =>
  objetosDisponibles[Math.floor(Math.random() * objetosDisponibles.length)];

const aleatorioEntre = (minimo, maximo) => minimo + Math.random() * (maximo - minimo);

const distanciaHorizontal = (a, b) => {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
};

const crearPosicionEnZonaBusqueda = (zona, posicionesExistentes) => {
  const radioMinimo = Math.min(zona.radioMinimo, zona.radioMaximo);
  const radioMaximo = Math.max(zona.radioMinimo, zona.radioMaximo);
  const alturaMinima = Math.min(zona.alturaMinima, zona.alturaMaxima);
  const alturaMaxima = Math.max(zona.alturaMinima, zona.alturaMaxima);
  const coberturaRadianes = Math.min(Math.max(zona.coberturaGrados, 90), 360) * (Math.PI / 180);
  const anguloInicial = -coberturaRadianes / 2;
  const centro = [0, 0, 0];

  for (let intento = 0; intento < 28; intento += 1) {
    const angulo = aleatorioEntre(anguloInicial, anguloInicial + coberturaRadianes);
    const radio = aleatorioEntre(radioMinimo, radioMaximo);
    const posicion = [
      Number((Math.sin(angulo) * radio).toFixed(2)),
      Number(aleatorioEntre(alturaMinima, alturaMaxima).toFixed(2)),
      Number((-Math.cos(angulo) * radio).toFixed(2)),
    ];

    if (
      distanciaHorizontal(posicion, centro) >= radioMinimo &&
      posicionesExistentes.every(
        (posicionExistente) =>
          distanciaHorizontal(posicion, posicionExistente) >= zona.separacionMinima,
      )
    ) {
      return posicion;
    }
  }

  const angulo = aleatorioEntre(anguloInicial, anguloInicial + coberturaRadianes);
  const radio = aleatorioEntre(radioMinimo, radioMaximo);

  return [
    Number((Math.sin(angulo) * radio).toFixed(2)),
    Number(aleatorioEntre(alturaMinima, alturaMaxima).toFixed(2)),
    Number((-Math.cos(angulo) * radio).toFixed(2)),
  ];
};

const crearPosicionesZonaBusqueda = (cantidad, zonaEntrada = {}) => {
  const zona = {
    ...ZONA_BUSQUEDA_RESPALDO,
    ...zonaEntrada,
  };
  const posiciones = [];

  for (let indice = 0; indice < cantidad; indice += 1) {
    posiciones.push(crearPosicionEnZonaBusqueda(zona, posiciones));
  }

  return posiciones;
};

const construirTextoMision = ({ objetivo, tipoMision }) => {
  if (tipoMision === 'caracteristica') {
    return `Encuentra algo que sirve para ${objetivo.uso}.`;
  }

  if (tipoMision === 'condicion') {
    return `Encuentra el objeto ${objetivo.color} que tiene forma ${objetivo.forma}.`;
  }

  return `Encuentra el objeto: ${objetivo.nombre}.`;
};

export const crearRondaObjetoPerdidoAr = ({ configuracion, numeroRonda = 1 }) => {
  const objetosDisponibles = obtenerObjetosDisponiblesPorDificultad(configuracion.dificultad);
  const cantidad = Math.min(
    configuracion.configuracion.objetosPorRonda,
    objetosDisponibles.length,
  );
  const posiciones = crearPosicionesZonaBusqueda(
    cantidad,
    configuracion.configuracion.zonaBusqueda,
  );
  const objetivo = seleccionarObjetivo(objetosDisponibles);
  const distractores = mezclar(objetosDisponibles.filter((objeto) => objeto.id !== objetivo.id))
    .slice(0, Math.max(0, cantidad - 1));
  const objetos = mezclar([objetivo, ...distractores]).map((objeto, indice) => ({
    ...objeto,
    indice,
    posicion: posiciones[indice],
  }));

  return {
    id: `ronda-${numeroRonda}`,
    numeroRonda,
    objetivoId: objetivo.id,
    objetivo,
    mision: construirTextoMision({
      objetivo,
      tipoMision: configuracion.configuracion.tipoMision,
    }),
    objetos,
  };
};

export const construirEventoObjetoPerdidoAr = ({
  tipoEvento,
  tiempoReaccionMs,
  puntos = 0,
  comboEnEvento = 0,
  metadata,
}) =>
  crearEventoSesion({
    tipoEvento,
    habilidad: HABILIDAD_OBJETO_PERDIDO_AR,
    tiempoReaccionMs,
    puntos,
    comboEnEvento,
    metadata,
  });

export const construirResumenObjetoPerdidoAr = ({
  configuracion,
  aciertos,
  errores,
  ayudasUsadas,
  comboMaximo,
  rondasCompletadas,
  tiempoTranscurridoMs,
}) => {
  const bonosRapidez = Math.max(0, aciertos - ayudasUsadas);
  const puntaje = Math.max(aciertos * 10 + bonosRapidez * 5 - errores * 3 - ayudasUsadas * 2, 0);
  const finalizacionSesion = crearFinalizacionSesion({
    puntaje,
    aciertos,
    errores,
    comboMaximo,
    dificultad: configuracion.dificultad,
    estado: ESTADOS_FINALIZACION_SESION.completado,
  });

  return crearResultadoJuegoComun({
    juego: {
      slug: configuracion.slug,
      titulo: configuracion.titulo,
      habilidad: HABILIDAD_OBJETO_PERDIDO_AR,
      fuenteAdaptacion: configuracion.fuenteAdaptacion,
      versionAdaptacion: configuracion.versionAdaptacion,
    },
    finalizacionSesion,
    estadisticas: crearEstadisticasJuegoComun({
      puntaje,
      aciertos,
      errores,
      comboMaximo,
      tiempoTotalMs: tiempoTranscurridoMs,
      pistasUsadas: ayudasUsadas,
      nivelAlcanzado: rondasCompletadas,
      dificultad: configuracion.dificultad,
      estadoSesion: finalizacionSesion.estado,
    }),
    detalles: {
      rondasCompletadas,
      rondasPorPartida: configuracion.configuracion.rondasPorPartida,
      objetosPorRonda: configuracion.configuracion.objetosPorRonda,
      tableroLimitado: configuracion.configuracion.usarTableroLimitado,
      zonaBusqueda: configuracion.configuracion.zonaBusqueda,
    },
  });
};
