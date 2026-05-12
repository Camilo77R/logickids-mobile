import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, StatusBar,
} from 'react-native';
import CazadorEstrellasScreen from '../features/games/cazador-estrellas/CazadorEstrellasScreen';
import CodigoEstelarScreen from '../features/games/codigo-estelar/CodigoEstelarScreen';

// DashboardScreen: solo navegación y selección de juego.
// No contiene lógica de ningún juego — eso vive en cada feature.
export default function DashboardScreen() {
  const [juegoActivo, setJuegoActivo] = useState(null); // null | 'cazador-estrellas' | 'codigo-estelar'

  if (juegoActivo === 'cazador-estrellas') {
    return <CazadorEstrellasScreen onSalir={() => setJuegoActivo(null)} />;
  }

  if (juegoActivo === 'codigo-estelar') {
    return <CodigoEstelarScreen onSalir={() => setJuegoActivo(null)} />;
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />

      <View style={styles.header}>
        <Text style={styles.logo}>⚡ LogicKids</Text>
        <Text style={styles.subtitulo}>Selecciona un juego</Text>
      </View>

      <View style={styles.grid}>
        {/* Tarjeta: Cazador de Estrellas */}
        <TouchableOpacity
          style={styles.tarjeta}
          onPress={() => setJuegoActivo('cazador-estrellas')}
          activeOpacity={0.85}
        >
          <Text style={styles.tarjetaEmoji}>🌟</Text>
          <Text style={styles.tarjetaTitulo}>Cazador de Estrellas</Text>
          <Text style={styles.tarjetaDesc}>
            Atrapa solo las estrellas del color correcto antes de que lleguen al suelo.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>Babylon.js 3D</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tarjeta}
          onPress={() => setJuegoActivo('codigo-estelar')}
          activeOpacity={0.85}
        >
          <Text style={styles.tarjetaEmoji}>☄️</Text>
          <Text style={styles.tarjetaTitulo}>Código Estelar</Text>
          <Text style={styles.tarjetaDesc}>
            Comparación numérica con ranking en tiempo real usando el contrato real del backend.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>HTTP + Socket.IO</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.15)',
  },
  logo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  grid: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  tarjeta: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  tarjetaBloqueada: {
    opacity: 0.4,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tarjetaEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  tarjetaTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  tarjetaDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginBottom: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  badgeTexto: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
});
