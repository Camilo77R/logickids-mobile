import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import { cargarMotorBabylon } from './cargarMotorBabylon';
import { generarHtmlMotorBabylon } from './tren3dMotorBabylon';

const fondoTrenAsset = require('../../../../../assets/images/tren-3d/fondo-tren.avif');

export default function Tren3DVistaWebView({
  webViewRef,
  onMensaje,
  onErrorMotor,
  parametrosIniciales,
}) {
  const [motorBabylonUri, setMotorBabylonUri] = useState(null);
  const fondoTrenUri = useMemo(
    () => Image.resolveAssetSource(fondoTrenAsset)?.uri,
    [],
  );

  useEffect(() => {
    let activo = true;

    const prepararMotor = async () => {
      try {
        const uri = await cargarMotorBabylon();

        if (!activo) {
          return;
        }

        setMotorBabylonUri(uri);
      } catch (_) {
        if (!activo) {
          return;
        }

        onErrorMotor?.(
          'No pudimos preparar el motor 3D del tren. Revisa la conexion y vuelve a entrar.',
        );
      }
    };

    void prepararMotor();

    return () => {
      activo = false;
    };
  }, [onErrorMotor]);

  const html = useMemo(
    () => (
      motorBabylonUri
        ? generarHtmlMotorBabylon(parametrosIniciales, {
          babylonScriptUri: motorBabylonUri,
          fondoTrenUri,
        })
        : null
    ),
    [fondoTrenUri, motorBabylonUri, parametrosIniciales],
  );

  if (!html) {
    return <View style={styles.webview} />;
  }

  return (
    <View style={styles.contenedor}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        originWhitelist={['*']}
        onMessage={onMensaje}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowFileAccess
        mixedContentMode="always"
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#06131f',
  },
});
