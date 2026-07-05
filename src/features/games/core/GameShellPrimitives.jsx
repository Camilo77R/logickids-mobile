import React from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts } from '../../../constants/theme';
import { colores, espaciado, radios, tipografia } from '../../../theme/tokens';

const MERCADO_BOTON_PRIMARIO = require('../../../../assets/images/mercado-inteligente/session-final/buttons/session-final-return-button-premium.png');
const MERCADO_BOTON_SECUNDARIO = require('../../../../assets/images/mercado-inteligente/session-final/buttons/session-final-history-button-premium.png');
const MERCADO_ESTRELLA_ACTIVA = require('../../../../assets/images/mercado-inteligente/session-final/stars/session-final-star-active-premium.png');
const MERCADO_ESTRELLA_INACTIVA = require('../../../../assets/images/mercado-inteligente/session-final/stars/session-final-star-inactive-premium.png');
const MERCADO_PANEL_RESUMEN = require('../../../../assets/images/mercado-inteligente/session-final/panels/session-final-summary-card-premium.png');
const MERCADO_GLOBO_MENSAJE = require('../../../../assets/images/mercado-inteligente/session-final/panels/session-final-message-bubble-premium.png');

export function GameOverlayLayer({
  children,
  dimmed = true,
  centered = true,
  padding = espaciado.lg,
}) {
  return (
    <View
      style={[
        styles.overlayLayer,
        dimmed ? styles.overlayLayerDimmed : styles.overlayLayerClear,
        centered && styles.overlayLayerCentered,
        { padding },
      ]}
    >
      {children}
    </View>
  );
}

export function GameSurfaceCard({
  iconName,
  eyebrow,
  title,
  description,
  children,
  accent = 'yellow',
  compact = false,
}) {
  return (
    <View style={[styles.surfaceCard, compact && styles.surfaceCardCompact]}>
      {iconName ? (
        <View style={[styles.iconBubble, accent === 'blue' && styles.iconBubbleBlue]}>
          <Ionicons name={iconName} size={28} color={colores.fondoSecundario} />
        </View>
      ) : null}

      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {description ? <Text style={styles.cardDescription}>{description}</Text> : null}

      {children}
    </View>
  );
}

export function GameActionButton({
  label,
  onPress,
  iconName,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}) {
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButtonTouchable, disabled && styles.actionButtonDisabled, style]}
    >
      <ImageBackground
        source={isSecondary ? MERCADO_BOTON_SECUNDARIO : MERCADO_BOTON_PRIMARIO}
        resizeMode="stretch"
        style={styles.actionButton}
        imageStyle={styles.actionButtonImage}
      >
        {iconName ? (
          <Ionicons
            name={iconName}
            size={18}
            color={isSecondary ? colores.fondoSecundario : colors.white}
          />
        ) : null}
        <Text
          style={[
            styles.actionButtonText,
            isSecondary ? styles.actionButtonTextSecondary : styles.actionButtonTextPrimary,
            textStyle,
          ]}
        >
          {label}
        </Text>
      </ImageBackground>
    </TouchableOpacity>
  );
}

export function GameStarsRow({ earned = 0, total = 3, size = 72 }) {
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: total }, (_, index) => {
        const active = index < earned;

        return (
          <Image
            key={`game-star-${index}`}
            source={active ? MERCADO_ESTRELLA_ACTIVA : MERCADO_ESTRELLA_INACTIVA}
            resizeMode="contain"
            style={{ width: size, height: size }}
          />
        );
      })}
    </View>
  );
}

export function GameMetricGrid({ items, compact = false }) {
  return (
    <ImageBackground
      source={MERCADO_PANEL_RESUMEN}
      resizeMode="stretch"
      style={[styles.metricGridPanel, compact && styles.metricGridPanelCompact]}
      imageStyle={styles.metricGridPanelImage}
    >
      <View style={[styles.metricGrid, compact && styles.metricGridCompact]}>
        {items.map((item) => (
          <View key={item.label} style={[styles.metricCard, compact && styles.metricCardCompact]}>
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </ImageBackground>
  );
}

export function GameMessageBubble({ title, message, detail }) {
  return (
    <ImageBackground
      source={MERCADO_GLOBO_MENSAJE}
      resizeMode="stretch"
      style={styles.messageBubble}
      imageStyle={styles.messageBubbleImage}
    >
      {title ? <Text style={styles.messageBubbleTitle}>{title}</Text> : null}
      {message ? <Text style={styles.messageBubbleMessage}>{message}</Text> : null}
      {detail ? <Text style={styles.messageBubbleDetail}>{detail}</Text> : null}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  overlayLayerDimmed: {
    backgroundColor: 'rgba(8, 17, 31, 0.78)',
  },
  overlayLayerClear: {
    backgroundColor: 'transparent',
  },
  overlayLayerCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  surfaceCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(10, 27, 49, 0.94)',
    borderRadius: 32,
    paddingHorizontal: espaciado.xl,
    paddingVertical: espaciado.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  surfaceCardCompact: {
    maxWidth: 420,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.lg,
  },
  iconBubble: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE68A',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    marginBottom: espaciado.sm,
  },
  iconBubbleBlue: {
    backgroundColor: '#BAE6FD',
  },
  eyebrow: {
    color: '#7DD3FC',
    fontFamily: fonts.black,
    fontSize: tipografia.etiqueta,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: espaciado.xs,
  },
  cardTitle: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: tipografia.subtitulo + 8,
    textAlign: 'center',
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: fonts.bold,
    fontSize: tipografia.cuerpo + 1,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: espaciado.sm,
  },
  actionButton: {
    minHeight: 76,
    minWidth: 260,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espaciado.sm,
    paddingHorizontal: 34,
    paddingVertical: 16,
  },
  actionButtonTouchable: {
    alignSelf: 'center',
  },
  actionButtonImage: {
    borderRadius: radios.pill,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontFamily: fonts.black,
    fontSize: tipografia.cuerpo + 2,
  },
  actionButtonTextPrimary: {
    color: colores.fondoSecundario,
  },
  actionButtonTextSecondary: {
    color: '#0369A1',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
    marginTop: espaciado.md,
  },
  metricGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    justifyContent: 'center',
  },
  metricGridCompact: {
    gap: espaciado.xs,
  },
  metricGridPanel: {
    width: '100%',
    marginTop: espaciado.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.lg,
  },
  metricGridPanelCompact: {
    marginTop: espaciado.sm,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.md,
  },
  metricGridPanelImage: {
    borderRadius: radios.lg,
  },
  metricCard: {
    minWidth: '47%',
    backgroundColor: 'rgba(224, 242, 254, 0.84)',
    borderRadius: radios.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  metricCardCompact: {
    paddingHorizontal: espaciado.sm,
  },
  metricValue: {
    color: colores.fondoSecundario,
    fontFamily: fonts.black,
    fontSize: tipografia.subtitulo + 2,
  },
  metricLabel: {
    color: '#475569',
    fontFamily: fonts.bold,
    fontSize: tipografia.etiqueta,
    marginTop: 2,
  },
  messageBubble: {
    width: '100%',
    marginTop: espaciado.md,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubbleImage: {
    borderRadius: radios.lg,
  },
  messageBubbleTitle: {
    color: '#7C2D12',
    fontFamily: fonts.black,
    fontSize: tipografia.cuerpo + 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  messageBubbleMessage: {
    color: colores.fondoSecundario,
    fontFamily: fonts.bold,
    fontSize: tipografia.cuerpo + 1,
    textAlign: 'center',
    marginTop: 4,
  },
  messageBubbleDetail: {
    color: '#475569',
    fontFamily: fonts.semiBold,
    fontSize: tipografia.etiqueta,
    textAlign: 'center',
    marginTop: 4,
  },
});
