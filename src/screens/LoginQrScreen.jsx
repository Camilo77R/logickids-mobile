import React, { useMemo } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandBackground from '../components/BrandBackground';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts, shadows, spacing } from '../constants/theme';

const wideLogo = require('../../assets/branding/logo-logickids.png');



const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function LoginQrScreen({ onBack, onScan }) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const ctaBottomPadding = insets.bottom + 16;
  const buttonSpace = 62 + ctaBottomPadding;
  const headerHeight = 60;

  const sizes = useMemo(() => {
    const logoWidth = clamp(width * 0.58, 190, 236);
    const logoHeight = logoWidth * (294 / 561);
    const qrCard = clamp(Math.min(width * 0.58, height * 0.26), 196, 230);
    const subtitleSize = clamp(width * 0.038, 13, 15);
    const cardPadding = height < 700 ? 8 : 9;
    const contentHeight = height - insets.top - insets.bottom - headerHeight - buttonSpace - 12;
    const estimatedContent = logoHeight + 70 + 40 + qrCard;
    const freeSpace = Math.max(0, contentHeight - estimatedContent);
    const topGap = clamp(freeSpace * 0.18, 6, 18);
    const titleGap = clamp(height * 0.014, 8, 14);
    const qrGap = clamp(height * 0.018, 10, 18);

    return {
      logoWidth,
      logoHeight,
      qrCard,
      subtitleSize,
      cardPadding,
      topGap,
      titleGap,
      qrGap,
      contentHeight,
    };
  }, [buttonSpace, height, insets.bottom, insets.top, width]);

  const qrInner = sizes.qrCard * 0.46;
  const cornerOffset = sizes.qrCard * 0.17;
  const cornerSize = sizes.qrCard * 0.15;

  return (
    <BrandBackground>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver a la pantalla inicial"
            activeOpacity={0.85}
            onPress={onBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.purple} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ayuda"
            activeOpacity={0.85}
            style={styles.helpButton}
          >
            <Ionicons name="help" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.content,
            {
              minHeight: sizes.contentHeight,
              paddingTop: sizes.topGap,
              paddingBottom: buttonSpace + 8,
            },
          ]}
        >
          <Image
            source={wideLogo}
            resizeMode="contain"
            style={[styles.qrLogo, { width: sizes.logoWidth, height: sizes.logoHeight }]}
          />

          <Text style={[styles.qrTitle, { marginTop: sizes.titleGap }]}>
            Inicia sesion escaneando tu codigo QR
          </Text>
          <Text
            style={[
              styles.qrSubtitle,
              {
                fontSize: sizes.subtitleSize,
                lineHeight: sizes.subtitleSize + 8,
                marginTop: 4,
              },
            ]}
          >
            Usa tu codigo QR para acceder de forma segura y rapida.
          </Text>

          <View
            style={[
              styles.qrCard,
              {
                width: sizes.qrCard,
                height: sizes.qrCard,
                marginTop: sizes.qrGap,
              },
            ]}
          >
            <View
              style={[
                styles.qrCornerTopLeft,
                { top: cornerOffset, left: cornerOffset, width: cornerSize, height: cornerSize },
              ]}
            />
            <View
              style={[
                styles.qrCornerTopRight,
                { top: cornerOffset, right: cornerOffset, width: cornerSize, height: cornerSize },
              ]}
            />
            <View
              style={[
                styles.qrCornerBottomLeft,
                { bottom: cornerOffset, left: cornerOffset, width: cornerSize, height: cornerSize },
              ]}
            />
            <View
              style={[
                styles.qrCornerBottomRight,
                { bottom: cornerOffset, right: cornerOffset, width: cornerSize, height: cornerSize },
              ]}
            />
            <View style={[styles.qrGrid, { width: qrInner, height: qrInner }]}>
              {Array.from({ length: 49 }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.qrPixel,
                    {
                      width: (qrInner - 30) / 7,
                      height: (qrInner - 30) / 7,
                    },
                    (index % 3 === 0 || index % 7 === 0 || [8, 12, 36, 40].includes(index)) &&
                      styles.qrPixelActive,
                  ]}
                />
              ))}
            </View>
          </View>

        </View>

        <View pointerEvents="box-none" style={[styles.cta, { paddingBottom: ctaBottomPadding }]}>
          <PrimaryButton title="Escanear codigo QR" onPress={onScan} />
        </View>
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    width: '100%',
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 8,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  helpButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  qrLogo: {
    alignSelf: 'center',
  },
  qrTitle: {
    fontSize: 22,
    lineHeight: 29,
    fontFamily: fonts.black,
    color: colors.purpleDark,
    textAlign: 'center',
  },
  qrSubtitle: {
    color: colors.textGray,
    textAlign: 'center',
    paddingHorizontal: 18,
    fontFamily: fonts.regular,
  },
  qrCard: {
    backgroundColor: colors.white,
    borderRadius: 36,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 9,
  },
  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  qrPixel: {
    borderRadius: 3,
    backgroundColor: '#EFE7F6',
  },
  qrPixelActive: {
    backgroundColor: colors.purple,
  },
  qrCornerTopLeft: {
    position: 'absolute',
    borderTopWidth: 7,
    borderLeftWidth: 7,
    borderColor: colors.purple,
    borderTopLeftRadius: 10,
  },
  qrCornerTopRight: {
    position: 'absolute',
    borderTopWidth: 7,
    borderRightWidth: 7,
    borderColor: colors.purple,
    borderTopRightRadius: 10,
  },
  qrCornerBottomLeft: {
    position: 'absolute',
    borderBottomWidth: 7,
    borderLeftWidth: 7,
    borderColor: colors.purple,
    borderBottomLeftRadius: 10,
  },
  qrCornerBottomRight: {
    position: 'absolute',
    borderBottomWidth: 7,
    borderRightWidth: 7,
    borderColor: colors.purple,
    borderBottomRightRadius: 10,
  },
  cta: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
});
