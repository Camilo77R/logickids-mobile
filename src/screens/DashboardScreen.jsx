import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import BabylonBasicScene from '../features/games/BabylonBasicScene';

export default function DashboardScreen() {
  const [juegoActivado, setJuegoActivado] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>LogicKids Mobile</Text>
        <Text style={styles.subtitle}>Integracion Babylon.js</Text>
      </View>
      <View style={styles.gameArea}>
        {!juegoActivado ? (
          <View style={styles.lockedState}>
            <Text style={styles.lockedText}> Presiona el boton para mostrar el motor 3D</Text>
          </View>
        ) : (
          <BabylonBasicScene />
        )}
      </View>
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, juegoActivado ? styles.buttonStop : styles.buttonStart]} 
          onPress={() => setJuegoActivado(!juegoActivado)}
        >
          <Text style={styles.buttonText}>
            {juegoActivado ? 'Ocultar Motor 3D' : 'Mostrar Babylon.js'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { padding: 20, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  logo: { fontSize: 24, fontWeight: '900', color: '#2C3E50' },
  subtitle: { fontSize: 14, color: '#7F8C8D', marginTop: 5 },
  gameArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lockedState: { padding: 20, backgroundColor: '#E8F4F8', borderRadius: 10, borderWidth: 1, borderColor: '#B3E5FC' },
  lockedText: { color: '#0277BD', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  controls: { padding: 20, paddingBottom: 40 },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  buttonStart: { backgroundColor: '#27AE60' },
  buttonStop: { backgroundColor: '#E74C3C' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
