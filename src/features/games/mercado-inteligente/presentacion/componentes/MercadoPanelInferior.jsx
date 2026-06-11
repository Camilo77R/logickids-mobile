import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { mercadoCopy, mercadoTheme } from '../mercadoUiTokens';

const { colors, fonts, radii, spacing } = mercadoTheme;

export default function MercadoPanelInferior({
  mensaje,
  total,
  presupuesto,
  monedasRestantes,
  combo,
  canastaResumen,
  canastaCantidad,
  canastaObjetivo,
  onPista,
  onConfirmar,
  confirmarDeshabilitado,
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.topStrip}>
        <View style={styles.mascotaMini}>
          <Text style={styles.mascotaMiniText}>M</Text>
        </View>

        <View style={styles.mascotaCopy}>
          <Text style={styles.mascotaNombre}>{mercadoCopy.mascotaNombre}</Text>
          <Text style={styles.mensaje} numberOfLines={1}>
            {mensaje}
          </Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalValue}>{total}/{presupuesto}</Text>
          <Text style={styles.totalLabel}>
            {monedasRestantes === 0 ? `Combo x${combo}` : `${monedasRestantes} restan`}
          </Text>
        </View>
      </View>

      <View style={styles.bottomStrip}>
        <View style={styles.cartBox}>
          <Text style={styles.cartTitle}>Canasta {canastaCantidad}/{canastaObjetivo}</Text>
          <Text style={styles.cartText} numberOfLines={1}>
            {canastaResumen}
          </Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity activeOpacity={0.86} onPress={onPista} style={styles.hintButton}>
            <Text style={styles.hintButtonText}>Pista</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onConfirmar}
            disabled={confirmarDeshabilitado}
            style={[
              styles.primaryButton,
              confirmarDeshabilitado && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>Probar compra</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 29,
    left: spacing.sm,
    right: spacing.sm,
    bottom: 6,
    minHeight: 94,
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: 7,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 12,
  },
  topStrip: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mascotaMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.creamStrong,
  },
  mascotaMiniText: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 19,
  },
  mascotaCopy: {
    flex: 1,
  },
  mascotaNombre: {
    color: colors.amberDark,
    fontFamily: fonts.black,
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  mensaje: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 12,
    lineHeight: 15,
  },
  totalBox: {
    width: 76,
    height: 36,
    borderRadius: 16,
    backgroundColor: colors.creamStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalValue: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 18,
  },
  totalLabel: {
    color: colors.inkSoft,
    fontFamily: fonts.black,
    fontSize: 8,
    lineHeight: 10,
  },
  bottomStrip: {
    height: 40,
    flexDirection: 'row',
    gap: 8,
  },
  cartBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: colors.cardSolid,
    borderWidth: 2,
    borderColor: colors.gold,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  cartTitle: {
    color: colors.amberDark,
    fontFamily: fonts.black,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  cartText: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 11,
    lineHeight: 14,
  },
  buttons: {
    width: 285,
    flexDirection: 'row',
    gap: 7,
  },
  hintButton: {
    flex: 0.72,
    borderRadius: radii.pill,
    backgroundColor: colors.cardSolid,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintButtonText: {
    color: colors.amberDark,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  primaryButton: {
    flex: 1.1,
    borderRadius: radii.pill,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.48,
  },
  primaryButtonText: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 13,
  },
});

