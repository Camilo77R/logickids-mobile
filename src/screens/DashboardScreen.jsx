import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config/api';
import { colors, fonts, shadows, spacing } from '../constants/theme';
import {
  ESTADOS_ACCESO_JUEGO,
  resolverAccesoJuegoDesdePerfil,
} from '../features/games/core/resolverAccesoJuego';

const DEFAULT_GAME_SLUG = 'camino-ar';

const getName = (profile, student) =>
  profile?.nombre || profile?.name || student?.nombre || student?.name || 'Estudiante';

const getAvatarFromSource = (source = {}) => {
  const nestedAvatar = source.avatar || source.foto || source.imagen || source.image || null;

  if (typeof nestedAvatar === 'object' && nestedAvatar !== null) {
    return nestedAvatar.url || nestedAvatar.path || nestedAvatar.src || null;
  }

  return (
    source.avatar_url ||
    source.avatarUrl ||
    source.foto_url ||
    source.fotoUrl ||
    source.imagen_url ||
    source.imagenUrl ||
    source.profile_photo_url ||
    source.photo_url ||
    source.url_avatar ||
    (typeof nestedAvatar === 'string' ? nestedAvatar : null)
  );
};

const getAvatarValue = (profile, student) => getAvatarFromSource(profile) || getAvatarFromSource(student);

const resolveAvatarUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  if (!API_BASE_URL) {
    return null;
  }

  const apiRoot = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  const cleanValue = value.startsWith('/') ? value : `/${value}`;

  return `${apiRoot}${cleanValue}`;
};

const getWebGeneratedAvatarUrl = (profile, student) => {
  const seed = getName(profile, student) || profile?.id || student?.id;

  if (!seed) {
    return null;
  }

  return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(seed)}&backgroundColor=ffffff`;
};

export default function DashboardScreen({
  profile,
  session,
  expectedGameSlug = DEFAULT_GAME_SLUG,
  loading = false,
  onLogout,
  onRefresh,
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const access = useMemo(
    () =>
      resolverAccesoJuegoDesdePerfil({
        perfilEstudiante: profile,
        slugJuego: expectedGameSlug,
      }),
    [expectedGameSlug, profile]
  );

  const available = access.estado === ESTADOS_ACCESO_JUEGO.disponible;
  const firstName = getName(profile, session?.student).split(' ')[0];
  const gameTitle = access.juegoHabilitadoTitulo || profile?.sesion_minijuego_titulo || 'Actividad logica';
  const stars = profile?.estrellas ?? profile?.estrellas_ganadas ?? profile?.puntos ?? 120;
  const avatarUrl =
    resolveAvatarUrl(getAvatarValue(profile, session?.student)) ||
    getWebGeneratedAvatarUrl(profile, session?.student);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View
          style={[
            styles.content,
            compact && styles.contentCompact,
            { paddingBottom: 86 + Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.avatar}>
              {avatarUrl && !avatarFailed ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Ionicons name="happy" size={30} color={colors.purple} />
              )}
            </View>
            <View style={styles.greeting}>
              <Text style={styles.title}>Hola, {firstName}!</Text>
              <Text style={styles.subtitle}>Listo para entrenar tu mente hoy.</Text>
            </View>
            <View style={styles.starsBox}>
              <Ionicons name="star" size={21} color={colors.yellowDark} />
              <Text style={styles.stars}>{stars}</Text>
              <Text style={styles.starsLabel}>Estrellas</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>Tu aventura logica te espera!</Text>
              <Text style={styles.heroText}>Completa actividades y gana estrellas.</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onRefresh}
                style={[styles.heroButton, !available && styles.heroButtonMuted]}
              >
                <Text style={styles.heroButtonText}>
                  {loading ? 'Cargando' : available ? 'Comenzar' : 'Actualizar'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.character}>
              <View style={styles.characterEyes}>
                <View style={styles.eye} />
                <View style={styles.eye} />
              </View>
              <View style={styles.smile} />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <SectionTitle title="Ruta de hoy" />
            <View style={styles.route}>
              <RouteCard active={available} icon="bulb" label="Memoria" number={1} />
              <RouteCard icon="extension-puzzle" label="Patrones" number={2} />
              <RouteCard icon="scale" label="Logica" number={3} />
              <RouteCard icon="cube" label="Razonar" number={4} />
              <RouteCard icon="search" label="Atencion" number={5} />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <SectionTitle title="Mi progreso" />
            <View style={styles.progress}>
              <ProgressItem icon="star" value={stars} label="Estrellas ganadas" />
              <ProgressItem icon="trophy" value="85%" label="Actividades completas" />
              <ProgressItem icon="flame" value="7" label="Dias de racha" />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <SectionTitle title="Continua jugando" />
            <View style={styles.games}>
              <GameCard title={gameTitle} status={available ? 'Actividad' : 'Bloqueado'} locked={!available} />
              <GameCard title="Secuencia logica" status="Proximamente" locked />
              <GameCard title="Equilibra ideas" status="Proximamente" locked />
            </View>
          </View>
        </View>

        <View style={[styles.nav, { bottom: Math.max(insets.bottom, 10) }]}>
          <NavItem icon="home" label="Mapa" active />
          <NavItem icon="clipboard-outline" label="Actividades" />
          <NavItem icon="star-outline" label="Logros" />
          <NavItem icon="bar-chart-outline" label="Progreso" />
          <NavItem icon="person-outline" label="Perfil" onPress={onLogout} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function SectionTitle({ title, action }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action} &gt;</Text> : null}
    </View>
  );
}

function RouteCard({ active, icon, label, number }) {
  return (
    <View style={[styles.routeCard, active && styles.routeCardActive]}>
      <View style={[styles.routeNumber, active && styles.routeNumberActive]}>
        <Text style={styles.routeNumberText}>{active ? 'OK' : number}</Text>
      </View>
      <Ionicons name={icon} size={24} color={active ? colors.white : colors.purple} />
      <Text style={[styles.routeLabel, active && styles.routeLabelActive]}>{label}</Text>
    </View>
  );
}

function ProgressItem({ icon, value, label }) {
  return (
    <View style={styles.progressItem}>
      <View style={styles.progressIcon}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <Text style={styles.progressValue}>{value}</Text>
      <Text style={styles.progressLabel}>{label}</Text>
    </View>
  );
}

function GameCard({ title, status, locked }) {
  return (
    <View style={[styles.gameCard, locked && styles.gameCardLocked]}>
      <View style={styles.gameArt}>
        <Ionicons name={locked ? 'lock-closed' : 'trail-sign'} size={30} color={locked ? colors.muted : colors.purple} />
      </View>
      <Text style={styles.gameStatus}>{status}</Text>
      <Text style={styles.gameTitle}>{title}</Text>
      <View style={styles.gameTrack}>
        <View style={[styles.gameFill, { width: locked ? '18%' : '72%' }]} />
      </View>
    </View>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.navItem}>
      <Ionicons name={icon} size={24} color={active ? colors.yellowDark : colors.purple} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF3FF' },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: spacing.sm,
    justifyContent: 'space-between',
  },
  contentCompact: { paddingHorizontal: 14, paddingTop: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.soft,
  },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { flex: 1 },
  title: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 19 },
  subtitle: { color: colors.textGray, fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 15 },
  starsBox: {
    width: 76,
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  stars: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 16 },
  starsLabel: { color: colors.textGray, fontFamily: fonts.bold, fontSize: 9 },
  hero: {
    minHeight: 116,
    borderRadius: 20,
    backgroundColor: colors.purple,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: spacing.md,
    ...shadows.soft,
  },
  heroTextBlock: { flex: 1, justifyContent: 'center' },
  heroTitle: { color: colors.white, fontFamily: fonts.black, fontSize: 19, lineHeight: 24 },
  heroText: { color: '#F3DDFE', fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 17, marginTop: 4 },
  heroButton: {
    marginTop: spacing.sm,
    height: 38,
    alignSelf: 'flex-start',
    borderRadius: 20,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroButtonMuted: { backgroundColor: '#C7A3DA' },
  heroButtonText: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
  character: {
    width: 70,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.yellow,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '4deg' }],
  },
  characterEyes: { flexDirection: 'row', gap: 14 },
  eye: { width: 9, height: 12, borderRadius: 7, backgroundColor: colors.purpleDark },
  smile: { width: 26, height: 13, borderBottomWidth: 4, borderBottomColor: colors.purpleDark, borderRadius: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 16 },
  sectionAction: { color: colors.purple, fontFamily: fonts.bold, fontSize: 13 },
  sectionBlock: { gap: spacing.xs },
  route: { flexDirection: 'row', gap: 6 },
  routeCard: {
    flex: 1,
    height: 66,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...shadows.soft,
  },
  routeCardActive: { backgroundColor: colors.yellow },
  routeNumber: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeNumberActive: { backgroundColor: colors.white },
  routeNumberText: { color: colors.purple, fontFamily: fonts.black, fontSize: 9 },
  routeLabel: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 9, textAlign: 'center' },
  routeLabelActive: { color: colors.white },
  progress: { borderRadius: 20, backgroundColor: colors.white, minHeight: 82, flexDirection: 'row', padding: spacing.sm, ...shadows.soft },
  progressItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  progressIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  progressValue: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 15 },
  progressLabel: { color: colors.textGray, fontFamily: fonts.semiBold, fontSize: 9, lineHeight: 12, textAlign: 'center' },
  games: { flexDirection: 'row', gap: spacing.sm },
  gameCard: { flex: 1, minHeight: 104, borderRadius: 18, backgroundColor: colors.white, padding: spacing.xs, ...shadows.soft },
  gameCardLocked: { opacity: 0.72 },
  gameArt: { height: 38, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  gameStatus: { color: colors.purple, fontFamily: fonts.black, fontSize: 8 },
  gameTitle: { color: colors.purpleDark, fontFamily: fonts.black, fontSize: 10, lineHeight: 13, marginTop: 2 },
  gameTrack: { height: 6, borderRadius: 3, backgroundColor: colors.lavender, marginTop: 'auto', overflow: 'hidden' },
  gameFill: { height: '100%', borderRadius: 4, backgroundColor: colors.purple },
  nav: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 66,
    borderRadius: 22,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...shadows.soft,
  },
  navItem: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navText: { color: colors.purple, fontFamily: fonts.bold, fontSize: 9, textAlign: 'center' },
  navTextActive: { color: colors.yellowDark },
});
