import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ESTADOS_CAMINO_AR } from '../caminoAr.constants';
import { resolveAchievementIcon } from '../../core/achievementIcon';
import { useCaminoArAudio } from '../useCaminoArAudio';
import MascotaGuiaJuego from '../../core/MascotaGuiaJuego';
import CaminoArGuiaInicial from './CaminoArGuiaInicial';

const RADIANES_A_GRADOS = 180 / Math.PI;
const PERDIDA_PLANO_CANCELACION_MS = 900;
const FASES_CON_TABLERO_ACTIVO = new Set(['mostrandoPatron', 'esperandoRespuesta']);

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
    case ESTADOS_CAMINO_AR.mostrandoPatron:
      return {
        badge: 'Mira',
        titulo: 'Las luces marcan la ruta',
        texto: 'Mira todo el recorrido antes de tocar.',
      };
    case ESTADOS_CAMINO_AR.esperandoRespuesta:
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

const construirGuiaMascotaFase = ({ escena, estadoPlano }) => {
  if (!estadoPlano.disponible) {
    return {
      titulo: 'Busca el suelo',
      mensaje: 'Mueve el celular lento hasta que aparezcan las baldosas.',
    };
  }

  switch (escena.estadoActual.fase) {
    case ESTADOS_CAMINO_AR.mostrandoPatron:
      return {
        titulo: 'Mira y memoriza',
        mensaje: 'No toques todavía. Escucha los tin y recuerda el orden.',
      };
    case ESTADOS_CAMINO_AR.esperandoRespuesta:
      return {
        titulo: '¡Tu turno!',
        mensaje: 'Ahora toca las baldosas en el mismo camino de luces.',
      };
    case ESTADOS_CAMINO_AR.listo:
      return {
        titulo: 'Camino listo',
        mensaje: 'Pulsa iniciar y yo te guío paso a paso.',
      };
    default:
      return null;
  }
};

function ConfettiCelebracion() {
  const piezas = [
    { id: 'rosa-1', left: '8%', top: 22, color: caminoArTheme.tintas.rosa, rotate: '18deg' },
    { id: 'sol-1', left: '18%', top: 56, color: caminoArTheme.tintas.sol, rotate: '-12deg' },
    { id: 'menta-1', left: '31%', top: 30, color: caminoArTheme.tintas.menta, rotate: '31deg' },
    { id: 'aqua-1', left: '52%', top: 18, color: caminoArTheme.tintas.aqua, rotate: '-28deg' },
    { id: 'uva-1', left: '70%', top: 52, color: caminoArTheme.tintas.uva, rotate: '9deg' },
    { id: 'naranja-1', left: '86%', top: 26, color: caminoArTheme.tintas.naranja, rotate: '-18deg' },
    { id: 'rosa-2', left: '12%', top: 118, color: caminoArTheme.tintas.rosa, rotate: '-38deg' },
    { id: 'sol-2', left: '25%', top: 136, color: caminoArTheme.tintas.sol, rotate: '42deg' },
    { id: 'menta-2', left: '40%', top: 104, color: caminoArTheme.tintas.menta, rotate: '-8deg' },
    { id: 'aqua-2', left: '60%', top: 124, color: caminoArTheme.tintas.aqua, rotate: '35deg' },
    { id: 'uva-2', left: '76%', top: 106, color: caminoArTheme.tintas.uva, rotate: '-44deg' },
    { id: 'naranja-2', left: '91%', top: 132, color: caminoArTheme.tintas.naranja, rotate: '20deg' },
    { id: 'rosa-3', left: '6%', top: 212, color: caminoArTheme.tintas.rosa, rotate: '62deg' },
    { id: 'sol-3', left: '19%', top: 238, color: caminoArTheme.tintas.sol, rotate: '-54deg' },
    { id: 'menta-3', left: '34%', top: 204, color: caminoArTheme.tintas.menta, rotate: '15deg' },
    { id: 'aqua-3', left: '55%', top: 226, color: caminoArTheme.tintas.aqua, rotate: '-17deg' },
    { id: 'uva-3', left: '73%', top: 206, color: caminoArTheme.tintas.uva, rotate: '48deg' },
    { id: 'naranja-3', left: '88%', top: 232, color: caminoArTheme.tintas.naranja, rotate: '-28deg' },
  ];

  return (
    <View pointerEvents="none" style={styles.confettiCapa}>
      {piezas.map((pieza) => (
        <View
          key={pieza.id}
          style={[
            styles.confettiPieza,
            {
              backgroundColor: pieza.color,
              left: pieza.left,
              top: pieza.top,
              transform: [{ rotate: pieza.rotate }],
            },
          ]}
        />
      ))}
    </View>
  );
}

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
  cancelarPartidaTecnica,
  guiaInicialVisible = false,
  onCerrarGuiaInicial,
}) {
  const insets = useSafeAreaInsets();
  const insetSuperior = insets.top;
  const insetInferior = insets.bottom;
  const ultimaCamaraRef = useRef(null);
  const perdidaPlanoTimeoutRef = useRef(null);
  const [rotacionTableroY, setRotacionTableroY] = useState(0);
  const [estadoPlano, setEstadoPlano] = useState({
    disponible: false,
    mensaje: 'Mueve el celular despacio hasta que aparezca el camino.',
  });
  const estadoPlanoRef = useRef(estadoPlano);

  const actualizarEstadoPlano = useCallback((siguienteEstado) => {
    estadoPlanoRef.current = siguienteEstado;
    setEstadoPlano((previo) => (
      previo.disponible === siguienteEstado.disponible &&
      previo.mensaje === siguienteEstado.mensaje
        ? previo
        : siguienteEstado
    ));
  }, []);

  const limpiarCancelacionPorPerdida = useCallback(() => {
    if (perdidaPlanoTimeoutRef.current) {
      clearTimeout(perdidaPlanoTimeoutRef.current);
      perdidaPlanoTimeoutRef.current = null;
    }
  }, []);

  const tableroDisponible = useCallback(
    () => estadoPlanoRef.current.disponible,
    [],
  );

  useEffect(() => {
    estadoPlanoRef.current = estadoPlano;
  }, [estadoPlano]);

  useEffect(() => () => {
    limpiarCancelacionPorPerdida();
  }, [limpiarCancelacionPorPerdida]);

  const { reproducirToque } = useCaminoArAudio({ escena });
  const manejarSeleccionarBaldosa = useCallback(
    (indiceBaldosa) => {
      reproducirToque();
      seleccionarBaldosa?.(indiceBaldosa);
    },
    [reproducirToque, seleccionarBaldosa],
  );

  const viroAppProps = useMemo(
    () => ({
      escenaEspacial,
      onSeleccionarBaldosa: manejarSeleccionarBaldosa,
      mostrarTablero: !escena.resultado.visible,
      rotacionTableroY,
      onCameraTransformUpdate: (cameraTransform) => {
        ultimaCamaraRef.current = cameraTransform;
      },
      onPlaneFound: (anchor) => {
        limpiarCancelacionPorPerdida();
        setRotacionTableroY(
          resolverRotacionTablero({
            forwardCamara: ultimaCamaraRef.current?.forward,
            rotacionPlano: anchor?.rotation,
          }),
        );
        actualizarEstadoPlano({
          disponible: true,
          mensaje: 'El tablero ya aparecio sobre el suelo.',
        });
      },
      onPlaneUpdated: () => {
        limpiarCancelacionPorPerdida();
        actualizarEstadoPlano({
          disponible: true,
          mensaje: 'El tablero ya esta listo para jugar.',
        });
      },
      onPlaneRemoved: () => {
        actualizarEstadoPlano({
          disponible: false,
          mensaje: 'Perdimos el suelo por un momento. Muevete despacio para recuperarlo.',
        });

        if (!FASES_CON_TABLERO_ACTIVO.has(escena.estadoActual.fase)) {
          return;
        }

        limpiarCancelacionPorPerdida();
        perdidaPlanoTimeoutRef.current = setTimeout(() => {
          cancelarPartidaTecnica?.(
            'El tablero se movio. Busca el suelo y vuelve a intentarlo.',
          );
        }, PERDIDA_PLANO_CANCELACION_MS);
      },
    }),
    [
      actualizarEstadoPlano,
      cancelarPartidaTecnica,
      escena.estadoActual.fase,
      escena.resultado.visible,
      escenaEspacial,
      limpiarCancelacionPorPerdida,
      manejarSeleccionarBaldosa,
      rotacionTableroY,
    ],
  );

  const momentoJuego = construirMomentoJuego({ escena, estadoPlano });
  const guiaMascotaFase = construirGuiaMascotaFase({ escena, estadoPlano });
  const mostrarGuiaInicial =
    guiaInicialVisible &&
    !escena.resultado.visible &&
    escena.estadoActual.fase === ESTADOS_CAMINO_AR.listo;
  const mostrarMascotaFase =
    !mostrarGuiaInicial && !escena.resultado.visible && Boolean(guiaMascotaFase);
  const hud = construirHud({ escena, estadoPlano });
  const colorInsignia = resolverColorInsigniaCaminoAr(momentoJuego.badge);
  const resumenResultado = escena.resultado.resumenInfantil ?? {
    estrellas: 0,
    estrellasMaximas: 3,
    aciertos: 0,
    errores: 0,
    faltaron: 0,
    combo: 0,
    patronLongitud: 0,
    patronResuelto: false,
  };
  const estrellasResultado = Array.from(
    { length: resumenResultado.estrellasMaximas },
    (_, indice) => indice < resumenResultado.estrellas,
  );
  const metricasResultadoInfantil = [
    {
      etiqueta: 'Aciertos',
      valor: `${resumenResultado.aciertos}/${resumenResultado.patronLongitud}`,
    },
    {
      etiqueta: resumenResultado.patronResuelto ? 'Errores' : 'Faltaron',
      valor: resumenResultado.patronResuelto
        ? resumenResultado.errores
        : resumenResultado.faltaron,
    },
    {
      etiqueta: 'Combo',
      valor: `x${resumenResultado.combo}`,
    },
  ];

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={colores.fondoPrincipal} />
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: EscenaCaminoArViro }}
        viroAppProps={viroAppProps}
        style={styles.visorAr}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlaySeguro}>
        {!escena.resultado.visible ? (
          <View pointerEvents="box-none" style={styles.layoutOverlay}>
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

              {!mostrarMascotaFase ? (
                <View pointerEvents="none" style={styles.panelEstado}>
                  <Text style={styles.cejaMision}>Camino AR</Text>
                  <Text style={styles.subtitulo}>{momentoJuego.titulo}</Text>
                  <Text style={styles.subtituloSecundario}>{momentoJuego.texto}</Text>
                </View>
              ) : null}
            </View>

            {mostrarMascotaFase ? (
              <View pointerEvents="none" style={styles.mascotaFaseFlotante}>
                <MascotaGuiaJuego
                  variante="pill"
                  titulo={guiaMascotaFase.titulo}
                  mensaje={guiaMascotaFase.mensaje}
                />
              </View>
            ) : null}

            <View
              pointerEvents="box-none"
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
                onPress={() => {
                  escena.acciones.iniciar.accion?.({ tableroDisponible });
                }}
              >
                <Text style={styles.botonPrimarioTexto}>
                  {escena.acciones.iniciar.etiqueta}
                </Text>
              </TouchableOpacity>

              {!escena.acciones.pista.deshabilitada ? (
                <View style={styles.filaBotonesSecundarios}>
                  <TouchableOpacity
                    style={[
                      styles.botonSecundario,
                      !estadoPlano.disponible && styles.botonInactivo,
                    ]}
                    disabled={!estadoPlano.disponible}
                    onPress={escena.acciones.pista.accion}
                  >
                    <Text style={styles.botonSecundarioTexto}>
                      {escena.acciones.pista.etiqueta}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.resultadoOverlay}>
            {escena.resultado.mostrarCelebracion ? <ConfettiCelebracion /> : null}

            <View pointerEvents="none" style={styles.resultadoDecoracion}>
              <View style={[styles.resultadoBurbujaFondo, styles.resultadoBurbujaAqua]} />
              <View style={[styles.resultadoBurbujaFondo, styles.resultadoBurbujaSol]} />
              <View style={[styles.resultadoBurbujaFondo, styles.resultadoBurbujaRosa]} />
              <Text style={[styles.resultadoIconoFondo, styles.resultadoIconoUno]}>★</Text>
              <Text style={[styles.resultadoIconoFondo, styles.resultadoIconoDos]}>◆</Text>
              <Text style={[styles.resultadoIconoFondo, styles.resultadoIconoTres]}>●</Text>
            </View>

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

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.panelResultadoContenido,
                {
                  paddingTop: Math.max(92, insetSuperior + 70),
                  paddingBottom: Math.max(espaciado.xl, insetInferior + espaciado.xl),
                },
              ]}
            >
              <View style={styles.panelResultado}>
                <View style={styles.resultadoCinta}>
                  <Text style={styles.resultadoCintaTexto}>
                    {escena.resultado.mostrarCelebracion ? 'VICTORIA' : 'RETO TERMINADO'}
                  </Text>
                </View>

                <View style={styles.resultadoHero}>
                  <View style={styles.resultadoAura} />
                  <View style={styles.resultadoNivelPill}>
                    <Text style={styles.resultadoNivelTexto}>Camino AR · Memoria</Text>
                  </View>

                  <Text style={styles.tituloResultado}>{escena.resultado.titulo}</Text>

                  <View style={styles.estrellasResultado}>
                    {estrellasResultado.map((activa, indice) => (
                      <View
                        key={`estrella-${indice}`}
                        style={[
                          styles.estrellaBurbuja,
                          !activa && styles.estrellaBurbujaInactiva,
                        ]}
                      >
                        <Text
                          style={[
                            styles.estrellaResultado,
                            !activa && styles.estrellaResultadoInactiva,
                          ]}
                        >
                          {activa ? '★' : '☆'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.resultadoRecompensa}>
                    <Text style={styles.resultadoRecompensaLabel}>Premio del reto</Text>
                    <Text style={styles.resultadoTexto}>{escena.resultado.descripcion}</Text>
                  </View>
                </View>

                <View style={styles.gridMetricasResultado}>
                  {metricasResultadoInfantil.map((metrica, indice) => (
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
                    {escena.resultado.mensajeProgreso}
                  </Text>
                </View>

                {escena.resultado.logros?.length ? (
                  <View style={styles.listaLogrosResultado}>
                    <Text style={styles.resumenResultadoTitulo}>Logros nuevos</Text>
                    {escena.resultado.logros.map((logro) => {
                      const iconoLogro = resolveAchievementIcon(logro);

                      return (
                        <View
                          key={logro.id ?? logro.nombre_logro}
                          style={styles.logroResultadoCard}
                        >
                          <View style={styles.logroIconoBurbuja}>
                            <Text style={styles.logroIconoTexto}>{iconoLogro}</Text>
                          </View>

                          <View style={styles.logroTextoContenido}>
                            <Text style={styles.logroResultadoTitulo}>
                              {logro.nombre_logro}
                            </Text>
                            {logro.descripcion ? (
                              <Text style={styles.logroResultadoTexto}>
                                {logro.descripcion}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.resultadoBotones}>
                  {escena.resultado.haySiguientePaso && escena.resultado.siguienteEsMismoJuego ? (
                    <TouchableOpacity
                      style={styles.botonContinuar}
                      onPress={() => {
                        escena.resultado.accionContinuar?.({ tableroDisponible });
                      }}
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
              </View>
            </ScrollView>
          </View>
        )}
      </SafeAreaView>

      {mostrarGuiaInicial ? (
        <CaminoArGuiaInicial onComenzar={onCerrarGuiaInicial} />
      ) : null}
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
  mascotaFaseFlotante: {
    position: 'absolute',
    top: 92,
    left: espaciado.md,
    right: espaciado.md,
    zIndex: 14,
    alignItems: 'flex-start',
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
    backgroundColor: '#39C84F',
    borderRadius: 26,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#1D7B31',
    shadowColor: '#145A26',
    shadowOpacity: 0.34,
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
    backgroundColor: '#FFF6DD',
    minWidth: 148,
    borderRadius: 22,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F5C84B',
  },
  botonSecundarioTexto: {
    color: '#5A2F17',
    fontWeight: '800',
    fontSize: 14,
  },
  botonInactivo: {
    opacity: 0.45,
  },
  resultadoOverlay: {
    flex: 1,
    backgroundColor: '#10113A',
  },
  resultadoDecoracion: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  resultadoBurbujaFondo: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.42,
  },
  resultadoBurbujaAqua: {
    width: 260,
    height: 260,
    top: -90,
    left: -100,
    backgroundColor: '#40D9FF',
  },
  resultadoBurbujaSol: {
    width: 220,
    height: 220,
    right: -86,
    top: 72,
    backgroundColor: '#FFD54F',
  },
  resultadoBurbujaRosa: {
    width: 260,
    height: 260,
    bottom: -120,
    left: 38,
    backgroundColor: '#FF5B9F',
  },
  resultadoIconoFondo: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.13)',
    fontWeight: '900',
  },
  resultadoIconoUno: {
    top: 116,
    left: 48,
    fontSize: 42,
    transform: [{ rotate: '-14deg' }],
  },
  resultadoIconoDos: {
    top: 286,
    right: 42,
    fontSize: 34,
    transform: [{ rotate: '20deg' }],
  },
  resultadoIconoTres: {
    bottom: 112,
    left: 28,
    fontSize: 28,
  },
  resultadoHeaderBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 4,
    paddingHorizontal: espaciado.md,
  },
  panelResultado: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#FFF4D8',
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#8E541E',
    paddingTop: 38,
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  panelResultadoContenido: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
    gap: espaciado.sm,
  },
  resultadoCinta: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    minWidth: 214,
    paddingVertical: 11,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.pill,
    backgroundColor: '#45CC54',
    borderWidth: 3,
    borderColor: '#247E2D',
    shadowColor: '#145A25',
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
  },
  resultadoCintaTexto: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  resultadoHero: {
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 28,
    backgroundColor: '#FFF9E8',
    borderWidth: 3,
    borderColor: '#F2C858',
    gap: 10,
  },
  resultadoAura: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -142,
    backgroundColor: '#FFF1A8',
  },
  resultadoNivelPill: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radios.pill,
    backgroundColor: '#FFF2C7',
    borderWidth: 2,
    borderColor: '#F2C858',
  },
  resultadoNivelTexto: {
    color: '#5A2F17',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  tituloResultado: {
    color: '#3B220F',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(255,213,79,0.36)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  resultadoTexto: {
    color: '#5A2F17',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '700',
  },
  resultadoRecompensa: {
    width: '100%',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFF2C7',
    borderWidth: 2,
    borderColor: '#FFD166',
    gap: 4,
  },
  resultadoRecompensaLabel: {
    color: '#D66D00',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  confettiCapa: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  confettiPieza: {
    position: 'absolute',
    width: 12,
    height: 20,
    borderRadius: 5,
    opacity: 0.88,
  },
  estrellasResultado: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 2,
  },
  estrellaBurbuja: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4B8',
    borderWidth: 3,
    borderColor: '#FF9F1C',
    shadowColor: '#C57A00',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  estrellaBurbujaInactiva: {
    backgroundColor: '#EEF2F7',
    borderColor: '#D4DCE8',
  },
  estrellaResultado: {
    color: '#FFB703',
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: 'rgba(196, 126, 0, 0.34)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  estrellaResultadoInactiva: {
    color: '#A8B3C3',
    textShadowColor: 'transparent',
  },
  resultadoSecundario: {
    color: '#5A2F17',
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  gridMetricasResultado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    marginTop: espaciado.sm,
  },
  cardMetricaResultado: {
    minWidth: '30%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 22,
    borderWidth: 2,
    gap: 4,
    alignItems: 'center',
  },
  cardMetricaEtiqueta: {
    color: '#68401E',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  cardMetricaValor: {
    color: '#3B220F',
    fontSize: 18,
    fontWeight: '900',
  },
  panelResumenResultado: {
    marginTop: espaciado.sm,
    padding: espaciado.sm,
    borderRadius: 22,
    backgroundColor: '#FFF2C7',
    borderWidth: 2,
    borderColor: '#FFD166',
    gap: espaciado.xs,
  },
  resumenResultadoTitulo: {
    color: '#3B220F',
    fontWeight: '900',
    textAlign: 'center',
  },
  listaLogrosResultado: {
    marginTop: espaciado.sm,
    gap: espaciado.xs,
  },
  logroResultadoCard: {
    padding: espaciado.sm,
    borderRadius: 24,
    backgroundColor: '#FFF9E8',
    borderWidth: 2,
    borderColor: '#F2C858',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  logroIconoBurbuja: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD54F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  logroIconoTexto: {
    fontSize: 27,
  },
  logroTextoContenido: {
    flex: 1,
    gap: 3,
  },
  logroResultadoTitulo: {
    color: '#3B220F',
    fontWeight: '900',
  },
  logroResultadoTexto: {
    color: '#68401E',
    lineHeight: 17,
  },
  resultadoBotones: {
    flexDirection: 'row',
    gap: espaciado.sm,
    marginTop: espaciado.md,
  },
  botonContinuar: {
    flex: 1,
    borderRadius: 26,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: '#39C84F',
    borderWidth: 4,
    borderColor: '#1F7B31',
    shadowColor: '#145923',
    shadowOpacity: 0.42,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  botonContinuarTexto: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    textShadowColor: '#1B6B2C',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  botonResultadoSalir: {
    flex: 1,
    borderRadius: 26,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: '#29B8F2',
    borderWidth: 4,
    borderColor: '#087CAD',
    shadowColor: '#075E85',
    shadowOpacity: 0.36,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  botonResultadoSalirTexto: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    textShadowColor: '#075E85',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
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
