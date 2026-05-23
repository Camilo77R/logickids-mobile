import React, { useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ViroAmbientLight,
  ViroARPlaneSelector,
  ViroARScene,
  ViroARSceneNavigator,
  ViroBox,
  ViroDirectionalLight,
  ViroMaterials,
  ViroNode,
  ViroText,
} from '@reactvision/react-viro';
import { colores, espaciado, radios } from '../../../../theme/tokens';

ViroMaterials.createMaterials({
  caminoArBaldosaLista: {
    diffuseColor: colores.baldosaBase,
  },
  caminoArBaldosaActiva: {
    diffuseColor: colores.baldosaActiva,
  },
  caminoArBaldosaBloqueada: {
    diffuseColor: colores.bloqueado,
  },
  caminoArTexto: {
    diffuseColor: colores.textoPrincipal,
  },
});

const resolverMaterialBaldosa = (estadoVisual) => {
  switch (estadoVisual) {
    case 'activa':
      return 'caminoArBaldosaActiva';
    case 'bloqueada':
      return 'caminoArBaldosaBloqueada';
    default:
      return 'caminoArBaldosaLista';
  }
};

function EscenaCaminoArViro(props) {
  const selectorRef = useRef(null);
  const viroAppProps =
    props.sceneNavigator?.viroAppProps ?? props.arSceneNavigator?.viroAppProps ?? {};
  const { escenaEspacial, escena, onSeleccionarBaldosa } = viroAppProps;

  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesHorizontal']}
      onAnchorFound={(anchor) => selectorRef.current?.handleAnchorFound(anchor)}
      onAnchorUpdated={(anchor) => selectorRef.current?.handleAnchorUpdated(anchor)}
      onAnchorRemoved={(anchor) => anchor && selectorRef.current?.handleAnchorRemoved(anchor)}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={450} />
      <ViroDirectionalLight
        color="#FFFFFF"
        direction={[0, -1, -0.2]}
        castsShadow={false}
        intensity={900}
      />

      <ViroARPlaneSelector
        ref={selectorRef}
        alignment="Horizontal"
        hideOverlayOnSelection
      >
        <ViroNode position={[0, 0, 0]}>
          <ViroText
            text={escenaEspacial.hud.titulo}
            position={[0, 0.16, 0]}
            scale={[0.12, 0.12, 0.12]}
            width={3}
            height={0.3}
            style={stylesViro.textoTitulo}
            materials={['caminoArTexto']}
          />
          <ViroText
            text={escena.estadoActual.mensaje}
            position={[0, 0.08, 0]}
            scale={[0.08, 0.08, 0.08]}
            width={3.4}
            height={0.4}
            style={stylesViro.textoEstado}
            materials={['caminoArTexto']}
          />

          {escenaEspacial.baldosas.map((baldosa) => (
            <ViroNode key={baldosa.id} position={baldosa.posicion}>
              <ViroBox
                position={[0, baldosa.escala[1] / 2, 0]}
                scale={baldosa.escala}
                materials={[resolverMaterialBaldosa(baldosa.estadoVisual)]}
                onClick={() => {
                  if (baldosa.interactiva) {
                    onSeleccionarBaldosa?.(baldosa.indice);
                  }
                }}
              />
              <ViroText
                text={String(baldosa.numeroVisible)}
                position={[0, baldosa.escala[1] + 0.03, 0]}
                scale={[0.06, 0.06, 0.06]}
                width={0.4}
                height={0.2}
                style={stylesViro.textoBaldosa}
                materials={['caminoArTexto']}
              />
            </ViroNode>
          ))}
        </ViroNode>
      </ViroARPlaneSelector>
    </ViroARScene>
  );
}

export default function CaminoArVistaArViro({
  escena,
  escenaEspacial,
  onSalir,
  seleccionarBaldosa,
}) {
  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: EscenaCaminoArViro }}
        viroAppProps={{
          escena,
          escenaEspacial,
          onSeleccionarBaldosa: seleccionarBaldosa,
        }}
        style={styles.visorAr}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlaySeguro}>
        <View style={styles.encabezado}>
          <TouchableOpacity onPress={onSalir} style={styles.botonVolver}>
            <Text style={styles.botonVolverTexto}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.panelEstado}>
            <Text style={styles.titulo}>Camino AR</Text>
            <Text style={styles.subtitulo}>{escena.estadoActual.mensaje}</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondoPrincipal,
  },
  visorAr: {
    flex: 1,
  },
  overlaySeguro: {
    ...StyleSheet.absoluteFillObject,
  },
  encabezado: {
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radios.pill,
    backgroundColor: 'rgba(8,17,31,0.72)',
  },
  botonVolverTexto: {
    color: colores.textoPrincipal,
    fontWeight: '700',
  },
  panelEstado: {
    alignSelf: 'stretch',
    padding: espaciado.md,
    borderRadius: radios.lg,
    backgroundColor: 'rgba(8,17,31,0.72)',
    gap: espaciado.xs,
  },
  titulo: {
    color: colores.textoPrincipal,
    fontSize: 20,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
});

const stylesViro = {
  textoTitulo: {
    fontFamily: 'Arial',
    fontSize: 24,
    color: colores.textoPrincipal,
    textAlign: 'center',
  },
  textoEstado: {
    fontFamily: 'Arial',
    fontSize: 16,
    color: colores.textoPrincipal,
    textAlign: 'center',
  },
  textoBaldosa: {
    fontFamily: 'Arial',
    fontSize: 18,
    color: colores.textoPrincipal,
    textAlign: 'center',
  },
};

