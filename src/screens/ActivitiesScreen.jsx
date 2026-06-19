import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, shadows, spacing } from '../constants/theme';

const ACTIVITY_FILTERS = Object.freeze([
  { id: 'Todas', label: 'Todas' },
  { id: 'Pendiente', label: 'Pendientes' },
  { id: 'Completada', label: 'Completadas' },
  { id: 'Bloqueada', label: 'Bloqueadas' },
]);

const STATUS_BADGES = Object.freeze({
  Activa: { backgroundColor: '#DDF8EA', color: '#157347' },
  Pendiente: { backgroundColor: '#FFF3CD', color: '#8A6500' },
  Bloqueada: { backgroundColor: '#ECEFF3', color: '#5F6673' },
  Completada: { backgroundColor: '#F3E8FA', color: colors.purple },
});

export default function ActivitiesScreen({ activities, onActivityPress, onActivityActionPress }) {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const filteredActivities = useMemo(
    () =>
      activeFilter === 'Todas'
        ? activities
        : activities.filter((activity) => activity.status === activeFilter),
    [activeFilter, activities],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Actividades</Text>
        <Text style={styles.subtitle}>Explora tus actividades</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {ACTIVITY_FILTERS.map((filter) => {
          const active = activeFilter === filter.id;

          return (
            <TouchableOpacity
              key={filter.id}
              activeOpacity={0.84}
              onPress={() => setActiveFilter(filter.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {filteredActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={() => onActivityPress(activity)}
            onActionPress={() => onActivityActionPress(activity)}
          />
        ))}
      </View>
    </View>
  );
}

function ActivityCard({ activity, onPress, onActionPress }) {
  const badge = STATUS_BADGES[activity.status] ?? STATUS_BADGES.Bloqueada;
  const actionLabel =
    activity.status === 'Activa'
      ? 'Continuar'
      : activity.status === 'Pendiente'
        ? 'Ver actividad'
        : activity.status === 'Completada'
          ? 'Ver detalle'
          : null;

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.card}>
      <View style={styles.icon}>
        <Ionicons
          name={activity.locked ? 'lock-closed' : activity.icon}
          size={24}
          color={activity.locked ? colors.muted : colors.purple}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{activity.title}</Text>
          <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{activity.status}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>{activity.skillLabel}</Text>
          <Text style={styles.meta}>{activity.durationLabel}</Text>
        </View>

        {actionLabel ? (
          <TouchableOpacity activeOpacity={0.86} onPress={onActionPress} style={styles.actionButton}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
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
  tabs: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  tab: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  tabActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  tabText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 11,
  },
  tabTextActive: {
    color: colors.white,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: 18,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    ...shadows.soft,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 14,
    lineHeight: 18,
  },
  badge: {
    minHeight: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    fontFamily: fonts.black,
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  meta: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
  },
  actionButton: {
    alignSelf: 'flex-start',
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 10,
  },
});
