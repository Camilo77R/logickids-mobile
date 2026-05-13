import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const SkillStatRow = ({ entry }) => (
  <View style={styles.rowCard}>
    <View style={styles.rowTop}>
      <View style={styles.rowTitleBlock}>
        <Text style={styles.skillName}>{entry.skillName}</Text>
        <Text style={styles.skillDescription}>{entry.skillDescription}</Text>
      </View>

      <View style={[styles.toneBadge, { backgroundColor: `${entry.tone.accent}20` }]}>
        <Text style={[styles.toneBadgeText, { color: entry.tone.accent }]}>
          {entry.tone.label}
        </Text>
      </View>
    </View>

    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          {
            width: `${Math.max(entry.precision, 6)}%`,
            backgroundColor: entry.tone.accent,
          },
        ]}
      />
    </View>

    <View style={styles.metricsRow}>
      <Text style={styles.metricText}>Precision {entry.precisionLabel}</Text>
      <Text style={styles.metricText}>{entry.attemptsLabel}</Text>
      <Text style={styles.metricText}>{entry.reactionLabel}</Text>
    </View>
  </View>
);

export default function StudentSkillStatsCard({ skillStatsView }) {
  if (!skillStatsView.hasStats) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Mis habilidades</Text>
        <Text style={styles.subtitle}>
          Todavia no hay estadisticas disponibles. Juega una partida completa y aqui veras tu
          precision por habilidad.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis habilidades</Text>
        <Text style={styles.subtitle}>
          Mira en que vas fuerte y que necesitas practicar mas.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Tu mejor zona</Text>
          <Text style={styles.summaryValue}>
            {skillStatsView.strongestSkill
              ? `${skillStatsView.strongestSkill.skillName} · ${skillStatsView.strongestSkill.precisionLabel}`
              : 'Sin datos'}
          </Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Para practicar</Text>
          <Text style={styles.summaryValue}>
            {skillStatsView.needsPracticeSkill
              ? `${skillStatsView.needsPracticeSkill.skillName} · ${skillStatsView.needsPracticeSkill.precisionLabel}`
              : 'Sin datos'}
          </Text>
        </View>
      </View>

      <View style={styles.rowsWrap}>
        {skillStatsView.entries.map((entry) => (
          <SkillStatRow key={entry.id} entry={entry} />
        ))}
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
  summaryRow: {
    gap: 10,
  },
  summaryBox: {
    borderRadius: 18,
    padding: 14,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '900',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: '#f8fbff',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  rowsWrap: {
    gap: 10,
  },
  rowCard: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitleBlock: {
    flex: 1,
    gap: 2,
  },
  skillName: {
    color: '#f8fbff',
    fontSize: 16,
    fontWeight: '900',
  },
  skillDescription: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    lineHeight: 17,
  },
  toneBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toneBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  metricsRow: {
    gap: 4,
  },
  metricText: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});
