import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function StudentAchievementsStrip({ achievements }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis logros</Text>
        <Text style={styles.subtitle}>
          {achievements.length
            ? `Has desbloqueado ${achievements.length} insignia${achievements.length === 1 ? '' : 's'}.`
            : 'Tu siguiente mision puede desbloquear tu primera insignia.'}
        </Text>
      </View>

      {achievements.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {achievements.map((achievement) => (
            <View key={achievement.id} style={styles.badge}>
              <Text style={styles.icon}>{achievement.icono ?? '⭐'}</Text>
              <Text style={styles.name}>{achievement.nombre_logro}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyBadge}>
          <Text style={styles.emptyEmoji}>🛰️</Text>
          <Text style={styles.emptyText}>Todavia no hay insignias, pero tu tablero ya esta listo para celebrarlas.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 18,
    gap: 14,
    backgroundColor: 'rgba(12, 22, 42, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(115,215,255,0.14)',
  },
  header: {
    gap: 4,
  },
  title: {
    color: '#f8fbff',
    fontSize: 21,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.64)',
    lineHeight: 20,
  },
  row: {
    gap: 12,
    paddingRight: 8,
  },
  badge: {
    width: 126,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  icon: {
    fontSize: 28,
  },
  name: {
    color: '#f8fbff',
    fontWeight: '800',
    lineHeight: 18,
  },
  emptyBadge: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyText: {
    flex: 1,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 19,
  },
});
