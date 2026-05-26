import React, { useMemo, useRef, useState } from 'react';
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

const RADIANES_A_GRADOS = 180 / Math.PI;

const proyectarForwardHorizontal = (forward = [0, 0, -1]) => {
  const [x = 0, , z = -1] = forward;
  const magnitud = Math.hypot(x, z);

  if (magnitud < 0.0001) {
    return null;
  }

  return [x / magnitud, 0, z / magnitud];
};

const normalizarYaw = (yaw) => {
  let resultado = Number.isFinite(yaw) ? yaw % 360 : 0;

  if (resultado > 180) {
    resultado -= 360;
  }

  if (resultado <= -180) {
    resultado += 360;
  }

  return Number(resultado.toFixed(3));
};

const resolverRotacionTablero = ({ forwardCamara, rotacionPlano = [0, 0, 0] }) => {
  const forwardHorizontal = proyectarForwardHorizontal(forwardCamara);

  if (!forwardHorizontal) {
    return 0;
  }

  const yawCamara =
    Math.atan2(forwardHorizontal[0], forwardHorizontal[2]) * RADIANES_A_GRADOS;
  const yawPlano = Array.isArray(rotacionPlano) ? rotacionPlano[1] ?? 0 : 0;

  return normalizarYaw(yawCamara - yawPlano);
};

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
  caminoArBaseTablero: {
    lightingModel: 'Lambert',
    diffuseColor: 'rgba(13, 34, 61, 0.82)',
    blendMode: 'Alpha',
    cullMode: 'None',
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
  const viroAppProps =
    props.sceneNavigator?.viroAppProps ?? props.arSceneNavigator?.viroAppProps ?? {};
  const {
    escenaEspacial,
    onSeleccionarBaldosa,
    onPlaneFound,
    onPlaneUpdated,
    onPlaneRemoved,
    onCameraTransformUpdate,
    rotacionTableroY = 0,
    mostrarTablero = true,
  } = viroAppProps;

  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesHorizontal']}
      onCameraTransformUpdate={onCameraTransformUpdate}
    >
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
        onAnchorFound={onPlaneFound}
        onAnchorUpdated={onPlaneUpdated}
        onAnchorRemoved={onPlaneRemoved}
      >
        {mostrarTablero ? (
          <ViroNode rotation={[0, rotacionTableroY, 0]}>
            <ViroQuad
              position={[0, 0.002, 0]}
              rotation={[-90, 0, 0]}
              width={Math.max(0.9, escenaEspacial.plano.ancho + 0.12)}
              height={Math.max(0.9, escenaEspacial.plano.profundo + 0.12)}
              materials={['caminoArBaseTablero']}
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
      </ViroARPlane>
    </ViroARScene>
  );
}

export default function CaminoArVistaArViro({
  escena,
  escenaEspacial,
  onSalir,
  seleccionarBaldosa,
}) {
  const mostrarInfoTecnica = __DEV__;
  const ultimaCamaraRef = useRef(null);
  const [resetKey, setResetKey] = useState(0);
  const [rotacionTableroY, setRotacionTableroY] = useState(0);
  const [estadoPlano, setEstadoPlano] = useState({
    disponible: false,
    etiqueta: 'Buscando el suelo',
    mensaje: 'Mueve el celular despacio hasta que el tablero aparezca sobre el suelo.',
    detalle: 'Aún no encontramos un plano estable.',
  });

  const viroAppProps = useMemo(
    () => ({
      escenaEspacial,
      onSeleccionarBaldosa: seleccionarBaldosa,
      mostrarTablero: !escena.resultado.visible,
      rotacionTableroY,
      onCameraTransformUpdate: (cameraTransform) => {
        ultimaCamaraRef.current = cameraTransform;
      },
      onPlaneFound: (anchor) => {
        setRotacionTableroY(
          resolverRotacionTablero({
            forwardCamara: ultimaCamaraRef.current?.forward,
            rotacionPlano: anchor?.rotation,
          }),
        );
        setEstadoPlano({
          disponible: true,
          etiqueta: 'Tablero listo',
          mensaje: 'El tablero ya quedó en el suelo. Ahora puedes comenzar.',
          detalle: `alignment: ${anchor.alignment ?? 'n/a'} · width: ${anchor.width ?? 0} · height: ${anchor.height ?? 0}`,
        });
      },
      onPlaneUpdated: (anchor) => {
        setEstadoPlano((previo) => ({
          ...previo,
          disponible: true,
          etiqueta: 'Tablero listo',
          mensaje: 'El tablero sigue en su lugar. Si quieres moverlo, recoloca el suelo.',
          detalle: `alignment: ${anchor.alignment ?? 'n/a'} · width: ${anchor.width ?? 0} · height: ${anchor.height ?? 0}`,
        }));
      },
      onPlaneRemoved: () => {
        setEstadoPlano({
          disponible: false,
          etiqueta: 'Suelo perdido',
          mensaje: 'Perdimos el suelo por un momento. Muévete despacio para recuperarlo.',
          detalle: 'El plano horizontal dejó de estar disponible.',
        });
      },
    }),
    [escenaEspacial, seleccionarBaldosa, rotacionTableroY],
  );

  const mensajePrincipal = escena.resultado.visible
    ? escena.resultado.descripcion
    : estadoPlano.disponible
      ? escena.estadoActual.mensaje
      : estadoPlano.mensaje;

  const detallePrincipal = escena.resultado.visible
    ? 'Tus resultados quedaron guardados para esta actividad.'
    : estadoPlano.disponible
      ? escena.estadoActual.descripcion
      : estadoPlano.detalle;
  const puedeRecolocarPiso =
    escena.salida.permitida && !escena.resultado.visible;

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />
      <ViroARSceneNavigator
        key={`camino-ar-plane-${resetKey}`}
        autofocus
        initialScene={{ scene: EscenaCaminoArViro }}
        viroAppProps={viroAppProps}
        style={styles.visorAr}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlaySeguro}>
        <View style={styles.layoutOverlay}>
          <View style={styles.encabezado}>
            <TouchableOpacity
              onPress={onSalir}
              disabled={!escena.salida.permitida}
              style={[
                styles.botonVolver,
                !escena.salida.permitida && styles.botonInactivo,
              ]}
            >
              <Text style={styles.botonVolverTexto}>{escena.salida.etiqueta}</Text>
            </TouchableOpacity>
            <View style={styles.panelEstado}>
              <Text style={styles.titulo}>Camino AR</Text>
              <Text style={styles.cejaEstado}>{estadoPlano.etiqueta}</Text>
              <Text style={styles.subtitulo}>{mensajePrincipal}</Text>
              <Text style={styles.subtituloSecundario}>{detallePrincipal}</Text>
              {mostrarInfoTecnica ? (
                <Text style={styles.infoTecnica}>{estadoPlano.detalle}</Text>
              ) : null}
              <TouchableOpacity
                disabled={!puedeRecolocarPiso}
                onPress={() => {
                  setRotacionTableroY(0);
                  setEstadoPlano({
                    disponible: false,
                    etiqueta: 'Buscando el suelo',
                    mensaje: 'Mueve el celular despacio hasta que el tablero aparezca sobre el suelo.',
                    detalle: 'Reiniciando escena para buscar un plano nuevo.',
                  });
                  setResetKey((previo) => previo + 1);
                }}
                style={[
                  styles.botonRecolocar,
                  !puedeRecolocarPiso && styles.botonInactivo,
                ]}
              >
                <Text style={styles.botonRecolocarTexto}>Recolocar piso</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.panelAcciones}>
            {escena.acciones.mostrarControlesPrincipales ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.botonPrimario,
                    (!estadoPlano.disponible || escena.acciones.iniciar.deshabilitada) &&
                      styles.botonInactivo,
                  ]}
                  disabled={!estadoPlano.disponible || escena.acciones.iniciar.deshabilitada}
                  onPress={escena.acciones.iniciar.accion}
                >
                  <Text style={styles.botonPrimarioTexto}>
                    {escena.acciones.iniciar.etiqueta}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botonSecundario,
                    (!estadoPlano.disponible || escena.acciones.pista.deshabilitada) &&
                      styles.botonInactivo,
                  ]}
                  disabled={!estadoPlano.disponible || escena.acciones.pista.deshabilitada}
                  onPress={escena.acciones.pista.accion}
                >
                  <Text style={styles.botonSecundarioTexto}>
                    {escena.acciones.pista.etiqueta}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {escena.resultado.visible ? (
              <View style={styles.panelResultado}>
                <Text style={styles.tituloResultado}>{escena.resultado.titulo}</Text>
                <Text style={styles.resultadoTexto}>{escena.resultado.descripcion}</Text>
                <View style={styles.gridMetricasResultado}>
                  {escena.resultado.metricas.map((metrica) => (
                    <View key={metrica.etiqueta} style={styles.cardMetricaResultado}>
                      <Text style={styles.cardMetricaEtiqueta}>{metrica.etiqueta}</Text>
                      <Text style={styles.cardMetricaValor}>{metrica.valor}</Text>
                    </View>
                  ))}
                </View>
                {escena.resultado.sincronizandoCierre ? (
                  <Text style={styles.resultadoSecundario}>
                    Guardando tus resultados y actualizando tu progreso...
                  </Text>
                ) : (
                  <View style={styles.panelResumenResultado}>
                    <Text style={styles.resumenResultadoTitulo}>Progreso guardado</Text>
                    <Text style={styles.resultadoSecundario}>
                      {escena.resultado.mensajeProgreso}
                    </Text>
                  </View>
                )}
                {escena.resultado.logros?.length ? (
                  <View style={styles.listaLogrosResultado}>
                    <Text style={styles.resumenResultadoTitulo}>Logros nuevos</Text>
                    {escena.resultado.logros.map((logro) => (
                      <View key={logro.id} style={styles.logroResultadoCard}>
                        <Text style={styles.logroResultadoTitulo}>{logro.nombre_logro}</Text>
                        {logro.descripcion ? (
                          <Text style={styles.logroResultadoTexto}>{logro.descripcion}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
                {escena.resultado.haySiguientePaso && escena.resultado.siguienteEsMismoJuego ? (
                  <TouchableOpacity
                    style={styles.botonContinuar}
                    onPress={escena.resultado.accionContinuar}
                  >
                    <Text style={styles.botonContinuarTexto}>
                      {escena.resultado.etiquetaContinuar ?? 'Continuar'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {escena.resultado.accionSalir ? (
                  <TouchableOpacity
                    style={styles.botonResultadoSalir}
                    onPress={escena.resultado.accionSalir}
                  >
                    <Text style={styles.botonResultadoSalirTexto}>
                      {escena.resultado.etiquetaSalir ?? 'Volver'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
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
  subtituloSecundario: {
    color: colores.textoDebil,
    lineHeight: 18,
  },
  infoTecnica: {
    color: colores.acento,
    fontSize: 12,
    lineHeight: 16,
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
  resultadoSecundario: {
    color: colores.textoDebil,
    lineHeight: 18,
  },
  panelResumenResultado: {
    marginTop: espaciado.xs,
    padding: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: espaciado.xs,
  },
  resumenResultadoTitulo: {
    color: colores.textoPrincipal,
    fontWeight: '800',
  },
  gridMetricasResultado: {
    marginTop: espaciado.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.xs,
  },
  cardMetricaResultado: {
    minWidth: '31%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radios.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  cardMetricaEtiqueta: {
    color: colores.textoDebil,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  cardMetricaValor: {
    color: colores.textoPrincipal,
    fontSize: 16,
    fontWeight: '900',
  },
  listaLogrosResultado: {
    gap: espaciado.xs,
  },
  logroResultadoCard: {
    padding: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: 'rgba(24,196,122,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(24,196,122,0.22)',
    gap: 4,
  },
  logroResultadoTitulo: {
    color: '#D7FFE7',
    fontWeight: '900',
  },
  logroResultadoTexto: {
    color: colores.textoSecundario,
    lineHeight: 17,
  },
  botonContinuar: {
    marginTop: espaciado.xs,
    borderRadius: radios.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colores.alerta,
  },
  botonContinuarTexto: {
    color: colores.fondoPrincipal,
    fontWeight: '900',
  },
  botonResultadoSalir: {
    marginTop: espaciado.xs,
    borderRadius: radios.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colores.bordeSuave,
  },
  botonResultadoSalirTexto: {
    color: colores.textoPrincipal,
    fontWeight: '800',
  },
});

const stylesViro = {
  textoBaldosa: {
    fontFamily: 'Arial',
    fontSize: 18,
    color: colores.textoPrincipal,
    textAlign: 'center',
  },
};
