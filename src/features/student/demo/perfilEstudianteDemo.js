/**
 * Demo temporal mientras otro frente conecta login + mi-perfil real.
 *
 * IMPORTANTE:
 * la forma del objeto replica el contrato real de obtenerPerfilInfantil en el
 * backend. Asi evitamos acoplar el dashboard a un invento local.
 */
export const crearPerfilEstudianteDemo = ({ sesionActiva, slugJuego, tituloJuego }) => ({
  id: 1,
  nombre: 'Estudiante Demo',
  edad: 7,
  color_avatar: '#3B82F6',
  sesion_activa: sesionActiva,
  creado_en: null,
  estado: 'activo',
  grupo_id: 101,
  grupo_nombre: 'Grupo Demo',
  grupo_activo: true,
  sesion_minijuego_id: sesionActiva ? 501 : null,
  sesion_minijuego_slug: sesionActiva ? slugJuego : null,
  sesion_minijuego_titulo: sesionActiva ? tituloJuego : null,
});
