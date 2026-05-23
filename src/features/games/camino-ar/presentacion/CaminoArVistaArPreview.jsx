import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colores, espaciado, radios, tipografia } from '../../../../theme/tokens';

export default function CaminoArVistaArPreview({ onSalir, configuracion }) {
  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />
      <View style={styles.contenido}>
        <TouchableOpacity onPress={onSalir} style={styles.botonVolver}>
          <Text style={styles.botonVolverTexto}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.panel}>
          <Text style={styles.ceja}>Preparado para AR</Text>
          <Text style={styles.titulo}>Camino AR</Text>
          <Text style={styles.texto}>
            La logica del juego ya esta separada del render. El siguiente paso
            sera conectar React Vision/Viro aqui sin tocar el controlador ni el
            contrato comun de resultados.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.tituloPanel}>Configuracion recibida</Text>
          <Text style={styles.texto}>Dificultad: {configuracion.dificultad}</Text>
          <Text style={styles.texto}>Patron: {configuracion.configuracion.longitudPatron}</Text>
          <Text style={styles.texto}>Baldosas: {configuracion.configuracion.cantidadBaldosas}</Text>
          <Text style={styles.texto}>Modo: {configuracion.modoPresentacion}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondoPrincipal,
  },
  contenido: {
    flex: 1,
    padding: espaciado.lg,
    gap: espaciado.lg,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radios.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  botonVolverTexto: {
    color: colores.textoPrincipal,
    fontWeight: '700',
  },
  panel: {
    backgroundColor: colores.fondoSecundario,
    borderRadius: radios.lg,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.bordeAcento,
    gap: espaciado.sm,
  },
  ceja: {
    color: colores.acento,
    fontSize: tipografia.etiqueta,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titulo: {
    color: colores.textoPrincipal,
    fontSize: tipografia.titulo,
    fontWeight: '900',
  },
  tituloPanel: {
    color: colores.textoPrincipal,
    fontSize: tipografia.subtitulo,
    fontWeight: '800',
  },
  texto: {
    color: colores.textoSecundario,
    lineHeight: 21,
  },
});
