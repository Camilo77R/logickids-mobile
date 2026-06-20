import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandBackground from '../components/BrandBackground';
import PrimaryButton from '../components/PrimaryButton';
import { resolveConfiguredApiBaseUrl } from '../config/api';
import { colors, fonts, shadows, spacing } from '../constants/theme';

const wideLogo = require('../../assets/branding/logo-logickids.png');



const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function LoginQrScreen({
  apiBaseUrl,
  apiSettingsError,
  needsApiConfiguration = false,
  onBack,
  onSaveApiBaseUrl,
  onScan,
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [draftApiBaseUrl, setDraftApiBaseUrl] = useState(apiBaseUrl ?? '');
  const canConfigureConnection = !resolveConfiguredApiBaseUrl();
  const ctaBottomPadding = insets.bottom + 14;
  const buttonSpace = 62 + ctaBottomPadding;
  const headerHeight = 60;

  const sizes = useMemo(() => {
    const logoWidth = clamp(width * 0.54, 178, 218);
    const logoHeight = logoWidth * (294 / 561);
    const qrCard = clamp(Math.min(width * 0.7, height * 0.33), 236, 276);
    const subtitleSize = clamp(width * 0.038, 13, 15);
    const cardPadding = height < 700 ? 8 : 9;
    const contentHeight = height - insets.top - insets.bottom - headerHeight - buttonSpace - 12;
    const estimatedContent = logoHeight + 70 + 52 + qrCard;
    const freeSpace = Math.max(0, contentHeight - estimatedContent);
    const topGap = clamp(freeSpace * 0.24, 10, 28);
    const titleGap = clamp(height * 0.012, 7, 12);
    const qrGap = clamp(height * 0.026, 18, 30);

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

          {canConfigureConnection ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Configurar conexion"
              activeOpacity={0.85}
              onPress={() => {
                setDraftApiBaseUrl(apiBaseUrl ?? '');
                setSettingsVisible(true);
              }}
              style={styles.helpButton}
            >
              <Ionicons name="wifi" size={23} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <View
          style={[
            styles.content,
            {
              height: sizes.contentHeight,
              paddingTop: sizes.topGap,
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

          {canConfigureConnection ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Revisar conexion del colegio"
              activeOpacity={0.85}
              onPress={() => {
                setDraftApiBaseUrl(apiBaseUrl ?? '');
                setSettingsVisible(true);
              }}
              style={[
                styles.connectionPill,
                needsApiConfiguration && styles.connectionPillWarning,
              ]}
            >
              <Ionicons
                name={needsApiConfiguration ? 'alert-circle' : 'wifi'}
                size={18}
                color={needsApiConfiguration ? colors.purpleDark : colors.white}
              />
              <Text
                style={[
                  styles.connectionPillText,
                  needsApiConfiguration && styles.connectionPillWarningText,
                ]}
              >
                {needsApiConfiguration ? 'Configura la conexion' : 'Conexion lista'}
              </Text>
            </TouchableOpacity>
          ) : null}

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

        <Modal
          animationType="fade"
          transparent
          visible={canConfigureConnection && settingsVisible}
          onRequestClose={() => setSettingsVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Conexion del colegio</Text>
              <Text style={styles.settingsCopy}>
                Configura la direccion del servidor para esta red Wi-Fi. Ejemplo: http://IP_DEL_PC:3000/api
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onChangeText={setDraftApiBaseUrl}
                placeholder="http://IP_DEL_PC:3000/api"
                placeholderTextColor="rgba(109,100,120,0.55)"
                style={styles.settingsInput}
                value={draftApiBaseUrl}
              />
              {apiSettingsError ? (
                <Text style={styles.settingsError}>{apiSettingsError}</Text>
              ) : null}

              <View style={styles.settingsActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSettingsVisible(false)}
                  style={[styles.settingsButton, styles.settingsButtonGhost]}
                >
                  <Text style={styles.settingsButtonGhostText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={async () => {
                    const saved = await onSaveApiBaseUrl?.(draftApiBaseUrl);

                    if (saved) {
                      setSettingsVisible(false);
                    }
                  }}
                  style={styles.settingsButton}
                >
                  <Text style={styles.settingsButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  headerSpacer: {
    width: 46,
    height: 46,
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
  connectionPill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.purple,
  },
  connectionPillWarning: {
    backgroundColor: colors.yellow,
  },
  connectionPillText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  connectionPillWarningText: {
    color: colors.purpleDark,
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
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(43,23,61,0.44)',
  },
  settingsCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  settingsTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 22,
  },
  settingsCopy: {
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    lineHeight: 20,
  },
  settingsInput: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
  settingsError: {
    color: colors.danger,
    fontFamily: fonts.bold,
    lineHeight: 18,
  },
  settingsActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  settingsButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  settingsButtonGhost: {
    backgroundColor: colors.purpleSoft,
  },
  settingsButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
  },
  settingsButtonGhostText: {
    color: colors.purple,
    fontFamily: fonts.black,
  },
});
