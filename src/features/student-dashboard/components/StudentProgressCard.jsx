import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ProgressMetric = ({ label, value, accent = '#8bddff' }) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
  </View>
);

export default function StudentProgressCard({ progressSummary }) {
  const hasProgress = progressSummary.skillsTracked > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi progreso</Text>
        <Text style={styles.subtitle}>
          {hasProgress
            ? 'Asi va tu viaje de aprendizaje hasta este momento.'
            : 'Tu progreso aparecera aqui despues de tus primeras partidas.'}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <ProgressMetric
          label="Intentos"
          value={hasProgress ? String(progressSummary.totalAttempts) : '0'}
          accent="#6bd5ff"
        />
        <ProgressMetric
          label="Precision"
          value={hasProgress ? `${progressSummary.averagePrecision}%` : '--'}
          accent="#37d79f"
        />
        <ProgressMetric
          label="Habilidades"
          value={hasProgress ? String(progressSummary.skillsTracked) : '0'}
          accent="#ffbf5b"
        />
      </View>

      <View style={styles.highlight}>
        <Text style={styles.highlightLabel}>Tu mejor radar</Text>
        <Text style={styles.highlightValue}>
          {progressSummary.bestSkill
            ? `${progressSummary.bestSkill.name} · ${progressSummary.bestSkill.precision}%`
            : 'Aun no tenemos una habilidad destacada'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    padding: 18,
    gap: 16,
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
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 23,
    fontWeight: '900',
  },
  highlight: {
    borderRadius: 18,
    padding: 14,
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  highlightLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '900',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  highlightValue: {
    color: '#f8fbff',
    fontWeight: '800',
    lineHeight: 20,
  },
});
