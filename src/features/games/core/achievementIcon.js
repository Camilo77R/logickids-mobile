const ACHIEVEMENT_ICON_MAP = Object.freeze({
  target: '🎯',
  precision: '🎯',
  precision_elite: '🎯',
  memory: '🧠',
  logic: '🧩',
  patterns: '🚂',
  reasoning: '🛍️',
  attention: '🔎',
  speed: '⚡',
  combo: '🔥',
  streak: '🔥',
  star: '⭐',
  trophy: '🏆',
  medal: '🏅',
  champion: '🏆',
  marathon: '🚀',
  maratonista: '🚀',
});

const normalizeIconKey = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

export const resolveAchievementIcon = (achievement) => {
  const directIcon =
    achievement?.icono ??
    achievement?.icono_logro ??
    achievement?.emoji;

  if (typeof directIcon === 'string' && directIcon.trim()) {
    const normalizedDirectIcon = normalizeIconKey(directIcon);

    if (ACHIEVEMENT_ICON_MAP[normalizedDirectIcon]) {
      return ACHIEVEMENT_ICON_MAP[normalizedDirectIcon];
    }

    return directIcon;
  }

  const iconKey = normalizeIconKey(
    achievement?.icon_key ??
    achievement?.iconKey ??
    achievement?.tipo ??
    achievement?.nombre_logro ??
    achievement?.nombre,
  );

  return ACHIEVEMENT_ICON_MAP[iconKey] ?? '🏅';
};
