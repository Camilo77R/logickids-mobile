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
import { useDeteccionSuperficieAr } from './ar/useDeteccionSuperficieAr';

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
  const {
    escenaEspacial,
    escena,
    onSeleccionarBaldosa,
    registrarAncla,
    actualizarAncla,
    removerAncla,
    confirmarSuperficie,
    puedeRenderizarTablero,
  } = viroAppProps;

  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesHorizontal']}
      onAnchorFound={(anchor) => {
        selectorRef.current?.handleAnchorFound(anchor);
        registrarAncla?.(anchor);
      }}
      onAnchorUpdated={(anchor) => {
        selectorRef.current?.handleAnchorUpdated(anchor);
        actualizarAncla?.(anchor);
      }}
      onAnchorRemoved={(anchor) => {
        if (anchor) {
          selectorRef.current?.handleAnchorRemoved(anchor);
          removerAncla?.(anchor);
        }
      }}
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
        minHeight={escenaEspacial.plano.profundo}
        minWidth={escenaEspacial.plano.ancho}
        useActualShape
        onPlaneSelected={() => confirmarSuperficie?.()}
      >
        {puedeRenderizarTablero ? (
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
        ) : null}
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
  const deteccionSuperficieAr = useDeteccionSuperficieAr();
  const superficieFijada = deteccionSuperficieAr.estado.superficieSeleccionada;

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
          registrarAncla: deteccionSuperficieAr.registrarAncla,
          actualizarAncla: deteccionSuperficieAr.actualizarAncla,
          removerAncla: deteccionSuperficieAr.removerAncla,
          confirmarSuperficie: deteccionSuperficieAr.confirmarSuperficie,
          puedeRenderizarTablero: superficieFijada,
        }}
        style={styles.visorAr}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlaySeguro}>
        <View style={styles.layoutOverlay}>
          <View style={styles.encabezado}>
            <TouchableOpacity onPress={onSalir} style={styles.botonVolver}>
              <Text style={styles.botonVolverTexto}>Volver</Text>
            </TouchableOpacity>
            <View style={styles.panelEstado}>
              <Text style={styles.titulo}>Camino AR</Text>
              <Text style={styles.cejaEstado}>{deteccionSuperficieAr.etiquetaEstado}</Text>
              <Text style={styles.subtitulo}>{deteccionSuperficieAr.mensaje}</Text>
              <Text style={styles.subtituloSecundario}>{escena.estadoActual.mensaje}</Text>
              <Text style={styles.subtituloSecundario}>
                Superficies detectadas: {deteccionSuperficieAr.estado.cantidadSuperficies}
              </Text>
              <TouchableOpacity
                onPress={onSalir}
                style={styles.botonRecolocar}
              >
                <Text style={styles.botonRecolocarTexto}>Salir y recolocar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.panelAcciones}>
            <TouchableOpacity
              style={[
                styles.botonPrimario,
                !superficieFijada && styles.botonInactivo,
              ]}
              disabled={!superficieFijada}
              onPress={escena.acciones.iniciar.accion}
            >
              <Text style={styles.botonPrimarioTexto}>
                {escena.acciones.iniciar.etiqueta}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonSecundario,
                !superficieFijada && styles.botonInactivo,
                escena.acciones.pista.deshabilitada && styles.botonInactivo,
              ]}
              disabled={!superficieFijada || escena.acciones.pista.deshabilitada}
              onPress={escena.acciones.pista.accion}
            >
              <Text style={styles.botonSecundarioTexto}>
                {escena.acciones.pista.etiqueta}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonSecundario,
                !superficieFijada && styles.botonInactivo,
              ]}
              disabled={!superficieFijada}
              onPress={escena.acciones.reiniciar.accion}
            >
              <Text style={styles.botonSecundarioTexto}>
                {escena.acciones.reiniciar.etiqueta}
              </Text>
            </TouchableOpacity>

            {escena.resultado.visible ? (
              <View style={styles.panelResultado}>
                <Text style={styles.tituloResultado}>{escena.resultado.titulo}</Text>
                <Text style={styles.resultadoTexto}>{escena.resultado.descripcion}</Text>
              </View>
            ) : null}
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
  subtitulo: {
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  cejaEstado: {
    color: colores.alerta,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtituloSecundario: {
    color: colores.textoDebil,
    lineHeight: 18,
  },
  botonRecolocar: {
    marginTop: espaciado.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radios.pill,
    borderWidth: 1,
    borderColor: colores.bordeAcento,
    backgroundColor: 'rgba(130,215,255,0.10)',
  },
  botonRecolocarTexto: {
    color: colores.acento,
    fontWeight: '800',
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
  botonSecundario: {
    backgroundColor: 'rgba(8,17,31,0.78)',
    borderRadius: radios.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  botonSecundarioTexto: {
    color: colores.textoPrincipal,
    fontWeight: '800',
  },
  botonInactivo: {
    opacity: 0.45,
  },
  panelResultado: {
    padding: espaciado.md,
    borderRadius: radios.lg,
    backgroundColor: 'rgba(16,27,46,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(24,196,122,0.28)',
    gap: espaciado.xs,
  },
  tituloResultado: {
    color: '#D7FFE7',
    fontSize: 18,
    fontWeight: '900',
  },
  resultadoTexto: {
    color: colores.textoSecundario,
    lineHeight: 18,
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
