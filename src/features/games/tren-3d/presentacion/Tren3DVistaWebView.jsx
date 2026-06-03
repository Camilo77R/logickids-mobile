import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import { generarHtmlMotorBabylon } from './tren3dMotorBabylon';

export default function Tren3DVistaWebView({
  webViewRef,
  onMensaje,
  parametrosIniciales,
}) {
  const html = useMemo(
    () => generarHtmlMotorBabylon(parametrosIniciales),
    [parametrosIniciales],
  );

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
