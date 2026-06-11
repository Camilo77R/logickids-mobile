import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { mercadoTheme } from '../mercadoUiTokens';

const { colors, fonts, spacing } = mercadoTheme;

function StarDisplay({ estrellas }) {
  return (
    <View style={styles.starDisplay}>
      {[0, 1, 2].map((indice) => (
        <View key={indice} style={[styles.starBubble, indice >= estrellas && styles.starBubbleOff]}>
          <Text style={[styles.starBubbleText, indice >= estrellas && styles.starBubbleTextOff]}>
            {'\u2605'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function FinalSummaryColumn({ title, value, helper, noDivider = false }) {
  return (
    <View style={[styles.finalSummaryColumn, noDivider && styles.finalSummaryColumnNoDivider]}>
      <Text style={styles.finalSummaryTitle}>{title}</Text>
      <Text style={styles.finalSummaryValue}>{value}</Text>
      <Text style={styles.finalSummaryHelper}>{helper}</Text>
    </View>
  );
}

function LevelMetric({ title, value, helper }) {
  return (
    <View style={styles.levelMetric}>
      <Text style={styles.levelMetricTitle}>{title}</Text>
      <Text style={styles.levelMetricValue}>{value}</Text>
      <Text style={styles.levelMetricHelper}>{helper}</Text>
    </View>
  );
}

export default function MercadoResultadoOverlay({
  resultado,
  estrellas,
  mensaje,
  estadoGuardado,
  etiquetaPrimaria,
  etiquetaSecundaria,
  esperandoBackend,
  presupuesto,
  monedasUsadas,
  nivel,
  onContinuar,
  onSalir,
}) {
  const esCierreFinal = !etiquetaPrimaria;
  const aciertos = resultado.estadisticas.aciertos;
  const errores = resultado.estadisticas.errores;
  const combo = resultado.estadisticas.comboMaximo;
  const puntaje = resultado.estadisticas.puntaje;
  const rondasCompletadas = resultado.detalles?.rondasCompletadas ?? 1;
  const rondasTotales = resultado.detalles?.rondasPorPartida ?? rondasCompletadas;

  return (
    <View style={styles.backdrop}>
      <View style={styles.topRow}>
        <View style={styles.playerCard}>
          <View style={styles.avatarFrame}>
            <Text style={styles.avatarFace}>{'\u263A'}</Text>
          </View>
          <View style={styles.playerBadge}>
            <Text style={styles.playerBadgeText}>{'\u2605'}</Text>
          </View>
          <Text style={styles.playerLevel}>NIVEL {nivel}</Text>
        </View>

        <View style={styles.bannerShell}>
          <View style={styles.bannerBody}>
            <Text style={styles.bannerText}>
              {esCierreFinal ? 'SESION DE CLASE FINALIZADA' : 'MISION DE NIVEL COMPLETADA'}
            </Text>
          </View>
        </View>

        {esCierreFinal ? (
          <View style={styles.topStarCluster}>
            <Text style={styles.topStarClusterText}>{'\u2605 \u2605 \u2605'}</Text>
          </View>
        ) : (
          <View style={styles.coinBag}>
            <Text style={styles.coinBagValue}>{presupuesto}</Text>
            <Text style={styles.coinBagLabel}>MONEDAS</Text>
          </View>
        )}
      </View>

      <View style={styles.centerWrap}>
        {esCierreFinal ? (
          <View style={styles.trophySection}>
            <Text style={styles.trophyIcon}>{'\u2302'}</Text>
            <View style={styles.trophyCup}>
              <Text style={styles.trophyCupText}>{'\u2605'}</Text>
            </View>
            <View style={styles.diplomaCard}>
              <Text style={styles.diplomaTitle}>DIPLOMA DE</Text>
              <Text style={styles.diplomaTitle}>COMPRADOR</Text>
              <Text style={styles.diplomaTitle}>INTELIGENTE</Text>
            </View>
          </View>
        ) : (
          <View style={styles.parchmentCard}>
            <Text style={styles.parchmentTitle}>GENIAL! HAS GANADO {estrellas} ESTRELLAS</Text>
          </View>
        )}

        <StarDisplay estrellas={estrellas} />

        {esCierreFinal ? (
          <View style={styles.finalSummaryCard}>
            <FinalSummaryColumn
              title="MISIONES TOTALES"
              value={`${rondasCompletadas}/${rondasTotales}`}
              helper="COMPLETADAS"
            />
            <FinalSummaryColumn
              title="TOTAL ESTRELLAS"
              value={`${estrellas}/3`}
              helper="EN ESTA SESION"
            />
            <FinalSummaryColumn
              title="ESTADISTICAS GLOBALES"
              value={`ACIERTOS: ${aciertos}`}
              helper={`FALLOS: ${errores}  COMBO MAX: x${combo}`}
              noDivider
            />
          </View>
        ) : (
          <View style={styles.levelSummaryCard}>
            <LevelMetric title="ACIERTOS" value={`${aciertos} Objetos`} helper="COMPRA LOGRADA" />
            <LevelMetric title="INTENTOS FALLIDOS" value={`${errores} Intento`} helper="SIGUE AJUSTANDO" />
            <LevelMetric title="COMBO ACTUAL" value={`x${combo}`} helper={estadoGuardado} />
            <LevelMetric title="MONEDAS TOTALES" value={`${monedasUsadas}`} helper="MONEDAS USADAS" />
          </View>
        )}

        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>
            {esCierreFinal
              ? 'SUPER TRABAJO! ERES UN EXPERTO DEL MERCADO INTELIGENTE.'
              : 'EXCELENTE! LOGRASTE LA MISION SIN PASARTE DEL PRESUPUESTO.'}
          </Text>
          <Text style={styles.messageSubtext}>{mensaje}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onSalir}
          style={[
            styles.bottomButton,
            esCierreFinal ? styles.leftButtonFinal : styles.leftButtonLevel,
          ]}
        >
          <Text style={styles.leftButtonText}>
            {esCierreFinal ? 'VER HISTORIAL DE SESIONES' : 'VER INVENTARIO'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          disabled={esperandoBackend}
          onPress={etiquetaPrimaria ? onContinuar : onSalir}
          style={[
            styles.bottomButton,
            esCierreFinal ? styles.rightButtonFinal : styles.rightButtonLevel,
            esperandoBackend && styles.rightButtonDisabled,
          ]}
        >
          <Text style={styles.rightButtonText}>
            {etiquetaPrimaria ? 'SIGUIENTE NIVEL' : (etiquetaSecundaria ?? `PUNTAJE ${puntaje}`).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    zIndex: 100,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  playerCard: {
    width: 126,
    borderRadius: 24,
    backgroundColor: colors.panelCream,
    borderWidth: 3,
    borderColor: colors.borderDark,
    padding: 8,
    alignItems: 'center',
  },
  avatarFrame: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: colors.badgeBlue,
    borderWidth: 3,
    borderColor: colors.badgeBlueBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFace: {
    color: colors.ink,
    fontSize: 40,
  },
  playerBadge: {
    position: 'absolute',
    left: -7,
    bottom: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.coin,
    borderWidth: 3,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBadgeText: {
    color: colors.coinDeep,
    fontSize: 20,
  },
  playerLevel: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.woodDark,
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  bannerShell: {
    flex: 1,
    marginHorizontal: 18,
    borderRadius: 32,
    backgroundColor: colors.greenPrimaryDark,
    paddingBottom: 5,
  },
  bannerBody: {
    minHeight: 86,
    borderRadius: 29,
    backgroundColor: colors.greenPrimary,
    borderWidth: 4,
    borderColor: colors.greenPrimaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  bannerText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 22,
    textAlign: 'center',
  },
  topStarCluster: {
    width: 126,
    minHeight: 110,
    borderRadius: 28,
    backgroundColor: colors.panelCream,
    borderWidth: 3,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  topStarClusterText: {
    color: colors.starBorder,
    fontSize: 26,
    textAlign: 'center',
  },
  coinBag: {
    width: 126,
    minHeight: 110,
    borderRadius: 28,
    backgroundColor: '#B97A47',
    borderWidth: 3,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinBagValue: {
    color: colors.panelCreamStrong,
    fontFamily: fonts.black,
    fontSize: 32,
  },
  coinBagLabel: {
    color: colors.panelCream,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 82,
  },
  trophySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 10,
  },
  trophyIcon: {
    display: 'none',
  },
  trophyCup: {
    width: 150,
    height: 150,
    borderRadius: 36,
    backgroundColor: '#FFCE53',
    borderWidth: 5,
    borderColor: '#D68B1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyCupText: {
    color: '#B46811',
    fontSize: 76,
  },
  diplomaCard: {
    borderRadius: 22,
    backgroundColor: colors.panelCream,
    borderWidth: 3,
    borderColor: colors.borderDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    transform: [{ rotate: '-8deg' }],
  },
  diplomaTitle: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 18,
    textAlign: 'center',
  },
  parchmentCard: {
    minWidth: 450,
    borderRadius: 26,
    backgroundColor: colors.parchment,
    borderWidth: 3,
    borderColor: colors.borderDark,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: 8,
  },
  parchmentTitle: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 20,
    textAlign: 'center',
  },
  starDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 14,
  },
  starBubble: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FFE78A',
    borderWidth: 5,
    borderColor: colors.starBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBubbleOff: {
    backgroundColor: '#D7D2CA',
    borderColor: '#99908B',
  },
  starBubbleText: {
    color: colors.starBorder,
    fontSize: 60,
  },
  starBubbleTextOff: {
    color: '#7B7772',
  },
  finalSummaryCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: colors.panelCream,
    borderWidth: 4,
    borderColor: colors.borderDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finalSummaryColumn: {
    flex: 1,
    minHeight: 146,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRightWidth: 2,
    borderRightColor: '#D7B07A',
  },
  finalSummaryColumnNoDivider: {
    borderRightWidth: 0,
  },
  finalSummaryTitle: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 17,
    textAlign: 'center',
  },
  finalSummaryValue: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 28,
    textAlign: 'center',
    marginTop: 10,
  },
  finalSummaryHelper: {
    color: colors.inkSoft,
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  levelSummaryCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: colors.panelCream,
    borderWidth: 4,
    borderColor: colors.borderDark,
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  levelMetric: {
    width: '48.5%',
    minHeight: 110,
    borderRadius: 20,
    backgroundColor: colors.panelCreamSoft,
    borderWidth: 2,
    borderColor: '#E2C190',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  levelMetricTitle: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 16,
    textAlign: 'center',
  },
  levelMetricValue: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 24,
    textAlign: 'center',
    marginTop: 8,
  },
  levelMetricHelper: {
    color: colors.inkSoft,
    fontFamily: fonts.bold,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  messageBubble: {
    width: '88%',
    borderRadius: 32,
    backgroundColor: colors.whiteSoft,
    borderWidth: 4,
    borderColor: colors.borderDark,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  messageText: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
  },
  messageSubtext: {
    color: colors.inkSoft,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bottomButton: {
    flex: 1,
    minHeight: 88,
    borderRadius: 26,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  leftButtonFinal: {
    backgroundColor: colors.greenPrimary,
    borderColor: colors.greenPrimaryDark,
  },
  leftButtonLevel: {
    backgroundColor: colors.brownAction,
    borderColor: colors.brownActionDark,
  },
  rightButtonFinal: {
    backgroundColor: colors.blueAction,
    borderColor: colors.blueActionDark,
  },
  rightButtonLevel: {
    backgroundColor: colors.greenPrimary,
    borderColor: colors.greenPrimaryDark,
  },
  rightButtonDisabled: {
    opacity: 0.6,
  },
  leftButtonText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 20,
    textAlign: 'center',
  },
  rightButtonText: {
    color: colors.whiteSoft,
    fontFamily: fonts.black,
    fontSize: 22,
    textAlign: 'center',
  },
});
