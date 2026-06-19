/**
 * AVATAR SERVICE - Unificación global de fuentes de avatar
 * 
 * Centraliza la lógica para obtener avatares de múltiples fuentes
 * Soporta: avatar, photoURL, photo, image, profileImage, profile.avatar, etc.
 * 
 * PROBLEMA RESUELTO:
 * - El 3er puesto no mostraba imagen
 * - Inconsistencias entre profile y ranking
 * - Múltiples campos de avatar sin fallback
 */

/**
 * Avatar por defecto usando ui-avatars API
 * Fallback cuando no hay imagen disponible
 */
export const getDefaultAvatar = (name) => {
  const safeName = encodeURIComponent(name?.trim() || 'User');
  return `https://ui-avatars.com/api/?name=${safeName}&background=random&color=fff&bold=true`;
};

/**
 * FUNCIÓN PRINCIPAL - Obtener avatar de CUALQUIER estructura de datos
 * 
 * Busca en este orden:
 * 1. user.avatar
 * 2. user.photoURL
 * 3. user.photo
 * 4. user.image
 * 5. user.profileImage
 * 6. user.profile.avatar
 * 7. user.profile.photoURL
 * 8. user.profile.photo
 * 9. Fallback a ui-avatars
 * 
 * @param {Object} user - Usuario o entrada de ranking
 * @returns {String} URL de avatar o fallback
 */
export const getAvatar = (user) => {
  if (!user || typeof user !== 'object') {
    return getDefaultAvatar('User');
  }

  const nameForFallback = user.name || user.studentName || user.nombre || 'User';

  // Búsqueda en cascada - Retorna el PRIMER valor válido encontrado
  const avatarUrl =
    user.avatar ||
    user.photoURL ||
    user.photo ||
    user.image ||
    user.profileImage ||
    user.profile?.avatar ||
    user.profile?.photoURL ||
    user.profile?.photo ||
    user.avatarUrl ||
    user.imagenPerfil ||
    null;

  // Si encontró algo, retorna; sino, fallback
  if (avatarUrl) {
    return avatarUrl;
  }

  return getDefaultAvatar(nameForFallback);
};

/**
 * Normalizar entrada de ranking - Preservar TODOS los campos de avatar
 * 
 * Asegura que las entradas de ranking conserven toda la info de avatar
 * para evitar pérdida de datos entre servicios
 */
export const preserveAvatarFields = (entry = {}) => {
  return {
    ...entry,
    // Explícitamente preservar todos los campos posibles
    avatar: entry.avatar || null,
    photoURL: entry.photoURL || null,
    photo: entry.photo || null,
    image: entry.image || null,
    profileImage: entry.profileImage || null,
    imagenPerfil: entry.imagenPerfil || null,
    avatarUrl: entry.avatarUrl || null,
    profile: entry.profile || {},
  };
};

/**
 * Validar si un usuario tiene avatar válido
 * Útil para debugging
 */
export const hasValidAvatar = (user) => {
  if (!user) return false;
  return Boolean(
    user.avatar ||
    user.photoURL ||
    user.photo ||
    user.image ||
    user.profileImage ||
    user.profile?.avatar ||
    user.profile?.photoURL ||
    user.profile?.photo
  );
};

export const createAvatarService = () => ({
  getAvatar,
  getDefaultAvatar,
  preserveAvatarFields,
  hasValidAvatar,
});
