import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { mercadoTheme } from '../mercadoUiTokens';

const { colors, fonts, radii, spacing } = mercadoTheme;

const ICONOS_PRODUCTO = Object.freeze({
  manzana: '\u{1F34E}',
  pera: '\u{1F350}',
  tomate: '\u{1F345}',
  banano: '\u{1F34C}',
  fresa: '\u{1F353}',
  platano: '\u{1F34C}',
  zanahoria: '\u{1F955}',
  lechuga: '\u{1F96C}',
  leche: '\u{1F95B}',
  queso: '\u{1F9C0}',
  pan: '\u{1F35E}',
  galleta: '\u{1F36A}',
  muffin: '\u{1F9C1}',
  yogur: '\u{1F964}',
});

const resolverIconoProducto = (producto) =>
  ICONOS_PRODUCTO[producto?.id] ?? producto?.nombre?.slice(0, 1)?.toUpperCase() ?? '?';

function BagItem({ producto }) {
  return (
    <View style={styles.bagItemSlot}>
      <Text style={styles.bagItemEmoji}>{resolverIconoProducto(producto)}</Text>
    </View>
  );
}

function BasketItem({ producto, offsetStyle }) {
  return (
    <View style={[styles.basketItem, offsetStyle]}>
      <Text style={styles.basketItemEmoji}>{resolverIconoProducto(producto)}</Text>
    </View>
  );
}

function FloatingCoin({ style }) {
  return (
    <View style={[styles.floatingCoin, style]}>
      <View style={styles.floatingCoinInner} />
    </View>
  );
}

export default function MercadoPanelInferior({
  total,
  productosSeleccionados,
  onConfirmar,
  onReiniciar,
  onSalir,
  confirmarDeshabilitado,
}) {
  const itemsVisibles = productosSeleccionados.slice(0, 2);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.bagPanel}>
        <View style={styles.bagHandle} />
        <Text style={styles.bagTitle}>MOCHILA</Text>

        <View style={styles.bagItemsWrap}>
          {itemsVisibles.length > 0 ? (
            itemsVisibles.map((producto) => <BagItem key={producto.id} producto={producto} />)
          ) : (
            <>
              <View style={styles.bagItemEmpty} />
              <View style={styles.bagItemEmpty} />
            </>
          )}
        </View>

      </View>

      <View style={styles.centerZone}>
        <View style={styles.totalBubble}>
          <Text style={styles.totalTitle}>TOTAL:</Text>
          <Text style={styles.totalValue}>{total} MONEDAS</Text>
          <View style={styles.totalPointer} />
        </View>

        <View style={styles.basketWrap}>
          <View style={styles.basketShadow} />
          <View style={styles.basketHandleLeft} />
          <View style={styles.basketHandleRight} />
          <View style={styles.basketBody}>
            <View style={styles.basketRim} />
            <View style={styles.basketGrid}>
              <View style={styles.basketGridBar} />
              <View style={styles.basketGridBar} />
              <View style={styles.basketGridBar} />
            </View>

            {itemsVisibles[0] ? <BasketItem producto={itemsVisibles[0]} offsetStyle={styles.itemLeft} /> : null}
            {itemsVisibles[1] ? <BasketItem producto={itemsVisibles[1]} offsetStyle={styles.itemRight} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.actionsColumn}>
        <View style={styles.buyButtonWrap}>
          <FloatingCoin style={styles.coinA} />
          <FloatingCoin style={styles.coinB} />
          <FloatingCoin style={styles.coinC} />

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onConfirmar}
            disabled={confirmarDeshabilitado}
            style={[styles.buyButton, confirmarDeshabilitado && styles.buyButtonDisabled]}
          >
            <Text style={styles.buyButtonText}>COMPRAR</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={onReiniciar} style={styles.restartButton}>
          <Text style={styles.restartIcon}>{'\u21BA'}</Text>
          <Text style={styles.restartText}>REINICIAR{'\n'}NIVEL</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={onSalir} style={styles.menuButton}>
          <Text style={styles.menuIcon}>{'\u2630'}</Text>
          <Text style={styles.menuText}>MENU</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomTabs}>
        <View style={styles.bottomTabActive}>
          <Text style={styles.bottomTabActiveText}>JUGAR</Text>
        </View>
        <View style={styles.bottomTab}>
          <Text style={styles.bottomTabText}>TIENDA</Text>
        </View>
        <View style={styles.bottomTab}>
          <Text style={styles.bottomTabText}>LOGROS</Text>
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
    bottom: 2,
    minHeight: 242,
  },
  bagPanel: {
    position: 'absolute',
    left: 8,
    bottom: 40,
    width: 148,
    minHeight: 174,
    borderRadius: 28,
    backgroundColor: colors.panelCream,
    borderWidth: 3,
    borderColor: colors.borderDark,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  bagHandle: {
    position: 'absolute',
    left: 16,
    top: -18,
    width: 38,
    height: 24,
    borderWidth: 4,
    borderColor: '#A96A32',
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: 'transparent',
  },
  bagTitle: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  bagItemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    minHeight: 92,
    marginTop: 14,
  },
  bagItemSlot: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF8EC',
    borderWidth: 2,
    borderColor: '#E7CAA2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagItemEmoji: {
    fontSize: 28,
  },
  bagItemEmpty: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F2E3C7',
    borderWidth: 2,
    borderColor: '#E7CAA2',
  },
  centerZone: {
    position: 'absolute',
    left: 200,
    right: 242,
    bottom: 10,
    alignItems: 'center',
  },
  totalBubble: {
    minWidth: 224,
    minHeight: 74,
    borderRadius: 24,
    backgroundColor: '#C8F0FF',
    borderWidth: 3,
    borderColor: colors.badgeBlueBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: -8,
    zIndex: 3,
  },
  totalTitle: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 18,
  },
  totalValue: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 24,
    marginTop: 2,
  },
  totalPointer: {
    position: 'absolute',
    bottom: -10,
    width: 20,
    height: 20,
    backgroundColor: '#C8F0FF',
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.badgeBlueBorder,
    transform: [{ rotate: '45deg' }],
  },
  basketWrap: {
    width: 232,
    height: 148,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  basketShadow: {
    position: 'absolute',
    bottom: 8,
    width: 178,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(76,40,9,0.18)',
  },
  basketHandleLeft: {
    position: 'absolute',
    top: 26,
    left: 42,
    width: 56,
    height: 18,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#D95345',
    borderWidth: 3,
    borderColor: colors.borderDark,
    transform: [{ rotate: '-28deg' }],
    zIndex: 1,
  },
  basketHandleRight: {
    position: 'absolute',
    top: 38,
    left: 84,
    width: 62,
    height: 14,
    borderRadius: 12,
    backgroundColor: '#D3DCE7',
    borderWidth: 3,
    borderColor: colors.borderDark,
    transform: [{ rotate: '-28deg' }],
    zIndex: 1,
  },
  basketBody: {
    width: 170,
    height: 92,
    borderRadius: 24,
    backgroundColor: '#E89B3D',
    borderWidth: 4,
    borderColor: colors.borderDark,
    overflow: 'hidden',
  },
  basketRim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 16,
    backgroundColor: '#F0B86A',
  },
  basketGrid: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 10,
    top: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  basketGridBar: {
    width: 18,
    borderRadius: 10,
    backgroundColor: '#5486B8',
  },
  basketItem: {
    position: 'absolute',
    top: 6,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketItemEmoji: {
    fontSize: 50,
  },
  itemLeft: {
    left: 28,
  },
  itemRight: {
    right: 22,
  },
  actionsColumn: {
    position: 'absolute',
    right: 4,
    bottom: 42,
    width: 204,
    alignItems: 'stretch',
  },
  buyButtonWrap: {
    minHeight: 116,
    justifyContent: 'center',
    marginBottom: 10,
  },
  buyButton: {
    minHeight: 92,
    borderRadius: radii.pill,
    backgroundColor: colors.greenPrimary,
    borderWidth: 4,
    borderColor: colors.greenPrimaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  buyButtonDisabled: {
    opacity: 0.48,
  },
  buyButtonText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 28,
    letterSpacing: 0.5,
  },
  floatingCoin: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2B63E',
    borderWidth: 3,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  floatingCoinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#FFEDAF',
  },
  coinA: {
    top: 10,
    right: 26,
  },
  coinB: {
    top: 34,
    right: -2,
  },
  coinC: {
    top: 58,
    right: 34,
  },
  restartButton: {
    minHeight: 60,
    borderRadius: 20,
    backgroundColor: colors.redAction,
    borderWidth: 3,
    borderColor: colors.redActionDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  restartIcon: {
    color: colors.whiteSoft,
    fontSize: 28,
    marginRight: 8,
  },
  restartText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 16,
    textAlign: 'center',
  },
  menuButton: {
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: colors.greenPrimary,
    borderWidth: 3,
    borderColor: colors.greenPrimaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: colors.whiteSoft,
    fontSize: 24,
    marginRight: 8,
  },
  menuText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 20,
  },
  bottomTabs: {
    position: 'absolute',
    right: 16,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bottomTabActive: {
    minWidth: 112,
    minHeight: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#F2A33E',
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  bottomTab: {
    minWidth: 106,
    minHeight: 32,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#A96A32',
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  bottomTabActiveText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 15,
  },
  bottomTabText: {
    color: colors.panelCream,
    fontFamily: fonts.black,
    fontSize: 14,
  },
});
