import React, { useMemo, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
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
import { caminoArTheme, resolverColorInsigniaCaminoAr } from '../caminoArTheme';

const RADIANES_A_GRADOS = 180 / Math.PI;

const PALETA_BALDOSAS = [
  'caminoArBaldosaCielo',
  'caminoArBaldosaMenta',
  'caminoArBaldosaCoral',
  'caminoArBaldosaSol',
  'caminoArBaldosaUva',
  'caminoArBaldosaNaranja',
];

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
  caminoArBaldosaCielo: {
    diffuseColor: caminoArTheme.tintas.aqua,
  },
  caminoArBaldosaMenta: {
    diffuseColor: caminoArTheme.tintas.menta,
  },
  caminoArBaldosaCoral: {
    diffuseColor: caminoArTheme.tintas.rosa,
  },
  caminoArBaldosaSol: {
    diffuseColor: caminoArTheme.tintas.sol,
  },
  caminoArBaldosaUva: {
    diffuseColor: caminoArTheme.tintas.uva,
  },
  caminoArBaldosaNaranja: {
    diffuseColor: caminoArTheme.tintas.naranja,
  },
  caminoArBaldosaActiva: {
    diffuseColor: '#FFF3A5',
  },
  caminoArBaldosaBloqueada: {
    diffuseColor: '#47586F',
  },
  caminoArBaldosaTextoOscuro: {
    diffuseColor: '#14314F',
  },
  caminoArBaldosaTextoClaro: {
    diffuseColor: '#F8FBFF',
  },
  caminoArBaseSombra: {
    lightingModel: 'Lambert',
    diffuseColor: 'rgba(4, 10, 24, 0.26)',
    blendMode: 'Alpha',
    cullMode: 'None',
  },
  caminoArBaseTablero: {
    lightingModel: 'Lambert',
    diffuseColor: 'rgba(31, 87, 124, 0.72)',
    blendMode: 'Alpha',
    cullMode: 'None',
  },
  caminoArBaseRuta: {
    lightingModel: 'Lambert',
    diffuseColor: 'rgba(255,255,255,0.18)',
    blendMode: 'Alpha',
    cullMode: 'None',
  },
});

const resolverMaterialBaldosa = (baldosa) => {
  if (baldosa.estadoVisual === 'activa') {
    return 'caminoArBaldosaActiva';
  }

  if (baldosa.estadoVisual === 'bloqueada') {
    return 'caminoArBaldosaBloqueada';
  }

  return PALETA_BALDOSAS[baldosa.indice % PALETA_BALDOSAS.length];
};

const resolverMaterialTexto = (baldosa) =>
  baldosa.estadoVisual === 'activa'
    ? 'caminoArBaldosaTextoOscuro'
    : 'caminoArBaldosaTextoClaro';

const obtenerValorMetrica = (metricas = [], etiqueta) =>
  metricas.find((metrica) => metrica.etiqueta === etiqueta)?.valor ?? null;

const construirHud = ({ escena, estadoPlano }) => [
  {
    id: 'nivel',
    texto: `Nivel ${
      obtenerValorMetrica(escena.sesion.metricas, 'Nivel') ??
      obtenerValorMetrica(escena.sesion.metricas, 'Paso') ??
      '--'
    }`,
  },
  {
    id: 'tiempo',
    texto: estadoPlano.disponible
      ? `Tiempo ${obtenerValorMetrica(escena.estadoActual.metricas, 'Tiempo') ?? '--'}`
      : 'Buscando piso',
  },
];

const construirMomentoJuego = ({ escena, estadoPlano }) => {
  if (!estadoPlano.disponible) {
      return {
        badge: 'Explorando',
        titulo: 'Busca un suelo amplio',
        texto: 'Mueve el celular despacio hasta que aparezca tu camino.',
      };
  }

  switch (escena.estadoActual.fase) {
    case 'mostrandoPatron':
      return {
        badge: 'Mira',
        titulo: 'Las luces marcan la ruta',
        texto: 'Mira todo el recorrido antes de tocar.',
      };
    case 'esperandoRespuesta':
      return {
        badge: 'Tu turno',
        titulo: 'Repite la ruta',
        texto: 'Toca las baldosas en el mismo orden.',
      };
    default:
      return {
        badge: 'Listo',
        titulo: 'Tu isla ya esta lista',
        texto: 'Cuando quieras, empezamos el reto.',
      };
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

  const anchoBase = Math.max(0.92, escenaEspacial.plano.ancho + 0.12);
  const profundoBase = Math.max(0.92, escenaEspacial.plano.profundo + 0.12);

  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesHorizontal']}
      onCameraTransformUpdate={onCameraTransformUpdate}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={480} />
      <ViroDirectionalLight
        color="#FFFFFF"
        direction={[0, -1, -0.2]}
        castsShadow={false}
        intensity={950}
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
              position={[0, -0.003, 0]}
              rotation={[-90, 0, 0]}
              width={anchoBase + 0.05}
              height={profundoBase + 0.05}
              materials={['caminoArBaseSombra']}
            />

            <ViroQuad
              position={[0, 0.002, 0]}
              rotation={[-90, 0, 0]}
              width={anchoBase}
              height={profundoBase}
              materials={['caminoArBaseTablero']}
            />

            <ViroQuad
              position={[0, 0.004, 0]}
              rotation={[-90, 0, 0]}
              width={Math.max(0.26, escenaEspacial.plano.ancho * 0.42)}
              height={Math.max(0.42, escenaEspacial.plano.profundo - 0.08)}
              materials={['caminoArBaseRuta']}
            />

            {escenaEspacial.baldosas.map((baldosa) => (
              <ViroNode key={baldosa.id} position={baldosa.posicion}>
                <ViroBox
                  position={[0, baldosa.escala[1] / 2, 0]}
                  scale={baldosa.escala}
                  materials={[resolverMaterialBaldosa(baldosa)]}
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
                  materials={[resolverMaterialTexto(baldosa)]}
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
  const insetSuperior = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const insetInferior = Platform.OS === 'android' ? 28 : 0;
  const ultimaCamaraRef = useRef(null);
  const [resetKey, setResetKey] = useState(0);
  const [rotacionTableroY, setRotacionTableroY] = useState(0);
  const [estadoPlano, setEstadoPlano] = useState({
    disponible: false,
    mensaje: 'Mueve el celular despacio hasta que aparezca el camino.',
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
          mensaje: 'El tablero ya aparecio sobre el suelo.',
        });
      },
      onPlaneUpdated: () => {
        setEstadoPlano((previo) => ({
          ...previo,
          disponible: true,
          mensaje: 'El tablero ya esta listo para jugar.',
        }));
      },
      onPlaneRemoved: () => {
        setEstadoPlano({
          disponible: false,
          mensaje: 'Perdimos el suelo por un momento. Muevete despacio para recuperarlo.',
        });
      },
    }),
    [escena.resultado.visible, escenaEspacial, rotacionTableroY, seleccionarBaldosa],
  );

  const momentoJuego = construirMomentoJuego({ escena, estadoPlano });
  const hud = construirHud({ escena, estadoPlano });
  const puedeRecolocarPiso = escena.salida.permitida && !escena.resultado.visible;
  const colorInsignia = resolverColorInsigniaCaminoAr(momentoJuego.badge);

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
        {!escena.resultado.visible ? (
          <View style={styles.layoutOverlay}>
            <View
              pointerEvents="box-none"
              style={[
                styles.encabezado,
                { paddingTop: Math.max(insetSuperior, espaciado.sm) },
              ]}
            >
              <View style={styles.encabezadoFila}>
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

                <View style={styles.encabezadoChips}>
                  {hud.map((item) => (
                    <View key={item.id} style={styles.hudChip}>
                      <Text style={styles.hudChipTexto}>{item.texto}</Text>
                    </View>
                  ))}

                  <View style={styles.badgeEstado}>
                    <Text style={[styles.badgeEstadoTexto, { color: colorInsignia }]}>
                      {momentoJuego.badge}
                    </Text>
                  </View>
                </View>
              </View>

              <View pointerEvents="none" style={styles.panelEstado}>
                <Text style={styles.cejaMision}>Camino AR</Text>
                <Text style={styles.subtitulo}>{momentoJuego.titulo}</Text>
                <Text style={styles.subtituloSecundario}>{momentoJuego.texto}</Text>
              </View>
            </View>

            <View
              style={[
                styles.panelAcciones,
                { paddingBottom: Math.max(espaciado.lg, insetInferior + 8) },
              ]}
            >
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

              <View style={styles.filaBotonesSecundarios}>
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

                <TouchableOpacity
                  style={[
                    styles.botonFantasma,
                    !puedeRecolocarPiso &&
                      styles.botonInactivo,
                  ]}
                  disabled={!puedeRecolocarPiso}
                  onPress={() => {
                    setRotacionTableroY(0);
                    setEstadoPlano({
                      disponible: false,
                      mensaje: 'Mueve el celular despacio hasta que aparezca el camino.',
                    });
                    setResetKey((previo) => previo + 1);
                  }}
                >
                  <Text style={styles.botonFantasmaTexto}>Cambiar lugar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.resultadoOverlay}>
            <View
              style={[
                styles.resultadoHeaderBar,
                { paddingTop: Math.max(insetSuperior, espaciado.sm) },
              ]}
            >
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
            </View>

            <View style={styles.panelResultado}>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.panelResultadoContenido,
                  { paddingBottom: Math.max(espaciado.lg, insetInferior + espaciado.md) },
                ]}
              >
                <View style={styles.badgeResultado}>
                  <Text style={styles.badgeResultadoTexto}>Tesoro de la ronda</Text>
                </View>

                <Text style={styles.tituloResultado}>{escena.resultado.titulo}</Text>
                <Text style={styles.resultadoTexto}>{escena.resultado.descripcion}</Text>

                <View style={styles.gridMetricasResultado}>
                  {escena.resultado.metricas.map((metrica, indice) => (
                    <View
                      key={metrica.etiqueta}
                      style={[
                        styles.cardMetricaResultado,
                        {
                          backgroundColor:
                            caminoArTheme.metricas[indice % caminoArTheme.metricas.length].fondo,
                          borderColor:
                            caminoArTheme.metricas[indice % caminoArTheme.metricas.length].borde,
                        },
                      ]}
                    >
                      <Text style={styles.cardMetricaEtiqueta}>{metrica.etiqueta}</Text>
                      <Text style={styles.cardMetricaValor}>{metrica.valor}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.panelResumenResultado}>
                  <Text style={styles.resumenResultadoTitulo}>Progreso guardado</Text>
                  <Text style={styles.resultadoSecundario}>
                    {escena.resultado.sincronizandoCierre
                      ? 'Guardando tus resultados y actualizando tu progreso...'
                      : escena.resultado.mensajeProgreso}
                  </Text>
                </View>

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

                <View style={styles.resultadoBotones}>
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
              </ScrollView>
            </View>
          </View>
        )}
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
    paddingHorizontal: espaciado.md,
    paddingTop: espaciado.sm,
    gap: espaciado.sm,
  },
  encabezadoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radios.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,104,0.28)',
  },
  botonVolverTexto: {
    color: caminoArTheme.tintas.oscuro,
    fontWeight: '800',
  },
  encabezadoChips: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: espaciado.xs,
  },
  badgeEstado: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radios.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,104,0.28)',
  },
  badgeEstadoTexto: {
    color: caminoArTheme.tintas.oscuro,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  hudChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radios.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(67,200,255,0.18)',
  },
  hudChipTexto: {
    color: caminoArTheme.tintas.medio,
    fontSize: 11,
    fontWeight: '800',
  },
  panelEstado: {
    alignSelf: 'flex-start',
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: caminoArTheme.paneles.mision,
    borderWidth: 1,
    borderColor: caminoArTheme.paneles.misionBorde,
    gap: 3,
    shadowColor: '#0A1D2D',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cejaMision: {
    color: caminoArTheme.tintas.rosa,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  subtitulo: {
    color: caminoArTheme.tintas.oscuro,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
  },
  subtituloSecundario: {
    color: caminoArTheme.tintas.medio,
    lineHeight: 17,
    fontSize: 13,
  },
  panelAcciones: {
    alignItems: 'center',
    paddingHorizontal: espaciado.md,
    gap: espaciado.sm,
  },
  filaBotonesSecundarios: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  botonPrimario: {
    width: '100%',
    maxWidth: 250,
    backgroundColor: caminoArTheme.botones.primario,
    borderRadius: 26,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    shadowColor: '#C57A00',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  botonPrimarioTexto: {
    color: caminoArTheme.botones.primarioTexto,
    fontWeight: '900',
    fontSize: 18,
  },
  botonSecundario: {
    flex: 0,
    backgroundColor: caminoArTheme.botones.secundario,
    minWidth: 138,
    borderRadius: 22,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.56)',
  },
  botonSecundarioTexto: {
    color: caminoArTheme.botones.secundarioTexto,
    fontWeight: '800',
    fontSize: 14,
  },
  botonFantasma: {
    minWidth: 138,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    minHeight: 48,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,104,0.24)',
  },
  botonFantasmaTexto: {
    color: caminoArTheme.tintas.medio,
    fontWeight: '800',
  },
  botonInactivo: {
    opacity: 0.45,
  },
  resultadoOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: espaciado.md,
  },
  resultadoHeaderBar: {
    paddingHorizontal: espaciado.md,
  },
  panelResultado: {
    marginTop: espaciado.md,
    maxHeight: '74%',
    backgroundColor: caminoArTheme.paneles.resultado,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: caminoArTheme.paneles.resultadoBorde,
  },
  panelResultadoContenido: {
    padding: espaciado.md,
    gap: espaciado.sm,
    paddingBottom: espaciado.lg,
  },
  badgeResultado: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radios.pill,
    backgroundColor: 'rgba(255,125,142,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,125,142,0.24)',
  },
  badgeResultadoTexto: {
    color: '#8A2E43',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  tituloResultado: {
    color: caminoArTheme.tintas.oscuro,
    fontSize: 24,
    fontWeight: '900',
  },
  resultadoTexto: {
    color: caminoArTheme.tintas.medio,
    lineHeight: 19,
  },
  resultadoSecundario: {
    color: caminoArTheme.tintas.suave,
    lineHeight: 18,
  },
  gridMetricasResultado: {
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
    color: caminoArTheme.tintas.suave,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  cardMetricaValor: {
    color: caminoArTheme.tintas.oscuro,
    fontSize: 16,
    fontWeight: '900',
  },
  panelResumenResultado: {
    padding: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: 'rgba(255,255,255,0.62)',
    gap: espaciado.xs,
  },
  resumenResultadoTitulo: {
    color: caminoArTheme.tintas.oscuro,
    fontWeight: '800',
  },
  listaLogrosResultado: {
    gap: espaciado.xs,
  },
  logroResultadoCard: {
    padding: espaciado.sm,
    borderRadius: radios.md,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(78,200,255,0.22)',
    gap: 4,
  },
  logroResultadoTitulo: {
    color: caminoArTheme.tintas.oscuro,
    fontWeight: '900',
  },
  logroResultadoTexto: {
    color: caminoArTheme.tintas.medio,
    lineHeight: 17,
  },
  resultadoBotones: {
    gap: espaciado.sm,
    marginTop: espaciado.sm,
  },
  botonContinuar: {
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: caminoArTheme.botones.primario,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  botonContinuarTexto: {
    color: caminoArTheme.botones.primarioTexto,
    fontWeight: '900',
    fontSize: 16,
  },
  botonResultadoSalir: {
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(20,49,79,0.08)',
  },
  botonResultadoSalirTexto: {
    color: caminoArTheme.tintas.medio,
    fontWeight: '800',
    fontSize: 15,
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
