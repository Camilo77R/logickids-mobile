import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ACCESS_COLORS } from '../studentAccess.theme';

export default function StudentAccessManualStage({
  apiBaseUrl,
  onChangeApiBaseUrl,
  qrToken,
  onChangeQrToken,
  onSubmit,
  isBusy,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerMarker}>
          <View style={styles.headerMarkerInner} />
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.title}>Escribe tu QR</Text>
          <Text style={styles.copy}>Si no puedes escanear, entra escribiendo tu código.</Text>
        </View>
      </View>

      <View style={styles.inputBlock}>
        <Text style={styles.label}>API base URL</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          value={apiBaseUrl}
          onChangeText={onChangeApiBaseUrl}
          placeholder="http://10.0.2.2:3000/api"
          placeholderTextColor="rgba(22,50,79,0.36)"
        />
        <Text style={styles.hint}>
          Cambiala si pruebas en un dispositivo fisico o en otra red local.
        </Text>
      </View>

      <View style={styles.inputBlock}>
        <Text style={styles.label}>Código QR</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          value={qrToken}
          onChangeText={onChangeQrToken}
          placeholder="Pega aquí el código del QR"
          placeholderTextColor="rgba(22,50,79,0.36)"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <Text style={styles.hint}>
          Usa el valor exacto del QR que entregó el backend para ese estudiante.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isBusy && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={isBusy}
        activeOpacity={0.86}
      >
        <Text style={styles.buttonText}>{isBusy ? 'Entrando...' : 'Entrar al tablero'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 30,
    padding: 20,
    gap: 18,
    backgroundColor: ACCESS_COLORS.card,
    borderWidth: 2,
    borderColor: 'rgba(255,127,0,0.14)',
    shadowColor: ACCESS_COLORS.orange,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 7,
  },
  header: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  headerMarker: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: ACCESS_COLORS.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMarkerInner: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: ACCESS_COLORS.orange,
  },
  headerBody: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: ACCESS_COLORS.navy,
    fontSize: 26,
    fontWeight: '900',
  },
  copy: {
    color: ACCESS_COLORS.navySoft,
    lineHeight: 21,
    fontSize: 14,
  },
  inputBlock: {
    borderRadius: 24,
    padding: 16,
    gap: 8,
    backgroundColor: ACCESS_COLORS.peach,
  },
  label: {
    color: ACCESS_COLORS.orange,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '900',
  },
  input: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: ACCESS_COLORS.card,
    borderWidth: 2,
    borderColor: 'rgba(255,127,0,0.16)',
    color: ACCESS_COLORS.navy,
    fontSize: 17,
    fontWeight: '800',
  },
  hint: {
    color: ACCESS_COLORS.navySoft,
    fontSize: 12,
  },
  button: {
    minHeight: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCESS_COLORS.orange,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: ACCESS_COLORS.card,
    fontSize: 18,
    fontWeight: '900',
  },
});
