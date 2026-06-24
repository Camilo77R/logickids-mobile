import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { colors, fonts, shadows, spacing } from '../constants/theme';

const TERMINAL_PARTICIPANT_STATES = new Set(['completado', 'finalizado', 'finalizada', 'abandonado', 'cerrado']);
const SKILL_NAMES = ['Memoria', 'Patrones', 'Logica', 'Razonar', 'Atencion'];
const SKILL_COLORS = [colors.purple, '#12B85A', '#2C86F7', colors.yellow, '#FF8D1A'];

const normalizeKey = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const clampProgress = (value) => Math.min(Math.max(Number(value) || 0, 0), 100);

const getResultHits = (result) =>
  Number(result.aciertos ?? result.hits ?? result.correctas ?? result.respuestas_correctas ?? result.raw?.aciertos ?? 0);
const getResultErrors = (result) =>
  Number(result.errores ?? result.errors ?? result.incorrectas ?? result.respuestas_incorrectas ?? result.raw?.errores ?? 0);
const getResultPrecision = (result) => {
  const direct = Number(
    result.precision ??
      result.accuracy ??
      result.precision_pct ??
      result.porcentaje_precision ??
      result.raw?.precision ??
      result.raw?.accuracy ??
      result.raw?.precision_pct ??
      result.raw?.porcentaje_precision,
  );
  if (Number.isFinite(direct)) return clampProgress(direct);

  const hits = getResultHits(result);
  const total = hits + getResultErrors(result);
  return total ? Math.round((hits / total) * 100) : null;
};

const getMetricByLabel = (metrics, label) =>
  metrics.find((metric) => normalizeKey(metric.label).includes(normalizeKey(label)));

const getNumericValue = (value) => {
  const numeric = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

const getSessionDate = (session) =>
  new Date(session.finishedAt ?? session.startedAt ?? session.openedAt ?? session.abierta_en ?? 0).getTime() || 0;

const getResultRecordId = (result = {}) =>
  result.id ??
  result.raw?.id ??
  result.gameSessionId ??
  result.raw?.sesion_id ??
  result.sessionId ??
  result.sesion_clase_id ??
  result.raw?.sesion_clase_id ??
  getResultDate(result);

const getResultDate = (result = {}) =>
  new Date(
    result.finishedAt ??
      result.finalizada_en ??
      result.startedAt ??
      result.iniciada_en ??
      result.raw?.finalizada_en ??
      result.raw?.fecha_fin ??
      result.raw?.iniciada_en ??
      result.raw?.created_at ??
      0,
  ).getTime() || 0;

const getResultsFromSessions = (sessions = []) =>
  sessions.flatMap((session) =>
    (session.results ?? []).map((result) => ({
      ...result,
      sessionId:
        result.sessionId ??
        result.sesion_clase_id ??
        result.raw?.sesion_clase_id ??
        session.id,
      finishedAt:
        result.finishedAt ??
        result.finalizada_en ??
        result.raw?.finalizada_en ??
        session.finishedAt,
      startedAt:
        result.startedAt ??
        result.iniciada_en ??
        result.raw?.iniciada_en ??
        session.startedAt,
    })),
  );

const getGraphResultKey = (result = {}) =>
  `${getResultRecordId(result)}-${getResultDate(result)}-${getResultGameSlug(result)}`;

const mergeGraphResults = (results = [], sessions = []) => {
  const merged = new Map();

  [...results, ...getResultsFromSessions(sessions)].forEach((result) => {
    const key = getGraphResultKey(result);
    if (!merged.has(key)) {
      merged.set(key, result);
    }
  });

  return [...merged.values()];
};

const buildSessionTrend = (sessions = []) => {
  const orderedSessions = [...sessions]
    .filter((session) => (session.results ?? []).length)
    .sort((a, b) => getSessionDate(a) - getSessionDate(b));

  return orderedSessions.map((session, index, source) => {
      const precisionValues = (session.results ?? [])
        .map(getResultPrecision)
        .filter((value) => value != null);
      const precision = precisionValues.length
        ? Math.round(precisionValues.reduce((sum, value) => sum + value, 0) / precisionValues.length)
        : 0;

      return {
        id: session.id ?? index,
        label: index === source.length - 1 ? 'Ultima sesion' : `Sesion ${index + 1}`,
        date: getSessionDate(session),
        precision,
      };
    });
};

const buildSessionTrendFromResults = (results = []) => {
  return [...results]
    .map((result) => ({
      id: getGraphResultKey(result),
      date: getResultDate(result),
      precision: getResultPrecision(result),
    }))
    .filter((session) => session.precision != null)
    .sort((a, b) => a.date - b.date)
    .map((session, index, source) => ({
      id: session.id,
      label: index === source.length - 1 ? 'Ultima sesion' : `Sesion ${index + 1}`,
      date: session.date,
      precision: Math.round(session.precision),
    }));
};

const limitSessionTrend = (trend = []) =>
  trend.slice(-3).map((session, index, source) => ({
    ...session,
    label: index === source.length - 1 ? 'Sesion actual' : `Sesion ${index + 1}`,
  }));

const getResultGameSlug = (result = {}) =>
  result.game?.slug ?? result.slug ?? result.minijuego_slug ?? result.juego_slug ?? '';

const getResultSkillName = (result = {}) =>
  result.game?.skillName ?? result.habilidad ?? result.skillName ?? '';

const resultMatchesSkill = (result, skillName) => {
  const skillKey = normalizeKey(skillName);
  const resultSkill = normalizeKey(getResultSkillName(result));
  const slug = normalizeKey(getResultGameSlug(result));

  if (resultSkill === skillKey) return true;
  if (skillKey === 'memoria') return slug.includes('camino') || slug.includes('memoria');
  if (skillKey === 'patrones') return slug.includes('tren') || slug.includes('patron');
  if (skillKey === 'logica') return slug.includes('robot') || slug.includes('logico') || slug.includes('logica');
  if (skillKey === 'razonar') return slug.includes('mercado') || slug.includes('razonar');
  if (skillKey === 'atencion') return slug.includes('objeto') || slug.includes('atencion');
  return false;
};

const averagePrecisionFromResults = (results = []) => {
  const values = results.map(getResultPrecision).filter((value) => value != null);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
};

const buildSkillRows = (skills = [], results = []) =>
  SKILL_NAMES.map((name) => {
    const skill = skills.find((entry) => normalizeKey(entry.name) === normalizeKey(name));
    const skillResults = results.filter((result) => resultMatchesSkill(result, name));
    const skillPrecision = skill?.precision ?? getNumericValue(skill?.progressLabel);
    const resultPrecision = averagePrecisionFromResults(skillResults);
    const precision = skillPrecision || resultPrecision;
    const gamesPlayed = skill?.gamesPlayed ?? skill?.attempts ?? skillResults.length ?? 0;

    return {
      id: normalizeKey(name),
      name,
      precision: clampProgress(precision),
      gamesPlayed,
      detail: gamesPlayed ? `${gamesPlayed} juego(s)` : 'Sin datos',
    };
  });

function AnimatedProgressFill({ value, color = colors.purple, delay = 0 }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(clampProgress(value), { duration: 650, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, progress, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return <Animated.View style={[styles.progressFill, { backgroundColor: color }, animatedStyle]} />;
}

function MetricCard({ icon, title, value, helper, progress, color, delay }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [delay, opacity, translateY]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.metricCard, cardStyle]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <View style={styles.progressTrack}>
        <AnimatedProgressFill value={progress} color={color} delay={delay + 120} />
      </View>
      <Text style={styles.metricHelper}>{helper}</Text>
    </Animated.View>
  );
}

function SectionCard({ icon, title, action, onAction, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={22} color={colors.purple} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {React.isValidElement(action) ? action : action ? (
          <TouchableOpacity activeOpacity={0.84} onPress={onAction} style={styles.sectionActionButton}>
            <Text style={styles.sectionAction}>{action}</Text>
            <Ionicons name="chevron-down" size={15} color={colors.purple} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SessionTrendChart({ sessions }) {
  if (!sessions.length) {
    return (
      <EmptyInline
        icon="analytics"
        text="Aun no hay sesiones con resultados para comparar."
      />
    );
  }

  const width = Math.max(320, sessions.length * 96);
  const height = 244;
  const left = 42;
  const right = 28;
  const top = 38;
  const bottom = 54;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const denominator = Math.max(sessions.length - 1, 1);
  const points = sessions.map((session, index) => {
    const x = sessions.length === 1
      ? left + chartWidth / 2
      : left + (chartWidth / denominator) * index;
    const y = top + chartHeight - (clampProgress(session.precision) / 100) * chartHeight;
    return { ...session, x, y };
  });
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const linePath = points.map((point) => `${point.x} ${point.y}`).join(' L ');
  const areaPath = points.length
    ? `M ${points[0].x} ${top + chartHeight} L ${linePath} L ${points[points.length - 1].x} ${top + chartHeight} Z`
    : '';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {[100, 75, 50, 25, 0].map((label) => {
          const y = top + chartHeight - (label / 100) * chartHeight;
          return (
            <G key={label}>
              <SvgText x={0} y={y + 4} fill="#6D6884" fontSize="11" fontWeight="700">
                {label}%
              </SvgText>
              <Line x1={left} y1={y} x2={width - right} y2={y} stroke="#EFE8F7" strokeWidth="1" />
            </G>
          );
        })}
        {areaPath ? <Path d={areaPath} fill={colors.purple} opacity={0.12} /> : null}
        <Polyline points={polylinePoints} fill="none" stroke={colors.purple} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <G key={point.id}>
            <Line x1={point.x} y1={top} x2={point.x} y2={top + chartHeight} stroke="#EFE8F7" strokeWidth="1" />
            <Circle cx={point.x} cy={point.y} r={7} fill={colors.purple} stroke={colors.white} strokeWidth="3" />
            <SvgText x={point.x} y={Math.max(point.y - 14, 18)} textAnchor="middle" fill={colors.purpleDark} fontSize="12" fontWeight="800">
              {point.precision}%
            </SvgText>
            <SvgText x={point.x} y={height - 30} textAnchor="middle" fill={colors.purpleDark} fontSize="9" fontWeight="700">
              {point.label === 'Sesion actual' ? 'Sesion' : point.label}
            </SvgText>
            {point.label === 'Sesion actual' ? (
              <SvgText x={point.x} y={height - 16} textAnchor="middle" fill={colors.purpleDark} fontSize="9" fontWeight="700">
                actual
              </SvgText>
            ) : null}
          </G>
        ))}
      </Svg>
    </ScrollView>
  );
}

function SkillCard({ skill, index }) {
  const color = SKILL_COLORS[index] ?? colors.purple;

  return (
    <View style={styles.skillCard}>
      <View style={[styles.skillIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={index === 0 ? 'bulb' : index === 1 ? 'extension-puzzle' : index === 2 ? 'hardware-chip' : index === 3 ? 'cube' : 'search'} size={22} color={color} />
      </View>
      <Text style={styles.skillName}>{skill.name}</Text>
      <Text style={styles.skillValue}>{skill.precision ? `${skill.precision}%` : 'Sin datos'}</Text>
      <View style={styles.progressTrack}>
        <AnimatedProgressFill value={skill.precision} color={color} delay={index * 80} />
      </View>
      <Text style={styles.skillDetail}>{skill.detail}</Text>
    </View>
  );
}

function SkillDonut({ skills }) {
  const total = skills.reduce((sum, skill) => sum + Number(skill.gamesPlayed || 0), 0);
  const radius = 54;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg width={150} height={150} viewBox="0 0 150 150">
        <Circle cx="75" cy="75" r={radius} stroke="#EDE3F8" strokeWidth={strokeWidth} fill="none" />
        {skills.map((skill, index) => {
          const value = total ? Number(skill.gamesPlayed || 0) / total : 1 / skills.length;
          const dash = value * circumference;
          const circle = (
            <Circle
              key={skill.id}
              cx="75"
              cy="75"
              r={radius}
              stroke={SKILL_COLORS[index] ?? colors.purple}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 75 75)"
            />
          );
          offset += dash;
          return circle;
        })}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{total}</Text>
        <Text style={styles.donutLabel}>Total</Text>
      </View>
    </View>
  );
}

function EmptyInline({ icon, text }) {
  return (
    <View style={styles.emptyInline}>
      <Ionicons name={icon} size={26} color={colors.purple} />
      <Text style={styles.emptyInlineText}>{text}</Text>
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

export default function ProgressTabScreen({
  achievements = [],
  metrics = [],
  sessions = [],
  skills = [],
  results = [],
  loading,
}) {
  const graphResults = useMemo(() => {
    return mergeGraphResults(results, sessions);
  }, [results, sessions]);
  const completedResults = useMemo(
    () => results.filter((result) => TERMINAL_PARTICIPANT_STATES.has(result.status ?? result.estado)),
    [results],
  );
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked !== false);
  const precisionMetric = getMetricByLabel(metrics, 'precision');
  const averagePrecisionFromSkills = Math.round(
    skills
      .map((skill) => getNumericValue(skill.progressLabel))
      .filter(Boolean)
      .reduce((sum, value, _, source) => sum + value / source.length, 0),
  );
  const averagePrecision = getNumericValue(precisionMetric?.value) || averagePrecisionFromSkills || averagePrecisionFromResults(graphResults);
  const sessionTrend = useMemo(() => {
    const trendFromSessions = buildSessionTrend(sessions);
    const trendFromResults = buildSessionTrendFromResults(graphResults);
    return limitSessionTrend(trendFromResults.length ? trendFromResults : trendFromSessions);
  }, [graphResults, sessions]);
  const skillRows = useMemo(() => buildSkillRows(skills, graphResults), [graphResults, skills]);

  if (loading) return <LoadingPanel text="Cargando progreso real..." />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Progreso</Text>
        <Text style={styles.subtitle}>Asi vas en tu aprendizaje</Text>
      </View>

      <SectionCard icon="bar-chart" title="Resumen general">
        <View style={styles.metricsRow}>
          <MetricCard
            icon="trophy"
            title="Logros"
            value={String(unlockedAchievements.length)}
            helper="Desbloqueados"
            progress={unlockedAchievements.length ? Math.min(unlockedAchievements.length * 12, 100) : 8}
            color={colors.purple}
            delay={0}
          />
          <MetricCard
            icon="radio-button-on"
            title="Precision"
            value={averagePrecision ? `${averagePrecision}%` : 'Sin datos'}
            helper="Promedio"
            progress={averagePrecision || 8}
            color="#12B85A"
            delay={80}
          />
          <MetricCard
            icon="flame"
            title="Actividades"
            value={String(completedResults.length)}
            helper="Completadas"
            progress={completedResults.length ? Math.min(completedResults.length * 10, 100) : 8}
            color="#2C86F7"
            delay={160}
          />
        </View>
      </SectionCard>

      <SectionCard
        icon="trending-up"
        title="Precision por sesion"
        action={(
          <View style={styles.todayPill}>
            <Text style={styles.sectionAction}>Hoy</Text>
          </View>
        )}
      >
        <SessionTrendChart sessions={sessionTrend} />
      </SectionCard>

      <SectionCard icon="pie-chart" title="Habilidades por categoria">
        <View style={styles.skillsOverview}>
          <SkillDonut skills={skillRows} />
          <View style={styles.skillLegend}>
            {skillRows.map((skill, index) => (
              <View key={skill.id} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: SKILL_COLORS[index] ?? colors.purple }]} />
                <Text style={styles.legendName}>{skill.name}</Text>
                <Text style={styles.legendValue}>{skill.gamesPlayed}</Text>
              </View>
            ))}
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.skillsScroll}
        >
          {skillRows.map((skill, index) => (
            <SkillCard key={skill.id} skill={skill} index={index} />
          ))}
        </ScrollView>
      </SectionCard>

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
    fontFamily: fonts.black,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  card: {
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 19,
    lineHeight: 24,
  },
  sectionAction: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  sectionActionButton: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.purpleSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
  },
  todayPill: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metricCard: {
    flex: 1,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  metricIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  metricValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 24,
    lineHeight: 29,
    textAlign: 'center',
  },
  metricTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 12,
    textAlign: 'center',
  },
  metricHelper: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    textAlign: 'center',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EDE3F8',
    overflow: 'hidden',
    marginTop: spacing.xs,
    width: '82%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartScroll: {
    minHeight: 244,
    paddingRight: spacing.sm,
  },
  skillsOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  donutWrap: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 26,
  },
  donutLabel: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
  skillLegend: {
    flex: 1,
    gap: spacing.xs,
  },
  legendRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE8F7',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  legendValue: {
    color: colors.textGray,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  skillsScroll: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  skillCard: {
    width: 132,
    minHeight: 160,
    borderRadius: 22,
    backgroundColor: '#FBF8FF',
    padding: spacing.md,
    gap: 4,
  },
  skillIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillName: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  skillValue: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  skillDetail: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 10,
  },
  emptyInline: {
    minHeight: 104,
    borderRadius: 20,
    backgroundColor: '#FBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyInlineText: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    textAlign: 'center',
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
});
