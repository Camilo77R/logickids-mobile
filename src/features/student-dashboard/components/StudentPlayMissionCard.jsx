import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const getStatusPalette = (status) => {
  switch (status) {
    case 'ready':
      return { glow: 'rgba(55,215,159,0.18)', accent: '#37d79f' };
    case 'waiting-tutor':
      return { glow: 'rgba(255,191,91,0.18)', accent: '#ffbf5b' };
    case 'archived-group':
    case 'missing-group':
      return { glow: 'rgba(255,126,114,0.16)', accent: '#ff8f82' };
    default:
      return { glow: 'rgba(107,213,255,0.16)', accent: '#8bddff' };
  }
};

export default function StudentPlayMissionCard({ playState, groupLabel, onPlayPress }) {
  const palette = getStatusPalette(playState.status);

  return (
    <View style={styles.card}>
      <View style={[styles.glow, { backgroundColor: palette.glow }]} />

      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Codigo Estelar</Text>
        </View>
        <Text style={styles.roomText}>{groupLabel}</Text>
      </View>

      <Text style={styles.title}>{playState.title}</Text>
      <Text style={styles.message}>{playState.message}</Text>

      <TouchableOpacity
        style={[
          styles.playButton,
          playState.canPlay
            ? { backgroundColor: palette.accent }
            : styles.playButtonDisabled,
        ]}
        disabled={!playState.canPlay}
        onPress={onPlayPress}
        activeOpacity={0.82}
      >
        <Text style={[styles.playButtonText, !playState.canPlay && styles.playButtonTextDisabled]}>
          {playState.buttonLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 28,
    padding: 20,
    gap: 12,
    backgroundColor: 'rgba(11, 22, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(115,215,255,0.14)',
  },
  glow: {
    position: 'absolute',
    top: -20,
    right: -22,
    width: 136,
    height: 136,
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    color: '#f8fbff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  roomText: {
    color: 'rgba(255,255,255,0.60)',
    fontWeight: '800',
  },
  title: {
    color: '#f8fbff',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
  },
  message: {
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 21,
  },
  playButton: {
    marginTop: 6,
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  playButtonText: {
    color: '#06121f',
    fontSize: 18,
    fontWeight: '900',
  },
  playButtonTextDisabled: {
    color: 'rgba(255,255,255,0.64)',
  },
});
