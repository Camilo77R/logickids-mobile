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
  ) || 'Fecha y hora no registradas';

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

export default function ActivitiesTabScreen({ sessions, loading }) {
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
        <DashboardSessionCard key={session.id} session={session} />
      ))}
    </View>
  );
}

function DashboardSessionCard({ session }) {
  const rankingTop = (session.ranking ?? []).slice(0, 3);
  const studentRanking = (session.ranking ?? []).find((entry) => entry.isCurrentStudent) ?? null;
  const games = getIntegratedSessionGames(session);
  const results = session.results ?? [];
  const levelsPlayed = results.length;
  const hits = getSessionHitsCount(session);
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
    <View style={styles.dashboardSessionCard}>
      <View style={styles.dashboardSessionHead}>
        <View style={styles.sessionIcon}>
          <Ionicons name={session.source === 'active' ? 'radio' : 'checkmark-circle'} size={22} color={colors.purple} />
        </View>
        <View style={styles.dashboardSessionTitleBlock}>
          <Text style={styles.dashboardSessionTitle}>{session.title}</Text>
          <Text style={styles.dashboardSessionSubtitle}>
            {session.activityDetail ? `${session.activityDetail} - ` : ''}{getSessionGamesLabel(games)}
          </Text>
        </View>
        <SessionStatusPill label={session.stateLabel} />
      </View>

      <View style={styles.dashboardSessionMeta}>
        <ClassMeta icon="game-controller" label="Juegos" value={String(games.length)} />
        <ClassMeta icon="checkmark-done" label="Aciertos" value={String(hits)} />
        <ClassMeta icon="layers" label="Niveles" value={String(levelsPlayed)} />
      </View>

      <View style={styles.dashboardSessionMeta}>
        <ClassMeta icon="calendar" label="Fecha" value={getSessionDateLabel(session)} />
        <ClassMeta
          icon="podium"
          label="Ranking"
          value={studentRanking ? `Tu puesto #${studentRanking.position}` : rankingTop.length ? 'Ranking listo' : 'Sin ranking'}
        />
      </View>

      <View style={styles.sessionDetailPanel}>
        <Text style={styles.sessionDetailTitle}>Juegos de esta sesion</Text>
        {games.length ? games.map((game) => {
          const gameResults = results.filter((result) => getResultGameSlug(result) === game.slug);
          const completed = gameResults.some((result) =>
            TERMINAL_PARTICIPANT_STATES.has(result.status ?? result.estado),
          );
          const gameHits = gameResults.reduce((sum, result) => sum + Number(result.aciertos ?? result.hits ?? 0), 0);

          return (
            <View key={game.slug ?? game.title} style={styles.sessionGameDetailRow}>
              <Ionicons name={getGameIcon(game.slug)} size={17} color={colors.purple} />
              <View style={styles.sessionGameDetailText}>
                <Text style={styles.sessionGameDetailTitle}>{game.title}</Text>
                <Text style={styles.sessionGameDetailMeta}>
                  {completed ? 'Completado' : session.source === 'active' ? 'En progreso' : 'Sin resultado'} - {gameHits} acierto(s) - {gameResults.length} nivel(es)
                </Text>
              </View>
            </View>
          );
        }) : (
          <Text style={styles.sessionGameDetailMeta}>Esta sesion no tiene juegos asignados.</Text>
        )}
      </View>

      {sessionSkills.length ? (
        <View style={styles.sessionSkillsPanel}>
          <Text style={styles.sessionSkillsTitle}>Habilidades</Text>
          <View style={styles.sessionSkillsList}>
            {sessionSkills.map((skill) => (
              <View key={skill.name} style={styles.sessionSkillChip}>
                <Ionicons name={skill.icon} size={14} color={colors.white} />
                <Text style={styles.sessionSkillChipText}>{skill.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ClassMeta({ icon, label, value }) {
  return (
    <View style={styles.classMeta}>
      <Ionicons name={icon} size={18} color={colors.purple} />
      <Text style={styles.classMetaLabel}>{label}</Text>
      <Text style={styles.classMetaValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SessionStatusPill({ label }) {
  const isActive = label === 'En progreso';
  const isDone = label === 'Finalizada';

  return (
    <View style={[
      styles.sessionStatusPill,
      isActive && styles.sessionStatusPillActive,
      isDone && styles.sessionStatusPillDone,
    ]}>
      <Text style={[
        styles.sessionStatusPillText,
        isActive && styles.sessionStatusPillTextActive,
        isDone && styles.sessionStatusPillTextDone,
      ]}>
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
  header: { gap: 2 },
  title: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
  },
  sessionList: { gap: spacing.md },
  dashboardSessionCard: {
    borderRadius: 24,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.soft,
  },
  dashboardSessionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardSessionTitleBlock: { flex: 1, gap: 2 },
  dashboardSessionTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 20,
  },
  dashboardSessionSubtitle: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    lineHeight: 15,
  },
  dashboardSessionMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  classMeta: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: 3,
  },
  classMetaLabel: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    textAlign: 'center',
  },
  classMetaValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  sessionDetailPanel: {
    borderRadius: 18,
    backgroundColor: '#F9F4FF',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sessionDetailTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  sessionGameDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionGameDetailText: { flex: 1 },
  sessionGameDetailTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  sessionGameDetailMeta: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
  },
  sessionSkillsPanel: { gap: spacing.sm },
  sessionSkillsTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  sessionSkillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sessionSkillChip: {
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
  },
  sessionSkillChipText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 10,
  },
  sessionStatusPill: {
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: '#ECEFF3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  sessionStatusPillActive: { backgroundColor: '#DDF8EA' },
  sessionStatusPillDone: { backgroundColor: '#F3E8FA' },
  sessionStatusPillText: {
    color: '#5F6673',
    fontFamily: fonts.black,
    fontSize: 10,
  },
  sessionStatusPillTextActive: { color: '#157347' },
  sessionStatusPillTextDone: { color: colors.purple },
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
    fontFamily: fonts.black,
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
