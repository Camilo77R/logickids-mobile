import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { fonts } from '../../../constants/theme';
import {
  FASES_MERCADO_PREMIUM,
  useMercadoPremiumController,
} from './aplicacion/useMercadoPremiumController';
import MercadoGuiaInicial from './presentacion/MercadoGuiaInicial';
import MercadoPremiumWebView from './presentacion/premium/MercadoPremiumWebView';
import { EVENTOS_DESDE_MERCADO_PREMIUM } from './presentacion/premium/mercadoPremiumBridge';
import { crearEstadoUiMercadoPremium } from './presentacion/premium/mercadoPremiumEstadoUi';

const resolverNombreJugador = (contextoSesion) =>
  contextoSesion?.nombreEstudiante ??
  contextoSesion?.estudianteNombre ??
  contextoSesion?.nombre ??
  'Estudiante';

export default function MercadoInteligenteScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const [guiaVisible, setGuiaVisible] = useState(true);

  const controlador = useMercadoPremiumController({
    configuracionInicial,
    contextoSesion,
    onSalir,
  });
  const {
    acciones,
    errorSincronizacionResultado,
    fase,
    feedbackEscena,
    modeloVisual,
    resumenActividad,
    resultado,
    sincronizandoResultado,
  } = controlador;
  const completado = fase === FASES_MERCADO_PREMIUM.completado;
  const tieneSiguienteNivel = modeloVisual.nivel < modeloVisual.totalNiveles;
  const nombreJugador = resolverNombreJugador(contextoSesion);
  const mostrarGuiaInicial = guiaVisible && fase === FASES_MERCADO_PREMIUM.jugando;

  useEffect(() => {
    const prepararPantalla = async () => {
      StatusBar.setHidden(true, 'fade');
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => null);
    };

    void prepararPantalla();

    return () => {
      StatusBar.setHidden(false, 'fade');
      void ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(() => null);
    };
  }, []);

  const estadoUi = useMemo(
    () =>
      crearEstadoUiMercadoPremium({
        modeloVisual,
        nombreJugador,
        bloqueado: fase === FASES_MERCADO_PREMIUM.bloqueado,
        completado,
        tieneSiguienteNivel,
        resultado,
        resumenActividad,
        sincronizandoResultado,
        errorSincronizacionResultado,
      }),
    [
      completado,
      nombreJugador,
      fase,
      modeloVisual,
      resultado,
      resumenActividad,
      sincronizandoResultado,
      errorSincronizacionResultado,
      tieneSiguienteNivel,
    ],
  );

  const ocultarGuiaInicial = useCallback(() => {
    setGuiaVisible(false);
  }, []);

  const manejarEvento = useCallback((evento) => {
    switch (evento.type) {
      case EVENTOS_DESDE_MERCADO_PREMIUM.productoAlternado:
        acciones.alternarProducto(evento.productId);
        break;
      case EVENTOS_DESDE_MERCADO_PREMIUM.comprar:
        acciones.comprar();
        break;
      case EVENTOS_DESDE_MERCADO_PREMIUM.continuar:
        if (sincronizandoResultado) {
          return;
        }

        if (errorSincronizacionResultado) {
          acciones.reintentarGuardado();
          return;
        }

        if (tieneSiguienteNivel) {
          acciones.continuarNivel();
        } else {
          acciones.salir();
        }
        break;
      case EVENTOS_DESDE_MERCADO_PREMIUM.reintentarGuardado:
        acciones.reintentarGuardado();
        break;
      case EVENTOS_DESDE_MERCADO_PREMIUM.reiniciar:
        acciones.reiniciarNivel();
        break;
      case EVENTOS_DESDE_MERCADO_PREMIUM.pista:
        acciones.solicitarPista();
        break;
      case EVENTOS_DESDE_MERCADO_PREMIUM.salir:
        if (!sincronizandoResultado) {
          acciones.salir();
        }
        break;
      default:
        break;
    }
  }, [
    acciones,
    errorSincronizacionResultado,
    sincronizandoResultado,
    tieneSiguienteNivel,
  ]);

  if (fase === FASES_MERCADO_PREMIUM.bloqueado) {
    return (
      <PantallaBloqueada
        onReintentar={acciones.reintentarPreparacion}
        onSalir={acciones.salir}
      />
    );
  }

  if (fase === FASES_MERCADO_PREMIUM.preparando) {
    return <PantallaCarga />;
  }

  return (
    <View style={styles.contenedor}>
      <MercadoPremiumWebView
        modeloVisual={modeloVisual}
        estadoUi={estadoUi}
        feedbackEscena={feedbackEscena}
        onEvento={manejarEvento}
      />
      {mostrarGuiaInicial ? (
        <View style={styles.guiaOverlay} pointerEvents="auto">
          <MercadoGuiaInicial
            nombreJugador={nombreJugador}
            onComenzar={ocultarGuiaInicial}
          />
        </View>
      ) : null}
    </View>
  );
}

function PantallaCarga() {
  return (
    <View style={styles.estadoPantalla}>
      <ActivityIndicator color="#F5A910" size="large" />
      <Text style={styles.tituloEstado}>Abriendo el mercadito...</Text>
    </View>
  );
}

function PantallaBloqueada({ onReintentar, onSalir }) {
  return (
    <View style={styles.estadoPantalla}>
      <Text style={styles.tituloEstado}>El mercado está en pausa</Text>
      <Text style={styles.textoEstado}>
        Espera a que tu tutor active la actividad.
      </Text>
      <TouchableOpacity style={styles.botonPrimario} onPress={onReintentar}>
        <Text style={styles.textoBotonPrimario}>Intentar otra vez</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.botonSecundario} onPress={onSalir}>
        <Text style={styles.textoBotonSecundario}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#8DE5F6',
  },
  guiaOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    backgroundColor: 'rgba(66, 39, 19, 0.38)',
  },
  estadoPantalla: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 28,
    backgroundColor: '#8DE5F6',
  },
  tituloEstado: {
    color: '#422713',
    fontFamily: fonts.black,
    fontSize: 24,
    textAlign: 'center',
  },
  textoEstado: {
    color: '#76502F',
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'center',
  },
  botonPrimario: {
    minWidth: 230,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#35B84A',
  },
  textoBotonPrimario: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 15,
  },
  botonSecundario: {
    minWidth: 230,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#A66532',
    backgroundColor: '#FFF4D8',
  },
  textoBotonSecundario: {
    color: '#70401F',
    fontFamily: fonts.black,
    fontSize: 15,
  },
});


