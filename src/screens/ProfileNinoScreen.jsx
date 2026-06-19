import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { colors, fonts, shadows, spacing } from '../constants/theme';

const PROFILE_BACKGROUND = '#FAF3FF';

const buildProfileGoalMessage = ({ achievementsCount, averagePrecision, totalAttempts }) => {
  if (!totalAttempts && !achievementsCount) {
    return 'Completa una actividad para empezar tu aventura.';
  }

  if (averagePrecision != null && averagePrecision < 90) {
    const nextTarget = Math.min(90, Math.max(40, Math.ceil((averagePrecision + 1) / 10) * 10));
    return `Mejora tu precision al ${nextTarget}% en tu siguiente actividad.`;
  }

  if (!achievementsCount) {
    return 'Sigue jugando para desbloquear tu primer logro.';
  }

  return `Ya tienes ${achievementsCount} logro${achievementsCount === 1 ? '' : 's'}. Sigue con la siguiente actividad.`;
};

function AvatarImage({ avatarColor, avatarUri, size, iconSize }) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: avatarUri ? PROFILE_BACKGROUND : avatarColor,
  };

  return (
    <View style={[styles.avatar, avatarStyle]}>
      {avatarUri ? (
        <SvgUri uri={avatarUri} width={size} height={size} />
      ) : (
        <Ionicons name="happy" size={iconSize} color={colors.purple} />
      )}
    </View>
  );
}

function ProfileMetric({ icon, label, value, helper }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricHelper}>{helper}</Text>
    </View>
  );
}

export default function ProfileNinoScreen({
  achievementsCount,
  activityTitle,
  activityText,
  canContinue,
  attemptsLabel,
  avatarColor,
  avatarUri,
  gradeLabel,
  groupLabel,
  lastSession,
  onContinue,
  onLogout,
  precisionLabel,
  progressSummary,
  sessionStatusLabel,
  studentName,
}) {
  const goalMessage = buildProfileGoalMessage({
    achievementsCount,
    averagePrecision: progressSummary.averagePrecision,
    totalAttempts: progressSummary.totalAttempts,
  });

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <AvatarImage avatarColor={avatarColor || colors.yellow} avatarUri={avatarUri} size={64} iconSize={32} />
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>Mi perfil</Text>
          <Text style={styles.name}>{studentName}</Text>
          <Text style={styles.meta}>{gradeLabel ?? groupLabel}</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Ionicons name="school" size={20} color={colors.purple} />
        <View style={styles.statusTextBlock}>
          <Text style={styles.statusTitle}>Estado de clase</Text>
          <Text style={styles.statusText}>{sessionStatusLabel}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <ProfileMetric icon="trophy" label="Logros" value={achievementsCount} helper="Desbloqueados" />
        <ProfileMetric icon="analytics" label="Precision" value={precisionLabel} helper="Promedio" />
        <ProfileMetric icon="flame" label="Actividades" value={attemptsLabel} helper="Completadas" />
      </View>

      <View style={styles.goalCard}>
        <View style={styles.cardIcon}>
          <Ionicons name="flag" size={20} color={colors.white} />
        </View>
        <View style={styles.cardTextBlock}>
          <Text style={styles.cardTitle}>Tu proxima meta</Text>
          <Text style={styles.cardText}>{goalMessage}</Text>
        </View>
      </View>

      <View style={styles.goalCard}>
        <View style={styles.cardIcon}>
          <Ionicons name="calendar" size={20} color={colors.white} />
        </View>
        <View style={styles.cardTextBlock}>
          <Text style={styles.cardTitle}>Ultima sesion</Text>
          <Text style={styles.cardText}>
            {lastSession
              ? `${lastSession.title ?? 'Sesion de clase'} - ${lastSession.stateLabel ?? 'En progreso'}`
              : 'Aun no tienes sesiones registradas.'}
          </Text>
        </View>
      </View>

      <View style={styles.learningCard}>
        <View style={styles.learningHeader}>
          <View style={styles.cardIcon}>
            <Ionicons name="school" size={20} color={colors.white} />
          </View>
          <View style={styles.cardTextBlock}>
            <Text style={styles.cardTitle}>Sigue aprendiendo</Text>
            <Text style={styles.cardText}>{activityTitle}</Text>
          </View>
        </View>
        <Text style={styles.learningText}>{activityText}</Text>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={!canContinue}
          onPress={onContinue}
          style={[
            styles.continueButton,
            canContinue && styles.continueButtonEnabled,
            !canContinue && styles.continueButtonDisabled,
          ]}
        >
          <Text style={styles.continueButtonText}>
            {canContinue ? 'Continuar jugando' : 'Esperando actividad'}
          </Text>
          <Ionicons name={canContinue ? 'play' : 'time'} size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={onLogout} style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={19} color={colors.danger} />
        <Text style={styles.logoutButtonText}>Salir de mi cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  avatar: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.soft,
  },
  hero: {
    minHeight: 112,
    borderRadius: 24,
    backgroundColor: colors.purple,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.soft,
  },
  heroText: {
    flex: 1,
  },
  eyebrow: {
    color: '#F3DDFE',
    fontFamily: fonts.black,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 27,
    marginTop: 2,
  },
  meta: {
    color: '#F3DDFE',
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  statusCard: {
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.soft,
  },
  statusTextBlock: {
    flex: 1,
  },
  statusTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  statusText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minHeight: 102,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    ...shadows.soft,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 17,
  },
  metricLabel: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 9,
    textAlign: 'center',
  },
  metricHelper: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 8,
    marginTop: 1,
    textAlign: 'center',
  },
  goalCard: {
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.soft,
  },
  learningCard: {
    minHeight: 168,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 15,
  },
  cardText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  learningText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
  },
  continueButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  continueButtonEnabled: {
    ...shadows.button,
  },
  continueButtonDisabled: {
    backgroundColor: '#C7A3DA',
  },
  continueButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  logoutButton: {
    minHeight: 42,
    borderRadius: 21,
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
