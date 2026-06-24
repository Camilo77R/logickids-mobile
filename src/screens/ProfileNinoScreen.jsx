import React, { useEffect } from 'react';
import {
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
  withTiming,
} from 'react-native-reanimated';
import StudentAvatar from '../components/StudentAvatar';
import { colors, fonts, shadows, spacing } from '../constants/theme';

const PROFILE_BACKGROUND = '#FAF3FF';

const getNumericValue = (value) => {
  const numeric = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildProfileGoalMessage = ({ achievementsCount, averagePrecision, totalAttempts }) => {
  if (!totalAttempts && !achievementsCount) {
    return 'Completa una actividad para empezar tu aventura.';
  }

  if (averagePrecision != null && averagePrecision < 90) {
    const nextTarget = Math.min(90, Math.max(40, Math.ceil((averagePrecision + 1) / 10) * 10));
    return `Cada paso que das te hace mejor. Sube tu precision al ${nextTarget}%.`;
  }

  if (!achievementsCount) {
    return 'Sigue jugando para desbloquear tu primer logro.';
  }

  return 'Cada paso que das te hace mejor. Sigue aprendiendo.';
};

const getAchievementIcon = (achievement = {}) => {
  if (!achievement.unlocked) return 'lock-closed';
  const title = `${achievement.title ?? ''} ${achievement.description ?? ''}`.toLowerCase();
  if (title.includes('rap')) return 'flash';
  if (title.includes('precision') || title.includes('mira')) return 'radio-button-on';
  if (title.includes('constante') || title.includes('racha')) return 'crown';
  return 'book';
};

function AnimatedMetric({ icon, label, value, helper, progress, tone = colors.purple, delay = 0 }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const fill = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
    fill.value = withDelay(delay + 120, withTiming(Math.min(Math.max(progress, 8), 100), { duration: 650 }));
  }, [delay, fill, opacity, progress, translateY]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value}%`,
  }));

  return (
    <Animated.View style={[styles.metric, cardStyle]}>
      <View style={[styles.metricIcon, { backgroundColor: tone }]}>
        <Ionicons name={icon} size={24} color={colors.white} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricHelper}>{helper}</Text>
      <View style={styles.metricTrack}>
        <Animated.View style={[styles.metricFill, { backgroundColor: tone }, fillStyle]} />
      </View>
    </Animated.View>
  );
}

function RecentAchievement({ achievement, index }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);

  useEffect(() => {
    const delay = 120 + index * 90;
    opacity.value = withDelay(delay, withTiming(1, { duration: 430, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 430, easing: Easing.out(Easing.cubic) }));
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.achievementItem, animatedStyle]}>
      <View style={[styles.achievementIcon, !achievement.unlocked && styles.achievementIconLocked]}>
        <Ionicons name={getAchievementIcon(achievement)} size={25} color={colors.white} />
      </View>
      <Text style={styles.achievementTitle} numberOfLines={1}>{achievement.title}</Text>
      <Text style={styles.achievementText} numberOfLines={2}>
        {achievement.description || achievement.gameTitle || 'Logro de tu aventura'}
      </Text>
    </Animated.View>
  );
}

export default function ProfileNinoScreen({
  achievements = [],
  achievementsCount,
  attemptsLabel,
  avatarColor,
  avatarUri,
  gradeLabel,
  groupLabel,
  precisionLabel,
  progressSummary,
  studentName,
  onLogout,
}) {
  const averagePrecision = progressSummary?.averagePrecision ?? getNumericValue(precisionLabel);
  const totalAttempts = progressSummary?.totalAttempts ?? getNumericValue(attemptsLabel);
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked !== false);
  const totalAchievements = achievementsCount ?? unlockedAchievements.length;
  const recentAchievements = (unlockedAchievements.length ? unlockedAchievements : achievements).slice(0, 4);
  const goalMessage = buildProfileGoalMessage({
    achievementsCount: totalAchievements,
    averagePrecision,
    totalAttempts,
  });

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroIdentity}>
          <View style={styles.avatarRing}>
            <StudentAvatar
              backgroundColor={avatarColor || colors.yellow}
              iconSize={44}
              size={88}
              uri={avatarUri}
            />
          </View>
          <Text style={styles.name} numberOfLines={1}>{studentName}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.gradePill}>
              <Text style={styles.gradeText}>{gradeLabel ?? groupLabel ?? 'Grado'}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Ionicons name="star" size={22} color={colors.yellow} />
              <Text style={styles.pointsValue}>{totalAchievements}</Text>
              <Text style={styles.pointsLabel}>logros</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="trending-up" size={22} color={colors.purple} />
          </View>
          <Text style={styles.sectionTitle}>Mi progreso</Text>
        </View>

        <View style={styles.metricsRow}>
          <AnimatedMetric
            icon="trophy"
            label="Logros"
            value={String(totalAchievements)}
            helper="Desbloqueados"
            progress={totalAchievements ? Math.min(totalAchievements * 12, 100) : 8}
            tone={colors.purple}
          />
          <View style={styles.metricDivider} />
          <AnimatedMetric
            icon="radio-button-on"
            label="Precision"
            value={averagePrecision ? `${averagePrecision}%` : 'Sin datos'}
            helper="Promedio"
            progress={averagePrecision || 8}
            tone="#18B957"
            delay={80}
          />
          <View style={styles.metricDivider} />
          <AnimatedMetric
            icon="flame"
            label="Actividades"
            value={String(totalAttempts || 0)}
            helper="Completadas"
            progress={totalAttempts ? Math.min(totalAttempts * 10, 100) : 8}
            tone="#2E8AF7"
            delay={160}
          />
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="star" size={22} color={colors.purple} />
          </View>
          <Text style={styles.sectionTitle}>Mis logros recientes</Text>
        </View>

        {recentAchievements.length ? (
          <View style={styles.achievementsRow}>
            {recentAchievements.map((achievement, index) => (
              <RecentAchievement
                key={achievement.id ?? `${achievement.title}-${index}`}
                achievement={achievement}
                index={index}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyAchievements}>
            <Ionicons name="sparkles" size={28} color={colors.purple} />
            <Text style={styles.emptyText}>Tus logros apareceran cuando completes actividades.</Text>
          </View>
        )}
      </View>

      <View style={styles.motivationCard}>
        <View style={styles.messageIcon}>
          <Ionicons name="chatbubble-ellipses" size={30} color={colors.white} />
        </View>
        <Text style={styles.motivationText}>{goalMessage}</Text>
        <View style={styles.motivationMascot}>
          <Ionicons name="sparkles" size={40} color={colors.yellow} />
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={onLogout} style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={19} color={colors.danger} />
        <Text style={styles.logoutButtonText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    backgroundColor: PROFILE_BACKGROUND,
  },
  hero: {
    minHeight: 210,
    borderRadius: 30,
    backgroundColor: colors.purple,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    ...shadows.soft,
  },
  heroIdentity: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  avatarRing: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colors.yellow,
  },
  name: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    maxWidth: '96%',
  },
  gradePill: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#F3E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gradeText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 34,
  },
  pointsValue: {
    color: colors.yellow,
    fontFamily: fonts.black,
    fontSize: 22,
  },
  pointsLabel: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  panel: {
    borderRadius: 26,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.soft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 20,
    lineHeight: 25,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metric: {
    flex: 1,
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  metricValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 21,
    lineHeight: 26,
    textAlign: 'center',
  },
  metricLabel: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 12,
    textAlign: 'center',
  },
  metricHelper: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  metricTrack: {
    width: '76%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EEE1F8',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricDivider: {
    width: 1,
    marginVertical: spacing.md,
    backgroundColor: '#E8DDF3',
  },
  achievementsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  achievementItem: {
    flex: 1,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  achievementIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadows.soft,
  },
  achievementIconLocked: {
    backgroundColor: '#A8A0B8',
  },
  achievementTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 11,
    textAlign: 'center',
  },
  achievementText: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  emptyAchievements: {
    minHeight: 96,
    borderRadius: 20,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    textAlign: 'center',
  },
  motivationCard: {
    minHeight: 82,
    borderRadius: 26,
    backgroundColor: '#F2E9FF',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    ...shadows.soft,
  },
  messageIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationText: {
    flex: 1,
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  motivationMascot: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F6B5BB',
    backgroundColor: '#FFE7EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.soft,
  },
  logoutButtonText: {
    color: colors.danger,
    fontFamily: fonts.black,
    fontSize: 13,
  },
});
