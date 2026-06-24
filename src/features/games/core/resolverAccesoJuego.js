export const ESTADOS_ACCESO_JUEGO = Object.freeze({
  bloqueado: 'bloqueado',
  disponible: 'disponible',
});

const ES_ESTADO_TERMINAL_PARTICIPANTE = new Set([
  'completado',
  'abandonado',
  'cerrado',
]);

/**
 * Traduce el perfil infantil real del backend a una decisión de acceso.
 *
 * PERFIL ESPERADO:
 * - grupo_id
 * - grupo_nombre
 * - grupo_activo
 * - sesion_activa
 * - sesion_minijuego_slug
 * - sesion_minijuego_titulo
 */
export const resolverAccesoJuegoDesdePerfil = ({ perfilEstudiante, slugJuego }) => {
  if (!perfilEstudiante) {
    return {
      estado: ESTADOS_ACCESO_JUEGO.bloqueado,
      motivo: 'Todavia no existe un perfil infantil cargado en la app.',
      juegoHabilitadoSlug: null,
      juegoHabilitadoTitulo: null,
      grupoId: null,
      grupoNombre: null,
    };
  }

  if (!perfilEstudiante.grupo_id || perfilEstudiante.grupo_activo === false) {
    return {
      estado: ESTADOS_ACCESO_JUEGO.bloqueado,
      motivo: 'El estudiante no tiene un grupo activo habilitado para jugar.',
      juegoHabilitadoSlug: null,
      juegoHabilitadoTitulo: null,
      grupoId: perfilEstudiante.grupo_id ?? null,
      grupoNombre: perfilEstudiante.grupo_nombre ?? null,
    };
  }

  if (ES_ESTADO_TERMINAL_PARTICIPANTE.has(perfilEstudiante.sesion_participante_estado)) {
    return {
      estado: ESTADOS_ACCESO_JUEGO.bloqueado,
      motivo:
        perfilEstudiante.sesion_participante_estado === 'completado'
          ? 'Ya completaste tu actividad actual.'
          : 'Tu actividad actual ya fue cerrada para este estudiante.',
      juegoHabilitadoSlug: perfilEstudiante.sesion_minijuego_slug ?? null,
      juegoHabilitadoTitulo: perfilEstudiante.sesion_minijuego_titulo ?? null,
      grupoId: perfilEstudiante.grupo_id,
      grupoNombre: perfilEstudiante.grupo_nombre ?? null,
    };
  }

  if (!perfilEstudiante.sesion_activa) {
    return {
      estado: ESTADOS_ACCESO_JUEGO.bloqueado,
      motivo: 'Tu tutor aun no ha abierto una sesion para este grupo.',
      juegoHabilitadoSlug: perfilEstudiante.sesion_minijuego_slug ?? null,
      juegoHabilitadoTitulo: perfilEstudiante.sesion_minijuego_titulo ?? null,
      grupoId: perfilEstudiante.grupo_id,
      grupoNombre: perfilEstudiante.grupo_nombre ?? null,
    };
  }

  if (!perfilEstudiante.sesion_minijuego_slug) {
    return {
      estado: ESTADOS_ACCESO_JUEGO.bloqueado,
      motivo: 'La sesion esta abierta, pero todavia no tiene un minijuego habilitado.',
      juegoHabilitadoSlug: null,
      juegoHabilitadoTitulo: null,
      grupoId: perfilEstudiante.grupo_id,
      grupoNombre: perfilEstudiante.grupo_nombre ?? null,
    };
  }

  if (perfilEstudiante.sesion_minijuego_slug !== slugJuego) {
    return {
      estado: ESTADOS_ACCESO_JUEGO.bloqueado,
      motivo: `Tu tutor habilito ${perfilEstudiante.sesion_minijuego_titulo ?? 'otro juego'} para esta sesion.`,
      juegoHabilitadoSlug: perfilEstudiante.sesion_minijuego_slug,
      juegoHabilitadoTitulo: perfilEstudiante.sesion_minijuego_titulo ?? null,
      grupoId: perfilEstudiante.grupo_id,
      grupoNombre: perfilEstudiante.grupo_nombre ?? null,
    };
  }

  return {
    estado: ESTADOS_ACCESO_JUEGO.disponible,
    motivo: 'El juego esta disponible para este estudiante.',
    juegoHabilitadoSlug: perfilEstudiante.sesion_minijuego_slug,
    juegoHabilitadoTitulo: perfilEstudiante.sesion_minijuego_titulo ?? null,
    grupoId: perfilEstudiante.grupo_id,
    grupoNombre: perfilEstudiante.grupo_nombre ?? null,
  };
};
