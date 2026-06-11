import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { mercadoTheme } from '../mercadoUiTokens';

const { colors, fonts, spacing } = mercadoTheme;

const normalizarEnteroPositivo = (valor, respaldo = 1) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : respaldo;
};

export default function MercadoMisionCard({ ronda }) {
  const presupuesto = ronda?.objetivo?.presupuestoObjetivo ?? 0;
  const cantidad = normalizarEnteroPositivo(ronda?.objetivo?.cantidadObjetivos, 2);

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <View style={styles.sideWingLeft} />
      <View style={styles.sideWingRight} />
      <View style={styles.bannerShadow}>
        <View style={styles.bannerBody}>
          <Text style={styles.title} numberOfLines={2}>
            MISION: ¡COMPRA {cantidad} OBJETOS SIN PASARTE DE {presupuesto} MONEDAS!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 4,
    left: 190,
    right: 190,
    zIndex: 32,
    alignItems: 'stretch',
  },
  sideWingLeft: {
    position: 'absolute',
    left: -40,
    top: 16,
    width: 74,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#A76534',
    borderWidth: 3,
    borderColor: colors.borderDark,
    transform: [{ rotate: '-16deg' }],
  },
  sideWingRight: {
    position: 'absolute',
    right: -40,
    top: 16,
    width: 74,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#A76534',
    borderWidth: 3,
    borderColor: colors.borderDark,
    transform: [{ rotate: '16deg' }],
  },
  bannerShadow: {
    minHeight: 96,
    borderRadius: 34,
    backgroundColor: colors.greenPrimaryDark,
    paddingBottom: 5,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  bannerBody: {
    minHeight: 90,
    borderRadius: 31,
    borderWidth: 4,
    borderColor: colors.greenPrimaryBorder,
    backgroundColor: colors.greenPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 24,
    lineHeight: 28,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(76,45,6,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
});
