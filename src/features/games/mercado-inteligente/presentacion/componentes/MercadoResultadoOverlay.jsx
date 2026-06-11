import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { mercadoTheme } from '../mercadoUiTokens';

const { colors, fonts, radii, spacing } = mercadoTheme;

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  onContinuar,
  onSalir,
}) {
  const aciertos = resultado.estadisticas.aciertos;
  const errores = resultado.estadisticas.errores;
  const titulo = aciertos > 0 ? 'Gran compra' : 'Buen intento';

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.ribbon}>Pedido revisado</Text>
            <Text style={styles.title}>{titulo}</Text>
            <View style={styles.starsRow}>
              {[0, 1, 2].map((starIndex) => (
                <Text
                  key={starIndex}
                  style={[
                    styles.star,
                    starIndex >= estrellas && styles.starEmpty,
                  ]}
                >
                  {'\u2605'}
                </Text>
              ))}
            </View>
          </View>

          <Text style={styles.saveState} numberOfLines={2}>
            {estadoGuardado}
          </Text>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.resultMessage} numberOfLines={2}>
            {mensaje}
          </Text>
        </View>

        <View style={styles.metrics}>
          <Metric label="Puntos" value={resultado.estadisticas.puntaje} />
          <Metric label="Aciertos" value={aciertos} />
          <Metric label="Combo" value={`x${resultado.estadisticas.comboMaximo}`} />
          <Metric label="Errores" value={errores} />
        </View>

        <View style={styles.actions}>
          {etiquetaPrimaria ? (
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={esperandoBackend}
              onPress={onContinuar}
              style={[
                styles.primary,
                esperandoBackend && styles.primaryDisabled,
              ]}
            >
              <Text style={styles.primaryText}>{etiquetaPrimaria}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity activeOpacity={0.9} onPress={onSalir} style={styles.secondary}>
            <Text style={styles.secondaryText}>{etiquetaSecundaria}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 46, 66, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    zIndex: 100,
  },
  card: {
    width: '96%',
    height: '90%',
    borderRadius: 34,
    backgroundColor: colors.cardSolid,
    borderWidth: 3,
    borderColor: colors.gold,
    padding: spacing.md,
    justifyContent: 'space-between',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 16,
  },
  topRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.creamStrong,
  },
  avatarText: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 28,
  },
  titleBlock: {
    flex: 1,
  },
  ribbon: {
    color: colors.amberDark,
    fontFamily: fonts.black,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 31,
    lineHeight: 35,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  star: {
    color: colors.amber,
    fontFamily: fonts.black,
    fontSize: 26,
    lineHeight: 29,
  },
  starEmpty: {
    color: '#E3D8BD',
  },
  saveState: {
    width: 190,
    color: colors.amberDark,
    fontFamily: fonts.black,
    fontSize: 12,
    textAlign: 'right',
  },
  messageBox: {
    borderRadius: 22,
    backgroundColor: '#E9FFF4',
    borderWidth: 2,
    borderColor: '#B6F2CF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultMessage: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: colors.creamStrong,
    borderWidth: 1,
    borderColor: '#FFE2A1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 25,
  },
  metricLabel: {
    color: colors.inkSoft,
    fontFamily: fonts.black,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: {
    opacity: 0.62,
  },
  primaryText: {
    color: colors.ink,
    fontFamily: fonts.black,
    fontSize: 16,
  },
  secondary: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.cardSolid,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.amberDark,
    fontFamily: fonts.black,
    fontSize: 16,
  },
});
