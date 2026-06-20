import React, { useMemo } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandBackground from '../components/BrandBackground';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts, spacing } from '../constants/theme';

const welcomeVideo = require('../../assets/branding/Vid/logickids-intro.mp4');
const logoFallback = require('../../assets/branding/logo-logickids-badge.png');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const loadExpoVideoModule = () => {
  try {
    const videoModule = require('expo-video');

    if (!videoModule.VideoView || !videoModule.useVideoPlayer) {
      return null;
    }

    return videoModule;
  } catch {
    return null;
  }
};

const expoVideoModule = loadExpoVideoModule();

function WelcomeVideoPlayer({ source }) {
  const VideoView = expoVideoModule.VideoView;
  const player = expoVideoModule.useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}

function WelcomeVideoFallback() {
  return (
    <View style={styles.videoFallback}>
      <Image source={logoFallback} style={styles.videoFallbackLogo} resizeMode="contain" />
      <Text style={styles.videoFallbackText}>LogicKids</Text>
    </View>
  );
}

function WelcomeMedia() {
  if (!expoVideoModule) {
    return <WelcomeVideoFallback />;
  }

  return <WelcomeVideoPlayer source={welcomeVideo} />;
}

export default function OnboardingScreen({ onStart }) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const ctaBottomPadding = insets.bottom + 22;
  const buttonSpace = 62 + ctaBottomPadding;

  const sizes = useMemo(() => {
    const videoSize = clamp(width * 0.78, 268, 340);
    const copySize = clamp(width * 0.043, 15, 17);
    const contentHeight = height - insets.top - insets.bottom - buttonSpace;
    const videoGap = clamp(height * 0.05, 34, 48);
    const copyGap = clamp(height * 0.06, 44, 62);
    const estimated = videoSize + 72 + videoGap + copyGap;
    const topGap = clamp((contentHeight - estimated) * 0.34, 34, 76);

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
              height: sizes.contentHeight,
              paddingTop: sizes.topGap,
            },
          ]}
        >
          <View
            style={[
              styles.videoClip,
              {
                width: sizes.videoSize,
                height: sizes.videoSize,
                borderRadius: sizes.videoSize / 2,
                marginTop: sizes.videoGap,
              },
            ]}
          >
            <WelcomeMedia />
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
  videoClip: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  videoFallbackLogo: {
    width: '72%',
    height: '72%',
  },
  videoFallbackText: {
    marginTop: -18,
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 22,
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
