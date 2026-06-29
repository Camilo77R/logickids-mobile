import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATALOGO_JUEGOS } from '../features/games/core/catalogoJuegos';
import { colors, fonts, shadows, spacing } from '../constants/theme';

const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'abandonado', 'cerrado']);
const INTEGRATED_GAME_SLUGS = new Set(
  ['caminoAr', 'trenFiguras', 'robotLogico', 'mercadoInteligente', 'objetoPerdido']
    .map((gameKey) => CATALOGO_JUEGOS[gameKey]?.slug)
    .filter(Boolean),
);

const getGameIcon = (slug = '') => {
  if (slug.includes('tren')) return 'shapes';
  if (slug.includes('mercado')) return 'basket';
  if (slug.includes('camino')) return 'trail-sign';
  if (slug.includes('robot')) return 'hardware-chip';
  if (slug.includes('objeto') || slug.includes('atencion')) return 'search';
  return 'game-controller';
};

const getResultGameSlug = (result = {}) =>
  result.game?.slug ?? result.slug ?? result.minijuego_slug ?? null;

const getSessionGamesLabel = (games = []) => {
  if (!games.length) return 'Sin juegos asignados';
  return games.map((game) => game.title).join(' + ');
};

const getPrimaryGameLabel = (session, games = []) => {
  if (session?.activityDetail) return session.activityDetail;
  if (games.length) return getSessionGamesLabel(games);
  return 'Sin juegos registrados';
};

const getSessionHitsCount = (session) =>
  (session?.results ?? []).reduce(
    (sum, result) => sum + Number(result.aciertos ?? result.hits ?? 0),
    0,
  );

const formatSessionDateTime = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getSessionDateLabel = (session) =>
  formatSessionDateTime(
    session?.finishedAt ??
      session?.startedAt ??
      session?.openedAt ??
      session?.abierta_en ??
      session?.results?.find((result) => result.finalizada_en ?? result.finishedAt)?.finalizada_en ??
      session?.results?.find((result) => result.finalizada_en ?? result.finishedAt)?.finishedAt ??
      session?.results?.find((result) => result.iniciada_en ?? result.startedAt)?.iniciada_en ??
      session?.results?.find((result) => result.iniciada_en ?? result.startedAt)?.startedAt,
  ) || 'Sin fecha registrada';

const getIntegratedSessionGames = (session) => {
  const assignedGames = (session?.assignedGames ?? []).filter((game) => INTEGRATED_GAME_SLUGS.has(game.slug));
  if (assignedGames.length) return assignedGames;

  const gamesBySlug = new Map();
  (session?.results ?? []).forEach((result) => {
    const slug = result.game?.slug ?? result.minijuego_slug ?? result.slug;
    if (!INTEGRATED_GAME_SLUGS.has(slug) || gamesBySlug.has(slug)) return;
    gamesBySlug.set(slug, result.game ?? {
      slug,
      title: result.minijuego_titulo ?? result.minijuego ?? 'Juego',
    });
  });

  return [...gamesBySlug.values()];
};

const getSessionRankingLabel = (session) => {
  const studentRanking = (session?.ranking ?? []).find((entry) => entry.isCurrentStudent) ?? null;
  if (studentRanking?.position) return `#${studentRanking.position}`;
  return 'Sin ranking';
};

const normalizeStatusLabel = (label = '') => {
  const normalized = String(label).toLowerCase();
  if (normalized.includes('progreso') || normalized.includes('activa')) return 'En progreso';
  if (normalized.includes('final') || normalized.includes('complet')) return 'Completada';
  if (normalized.includes('pend')) return 'Pendiente';
  if (normalized.includes('bloq') || normalized.includes('cerr')) return 'No disponible';
  return label || 'Pendiente';
};

const getStatusTone = (label = '') => {
  const normalized = normalizeStatusLabel(label);
  if (normalized === 'En progreso') return 'active';
  if (normalized === 'Completada') return 'done';
  if (normalized === 'Pendiente') return 'pending';
  return 'disabled';
};

const getGameStatusLabel = ({ gameResults, session }) => {
  const completed = gameResults.some((result) =>
    TERMINAL_PARTICIPANT_STATES.has(result.status ?? result.estado),
  );

  if (completed) return 'Completado';
  if (session?.source === 'active') return 'En progreso';
  return 'Sin resultado';
};

export default function ActivitiesTabScreen({ sessions = [], loading }) {
  if (loading) return <LoadingPanel text="Cargando sesiones..." />;

  return (
    <View style={styles.sessionsScreen}>
      <View style={styles.header}>
        <Text style={styles.title}>Actividades</Text>
        <Text style={styles.subtitle}>Detalle de tus sesiones jugadas</Text>
      </View>
      <SessionList sessions={sessions} />
    </View>
  );
}

function SessionList({ sessions }) {
  if (!sessions.length) {
    return (
      <EmptyPanel
        icon="calendar"
        title="Sin sesiones todavia"
        text="Tu tutor debe abrir una clase para que aparezca aqui."
      />
    );
  }

  return (
    <View style={styles.sessionList}>
      {sessions.map((session) => (
        <ActivitySessionCard
          key={session.id}
          session={session}
        />
      ))}
    </View>
  );
}

function ActivitySessionCard({ session }) {
  const games = getIntegratedSessionGames(session);
  const results = session.results ?? [];
  const levelsPlayed = results.length;
  const hits = getSessionHitsCount(session);
  const statusLabel = normalizeStatusLabel(session.stateLabel);
  const rankingLabel = getSessionRankingLabel(session);
  const primaryGameLabel = getPrimaryGameLabel(session, games);
  const sessionSkills = useMemo(() => {
    const skillsMap = new Map();
    games.forEach((game) => {
      if (game.skillName && !skillsMap.has(game.skillName)) {
        skillsMap.set(game.skillName, { name: game.skillName, icon: getGameIcon(game.slug) });
      }
    });
    return [...skillsMap.values()];
  }, [games]);

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionIcon}>
          <Ionicons name={session.source === 'active' ? 'radio' : 'checkmark'} size={28} color={colors.purple} />
        </View>
        <View style={styles.sessionTitleBlock}>
          <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
          <Text style={styles.sessionSubtitle} numberOfLines={1}>{primaryGameLabel}</Text>
        </View>
        <SessionStatusBadge label={statusLabel} />
      </View>

      <View style={styles.statsGrid}>
        <SessionStatItem icon="game-controller" label="Juegos" value={String(games.length)} />
        <SessionStatItem icon="checkmark-done" label="Aciertos" value={String(hits)} />
        <SessionStatItem icon="layers" label="Niveles" value={String(levelsPlayed)} />
        <SessionStatItem icon="podium" label="Ranking" value={rankingLabel} />
      </View>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={18} color={colors.purple} />
        <Text style={styles.dateText}>{getSessionDateLabel(session)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.sectionBlock}>
        <Text style={styles.sessionDetailTitle}>Juegos de esta sesion</Text>
        {games.length ? (
          <View style={styles.gameRows}>
            {games.map((game) => (
              <SessionGameRow
                key={game.slug ?? game.title}
                game={game}
                results={results}
                session={session}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyInlineText}>Sin juegos registrados</Text>
        )}
      </View>

      {sessionSkills.length ? (
        <View style={styles.skillsBlock}>
          <Text style={styles.sessionSkillsTitle}>Habilidades</Text>
          <View style={styles.sessionSkillsList}>
            {sessionSkills.map((skill) => (
              <SkillChip key={skill.name} skill={skill} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SessionStatItem({ icon, label, value }) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statTopRow}>
        <Ionicons name={icon} size={18} color={colors.purple} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SessionGameRow({ game, results, session }) {
  const gameResults = results.filter((result) => getResultGameSlug(result) === game.slug);
  const gameHits = gameResults.reduce((sum, result) => sum + Number(result.aciertos ?? result.hits ?? 0), 0);
  const status = getGameStatusLabel({ gameResults, session });

  return (
    <View style={styles.gameRow}>
      <Ionicons name={getGameIcon(game.slug)} size={20} color={colors.purple} />
      <Text style={styles.gameRowText} numberOfLines={2}>
        <Text style={styles.gameRowTitle}>{game.title}</Text>
        {` - ${status} - ${gameHits} acierto(s) - ${gameResults.length} nivel(es)`}
      </Text>
    </View>
  );
}

function SkillChip({ skill }) {
  return (
    <View style={styles.sessionSkillChip}>
      <Ionicons name={skill.icon} size={14} color={colors.white} />
      <Text style={styles.sessionSkillChipText}>{skill.name}</Text>
    </View>
  );
}

function SessionStatusBadge({ label }) {
  const tone = getStatusTone(label);

  return (
    <View style={[styles.sessionStatusPill, styles[`sessionStatusPill_${tone}`]]}>
      <Text style={[styles.sessionStatusPillText, styles[`sessionStatusPillText_${tone}`]]}>
        {label}
      </Text>
    </View>
  );
}

function LoadingPanel({ text }) {
  return (
    <View style={styles.loadingPanel}>
      <ActivityIndicator color={colors.purple} />
      <Text style={styles.loadingPanelText}>{text}</Text>
    </View>
  );
}

function EmptyPanel({ icon, title, text }) {
  return (
    <View style={styles.sessionsEmpty}>
      <Ionicons name={icon} size={34} color={colors.purple} />
      <Text style={styles.sessionsEmptyTitle}>{title}</Text>
      <Text style={styles.sessionsEmptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sessionsScreen: { gap: spacing.md },
  header: {
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  title: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  sessionList: { gap: spacing.md },
  sessionCard: {
    borderRadius: 22,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionIcon: {
    width: 56,
    height: 56,
    borderRadius: 22,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitleBlock: { flex: 1, gap: 2 },
  sessionTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 23,
  },
  sessionSubtitle: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statItem: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: '#FBF7FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 3,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statLabel: {
    color: colors.textGray,
    fontFamily: fonts.regular,
    fontSize: 10,
    textAlign: 'center',
  },
  statValue: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 21,
    textAlign: 'center',
  },
  dateRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  sectionBlock: {
    gap: spacing.xs,
  },
  sessionDetailTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  gameRows: {
    gap: spacing.xs,
  },
  gameRow: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: '#FBF7FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  gameRowText: {
    flex: 1,
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
  },
  gameRowTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
  },
  emptyInlineText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
  },
  skillsBlock: {
    gap: spacing.xs,
  },
  sessionSkillsTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  sessionSkillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sessionSkillChip: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  sessionSkillChipText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 10,
  },
  sessionStatusPill: {
    minHeight: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    maxWidth: 112,
  },
  sessionStatusPill_active: {
    backgroundColor: '#D5F8E5',
  },
  sessionStatusPill_done: {
    backgroundColor: '#FFF2BF',
  },
  sessionStatusPill_pending: {
    backgroundColor: '#EEF0F4',
  },
  sessionStatusPill_disabled: {
    backgroundColor: '#ECE9F1',
  },
  sessionStatusPillText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    textAlign: 'center',
  },
  sessionStatusPillText_active: {
    color: '#137A43',
  },
  sessionStatusPillText_done: {
    color: colors.purpleDark,
  },
  sessionStatusPillText_pending: {
    color: '#5F6673',
  },
  sessionStatusPillText_disabled: {
    color: '#6F6A83',
  },
  loadingPanel: {
    minHeight: 160,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingPanelText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  sessionsEmpty: {
    minHeight: 170,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sessionsEmptyTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  sessionsEmptyText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
