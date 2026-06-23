import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, shadows, spacing } from '../../constants/theme';

export default function DeveloperConnectionSettings({
  apiBaseUrl,
  apiSettingsError,
  needsApiConfiguration,
  onSaveApiBaseUrl,
  variant = 'icon',
}) {
  const [visible, setVisible] = useState(false);
  const [draftApiBaseUrl, setDraftApiBaseUrl] = useState(apiBaseUrl ?? '');

  const open = () => {
    setDraftApiBaseUrl(apiBaseUrl ?? '');
    setVisible(true);
  };

  return (
    <>
      {variant === 'status' ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Revisar conexion del colegio"
          activeOpacity={0.85}
          onPress={open}
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
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Configurar conexion"
          activeOpacity={0.85}
          onPress={open}
          style={styles.iconButton}
        >
          <Ionicons name="wifi" size={23} color={colors.white} />
        </TouchableOpacity>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={() => setVisible(false)}
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
                onPress={() => setVisible(false)}
                style={[styles.settingsButton, styles.settingsButtonGhost]}
              >
                <Text style={styles.settingsButtonGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={async () => {
                  const saved = await onSaveApiBaseUrl?.(draftApiBaseUrl);
                  if (saved) setVisible(false);
                }}
                style={styles.settingsButton}
              >
                <Text style={styles.settingsButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
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
  connectionPillWarning: { backgroundColor: colors.yellow },
  connectionPillText: { color: colors.white, fontFamily: fonts.black, fontSize: 12 },
  connectionPillWarningText: { color: colors.purpleDark },
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
  settingsTitle: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 22 },
  settingsCopy: { color: colors.textGray, fontFamily: fonts.semiBold, lineHeight: 20 },
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
  settingsError: { color: colors.danger, fontFamily: fonts.bold, lineHeight: 18 },
  settingsActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  settingsButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  settingsButtonGhost: { backgroundColor: colors.purpleSoft },
  settingsButtonText: { color: colors.white, fontFamily: fonts.black },
  settingsButtonGhostText: { color: colors.purple, fontFamily: fonts.black },
});
