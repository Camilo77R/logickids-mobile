import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, shadows } from '../constants/theme';

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={[styles.label, textStyle]}>{title}</Text>
          <Text style={styles.arrow}>→</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    ...shadows.button,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  icon: {
    color: colors.purpleDark,
    fontSize: 18,
    fontFamily: fonts.black,
  },
  label: {
    color: colors.purpleDark,
    fontSize: 20,
    fontFamily: fonts.black,
    textAlign: 'center',
  },
  arrow: {
    color: colors.purpleDark,
    fontSize: 19,
    fontFamily: fonts.black,
  },
});
