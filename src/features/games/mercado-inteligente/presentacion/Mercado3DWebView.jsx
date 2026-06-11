import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';

import { colors, fonts, radii, spacing } from '../../../../constants/theme';
import {
  MODELOS_DECORACION_MERCADO,
  resolverModeloMercado,
} from '../mercadoModelos3d';
import {
  ocultarUriLargaParaLog,
  resolverFuenteModeloBabylon,
} from './mercado3dAssets';
import { generarHtmlMercado3D } from './mercado3dMotorBabylon';

const DEBUG_MERCADO_3D = false;

const TIPOS_LOG_IMPORTANTES = new Set([
  'WEBVIEW_JS_ERROR',
  'WEBVIEW_PROMISE_ERROR',
  'SCENE_ERROR',
  'BRIDGE_ERROR',
  'MODEL_SOURCE_FAILED',
  'MODEL_FALLBACK_USED',
  'DECORATION_SKIPPED',
]);

const WEBVIEW_INJECTED_BOOT = `
  (function () {
    try {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'WEBVIEW_INJECTED_BOOT',
        message: 'React Native WebView bridge activo'
      }));
    } catch (error) {}
  })();
  true;
`;

const crearMapaAssetsProductos = async (productos) => {
  const pares = await Promise.all(
    productos.map(async (producto) => {
      const modelo = resolverModeloMercado(producto);
      const fuente = await resolverFuenteModeloBabylon(modelo?.source);

      return [
        producto.id,
        {
          uri: fuente.uri,
          uris: fuente.uris,
          tipo: fuente.tipo,
          diagnostico: fuente.diagnostico,
        },
      ];
    }),
  );

  return Object.fromEntries(pares);
};

const crearMapaAssetsDecoracion = async () => {
  const pares = await Promise.all(
    Object.entries(MODELOS_DECORACION_MERCADO).map(async ([clave, modelo]) => {
      const fuente = await resolverFuenteModeloBabylon(modelo?.source);

      return [
        clave,
        {
          uri: fuente.uri,
          uris: fuente.uris,
          tipo: fuente.tipo,
          diagnostico: fuente.diagnostico,
        },
      ];
    }),
  );

  return Object.fromEntries(pares);
};

const extraerFuentesValidas = (mapaAssets) =>
  Object.fromEntries(
    Object.entries(mapaAssets)
      .filter(([, fuente]) => Boolean(fuente?.uri || fuente?.uris?.length))
      .map(([clave, fuente]) => [
        clave,
        fuente.uris?.length ? fuente.uris : [fuente.uri],
      ]),
  );

const crearDiagnosticoAssets = ({ productos, decoracion }) => ({
  productos: Object.fromEntries(
    Object.entries(productos).map(([clave, fuente]) => [
      clave,
      {
        tipo: fuente.tipo,
        diagnostico: fuente.diagnostico,
        cantidadFuentes: fuente.uris?.length ?? (fuente.uri ? 1 : 0),
      },
    ]),
  ),
  decoracion: Object.fromEntries(
    Object.entries(decoracion).map(([clave, fuente]) => [
      clave,
      {
        tipo: fuente.tipo,
        diagnostico: fuente.diagnostico,
        cantidadFuentes: fuente.uris?.length ?? (fuente.uri ? 1 : 0),
      },
    ]),
  ),
});

const crearClaveRonda = (ronda) => {
  const productos = ronda.oferta
    .map((producto) => `${producto.id}:${producto.precio}`)
    .join('|');

  const objetivo = [
    ronda.objetivo?.modo,
    ronda.objetivo?.presupuestoObjetivo,
    ronda.objetivo?.cantidadObjetivos,
    ronda.objetivo?.categoriaObjetivo,
  ]
    .filter(Boolean)
    .join(':');

  return `${objetivo}-${productos}`;
};

const normalizarEstadoResultadoParaBabylon = (estadoCompra) => {
  if (!estadoCompra) {
    return null;
  }

  const estadoOriginal =
    estadoCompra.state ??
    estadoCompra.estadoCompra ??
    estadoCompra.tipoResultado ??
    estadoCompra.estado ??
    null;

  let state = estadoOriginal;

  if (estadoOriginal === 'acierto') {
    state = 'success';
  }

  if (estadoOriginal === 'error_exceso') {
    state = 'over_budget';
  }

  if (estadoOriginal === 'error_faltante') {
    state = 'under_budget';
  }

  return {
    ...estadoCompra,
    state,
  };
};

const sanitizarMensajeParaLog = (mensaje) => {
  if (!mensaje || typeof mensaje !== 'object') {
    return mensaje;
  }

  return {
    ...mensaje,
    uri: ocultarUriLargaParaLog(mensaje.uri),
  };
};

export default function Mercado3DWebView({
  ronda,
  seleccionadosIds,
  estadoCompra,
  onMensaje,
}) {
  const webViewRef = useRef(null);
  const [sceneReady, setSceneReady] = useState(false);

  const [assets, setAssets] = useState({
    cargando: true,
    productos: {},
    decoracion: {},
    diagnostico: null,
  });

  useEffect(() => {
    let activo = true;

    const cargarAssets = async () => {
      setSceneReady(false);

      setAssets((previo) => ({
        ...previo,
        cargando: true,
      }));

      try {
        const [productos, decoracion] = await Promise.all([
          crearMapaAssetsProductos(ronda.oferta),
          crearMapaAssetsDecoracion(),
        ]);

        if (!activo) {
          return;
        }

        setAssets({
          cargando: false,
          productos: extraerFuentesValidas(productos),
          decoracion: extraerFuentesValidas(decoracion),
          diagnostico: crearDiagnosticoAssets({ productos, decoracion }),
        });
      } catch (error) {
        if (!activo) {
          return;
        }

        console.warn('[Mercado3D] No se pudieron preparar assets 3D:', error);

        setAssets({
          cargando: false,
          productos: {},
          decoracion: {},
          diagnostico: {
            error: String(error?.message ?? error),
          },
        });
      }
    };

    cargarAssets();

    return () => {
      activo = false;
    };
  }, [ronda]);

  useEffect(() => {
    if (DEBUG_MERCADO_3D && !assets.cargando && assets.diagnostico) {
      console.log('[Mercado3D][ASSETS]', assets.diagnostico);
    }
  }, [assets.cargando, assets.diagnostico]);

  const html = useMemo(
    () =>
      generarHtmlMercado3D({
        ronda,
        assetsPorProducto: assets.productos,
        assetsDecoracion: assets.decoracion,
      }),
    [assets.decoracion, assets.productos, ronda],
  );

  const webViewKey = useMemo(() => {
    const rondaKey = crearClaveRonda(ronda);
    const productosCargados = Object.keys(assets.productos).sort().join('-');
    const decoracionCargada = Object.keys(assets.decoracion).sort().join('-');

    return `${rondaKey}-${productosCargados}-${decoracionCargada}`;
  }, [assets.decoracion, assets.productos, ronda]);

  const enviarComando = useCallback((mensaje) => {
    const script = `
      try {
        window.recibirMercado && window.recibirMercado(${JSON.stringify(mensaje)});
      } catch (error) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'BRIDGE_ERROR',
          message: String(error && error.message ? error.message : error)
        }));
      }
      true;
    `;

    webViewRef.current?.injectJavaScript(script);
  }, []);

  useEffect(() => {
    if (!sceneReady) {
      return;
    }

    enviarComando({
      type: 'SET_CART',
      payload: {
        selectedProductIds: seleccionadosIds,
      },
    });
  }, [enviarComando, sceneReady, seleccionadosIds]);

  useEffect(() => {
    if (!sceneReady || !estadoCompra) {
      return;
    }

    const resultadoVisual = normalizarEstadoResultadoParaBabylon(estadoCompra);

    if (!resultadoVisual) {
      return;
    }

    enviarComando({
      type: 'SHOW_RESULT',
      payload: resultadoVisual,
    });
  }, [enviarComando, estadoCompra, sceneReady]);

  const manejarMensaje = useCallback(
    (evento) => {
      try {
        const mensaje = JSON.parse(evento.nativeEvent.data);

        if (DEBUG_MERCADO_3D || TIPOS_LOG_IMPORTANTES.has(mensaje.type)) {
          console.log('[Mercado3D]', sanitizarMensajeParaLog(mensaje));
        }

        if (mensaje.type === 'SCENE_READY') {
          setSceneReady(true);
        }

        onMensaje?.(mensaje);
      } catch (error) {
        console.warn('[Mercado3D] Mensaje inválido desde WebView:', evento.nativeEvent.data, error);
      }
    },
    [onMensaje],
  );

  if (assets.cargando) {
    return (
      <View style={styles.contenedor}>
        <View style={styles.cargando}>
          <ActivityIndicator color="#f5a910" />
          <Text style={styles.cargandoTexto}>Armando el mercadito...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ html }}
        originWhitelist={['*']}
        onMessage={manejarMensaje}
        injectedJavaScriptBeforeContentLoaded={WEBVIEW_INJECTED_BOOT}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        allowingReadAccessToURL="*"
        mixedContentMode="always"
        onError={(evento) => {
          console.warn('[Mercado3D][WEBVIEW_ERROR]', evento.nativeEvent);
        }}
        onHttpError={(evento) => {
          console.warn('[Mercado3D][WEBVIEW_HTTP_ERROR]', evento.nativeEvent);
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#8ee6ff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#8ee6ff',
  },
  cargando: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: '38%',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 248, 237, 0.96)',
    borderWidth: 2,
    borderColor: '#f4c66d',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  cargandoTexto: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 14,
  },
});
