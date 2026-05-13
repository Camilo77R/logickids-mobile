import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ACCESS_COLORS } from '../studentAccess.theme';

export const ACCESS_MODES = {
  scan: 'scan',
  manual: 'manual',
};

const MODES = [
  { key: ACCESS_MODES.scan, title: 'Escanear' },
  { key: ACCESS_MODES.manual, title: 'Escribir QR' },
];

export default function StudentAccessModeToggle({ activeMode, onChangeMode }) {
  return (
    <View style={styles.wrap}>
      {MODES.map((mode) => {
        const isActive = mode.key === activeMode;
        return (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.button,
              isActive && styles.buttonActive,
            ]}
            onPress={() => onChangeMode(mode.key)}
            activeOpacity={0.85}
          >
            <View style={[styles.marker, isActive && styles.markerActive]} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{mode.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ACCESS_COLORS.card,
    borderWidth: 1.5,
    borderColor: 'rgba(22,50,79,0.08)',
  },
  buttonActive: {
    backgroundColor: ACCESS_COLORS.card,
    borderColor: 'rgba(0,123,255,0.14)',
    transform: [{ scale: 1.01 }],
    shadowColor: ACCESS_COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  marker: {
    width: 30,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(22,50,79,0.14)',
  },
  markerActive: {
    backgroundColor: ACCESS_COLORS.blue,
  },
  label: {
    color: ACCESS_COLORS.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  labelActive: {
    color: ACCESS_COLORS.navy,
  },
});
