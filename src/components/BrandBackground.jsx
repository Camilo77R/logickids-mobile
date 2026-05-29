import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';

export default function BrandBackground({ children, dark = false }) {
  return (
      <View style={[styles.container, dark && styles.containerDark]}>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />
      <View style={[styles.dot, styles.dotTwo]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  containerDark: {
    backgroundColor: '#1B1228',
  },
  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.95,
  },
  blobTop: {
    top: -120,
    left: -76,
    backgroundColor: colors.yellow,
  },
  blobBottom: {
    right: -120,
    bottom: -124,
    backgroundColor: colors.lavender,
  },
  dot: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 6,
  },
  dotTwo: {
    width: 18,
    height: 18,
    right: 28,
    top: 86,
    borderColor: colors.yellow,
  },
});
