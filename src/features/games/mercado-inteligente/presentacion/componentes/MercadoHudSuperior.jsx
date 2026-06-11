import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { mercadoTheme } from '../mercadoUiTokens';

const { colors, fonts, radii, spacing } = mercadoTheme;

function HudPill({ label, value, compact = false }) {
  return (
    <View style={[styles.pill, compact && styles.pillCompact]}>
      <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
      {!compact ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

export default function MercadoHudSuperior({
  nivel,
  presupuesto,
  estrellas,
  combo,
  onSalir,
}) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity activeOpacity={0.86} onPress={onSalir} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'‹'}</Text>
      </TouchableOpacity>

      <View style={styles.primaryMetrics}>
        <HudPill label="Nivel" value={nivel} />
        <HudPill label="Monedas" value={presupuesto} />
      </View>

      <View style={styles.rewardMetrics}>
        <HudPill compact label="Estrellas" value={`${'★'.repeat(estrellas)}${'☆'.repeat(3 - estrellas)}`} />
        {combo > 0 ? <HudPill compact label="Combo" value={`Combo x${combo}`} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 30,
    top: 4,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(36, 25, 10, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D1903',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 9,
  },
  backButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 46,
    lineHeight: 48,
    marginTop: -4,
  },
  pill: {
    minWidth: 112,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 209, 102, 0.72)',
  },
  pillCompact: {
    minWidth: 86,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
  },
  primaryMetrics: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rewardMetrics: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  value: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 19,
    lineHeight: 22,
  },
  valueCompact: {
    color: colors.amberDark,
    fontSize: 13,
    lineHeight: 16,
  },
  label: {
    color: colors.inkSoft,
    fontFamily: fonts.black,
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
