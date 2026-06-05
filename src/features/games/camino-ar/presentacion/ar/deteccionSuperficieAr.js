export const ESTADOS_DETECCION_SUPERFICIE_AR = Object.freeze({
  buscando: 'buscando',
  superficiesDisponibles: 'superficies-disponibles',
  superficieSeleccionada: 'superficie-seleccionada',
});

export const crearEstadoInicialDeteccionSuperficieAr = () => ({
  estado: ESTADOS_DETECCION_SUPERFICIE_AR.buscando,
  cantidadSuperficies: 0,
  superficieSeleccionada: false,
  revisionReinicio: 0,
});

export const reducirDeteccionSuperficieAr = (estado, evento) => {
  switch (evento.tipo) {
    case 'ancla-registrada': {
      const cantidadSuperficies = Math.max(1, evento.cantidadSuperficies ?? 1);

      if (
        estado.cantidadSuperficies === cantidadSuperficies &&
        estado.estado === ESTADOS_DETECCION_SUPERFICIE_AR.superficiesDisponibles
      ) {
        return estado;
      }

      return {
        ...estado,
        estado: ESTADOS_DETECCION_SUPERFICIE_AR.superficiesDisponibles,
        cantidadSuperficies,
      };
    }
    case 'anclas-vacias':
      if (
        estado.estado === ESTADOS_DETECCION_SUPERFICIE_AR.buscando &&
        estado.cantidadSuperficies === 0 &&
        estado.superficieSeleccionada === false
      ) {
        return estado;
      }

      return {
        ...estado,
        estado: ESTADOS_DETECCION_SUPERFICIE_AR.buscando,
        cantidadSuperficies: 0,
        superficieSeleccionada: false,
      };
    case 'superficie-seleccionada':
      if (estado.superficieSeleccionada) {
        return estado;
      }

      return {
        ...estado,
        estado: ESTADOS_DETECCION_SUPERFICIE_AR.superficieSeleccionada,
        superficieSeleccionada: true,
      };
    case 'reiniciar-seleccion':
      if (
        estado.estado === ESTADOS_DETECCION_SUPERFICIE_AR.buscando &&
        estado.cantidadSuperficies === 0 &&
        estado.superficieSeleccionada === false
      ) {
        return estado;
      }

      return {
        ...crearEstadoInicialDeteccionSuperficieAr(),
        revisionReinicio: estado.revisionReinicio + 1,
      };
    default:
      return estado;
  }
};

export const resolverMensajeDeteccionSuperficieAr = (estado) => {
  switch (estado.estado) {
    case ESTADOS_DETECCION_SUPERFICIE_AR.buscando:
      return 'Apunte la camara al piso y mueva el celular despacio para detectar una superficie horizontal.';
    case ESTADOS_DETECCION_SUPERFICIE_AR.superficiesDisponibles:
      return 'Superficie detectada. Toque una zona del piso para colocar el camino.';
    case ESTADOS_DETECCION_SUPERFICIE_AR.superficieSeleccionada:
      return 'Camino colocado sobre el piso. Ahora el estudiante puede seguir el recorrido.';
    default:
      return 'Preparando escena de realidad aumentada.';
  }
};

export const resolverEtiquetaEstadoDeteccionAr = (estado) => {
  switch (estado.estado) {
    case ESTADOS_DETECCION_SUPERFICIE_AR.buscando:
      return 'Buscando piso';
    case ESTADOS_DETECCION_SUPERFICIE_AR.superficiesDisponibles:
      return 'Piso detectado';
    case ESTADOS_DETECCION_SUPERFICIE_AR.superficieSeleccionada:
      return 'Piso fijado';
    default:
      return 'Preparando AR';
  }
};
