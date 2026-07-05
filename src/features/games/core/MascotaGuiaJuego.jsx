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

import { fonts } from '../../../constants/theme';

export const MASCOTA_GUIA_JUEGO = require('../../../../assets/branding/fondo definitivo.jpeg');

const crearAnimacionRespiracion = (valorAnimado) =>
  Animated.loop(
    Animated.sequence([
      Animated.timing(valorAnimado, {
        toValue: 1,
        duration: 920,
        useNativeDriver: true,
      }),
      Animated.timing(valorAnimado, {
        toValue: 0,
        duration: 920,
        useNativeDriver: true,
      }),
    ]),
  );

export default function MascotaGuiaJuego({
  variante = 'overlay',
  titulo,
  mensaje,
  pasos = [],
  accion,
  onAccion,
  style,
}) {
  const respiracion = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const pantallaAngosta = width < 520;

  useEffect(() => {
    const animacion = crearAnimacionRespiracion(respiracion);
    animacion.start();

    return () => animacion.stop();
  }, [respiracion]);

  const escala = respiracion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });
  const desplazamientoY = respiracion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });
  const estiloCard = useMemo(
    () => [
      styles.card,
      pantallaAngosta && styles.cardCompacta,
      variante === 'intro' && styles.cardIntro,
      style,
    ],
    [pantallaAngosta, style, variante],
  );

  if (variante === 'pill') {
    return (
      <View style={[styles.pill, style]}>
        <Animated.View
          style={[
            styles.pillMascotaMarco,
            { transform: [{ translateY: desplazamientoY }, { scale: escala }] },
          ]}
        >
          <Image source={MASCOTA_GUIA_JUEGO} style={styles.pillMascota} resizeMode="contain" />
        </Animated.View>
        <View style={styles.pillTextoContenido}>
          {titulo ? <Text style={styles.pillTitulo}>{titulo}</Text> : null}
          {mensaje ? <Text style={styles.pillMensaje}>{mensaje}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={estiloCard}>
      <Animated.View
        style={[
          styles.cardMascotaMarco,
          variante === 'intro' && styles.cardMascotaMarcoIntro,
          pantallaAngosta && styles.cardMascotaMarcoCompacto,
          { transform: [{ translateY: desplazamientoY }, { scale: escala }] },
        ]}
      >
        <Image source={MASCOTA_GUIA_JUEGO} style={styles.cardMascota} resizeMode="cover" />
      </Animated.View>

      <View style={[styles.cardContenido, pantallaAngosta && styles.cardContenidoCompacto]}>
        {titulo ? <Text style={styles.cardTitulo}>{titulo}</Text> : null}
        {mensaje ? <Text style={styles.cardMensaje}>{mensaje}</Text> : null}

        {pasos.map((paso, indice) => (
          <View key={paso} style={styles.pasoFila}>
            <Text style={styles.pasoNumero}>{indice + 1}</Text>
            <Text style={styles.pasoTexto}>{paso}</Text>
          </View>
        ))}
      </View>

      {accion && onAccion ? (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onAccion}
          style={[styles.cardBoton, pantallaAngosta && styles.cardBotonCompacto]}
        >
          <Text style={styles.cardBotonTexto}>{accion}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '86%',
    maxWidth: 780,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 18,
    borderRadius: 30,
    borderWidth: 5,
    borderColor: '#8D4E20',
    backgroundColor: '#FFF4D8',
    shadowColor: '#422713',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  cardCompacta: {
    width: '92%',
    maxWidth: 420,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
    padding: 16,
    borderRadius: 28,
  },
  cardIntro: {
    maxWidth: 460,
    borderColor: '#F5C84B',
    backgroundColor: 'rgba(255, 246, 221, 0.98)',
  },
  cardMascotaMarco: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 36,
    borderWidth: 5,
    borderColor: '#F5C84B',
    backgroundColor: '#9B36D9',
  },
  cardMascotaMarcoIntro: {
    alignSelf: 'center',
    width: 126,
    height: 126,
    borderRadius: 34,
  },
  cardMascotaMarcoCompacto: {
    alignSelf: 'center',
  },
  cardMascota: {
    width: '112%',
    height: '112%',
    marginLeft: '-6%',
    marginTop: '-6%',
  },
  cardContenido: {
    flex: 1,
    gap: 7,
  },
  cardContenidoCompacto: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    width: '100%',
  },
  cardTitulo: {
    color: '#3F2512',
    fontFamily: fonts.black,
    fontSize: 28,
    lineHeight: 31,
  },
  cardMensaje: {
    color: '#6F3D1E',
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  pasoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pasoNumero: {
    width: 28,
    height: 28,
    overflow: 'hidden',
    borderRadius: 14,
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 15,
    lineHeight: 28,
    textAlign: 'center',
    backgroundColor: '#35B84A',
  },
  pasoTexto: {
    flex: 1,
    color: '#5B3019',
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  cardBoton: {
    minWidth: 170,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#1D7B31',
    backgroundColor: '#39C84F',
    shadowColor: '#145A26',
    shadowOpacity: 0.38,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  cardBotonCompacto: {
    width: '100%',
    minWidth: 0,
  },
  cardBotonTexto: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 18,
    lineHeight: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  pill: {
    maxWidth: 460,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#F5C84B',
    backgroundColor: 'rgba(255, 244, 216, 0.94)',
    shadowColor: '#422713',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  pillMascotaMarco: {
    width: 52,
    height: 52,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#9B36D9',
  },
  pillMascota: {
    width: '116%',
    height: '116%',
    marginLeft: '-8%',
    marginTop: '-8%',
  },
  pillTextoContenido: {
    flex: 1,
  },
  pillTitulo: {
    color: '#3F2512',
    fontFamily: fonts.black,
    fontSize: 14,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  pillMensaje: {
    color: '#68401E',
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
  },
});
