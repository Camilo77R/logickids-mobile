import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const compactName = (value) => {
  if (!value) return 'Piloto';
  const shortName = value.trim().split(/\s+/).slice(0, 2).join(' ');
  return shortName.length > 18 ? `${shortName.slice(0, 18)}…` : shortName;
};

const buildGroupLabel = (profile) => {
  if (!profile?.grupo_id) return 'Sin grupo activo';
  if (profile.grupo_nombre) return profile.grupo_nombre;
  return `Grupo #${profile.grupo_id}`;
};

export default function StudentHeroCard({ profile, onLogout, isRefreshing }) {
  return (
    <View style={styles.card}>
      <View style={[styles.avatarHalo, { backgroundColor: `${profile?.color_avatar ?? '#6bd5ff'}22` }]} />

      <View style={styles.headerRow}>
        <View style={styles.identityRow}>
          <View
            style={[
              styles.avatarBadge,
              { backgroundColor: profile?.color_avatar ?? '#6bd5ff' },
            ]}
          >
            <Text style={styles.avatarLetter}>
              {profile?.nombre?.trim()?.charAt(0)?.toUpperCase() ?? 'P'}
            </Text>
          </View>

          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>Mi base estelar</Text>
            <Text style={styles.title}>Hola, {compactName(profile?.nombre)}</Text>
            <Text style={styles.subtitle}>
              {isRefreshing
                ? 'Actualizando tu cabina...'
                : 'Tu progreso, tus logros y tu proxima mision viven aqui.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipsRow}>
        <View style={styles.infoChip}>
          <Text style={styles.chipLabel}>Grupo</Text>
          <Text style={styles.chipValue}>{buildGroupLabel(profile)}</Text>
        </View>

        <View style={styles.infoChip}>
          <Text style={styles.chipLabel}>Edad</Text>
          <Text style={styles.chipValue}>{profile?.edad ?? '-'}</Text>
        </View>

        <View style={styles.infoChip}>
          <Text style={styles.chipLabel}>Cabina</Text>
          <Text style={styles.chipValue}>
            {profile?.sesion_activa ? 'Lista' : 'Esperando tutor'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 30,
    padding: 20,
    gap: 18,
    backgroundColor: 'rgba(12, 21, 39, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(115,215,255,0.18)',
  },
  avatarHalo: {
    position: 'absolute',
    top: -36,
    right: -28,
    width: 148,
    height: 148,
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  identityRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  avatarBadge: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarLetter: {
    color: '#07111f',
    fontSize: 26,
    fontWeight: '900',
  },
  identityCopy: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: '#8bddff',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8fbff',
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 20,
  },
  logoutButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logoutText: {
    color: '#eff7ff',
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoChip: {
    minWidth: 108,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipValue: {
    color: '#f8fbff',
    fontSize: 15,
    fontWeight: '900',
  },
});
