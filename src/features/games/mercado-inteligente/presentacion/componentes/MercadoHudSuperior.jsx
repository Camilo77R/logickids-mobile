import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { mercadoTheme } from '../mercadoUiTokens';

const { colors, fonts, spacing } = mercadoTheme;

export default function MercadoHudSuperior({
  nivel,
  presupuesto,
  cantidadSeleccionada,
  cantidadObjetivo,
}) {
  return (
    <View style={styles.wrapper} pointerEvents="none">
      <View style={styles.taskPanel}>
        <Text style={styles.taskTitle}>TAREA</Text>

        <View style={styles.taskBody}>
          <View style={styles.taskAvatarWrap}>
            <Text style={styles.taskAvatar}>{'\u25CF'}</Text>
            <View style={styles.taskCheckBadge}>
              <Text style={styles.taskCheckText}>{'\u2713'}</Text>
            </View>
          </View>

          <Text style={styles.taskMetric}>
            {cantidadSeleccionada}/{cantidadObjetivo}
          </Text>
          <Text style={styles.taskLabel}>OBJETOS</Text>
        </View>

        <View style={styles.taskDivider} />

        <View style={styles.coinGoalRow}>
          <View style={styles.coinGoalBubble}>
            <View style={styles.coinGoalInner} />
          </View>

          <View style={styles.coinGoalTextWrap}>
            <Text style={styles.coinGoalValue}>MAX {presupuesto}</Text>
            <Text style={styles.coinGoalLabel}>MONEDAS</Text>
          </View>
        </View>
      </View>

      <View style={styles.playerColumn}>
        <View style={styles.playerCard}>
          <View style={styles.playerStarBadge}>
            <Text style={styles.playerStarText}>{'\u2605'}</Text>
          </View>

          <View style={styles.playerRibbon} />

          <View style={styles.playerAvatarFrame}>
            <Text style={styles.playerAvatarFace}>{'\u263A'}</Text>
          </View>

          <View style={styles.playerLevelPill}>
            <Text style={styles.playerLevelText}>NIVEL {nivel}</Text>
          </View>
        </View>

        <View style={styles.playerCoinsRow}>
          <View style={styles.playerCoinBubble}>
            <View style={styles.playerCoinInner} />
          </View>
          <Text style={styles.playerCoinsText}>{presupuesto} Monedas</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 35,
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskPanel: {
    width: 164,
    minHeight: 232,
    borderRadius: 32,
    backgroundColor: '#BF7A44',
    borderWidth: 3,
    borderColor: colors.borderDark,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  taskTitle: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  taskBody: {
    marginTop: 10,
    alignItems: 'center',
  },
  taskAvatarWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskAvatar: {
    color: '#6A3510',
    fontSize: 44,
    lineHeight: 44,
  },
  taskCheckBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.greenPrimary,
    borderWidth: 2,
    borderColor: colors.whiteSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 16,
  },
  taskMetric: {
    marginTop: 6,
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 28,
    lineHeight: 30,
  },
  taskLabel: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  taskDivider: {
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(74,37,4,0.22)',
    marginVertical: 14,
  },
  coinGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinGoalBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F2B63E',
    borderWidth: 3,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  coinGoalInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    borderColor: '#FFEDAF',
  },
  coinGoalTextWrap: {
    flex: 1,
  },
  coinGoalValue: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 24,
  },
  coinGoalLabel: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  playerColumn: {
    width: 154,
    alignItems: 'stretch',
  },
  playerCard: {
    borderRadius: 26,
    backgroundColor: colors.panelCream,
    borderWidth: 3,
    borderColor: colors.borderDark,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  playerStarBadge: {
    position: 'absolute',
    top: -8,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.panelCream,
    borderWidth: 3,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  playerStarText: {
    color: colors.coinDeep,
    fontSize: 18,
  },
  playerRibbon: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 10,
    height: 46,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#D9574B',
  },
  playerAvatarFrame: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: colors.badgeBlue,
    borderWidth: 3,
    borderColor: colors.badgeBlueBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarFace: {
    color: colors.ink,
    fontSize: 40,
  },
  playerLevelPill: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.woodDark,
  },
  playerLevelText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  playerCoinsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCoinBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2B63E',
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  playerCoinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#FFEDAF',
  },
  playerCoinsText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 16,
    textShadowColor: 'rgba(74,37,4,0.24)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
});
