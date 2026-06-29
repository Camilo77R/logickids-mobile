import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, shadows, spacing } from '../constants/theme';
import {
  fallbackTrophyImage,
  getAchievementImage,
  isAchievementUnlocked,
} from '../features/student-dashboard/achievementVisuals';

const FILTERS = Object.freeze([
  { id: 'all', label: 'Todos', icon: 'grid' },
  { id: 'unlocked', label: 'Desbloqueados', icon: 'checkmark-circle' },
  { id: 'locked', label: 'Bloqueados', icon: 'lock-closed' },
]);

const getAchievementPoints = (achievement) =>
  achievement.points ?? achievement.puntos ?? achievement.valor ?? '+1';

const buildProgressMessage = (unlockedCount, totalCount) => {
  if (!totalCount || !unlockedCount) {
    return 'Completa actividades para empezar tu camino.';
  }

  if (unlockedCount === totalCount) {
    return 'Completaste todos tus logros. Excelente trabajo.';
  }

  return 'Sigue asi, vas por buen camino.';
};

function LoadingPanel({ text }) {
  return (
    <View style={styles.loadingPanel}>
      <ActivityIndicator color={colors.purple} />
      <Text style={styles.loadingPanelText}>{text}</Text>
    </View>
  );
}

function EmptyPanel() {
  return (
    <View style={styles.emptyPanel}>
      <Image source={fallbackTrophyImage} style={styles.emptyTrophy} resizeMode="contain" />
      <Text style={styles.emptyTitle}>Sin logros todavia</Text>
      <Text style={styles.emptyText}>Completa actividades para desbloquear tus primeros logros.</Text>
    </View>
  );
}

function ProgressHero({ unlockedCount, totalCount }) {
  const progress = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(progress, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [fill, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value}%`,
  }));

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroSparkleOne} />
      <View style={styles.heroSparkleTwo} />
      <View style={styles.heroTextBlock}>
        <Text style={styles.heroEyebrow}>Tu progreso general</Text>
        <Text style={styles.heroNumber}>{unlockedCount}</Text>
        <Text style={styles.heroLabel}>Logros desbloqueados</Text>
        <View style={styles.heroTrack}>
          <Animated.View style={[styles.heroFill, fillStyle]} />
        </View>
        <Text style={styles.heroMessage}>{buildProgressMessage(unlockedCount, totalCount)}</Text>
      </View>
      <Image source={fallbackTrophyImage} style={styles.heroTrophy} resizeMode="contain" />
    </View>
  );
}

function AchievementCard({ achievement, index }) {
  const unlocked = isAchievementUnlocked(achievement);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(index * 70, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(index * 70, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));

    if (unlocked) {
      scale.value = withDelay(
        index * 70 + 140,
        withSequence(
          withTiming(1.06, { duration: 160 }),
          withTiming(1, { duration: 180 }),
        ),
      );
    }
  }, [index, opacity, scale, translateY, unlocked]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.achievementCard, !unlocked && styles.achievementCardLocked, cardStyle]}>
      <View style={styles.trophySlot}>
        <Image source={getAchievementImage(achievement)} style={[styles.trophyIcon, !unlocked && styles.trophyIconLocked]} resizeMode="contain" />
      </View>
      <View style={styles.achievementTextBlock}>
        <Text style={styles.achievementTitle} numberOfLines={1}>{achievement.title}</Text>
        <Text style={styles.achievementDescription} numberOfLines={2}>
          {achievement.description || achievement.gameTitle || 'Logro de actividad'}
        </Text>
        <View style={[styles.statusPill, unlocked ? styles.statusPillUnlocked : styles.statusPillLocked]}>
          <Ionicons name={unlocked ? 'checkmark-circle' : 'lock-closed'} size={13} color={unlocked ? '#0BAA4B' : '#6F6A83'} />
          <Text style={[styles.statusText, unlocked ? styles.statusTextUnlocked : styles.statusTextLocked]}>
            {unlocked ? 'Desbloqueado' : 'Bloqueado'}
          </Text>
        </View>
      </View>
      <Text style={styles.pointsText}>{getAchievementPoints(achievement)} pts</Text>
    </Animated.View>
  );
}

export default function AchievementsTabScreen({ achievements = [], loading }) {
  const [activeFilter, setActiveFilter] = useState('all');

  if (loading) return <LoadingPanel text="Cargando logros desde la base de datos..." />;
  if (!achievements.length) return <EmptyPanel />;

  const unlockedAchievements = achievements.filter(isAchievementUnlocked);
  const lockedAchievements = achievements.filter((achievement) => !isAchievementUnlocked(achievement));
  const orderedAchievements = activeFilter === 'unlocked'
    ? unlockedAchievements
    : activeFilter === 'locked'
      ? lockedAchievements
      : [...unlockedAchievements, ...lockedAchievements];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Logros recientes</Text>
        <Text style={styles.subtitle}>Desbloquea retos mientras aprendes</Text>
      </View>

      <ProgressHero
        unlockedCount={unlockedAchievements.length}
        totalCount={achievements.length}
      />

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.id;

          return (
            <TouchableOpacity
              key={filter.id}
              activeOpacity={0.86}
              onPress={() => setActiveFilter(filter.id)}
              style={[styles.filterCard, active && styles.filterCardActive]}
            >
              <Ionicons name={filter.icon} size={20} color={active ? colors.white : colors.textGray} />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.achievementsList}>
        {orderedAchievements.map((achievement, index) => (
          <AchievementCard
            key={achievement.id ?? `${achievement.title}-${index}`}
            achievement={achievement}
            index={index}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.md,
  },
  header: {
    gap: 2,
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
  heroCard: {
    minHeight: 196,
    borderRadius: 28,
    backgroundColor: '#8000FF',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.soft,
  },
  heroSparkleOne: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.yellow,
    opacity: 0.85,
    top: 42,
    right: 150,
    transform: [{ rotate: '45deg' }],
  },
  heroSparkleTwo: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 3,
    backgroundColor: '#FF8DCE',
    opacity: 0.9,
    bottom: 62,
    right: 118,
    transform: [{ rotate: '45deg' }],
  },
  heroTextBlock: {
    flex: 1,
    gap: 4,
    zIndex: 1,
  },
  heroEyebrow: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  heroNumber: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 54,
    lineHeight: 58,
  },
  heroLabel: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 15,
  },
  heroTrack: {
    width: '92%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#351370',
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  heroFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.yellow,
  },
  heroMessage: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  heroTrophy: {
    width: 124,
    height: 134,
    marginLeft: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    ...shadows.soft,
  },
  filterCardActive: {
    backgroundColor: colors.purple,
  },
  filterText: {
    color: colors.textGray,
    fontFamily: fonts.black,
    fontSize: 11,
    textAlign: 'center',
  },
  filterTextActive: {
    color: colors.white,
  },
  achievementsList: {
    gap: spacing.md,
  },
  achievementCard: {
    minHeight: 118,
    borderRadius: 24,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.soft,
  },
  achievementCardLocked: {
    opacity: 0.62,
  },
  trophySlot: {
    width: 76,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyIcon: {
    width: 72,
    height: 78,
  },
  trophyIconLocked: {
    opacity: 0.45,
  },
  achievementTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 20,
  },
  achievementDescription: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  achievementTextBlock: {
    flex: 1,
    gap: 4,
  },
  statusPill: {
    minHeight: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  statusPillUnlocked: {
    backgroundColor: '#DDF8EA',
  },
  statusPillLocked: {
    backgroundColor: '#ECE9F1',
  },
  statusText: {
    fontFamily: fonts.black,
    fontSize: 10,
  },
  statusTextUnlocked: {
    color: '#0BAA4B',
  },
  statusTextLocked: {
    color: '#6F6A83',
  },
  pointsText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 12,
    minWidth: 42,
    textAlign: 'right',
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
  emptyPanel: {
    minHeight: 260,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  emptyTrophy: {
    width: 116,
    height: 126,
  },
  emptyTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 20,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
