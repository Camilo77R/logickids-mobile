import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { fonts } from '../../../../constants/theme';
import { MASCOTA_GUIA_JUEGO } from '../../core/MascotaGuiaJuego';

const PASOS_CAMINO_AR = Object.freeze([
  {
    numero: '1',
    titulo: 'Busca el piso',
    descripcion: 'Mueve el celular lento hasta que aparezcan las baldosas.',
  },
  {
    numero: '2',
    titulo: 'Mira la secuencia',
    descripcion: 'Las baldosas brillan en orden. No toques todavia.',
  },
  {
    numero: '3',
    titulo: 'Repite el camino',
    descripcion: 'Cuando sea tu turno, toca las baldosas en el mismo orden.',
  },
]);

const crearAnimacionMascota = (valorAnimado) =>
  Animated.loop(
    Animated.sequence([
      Animated.timing(valorAnimado, {
        toValue: 1,
        duration: 860,
        useNativeDriver: true,
      }),
      Animated.timing(valorAnimado, {
        toValue: 0,
        duration: 860,
        useNativeDriver: true,
      }),
    ]),
  );

function PasoGuia({ numero, titulo, descripcion }) {
  return (
    <View style={styles.paso}>
      <Text style={styles.pasoNumero}>{numero}</Text>
      <View style={styles.pasoContenido}>
        <Text style={styles.pasoTitulo}>{titulo}</Text>
        <Text style={styles.pasoDescripcion}>{descripcion}</Text>
      </View>
    </View>
  );
}

export default function CaminoArGuiaInicial({ onComenzar }) {
  const respiracion = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const layoutCompacto = width < 700 || height > width;

  useEffect(() => {
    const animacion = crearAnimacionMascota(respiracion);
    animacion.start();

    return () => animacion.stop();
  }, [respiracion]);

  const transformacionMascota = useMemo(
    () => [
      {
        translateY: respiracion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
      {
        scale: respiracion.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.055],
        }),
      },
    ],
    [respiracion],
  );

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={[styles.card, layoutCompacto && styles.cardCompacta]}>
        <View style={styles.banner}>
          <Text style={styles.bannerEyebrow}>Camino AR · Memoria</Text>
          <Text style={styles.bannerTitulo}>Entrena tu memoria</Text>
        </View>

        <View style={[styles.contenido, layoutCompacto && styles.contenidoCompacto]}>
          <Animated.View
            style={[styles.mascotaMarco, { transform: transformacionMascota }]}
          >
            <Image source={MASCOTA_GUIA_JUEGO} style={styles.mascota} resizeMode="cover" />
          </Animated.View>

          <View style={styles.panelTexto}>
            <Text style={styles.mensajePrincipal}>
              Observa primero. Luego repite el camino iluminado.
            </Text>

            <View style={styles.listaPasos}>
              {PASOS_CAMINO_AR.map((paso) => (
                <PasoGuia key={paso.numero} {...paso} />
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={onComenzar} style={styles.boton}>
          <Text style={styles.botonTexto}>Estoy listo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(8, 19, 38, 0.58)',
  },
  card: {
    width: '92%',
    maxWidth: 760,
    padding: 14,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: '#8E541E',
    backgroundColor: '#FFF2D4',
    shadowColor: '#2E180B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 18,
  },
  cardCompacta: {
    maxWidth: 390,
    padding: 12,
    borderRadius: 30,
  },
  banner: {
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: '#247E2D',
    backgroundColor: '#45CC54',
    shadowColor: '#145A25',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 0,
    elevation: 8,
  },
  bannerEyebrow: {
    color: '#205016',
    fontFamily: fonts.black,
    fontSize: 12,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  bannerTitulo: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 25,
    lineHeight: 29,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: '#24551F',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 14,
  },
  contenidoCompacto: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  mascotaMarco: {
    width: 122,
    height: 122,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 34,
    borderWidth: 5,
    borderColor: '#F6C642',
    backgroundColor: '#9E36DD',
    shadowColor: '#6E3C15',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 0,
    elevation: 10,
  },
  mascota: {
    width: '116%',
    height: '116%',
    marginLeft: '-8%',
    marginTop: '-8%',
  },
  panelTexto: {
    flex: 1,
    gap: 10,
  },
  mensajePrincipal: {
    color: '#4A2B13',
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
  },
  listaPasos: {
    gap: 7,
  },
  paso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F2C858',
    backgroundColor: '#FFF9E8',
  },
  pasoNumero: {
    width: 32,
    height: 32,
    overflow: 'hidden',
    borderRadius: 16,
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'center',
    backgroundColor: '#35C651',
    textShadowColor: '#16742A',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  pasoContenido: {
    flex: 1,
  },
  pasoTitulo: {
    color: '#3B220F',
    fontFamily: fonts.black,
    fontSize: 14,
    lineHeight: 17,
    textTransform: 'uppercase',
  },
  pasoDescripcion: {
    color: '#70401E',
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
  },
  boton: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    borderRadius: 24,
    borderWidth: 5,
    borderColor: '#1F7B31',
    backgroundColor: '#37C94E',
    shadowColor: '#145923',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.48,
    shadowRadius: 0,
    elevation: 10,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 22,
    lineHeight: 25,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: '#1B6B2C',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
});
