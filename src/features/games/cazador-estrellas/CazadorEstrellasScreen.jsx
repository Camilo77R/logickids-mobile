import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useCazadorEstrellas } from './useCazadorEstrellas';

// Responsabilidad única: montar el WebView y escuchar mensajes.
// No contiene lógica de negocio — eso vive en useCazadorEstrellas.
export default function CazadorEstrellasScreen({ onSalir }) {
  const { htmlContent, webViewRef, puntaje, estado, iniciarJuego, onMessage } =
    useCazadorEstrellas();

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor="#000010" />

      {/* Header nativo — fuera del WebView para rendimiento */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onSalir} style={styles.btnSalir}>
          <Text style={styles.btnSalirTexto}>← Salir</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Cazador de Estrellas</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Motor Babylon en WebView de pantalla completa */}
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          onMessage={onMessage}
          scrollEnabled={false}
          bounces={false}
          // Permite postMessage bidireccional
          originWhitelist={['*']}
          // Necesario para que Babylon acceda al canvas correctamente
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      </View>

      {/* Controles nativos — solo visibles antes de iniciar */}
      {estado === 'idle' && (
        <View style={styles.controles}>
          <TouchableOpacity style={styles.btnJugar} onPress={() => iniciarJuego()}>
            <Text style={styles.btnJugarTexto}>🚀 ¡Jugar!</Text>
          </TouchableOpacity>
        </View>
      )}

      {estado === 'terminado' && (
        <View style={styles.controles}>
          <Text style={styles.puntajeFinal}>Puntaje: {puntaje} ⭐</Text>
          <TouchableOpacity style={styles.btnJugar} onPress={() => iniciarJuego()}>
            <Text style={styles.btnJugarTexto}>🔄 Jugar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#000010',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,20,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.2)',
  },
  titulo: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnSalir: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  btnSalirTexto: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  placeholder: { width: 60 },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  controles: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,20,0.95)',
  },
  btnJugar: {
    backgroundColor: '#FFD700',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 48,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnJugarTexto: {
    color: '#1a1a00',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  puntajeFinal: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
});
