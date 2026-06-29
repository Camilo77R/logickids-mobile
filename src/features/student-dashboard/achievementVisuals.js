const achievementIconMap = {
  memoria_main: require('../../../assets/rewards/trofeo_memoria.png'),
  patrones_main: require('../../../assets/rewards/trofeo_patrones.png'),
  logica_main: require('../../../assets/rewards/trofeo_logica.png'),
  razonar_main: require('../../../assets/rewards/trofeo_razonar.png'),
  atencion_main: require('../../../assets/rewards/trofeo_atencion.png'),
  general_star: require('../../../assets/rewards/trofeo_general.png'),
  precision_main: require('../../../assets/rewards/trofeo_precision.png'),
  explorador_main: require('../../../assets/rewards/trofeo_patrones.png'),
  multitalento_main: require('../../../assets/rewards/trofeo_extra.png'),
};

export const fallbackTrophyImage = achievementIconMap.general_star;

const iconKeyByModule = {
  memoria: 'memoria_main',
  patrones: 'patrones_main',
  logica: 'logica_main',
  razonar: 'razonar_main',
  atencion: 'atencion_main',
};

export const isAchievementUnlocked = (achievement = {}) =>
  Boolean(achievement.isUnlocked ?? achievement.unlocked ?? achievement.desbloqueado ?? achievement.obtenido ?? false);

export const normalizeModuleKey = (value = '') => {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (['memoria', 'memory'].includes(normalized)) return 'memoria';
  if (['patrones', 'pattern', 'patterns', 'tren', 'figuras'].includes(normalized)) return 'patrones';
  if (['logica', 'logic', 'logical'].includes(normalized)) return 'logica';
  if (['razonar', 'razonamiento', 'reason', 'reasoning'].includes(normalized)) return 'razonar';
  if (['atencion', 'attention', 'buscar', 'observacion'].includes(normalized)) return 'atencion';
  return null;
};

export const resolveAchievementIconKey = (achievement = {}) => {
  const directKey = achievement.iconKey ?? achievement.icon_key ?? achievement.icono;
  if (directKey && achievementIconMap[directKey]) return directKey;

  const code = achievement.code ?? achievement.clave ?? achievement.clave_logro;
  if (code && achievementIconMap[code]) return code;

  const moduleKey = normalizeModuleKey(achievement.module ?? achievement.modulo ?? achievement.habilidad);
  if (moduleKey) return iconKeyByModule[moduleKey];

  return 'general_star';
};

export const getAchievementImage = (achievement = {}) =>
  achievementIconMap[resolveAchievementIconKey(achievement)] ?? fallbackTrophyImage;
