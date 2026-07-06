import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, fonts, shadows, spacing } from '../constants/theme';
import { MASCOTA_GUIA_JUEGO } from '../features/games/core/MascotaGuiaJuego';

const NODE_SIZE = 84;
const ROAD_PATH =
  'M 248 40 C 298 94 218 116 142 126 C 58 138 52 202 132 222 C 214 242 304 234 304 304 C 304 374 198 358 116 394 C 38 430 62 510 150 526 C 218 538 278 512 300 586';

const NODE_LAYOUT = [
  { top: 72, left: '5%' },
  { top: 172, right: '1%' },
  { top: 292, left: '5%' },
  { top: 400, right: '8%' },
  { top: 500, left: '12%' },
];

const NODE_VISUALS = Object.freeze({
  completed: {
    circle: colors.purple,
    border: colors.yellow,
    icon: colors.white,
    labelBackground: '#F6E6FF',
    labelText: colors.purpleDark,
    helperBackground: colors.yellow,
    helperBorder: colors.yellowDark,
    helperText: colors.purpleDark,
    badgeIcon: 'checkmark',
  },
  current: {
    circle: colors.yellow,
    border: colors.purple,
    icon: colors.purpleDark,
    labelBackground: '#FFF2C7',
    labelText: colors.purpleDark,
    helperBackground: '#F6E6FF',
    helperBorder: colors.purple,
    helperText: colors.purpleDark,
    badgeIcon: 'play',
  },
  next: {
    circle: colors.white,
    border: colors.yellow,
    icon: colors.purple,
    labelBackground: '#FFF8DF',
    labelText: colors.purpleDark,
    helperBackground: '#FFF8DF',
    helperBorder: colors.yellowDark,
    helperText: colors.purpleDark,
    badgeIcon: 'sparkles',
  },
  locked: {
    circle: '#E8DFF1',
    border: colors.white,
    icon: '#7C7190',
    labelBackground: colors.white,
    labelText: '#7C7190',
    helperBackground: 'rgba(255,255,255,0.94)',
    helperBorder: colors.border,
    helperText: colors.textGray,
    badgeIcon: 'lock-closed',
  },
});

const normalizeRouteMap = (routeMap) => ({
  routeTitle: routeMap?.routeTitle ?? 'Ruta de hoy',
  completedStepsLabel: routeMap?.completedStepsLabel ?? 'Tu progreso en clase',
  routeCompleted: Boolean(routeMap?.routeCompleted),
  progressPercent: Number.isFinite(routeMap?.progressPercent) ? routeMap.progressPercent : 0,
  nodes: Array.isArray(routeMap?.nodes) ? routeMap.nodes : [],
});

export default function GamePathScreen({ routeMap, onBack, onStartSkill }) {
  const normalizedMap = normalizeRouteMap(routeMap);
  const currentNode = normalizedMap.nodes.find((node) => node.isCurrent);

  return (
    <View style={styles.panel}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.86} onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={colors.purple} />
          <Text style={styles.backText}>{normalizedMap.routeTitle}</Text>
        </TouchableOpacity>
        <View style={styles.badge}>
          <Ionicons name="map" size={16} color={colors.yellowDark} />
          <Text style={styles.badgeText}>{normalizedMap.completedStepsLabel}</Text>
        </View>
      </View>

      <View style={styles.map}>
        <AdventureRoad progressPercent={normalizedMap.progressPercent} />

        <View style={styles.startMark}>
          <Ionicons name="flag" size={20} color={colors.white} />
          <Text style={styles.markerText}>Inicio</Text>
        </View>

        <View style={[styles.finishMark, normalizedMap.routeCompleted && styles.finishMarkCompleted]}>
          <Ionicons
            name={normalizedMap.routeCompleted ? 'trophy' : 'trophy-outline'}
            size={22}
            color={colors.white}
          />
          <Text style={styles.markerText}>Meta</Text>
        </View>

        <MapDecoration top={94} right="10%" icon="sparkles" />
        <MapDecoration top={232} left="6%" icon="flower" />
        <MapDecoration top={486} right="12%" icon="star" />

        {!normalizedMap.routeCompleted && currentNode ? (
          <CurrentMascotMarker nodeIndex={normalizedMap.nodes.findIndex((node) => node.isCurrent)} />
        ) : null}

        {normalizedMap.routeCompleted ? <RouteCompletedMascot /> : null}

        {normalizedMap.nodes.map((skill, index) => (
          <PathNode
            key={skill.id}
            layout={NODE_LAYOUT[index]}
            skill={skill}
            onStartSkill={onStartSkill}
          />
        ))}
      </View>
    </View>
  );
}

function AdventureRoad({ progressPercent = 0 }) {
  const normalizedProgress = Math.max(0, Math.min(progressPercent, 100));

  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 620" style={styles.roadSvg}>
      <Defs>
        <LinearGradient id="roadBase" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#EFE6F8" />
          <Stop offset="1" stopColor="#E0D0F1" />
        </LinearGradient>
        <LinearGradient id="roadProgress" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.yellow} />
          <Stop offset="1" stopColor={colors.purple} />
        </LinearGradient>
      </Defs>

      <G opacity="0.38">
        <Circle cx="44" cy="84" r="15" fill="#F3E8FA" />
        <Circle cx="315" cy="144" r="11" fill="#F3E8FA" />
        <Circle cx="52" cy="286" r="12" fill="#F3E8FA" />
        <Circle cx="312" cy="448" r="14" fill="#F3E8FA" />
        <Circle cx="80" cy="564" r="10" fill="#F3E8FA" />
      </G>

      <Path
        d={ROAD_PATH}
        stroke="#D7C8E5"
        strokeWidth={78}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.78"
      />
      <Path
        d={ROAD_PATH}
        stroke="#F8FBFA"
        strokeWidth={70}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d={ROAD_PATH}
        stroke="url(#roadBase)"
        strokeWidth={58}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d={ROAD_PATH}
        pathLength={100}
        stroke="url(#roadProgress)"
        strokeWidth={58}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${normalizedProgress} 1000`}
        fill="none"
      />
      <Path
        d={ROAD_PATH}
        stroke="#F7F0FD"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="17 18"
        fill="none"
      />
      <Circle cx="250" cy="34" r="25" fill={colors.yellow} />
      <Circle cx="300" cy="586" r="30" fill={colors.yellow} />
    </Svg>
  );
}

function PathNode({ skill, layout, onStartSkill }) {
  const visual = NODE_VISUALS[skill.visualState] ?? NODE_VISUALS.locked;
  const canStart = skill.active && skill.gameSlug;
  const helperText = skill.isCurrent
    ? 'Jugando ahora'
    : skill.isNext
      ? 'Siguiente reto'
      : skill.isCompleted
        ? 'Superado'
        : skill.lockedReason;

  const node = (
    <>
      <View
        style={[
          styles.nodeCircle,
          {
            backgroundColor: visual.circle,
            borderColor: visual.border,
          },
          skill.isCurrent && styles.nodeCircleCurrent,
          skill.isCompleted && styles.nodeCircleCompleted,
        ]}
      >
        <Ionicons name={skill.icon} size={30} color={visual.icon} />
        <View
          style={[
            styles.stateBadge,
            skill.isCompleted && styles.stateBadgeCompleted,
            skill.isCurrent && styles.stateBadgeCurrent,
            skill.isNext && styles.stateBadgeNext,
          ]}
        >
          <Ionicons name={visual.badgeIcon} size={12} color={colors.white} />
        </View>
      </View>

      <View style={[styles.labelPill, { backgroundColor: visual.labelBackground }]}>
        <Text style={[styles.labelText, { color: visual.labelText }]}>
          {skill.number}. {skill.name}
        </Text>
      </View>

      {helperText ? (
        <View
          style={[
            styles.helperPill,
            {
              backgroundColor: visual.helperBackground,
              borderColor: visual.helperBorder,
            },
          ]}
        >
          <Text style={[styles.helperText, { color: visual.helperText }]}>{helperText}</Text>
        </View>
      ) : null}
    </>
  );

  if (!canStart) {
    return <View style={[styles.node, layout]}>{node}</View>;
  }

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={() => onStartSkill(skill)} style={[styles.node, layout]}>
      {node}
    </TouchableOpacity>
  );
}

function CurrentMascotMarker({ nodeIndex }) {
  const layout = NODE_LAYOUT[nodeIndex] ?? NODE_LAYOUT[0];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.currentMascotWrap,
        {
          top: (layout.top ?? 0) - 22,
          left: layout.left ? '18%' : undefined,
          right: layout.right ? '20%' : undefined,
        },
      ]}
    >
      <View style={styles.currentMascotBubble}>
        <Image source={MASCOTA_GUIA_JUEGO} style={styles.currentMascotImage} resizeMode="cover" />
      </View>
    </View>
  );
}

function RouteCompletedMascot() {
  return (
    <View pointerEvents="none" style={styles.routeCompletedCard}>
      <View style={styles.routeCompletedMascotFrame}>
        <Image source={MASCOTA_GUIA_JUEGO} style={styles.routeCompletedMascot} resizeMode="cover" />
      </View>
      <View style={styles.routeCompletedTextBlock}>
        <Text style={styles.routeCompletedEyebrow}>Ruta completada</Text>
        <Text style={styles.routeCompletedTitle}>Llegaste a la meta</Text>
        <Text style={styles.routeCompletedText}>
          Muy bien. Terminaste todos los retos de hoy y tu camino quedo completo.
        </Text>
      </View>
    </View>
  );
}

function MapDecoration({ top, left, right, icon }) {
  return (
    <View style={[styles.decoration, { top, left, right }]}>
      <Ionicons name={icon} size={16} color="#D7A7F2" />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    gap: 2,
    ...shadows.soft,
  },
  backText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  badge: {
    minHeight: 38,
    maxWidth: 156,
    borderRadius: 19,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    ...shadows.soft,
  },
  badgeText: {
    flexShrink: 1,
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  map: {
    flex: 1,
    minHeight: 650,
    borderRadius: 24,
    backgroundColor: '#F8FBFA',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E1EEF0',
  },
  roadSvg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  node: {
    position: 'absolute',
    width: NODE_SIZE + 86,
    alignItems: 'center',
  },
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    ...shadows.soft,
  },
  nodeCircleCurrent: {
    shadowColor: colors.yellow,
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    transform: [{ scale: 1.06 }],
  },
  nodeCircleCompleted: {
    borderWidth: 6,
  },
  stateBadge: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  stateBadgeCompleted: {
    backgroundColor: colors.yellowDark,
  },
  stateBadgeCurrent: {
    backgroundColor: colors.purpleDark,
  },
  stateBadgeNext: {
    backgroundColor: colors.purple,
  },
  labelPill: {
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -7,
    ...shadows.soft,
  },
  labelText: {
    fontFamily: fonts.black,
    fontSize: 13,
  },
  helperPill: {
    maxWidth: NODE_SIZE + 88,
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: 6,
    ...shadows.soft,
  },
  helperText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  currentMascotWrap: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 3,
  },
  currentMascotBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.yellow,
    backgroundColor: colors.purple,
    ...shadows.soft,
  },
  currentMascotImage: {
    width: '118%',
    height: '118%',
    marginLeft: '-9%',
    marginTop: '-9%',
  },
  finishMark: {
    position: 'absolute',
    right: '7%',
    bottom: 18,
    minWidth: 78,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    ...shadows.soft,
  },
  finishMarkCompleted: {
    backgroundColor: colors.yellowDark,
  },
  startMark: {
    position: 'absolute',
    right: '21%',
    top: 14,
    minWidth: 82,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    ...shadows.soft,
  },
  markerText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 11,
  },
  decoration: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3E8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCompletedCard: {
    position: 'absolute',
    top: 52,
    left: '50%',
    width: 210,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 2,
    borderColor: colors.yellow,
    padding: 12,
    gap: 10,
    transform: [{ translateX: -105 }],
    zIndex: 12,
    elevation: 14,
    ...shadows.soft,
  },
  routeCompletedMascotFrame: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.yellow,
    backgroundColor: colors.purple,
  },
  routeCompletedMascot: {
    width: '115%',
    height: '115%',
    marginLeft: '-7%',
    marginTop: '-7%',
  },
  routeCompletedTextBlock: {
    gap: 4,
  },
  routeCompletedEyebrow: {
    color: colors.yellowDark,
    fontFamily: fonts.black,
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  routeCompletedTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 19,
    textAlign: 'center',
  },
  routeCompletedText: {
    color: colors.textGray,
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
