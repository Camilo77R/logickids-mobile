import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { fonts } from '../../../../constants/theme';

const MASCOTA_APP = require('../../../../../assets/icon.png');

const GUIA_MERCADO = Object.freeze({
  titulo: '¡Bienvenido al Mercadito!',
  pasos: [
    'Toca productos para agregarlos a tu mochila.',
    'Mira el total y no te pases de las monedas.',
    'Cuando estés listo, pulsa Comprar.',
  ],
  accion: 'Empezar misión',
});

export default function MercadoGuiaInicial({ nombreJugador, onComenzar }) {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.tarjeta}>
        <View style={styles.mascotaMarco}>
          <Image source={MASCOTA_APP} style={styles.mascota} resizeMode="contain" />
        </View>
        <View style={styles.contenido}>
          <Text style={styles.saludo}>Hola, {nombreJugador}</Text>
          <Text style={styles.titulo}>{GUIA_MERCADO.titulo}</Text>
          {GUIA_MERCADO.pasos.map((paso, indice) => (
            <View key={paso} style={styles.paso}>
              <Text style={styles.numeroPaso}>{indice + 1}</Text>
              <Text style={styles.textoPaso}>{paso}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={onComenzar}
          style={styles.boton}
        >
          <Text style={styles.textoBoton}>{GUIA_MERCADO.accion}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    backgroundColor: 'rgba(66, 39, 19, 0.38)',
  },
  tarjeta: {
    width: '82%',
    maxWidth: 760,
    minHeight: 230,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 18,
    borderRadius: 30,
    borderWidth: 5,
    borderColor: '#8D4E20',
    backgroundColor: '#FFF4D8',
    shadowColor: '#422713',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  mascotaMarco: {
    width: 126,
    height: 126,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    borderWidth: 5,
    borderColor: '#F5C84B',
    backgroundColor: '#EAFBFF',
  },
  mascota: {
    width: '82%',
    height: '82%',
  },
  contenido: {
    flex: 1,
    gap: 7,
  },
  saludo: {
    color: '#8A4A20',
    fontFamily: fonts.black,
    fontSize: 15,
    textTransform: 'uppercase',
  },
  titulo: {
    color: '#3F2512',
    fontFamily: fonts.black,
    fontSize: 28,
    lineHeight: 31,
  },
  paso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  numeroPaso: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 15,
    lineHeight: 28,
    textAlign: 'center',
    backgroundColor: '#35B84A',
  },
  textoPaso: {
    flex: 1,
    color: '#5B3019',
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  boton: {
    minWidth: 178,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#1D7B31',
    backgroundColor: '#39C84F',
    shadowColor: '#145A26',
    shadowOpacity: 0.36,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
