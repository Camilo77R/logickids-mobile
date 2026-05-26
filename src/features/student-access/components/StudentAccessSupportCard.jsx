import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ACCESS_COLORS } from '../studentAccess.theme';

export default function StudentAccessSupportCard({
  visible,
  apiBaseUrl,
  onToggle,
  onChangeApiBaseUrl,
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.toggle} onPress={onToggle} activeOpacity={0.85}>
        <Text style={styles.toggleLabel}>🛠️ Para profe o soporte</Text>
        <Text style={styles.toggleAction}>{visible ? 'Ocultar' : 'Mostrar'}</Text>
      </TouchableOpacity>

      {visible ? (
        <View style={styles.body}>
          <Text style={styles.label}>Dirección de la API</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            value={apiBaseUrl}
            onChangeText={onChangeApiBaseUrl}
            placeholder="http://192.168.1.50:3000/api"
            placeholderTextColor="rgba(22,50,79,0.36)"
          />
          <Text style={styles.helpText}>
            Solo cámbialo si la persona de soporte te lo pidió.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: ACCESS_COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(0,123,255,0.12)',
    overflow: 'hidden',
  },
  toggle: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLabel: {
    color: ACCESS_COLORS.blue,
    fontSize: 14,
    fontWeight: '900',
  },
  toggleAction: {
    color: ACCESS_COLORS.navySoft,
    fontSize: 13,
    fontWeight: '800',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  label: {
    color: ACCESS_COLORS.navySoft,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: ACCESS_COLORS.page,
    borderWidth: 1,
    borderColor: 'rgba(0,123,255,0.12)',
    color: ACCESS_COLORS.navy,
  },
  helpText: {
    color: ACCESS_COLORS.navySoft,
    fontSize: 12,
    lineHeight: 18,
  },
});
