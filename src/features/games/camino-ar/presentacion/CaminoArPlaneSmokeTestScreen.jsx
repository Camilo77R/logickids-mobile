import React, { useMemo, useState } from 'react';
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
  ViroARPlane,
  ViroARScene,
  ViroARSceneNavigator,
  ViroBox,
  ViroDirectionalLight,
  ViroMaterials,
  ViroNode,
  ViroQuad,
  ViroText,
} from '@reactvision/react-viro';
import { colores, espaciado, radios } from '../../../../theme/tokens';

ViroMaterials.createMaterials({
  smokePlaneBase: {
    lightingModel: 'Lambert',
    diffuseColor: 'rgba(13, 34, 61, 0.82)',
    blendMode: 'Alpha',
    cullMode: 'None',
  },
  smokePlaneTile: {
    diffuseColor: colores.baldosaBase,
  },
  smokePlaneTileAccent: {
    diffuseColor: colores.alerta,
  },
  smokePlaneText: {
    diffuseColor: colores.textoPrincipal,
  },
});

function EscenaPlaneSmokeTest(props) {
  const viroAppProps =
    props.sceneNavigator?.viroAppProps ?? props.arSceneNavigator?.viroAppProps ?? {};
  const { onAnchorFound, onAnchorUpdated, onAnchorRemoved } = viroAppProps;

  return (
    <ViroARScene anchorDetectionTypes={['PlanesHorizontal']}>
      <ViroAmbientLight color="#FFFFFF" intensity={450} />
      <ViroDirectionalLight
        color="#FFFFFF"
        direction={[0, -1, -0.2]}
        castsShadow={false}
        intensity={900}
      />

      <ViroARPlane
        alignment="HorizontalUpward"
        minHeight={0.5}
        minWidth={0.5}
        onAnchorFound={onAnchorFound}
        onAnchorUpdated={onAnchorUpdated}
        onAnchorRemoved={onAnchorRemoved}
      >
        <ViroQuad
          position={[0, 0.002, 0]}
          rotation={[-90, 0, 0]}
          width={0.9}
          height={0.9}
          materials={['smokePlaneBase']}
        />

        <ViroText
          text="Smoke Test"
          position={[0, 0.08, -0.26]}
          scale={[0.12, 0.12, 0.12]}
          width={2}
          height={0.3}
          style={stylesViro.texto}
          materials={['smokePlaneText']}
        />

        <ViroNode position={[-0.16, 0, -0.02]}>
          <ViroBox
            position={[0, 0.03, 0]}
            scale={[0.14, 0.06, 0.14]}
            materials={['smokePlaneTile']}
          />
        </ViroNode>
        <ViroNode position={[0.16, 0, -0.02]}>
          <ViroBox
            position={[0, 0.03, 0]}
            scale={[0.14, 0.06, 0.14]}
            materials={['smokePlaneTileAccent']}
          />
        </ViroNode>
        <ViroNode position={[0, 0, 0.22]}>
          <ViroBox
            position={[0, 0.03, 0]}
            scale={[0.14, 0.06, 0.14]}
            materials={['smokePlaneTile']}
          />
        </ViroNode>
      </ViroARPlane>
    </ViroARScene>
  );
}

export default function CaminoArPlaneSmokeTestScreen({ onSalir }) {
  const [resetKey, setResetKey] = useState(0);
  const [anchorState, setAnchorState] = useState({
    estado: 'Buscando piso',
    detalle: 'Aun no se ha anclado ningun plano horizontal valido.',
  });

  const viroAppProps = useMemo(
    () => ({
      onAnchorFound: (anchor) => {
        setAnchorState({
          estado: 'Plano encontrado',
          detalle: `alignment: ${anchor.alignment ?? 'n/a'} · width: ${anchor.width ?? 0} · height: ${anchor.height ?? 0}`,
        });
      },
      onAnchorUpdated: (anchor) => {
        setAnchorState({
          estado: 'Plano actualizado',
          detalle: `alignment: ${anchor.alignment ?? 'n/a'} · width: ${anchor.width ?? 0} · height: ${anchor.height ?? 0}`,
        });
      },
      onAnchorRemoved: () => {
        setAnchorState({
          estado: 'Plano perdido',
          detalle: 'El plano desaparecio del tracking actual.',
        });
      },
    }),
    [],
  );

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />
      <ViroARSceneNavigator
        key={`plane-smoke-${resetKey}`}
        autofocus
        initialScene={{ scene: EscenaPlaneSmokeTest }}
        viroAppProps={viroAppProps}
        style={styles.visorAr}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlaySeguro}>
        <View style={styles.layoutOverlay}>
          <View style={styles.encabezado}>
            <TouchableOpacity onPress={onSalir} style={styles.botonVolver}>
              <Text style={styles.botonVolverTexto}>Volver</Text>
            </TouchableOpacity>
            <View style={styles.panelEstado}>
              <Text style={styles.titulo}>Smoke Test AR Plane</Text>
              <Text style={styles.cejaEstado}>{anchorState.estado}</Text>
              <Text style={styles.subtitulo}>
                Esta escena solo prueba si `ViroARPlane` ancla contenido al piso correctamente.
              </Text>
              <Text style={styles.detalleEstado}>{anchorState.detalle}</Text>
            </View>
          </View>

          <View style={styles.panelAcciones}>
            <TouchableOpacity
              style={styles.botonPrimario}
              onPress={() => {
                setAnchorState({
                  estado: 'Buscando piso',
                  detalle: 'Reiniciando escena para buscar un plano nuevo.',
                });
                setResetKey((previo) => previo + 1);
              }}
            >
              <Text style={styles.botonPrimarioTexto}>Reiniciar prueba</Text>
            </TouchableOpacity>
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
  layoutOverlay: {
    flex: 1,
    justifyContent: 'space-between',
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
  cejaEstado: {
    color: colores.alerta,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitulo: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  detalleEstado: {
    color: colores.textoDebil,
    lineHeight: 18,
  },
  panelAcciones: {
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
    gap: espaciado.sm,
  },
  botonPrimario: {
    backgroundColor: colores.exito,
    borderRadius: radios.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botonPrimarioTexto: {
    color: '#052A16',
    fontWeight: '900',
    fontSize: 15,
  },
});

const stylesViro = {
  texto: {
    fontFamily: 'Arial',
    fontSize: 20,
    color: colores.textoPrincipal,
    textAlign: 'center',
  },
};
