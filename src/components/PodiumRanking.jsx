import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, shadows, spacing } from '../constants/theme';

const PODIUM_BACKGROUND = '#F5F5F5';

const getRankingAvatarUri = (studentName) => {
  const safeName = encodeURIComponent(studentName?.trim() || 'Student');
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${safeName}&backgroundColor=${PODIUM_BACKGROUND.replace('#', '')}`;
};

export default function PodiumRanking({ data = null, ranking = [] }) {
  const normalizedData = useMemo(() => {
    const rawData = data || ranking || [];
    return [...rawData]
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .slice(0, 3);
  }, [data, ranking]);

  const first = normalizedData.find((p) => p.position === 1) || normalizedData[0] || null;
  const second = normalizedData.find((p) => p.position === 2) || normalizedData[1] || null;
  const third = normalizedData.find((p) => p.position === 3) || normalizedData[2] || null;

  const scale1 = useSharedValue(0.8);
  const scale2 = useSharedValue(0.8);
  const scale3 = useSharedValue(0.8);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacity3 = useSharedValue(0);

  useEffect(() => {
    scale1.value = withDelay(0, withTiming(1.1, { duration: 500 }));
    scale2.value = withDelay(150, withTiming(1, { duration: 500 }));
    scale3.value = withDelay(300, withTiming(1, { duration: 500 }));
    opacity1.value = withDelay(0, withTiming(1, { duration: 400 }));
    opacity2.value = withDelay(150, withTiming(1, { duration: 400 }));
    opacity3.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, [opacity1, opacity2, opacity3, scale1, scale2, scale3]);

  const anim1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const anim2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  const anim3 = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
    opacity: opacity3.value,
  }));

  const renderItem = (item, animStyle, height, isFirst) => {
    if (!item) {
      return <View style={[styles.emptySlot, { height }]} />;
    }

    const nameForDisplay = item.name || item.studentName || 'Student';
    const avatarUrl = getRankingAvatarUri(nameForDisplay);

    return (
      <Animated.View style={[styles.item, animStyle, { height }]}>
        <Text style={styles.medal}>
          {item.position === 1 ? '🥇' : item.position === 2 ? '🥈' : '🥉'}
        </Text>

        <View style={[styles.avatarContainer, isFirst && styles.avatarContainerFirst]}>
          <SvgUri
            uri={avatarUrl}
            width={isFirst ? 60 : 50}
            height={isFirst ? 60 : 50}
          />
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {nameForDisplay}
        </Text>

        <Text style={styles.points}>
          {item.points || item.score || 0} pts
        </Text>

        {isFirst ? <View style={styles.glow} /> : null}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {renderItem(second ? { ...second, position: second.position || 2 } : null, anim2, 140, false)}
        {renderItem(first ? { ...first, position: first.position || 1 } : null, anim1, 180, true)}
        {renderItem(third ? { ...third, position: third.position || 3 } : null, anim3, 140, false)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.md,
  },
  item: {
    width: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    ...shadows.soft,
  },
  emptySlot: {
    width: 100,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: colors.lavender,
    marginTop: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainerFirst: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.purpleDark,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 90,
  },
  points: {
    color: colors.purple,
    fontFamily: fonts.bold,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  medal: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  glow: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 8,
    backgroundColor: colors.yellow,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.yellow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});
