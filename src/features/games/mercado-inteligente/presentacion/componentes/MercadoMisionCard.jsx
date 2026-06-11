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
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>Pedido</Text>
      <Text style={styles.title} numberOfLines={1}>
        Elige {cantidad} · Hasta {presupuesto} monedas
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 26,
    top: 58,
    left: spacing.md,
    width: 300,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.gold,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 7,
  },
  eyebrow: {
    color: colors.amberDark,
    fontFamily: fonts.black,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 14,
    lineHeight: 18,
  },
});
