import React, { useMemo } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandBackground from '../components/BrandBackground';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts, spacing } from '../constants/theme';

const welcomeImage = require('../../assets/branding/logo-logickids-badge.png');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function OnboardingScreen({ onStart }) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const ctaBottomPadding = insets.bottom + 22;
  const buttonSpace = 62 + ctaBottomPadding;
  const sizes = useMemo(() => {
    const videoSize = clamp(width * 0.76, 260, 342);
    const copySize = clamp(width * 0.043, 15, 17);
    const contentHeight = height - insets.top - insets.bottom - buttonSpace;
    const videoGap = clamp(height * 0.026, 18, 28);
    const copyGap = clamp(height * 0.04, 28, 42);
    const estimated = videoSize + 72 + videoGap + copyGap;
    const topGap = clamp((contentHeight - estimated) * 0.15, 12, 28);

    return {
      copyGap,
      copySize,
      contentHeight,
      topGap,
      videoGap,
      videoSize,
    };
  }, [buttonSpace, height, insets.bottom, insets.top, width]);

  return (
    <BrandBackground>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View
          style={[
            styles.content,
            {
              minHeight: sizes.contentHeight,
              paddingBottom: buttonSpace + 8,
              paddingTop: sizes.topGap,
            },
          ]}
        >
          <View
            style={[
              styles.mediaClip,
              {
                width: sizes.videoSize,
                height: sizes.videoSize,
                borderRadius: sizes.videoSize / 2,
                marginTop: sizes.videoGap,
              },
            ]}
          >
            <Image source={welcomeImage} style={styles.media} resizeMode="cover" />
          </View>

          <View style={[styles.copyBlock, { marginTop: sizes.copyGap }]}>
            <Ionicons name="sparkles" size={24} color={colors.purple} />
            <Text style={[styles.copy, { fontSize: sizes.copySize, lineHeight: sizes.copySize + 8 }]}>
              Desarrolla tu pensamiento logico y resuelve problemas de forma divertida.
            </Text>
          </View>
        </View>

        <View pointerEvents="box-none" style={[styles.cta, { paddingBottom: ctaBottomPadding }]}>
          <PrimaryButton title="Comenzar" onPress={onStart} />
        </View>
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  mediaClip: {
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  copyBlock: {
    alignItems: 'center',
    gap: 8,
  },
  copy: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
    paddingHorizontal: 26,
  },
  cta: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
});
