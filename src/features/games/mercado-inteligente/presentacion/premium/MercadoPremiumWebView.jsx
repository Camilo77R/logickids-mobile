import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

import { fonts } from '../../../../../constants/theme';
import {
  crearComandoEstadoMercadoPremium,
  EVENTOS_DESDE_MERCADO_PREMIUM,
  interpretarMensajeMercadoPremium,
  serializarComandoMercadoPremium,
} from './mercadoPremiumBridge';
import {
  prepararAssetsMercadoPremium,
} from './mercadoPremiumAssets';
import { FONDOS_MERCADO_PREMIUM } from './mercadoPremiumFondos';
import {
  crearScriptActualizarUiMercadoPremium,
  generarDocumentoMercadoPremium,
} from './mercadoPremiumDocumento';

const crearClaveProductos = (productos) =>
  productos.map(({ id }) => id).sort().join('|');

export default function MercadoPremiumWebView({
  modeloVisual,
  estadoUi,
  feedbackEscena,
  onEvento,
}) {
  const webViewRef = useRef(null);
  const [escenaLista, setEscenaLista] = useState(false);
  const [assets, setAssets] = useState(null);
  const claveProductos = useMemo(
    () => crearClaveProductos(modeloVisual.productos),
    [modeloVisual.productos],
  );

  useEffect(() => {
    let vigente = true;
    setAssets(null);
    setEscenaLista(false);

    prepararAssetsMercadoPremium({
      productos: modeloVisual.productos,
    })
      .then((resultado) => {
        if (vigente) {
          setAssets(resultado);
        }
      })
      .catch(() => {
        if (vigente) {
          setAssets({
            productos: {},
            escena: {},
            sesionFinal: { capas: {}, iconos: {}, efectos: {} },
          });
        }
      });

    return () => {
      vigente = false;
    };
  }, [claveProductos]);

  const documento = useMemo(
    () =>
      assets
        ? generarDocumentoMercadoPremium({ modeloVisual, estadoUi, assets })
        : null,
    // El documento se crea una vez por oferta; los toques posteriores viajan por el bridge.
    [assets, claveProductos],
  );

  useEffect(() => {
    if (!escenaLista) {
      return;
    }

    webViewRef.current?.injectJavaScript(
      serializarComandoMercadoPremium(crearComandoEstadoMercadoPremium({ modeloVisual, feedbackEscena })),
    );
    webViewRef.current?.injectJavaScript(crearScriptActualizarUiMercadoPremium(estadoUi, assets));
  }, [escenaLista, estadoUi, feedbackEscena, modeloVisual]);

  const manejarMensaje = useCallback((evento) => {
    const mensaje = interpretarMensajeMercadoPremium(evento.nativeEvent.data);

    if (!mensaje) {
      return;
    }

    if (mensaje.type === EVENTOS_DESDE_MERCADO_PREMIUM.listo) {
      setEscenaLista(true);
    }

    onEvento?.(mensaje);
  }, [onEvento]);

  if (!documento) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator color="#f5a910" size="large" />
        <Text style={styles.cargandoTexto}>Abriendo el mercadito...</Text>
      </View>
    );
  }

  const fondoActual = estadoUi?.screen === 'session-result'
    ? FONDOS_MERCADO_PREMIUM.sesionFinal
    : FONDOS_MERCADO_PREMIUM.juego;

  return (
    <ImageBackground
      source={fondoActual}
      resizeMode="cover"
      style={styles.fondo}
    >
      <WebView
        key={claveProductos}
        ref={webViewRef}
        source={{ html: documento }}
        originWhitelist={['*']}
        onMessage={manejarMensaje}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webView}
        containerStyle={styles.webViewContainer}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#8DE5F6',
  },
  cargandoTexto: {
    color: '#422713',
    fontFamily: fonts.black,
    fontSize: 16,
  },
});
