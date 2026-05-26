import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ACCESS_COLORS, ACCESS_COPY } from '../studentAccess.theme';

export default function StudentAccessHero() {
  return (
    <View style={styles.wrap}>
      <View style={styles.heroCard}>
        <View style={styles.glowBlue} />
        <View style={styles.glowGreen} />
        <View style={styles.stripPrimary} />
        <View style={styles.stripAccent} />

        <View style={styles.topRow}>
          <View style={styles.ticket}>
            <Text style={styles.ticketLabel}>Acceso del estudiante</Text>
          </View>

          <View style={styles.signalWrap}>
            <View style={styles.signalBlue} />
            <View style={styles.signalGreen} />
          </View>
        </View>

        <View style={styles.contentRow}>
          <View style={styles.orbitMark}>
            <View style={styles.orbitRing}>
              <View style={styles.orbitCore} />
            </View>
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>{ACCESS_COPY.title}</Text>
            <Text style={styles.subtitle}>{ACCESS_COPY.subtitle}</Text>
          </View>
        </View>

        <View style={styles.badgesRow}>
          <View style={[styles.badge, styles.badgeBlue]}>
            <Text style={[styles.badgeText, { color: ACCESS_COLORS.blue }]}>Entrada rápida</Text>
          </View>
          <View style={[styles.badge, styles.badgeGreen]}>
            <Text style={[styles.badgeText, { color: ACCESS_COLORS.green }]}>Sin contraseñas</Text>
          </View>
          <View style={[styles.badge, styles.badgeOrange]}>
            <Text style={[styles.badgeText, { color: ACCESS_COLORS.orange }]}>Lista para jugar</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: 32,
    padding: 20,
    gap: 16,
    backgroundColor: ACCESS_COLORS.card,
    borderWidth: 1.5,
    borderColor: 'rgba(0,123,255,0.10)',
    shadowColor: ACCESS_COLORS.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  glowBlue: {
    position: 'absolute',
    top: -28,
    right: -20,
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: 'rgba(0,123,255,0.14)',
  },
  glowGreen: {
    position: 'absolute',
    bottom: -24,
    left: -20,
    width: 122,
    height: 122,
    borderRadius: 999,
    backgroundColor: 'rgba(57,211,83,0.16)',
  },
  stripPrimary: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 110,
    height: 7,
    backgroundColor: ACCESS_COLORS.blue,
    borderBottomRightRadius: 12,
  },
  stripAccent: {
    position: 'absolute',
    top: 7,
    left: 0,
    width: 74,
    height: 5,
    backgroundColor: ACCESS_COLORS.yellow,
    borderBottomRightRadius: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  ticket: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: ACCESS_COLORS.page,
    borderWidth: 1,
    borderColor: 'rgba(0,123,255,0.10)',
  },
  ticketLabel: {
    color: ACCESS_COLORS.blue,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  signalWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalBlue: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: ACCESS_COLORS.blue,
  },
  signalGreen: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: ACCESS_COLORS.green,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  orbitMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: ACCESS_COLORS.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRing: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 6,
    borderColor: ACCESS_COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCESS_COLORS.yellow,
  },
  orbitCore: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: ACCESS_COLORS.orange,
  },
  copyBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: ACCESS_COLORS.navy,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: ACCESS_COLORS.navySoft,
    fontSize: 15,
    lineHeight: 22,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeBlue: {
    backgroundColor: ACCESS_COLORS.sky,
  },
  badgeGreen: {
    backgroundColor: ACCESS_COLORS.mint,
  },
  badgeOrange: {
    backgroundColor: ACCESS_COLORS.peach,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
