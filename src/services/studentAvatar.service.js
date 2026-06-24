const DICEBEAR_BASE_URL = 'https://api.dicebear.com/7.x/adventurer/svg';

const resolveAvatarSeed = (profile, fallbackProfile) =>
  profile?.nombre ||
  profile?.studentName ||
  profile?.estudiante_nombre ||
  profile?.name ||
  fallbackProfile?.nombre ||
  fallbackProfile?.studentName ||
  fallbackProfile?.estudiante_nombre ||
  fallbackProfile?.name ||
  profile?.id ||
  profile?.estudiante_id ||
  profile?.studentId ||
  fallbackProfile?.id ||
  fallbackProfile?.estudiante_id ||
  fallbackProfile?.studentId ||
  'Estudiante';

export const resolveStudentAvatarUri = (profile, fallbackProfile) => {
  const explicitAvatar =
    profile?.avatar_url ||
    profile?.avatarUrl ||
    fallbackProfile?.avatar_url ||
    fallbackProfile?.avatarUrl;

  if (typeof explicitAvatar === 'string' && explicitAvatar.startsWith('https://')) {
    return explicitAvatar;
  }

  const seed = encodeURIComponent(String(resolveAvatarSeed(profile, fallbackProfile)));
  return `${DICEBEAR_BASE_URL}?seed=${seed}`;
};
