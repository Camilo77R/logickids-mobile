import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, fonts, shadows, spacing } from '../constants/theme';

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

export default function GamePathScreen({ skills, onBack, onStartSkill }) {
  return (
    <View style={styles.panel}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.86} onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={colors.purple} />
          <Text style={styles.backText}>Ruta de hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.86} onPress={onBack} style={styles.badge}>
          <Ionicons name="map" size={16} color={colors.yellowDark} />
          <Text style={styles.badgeText}>Mapa</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.map}>
        <AdventureRoad />

        <View style={styles.startMark}>
          <Ionicons name="flag" size={20} color={colors.white} />
          <Text style={styles.markerText}>Inicio</Text>
        </View>

        <View style={styles.finishMark}>
          <Ionicons name="trophy" size={22} color={colors.white} />
          <Text style={styles.markerText}>Meta</Text>
        </View>

        <MapDecoration top={94} right="10%" icon="sparkles" />
        <MapDecoration top={232} left="6%" icon="flower" />
        <MapDecoration top={486} right="12%" icon="star" />

        {skills.map((skill, index) => (
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

function AdventureRoad() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 620" style={styles.roadSvg}>
      <Defs>
        <LinearGradient id="roadPurple" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A84BDB" />
          <Stop offset="1" stopColor="#7D2BC5" />
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
        opacity="0.8"
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
        stroke="url(#roadPurple)"
        strokeWidth={58}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d={ROAD_PATH}
        stroke="#EBC6FA"
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
  const canStart = skill.active && skill.gameSlug;
  const node = (
    <>
      <View style={[styles.nodeCircle, skill.active && styles.nodeCircleActive]}>
        <Ionicons name={skill.icon} size={30} color={colors.white} />
        {!skill.active ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.white} />
          </View>
        ) : null}
      </View>
      <View style={styles.labelPill}>
        <Text style={styles.labelText}>
          {skill.number}. {skill.name}
        </Text>
      </View>
      {skill.active && skill.activeMessage ? (
        <View style={styles.activePill}>
          <Text style={styles.activeText}>{skill.activeMessage}</Text>
        </View>
      ) : null}
      {!skill.active ? (
        <View style={styles.reasonPill}>
          <Ionicons name="lock-closed" size={11} color={colors.purple} />
          <Text style={styles.reasonText}>{skill.lockedReason}</Text>
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
    borderRadius: 19,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    ...shadows.soft,
  },
  badgeText: {
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
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colors.white,
    ...shadows.soft,
  },
  nodeCircleActive: {
    backgroundColor: colors.yellow,
  },
  lockBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  labelPill: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -7,
    ...shadows.soft,
  },
  labelText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  reasonPill: {
    maxWidth: NODE_SIZE + 82,
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    marginTop: 4,
    ...shadows.soft,
  },
  reasonText: {
    flex: 1,
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
  },
  activePill: {
    maxWidth: NODE_SIZE + 82,
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    marginTop: 4,
    ...shadows.soft,
  },
  activeText: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
  },
  finishMark: {
    position: 'absolute',
    right: '7%',
    bottom: 18,
    minWidth: 78,
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
});
