export const ESTADOS_DETECCION_SUPERFICIE_AR = Object.freeze({
  buscando: 'buscando',
  superficiesDisponibles: 'superficies-disponibles',
  superficieSeleccionada: 'superficie-seleccionada',
});

export const crearEstadoInicialDeteccionSuperficieAr = () => ({
  estado: ESTADOS_DETECCION_SUPERFICIE_AR.buscando,
  cantidadSuperficies: 0,
  superficieSeleccionada: false,
});

export const reducirDeteccionSuperficieAr = (estado, evento) => {
  switch (evento.tipo) {
    case 'ancla-registrada': {
      const cantidadSuperficies = Math.max(1, evento.cantidadSuperficies ?? 1);
      return {
        ...estado,
        estado: ESTADOS_DETECCION_SUPERFICIE_AR.superficiesDisponibles,
        cantidadSuperficies,
      };
    }
    case 'anclas-vacias':
      return {
        ...estado,
        estado: ESTADOS_DETECCION_SUPERFICIE_AR.buscando,
        cantidadSuperficies: 0,
        superficieSeleccionada: false,
      };
    case 'superficie-seleccionada':
      return {
        ...estado,
        estado: ESTADOS_DETECCION_SUPERFICIE_AR.superficieSeleccionada,
        superficieSeleccionada: true,
      };
    case 'reiniciar-seleccion':
      return crearEstadoInicialDeteccionSuperficieAr();
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

