import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radii, shadows, spacing } from '../../../../constants/theme';
import { mercadoArTheme } from '../mercadoArTheme';

function ProductoPreview({ producto }) {
  return (
    <View
      style={[
        styles.productoMini,
        {
          backgroundColor: producto.colores.fondo,
          borderColor: producto.seleccionado ? producto.colores.tinta : producto.colores.borde,
          transform: [{ translateY: producto.seleccionado ? -6 : 0 }],
        },
      ]}
    >
      <Text style={[styles.productoMiniBadge, { color: producto.colores.tinta }]}>
        {producto.categoria}
      </Text>
      <View
        style={[
          styles.productoFigura,
          { backgroundColor: producto.colores.techo },
          producto.seleccionado && styles.productoFiguraActiva,
        ]}
      />
      <Text style={[styles.productoMiniNombre, { color: producto.colores.tinta }]}>
        {producto.nombre}
      </Text>
      <Text style={[styles.productoMiniPrecio, { color: producto.colores.tinta }]}>
        {producto.precio} monedas
      </Text>
    </View>
  );
}

export default function MercadoArVistaArPreview({
  onSalir,
  escenaEspacial,
  rondaLabel,
  presupuestoLabel,
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={onSalir} activeOpacity={0.88} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Preview AR</Text>
          <Text style={styles.title}>{escenaEspacial.puesto.titulo}</Text>
          <Text style={styles.subtitle}>{escenaEspacial.puesto.subtitulo}</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{rondaLabel}</Text>
            <Text style={styles.metricLabel}>Ronda</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{presupuestoLabel}</Text>
            <Text style={styles.metricLabel}>Presupuesto</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{escenaEspacial.canasta.seleccionados}</Text>
            <Text style={styles.metricLabel}>Canasta</Text>
          </View>
        </View>

        <View style={styles.stageWrap}>
          <View style={styles.skyGlowA} />
          <View style={styles.skyGlowB} />
          <View style={styles.stage}>
            <View style={styles.cartel}>
              <Text style={styles.cartelText}>Puesto AR listo para React Viro</Text>
            </View>
            <View style={styles.toldo} />
            <View style={styles.soporteIzquierdo} />
            <View style={styles.soporteDerecho} />
            <View style={styles.mostrador}>
              <View style={styles.productosGrid}>
                {escenaEspacial.productos.map((producto) => (
                  <ProductoPreview key={producto.id} producto={producto} />
                ))}
              </View>
            </View>
            <View style={styles.canasta}>
              <Text style={styles.canastaText}>Canasta</Text>
            </View>
            <View style={styles.shadow} />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Por qué esta dirección sube el nivel</Text>
          <Text style={styles.panelText}>
            El puesto concentra la atención, agranda los productos y deja el presupuesto
            en un HUD claro. Eso funciona mejor para niños y además encaja bien con AR.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mercadoArTheme.fondos.cielo,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  exitButton: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.soft,
  },
  exitButtonText: {
    color: mercadoArTheme.tintas.fuerte,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  hero: {
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    ...shadows.soft,
  },
  eyebrow: {
    color: mercadoArTheme.tintas.alerta,
    fontFamily: fonts.black,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: mercadoArTheme.tintas.fuerte,
    fontFamily: fonts.black,
    fontSize: 26,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: mercadoArTheme.tintas.cuerpo,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.soft,
  },
  metricValue: {
    color: mercadoArTheme.tintas.fuerte,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  metricLabel: {
    color: mercadoArTheme.tintas.cuerpo,
    fontFamily: fonts.bold,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  stageWrap: {
    borderRadius: 28,
    backgroundColor: '#FFECC9',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  skyGlowA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
    top: -30,
    left: -20,
  },
  skyGlowB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.3)',
    top: 80,
    right: -20,
  },
  stage: {
    minHeight: 380,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cartel: {
    position: 'absolute',
    top: 4,
    borderRadius: radii.md,
    backgroundColor: mercadoArTheme.fondos.cartel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: '#F6C77A',
  },
  cartelText: {
    color: mercadoArTheme.tintas.alerta,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  toldo: {
    position: 'absolute',
    top: 52,
    width: '86%',
    height: 52,
    borderRadius: 20,
    backgroundColor: mercadoArTheme.fondos.toldo,
  },
  soporteIzquierdo: {
    position: 'absolute',
    top: 92,
    left: '16%',
    width: 10,
    height: 170,
    borderRadius: 8,
    backgroundColor: '#C67B2C',
  },
  soporteDerecho: {
    position: 'absolute',
    top: 92,
    right: '16%',
    width: 10,
    height: 170,
    borderRadius: 8,
    backgroundColor: '#C67B2C',
  },
  mostrador: {
    width: '92%',
    minHeight: 190,
    borderRadius: 28,
    backgroundColor: mercadoArTheme.fondos.mostrador,
    padding: spacing.md,
    justifyContent: 'center',
  },
  productosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  productoMini: {
    width: '30%',
    minHeight: 116,
    borderRadius: 18,
    padding: spacing.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productoMiniBadge: {
    fontFamily: fonts.black,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  productoFigura: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  productoFiguraActiva: {
    transform: [{ scale: 1.12 }],
  },
  productoMiniNombre: {
    fontFamily: fonts.black,
    fontSize: 13,
    textAlign: 'center',
  },
  productoMiniPrecio: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  canasta: {
    position: 'absolute',
    right: 14,
    bottom: 34,
    width: 84,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#D89B48',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F6D2A3',
  },
  canastaText: {
    color: '#6B3D00',
    fontFamily: fonts.black,
    fontSize: 11,
  },
  shadow: {
    position: 'absolute',
    bottom: 6,
    width: '76%',
    height: 24,
    borderRadius: 999,
    backgroundColor: mercadoArTheme.fondos.sombra,
  },
  panel: {
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    ...shadows.soft,
  },
  panelTitle: {
    color: mercadoArTheme.tintas.fuerte,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  panelText: {
    color: mercadoArTheme.tintas.cuerpo,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
});
