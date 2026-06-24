import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrandBackground from '../components/BrandBackground';
import PrimaryButton from '../components/PrimaryButton';
import { colors, fonts, spacing } from '../constants/theme';

const logo = require('../../assets/branding/logo-logickids.png');

export default function SessionRecoveryScreen({ message, onRetry, onUseAnotherQr }) {
  return (
    <BrandBackground>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Image source={logo} resizeMode="contain" style={styles.logo} />
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-offline-outline" size={46} color={colors.purple} />
          </View>
          <Text style={styles.title}>Estamos reconectando</Text>
          <Text style={styles.message}>
            {message || 'No pudimos confirmar tu sesion con el colegio. Tu acceso sigue guardado de forma segura.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton title="Intentar de nuevo" onPress={onRetry} />
          <Text accessibilityRole="button" onPress={onUseAnotherQr} style={styles.secondaryAction}>
            Usar otro codigo QR
          </Text>
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
    paddingVertical: spacing.sm,
  },
});
