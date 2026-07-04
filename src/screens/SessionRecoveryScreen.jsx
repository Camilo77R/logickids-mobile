import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrandBackground from '../components/BrandBackground';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts, spacing } from '../constants/theme';

const logo = require('../../assets/branding/logo-logickids.png');

export default function SessionRecoveryScreen({
  message,
  onRetry,
  onUseAnotherQr,
  title = 'Estamos reconectando',
  primaryActionLabel = 'Intentar de nuevo',
  secondaryActionLabel = 'Usar otro codigo QR',
}) {
  const [submitting, setSubmitting] = useState(false);

  const handlePrimaryPress = async () => {
    if (!onRetry || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await onRetry();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BrandBackground>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Image source={logo} resizeMode="contain" style={styles.logo} />
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-offline-outline" size={46} color={colors.purple} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>
            {message || 'No pudimos confirmar tu sesion con el colegio. Si este dispositivo ya tenia acceso, vamos a intentar recuperarlo de forma segura.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={primaryActionLabel}
            onPress={handlePrimaryPress}
            loading={submitting}
          />
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            hitSlop={10}
            onPress={onUseAnotherQr}
            style={({ pressed }) => [
              styles.secondaryActionButton,
              pressed && styles.secondaryActionButtonPressed,
              submitting && styles.secondaryActionButtonDisabled,
            ]}
          >
            <Text style={styles.secondaryAction}>{secondaryActionLabel}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  logo: {
    width: 220,
    height: 116,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 25,
    textAlign: 'center',
  },
  message: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actions: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  secondaryAction: {
    color: colors.purple,
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'center',
  },
  secondaryActionButton: {
    paddingVertical: spacing.sm,
  },
  secondaryActionButtonPressed: {
    opacity: 0.72,
  },
  secondaryActionButtonDisabled: {
    opacity: 0.55,
  },
});
