import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  ViroSphere,
  ViroText,
} from '@reactvision/react-viro';
import { ESTADOS_OBJETO_PERDIDO_AR } from '../objetoPerdidoAr.constants';

const FASES_ZONA_VISIBLE = new Set([
  ESTADOS_OBJETO_PERDIDO_AR.jugando,
  ESTADOS_OBJETO_PERDIDO_AR.rondaCompletada,
  ESTADOS_OBJETO_PERDIDO_AR.completado,
]);

const TIEMPO_FALLBACK_MANUAL_MS = 6500;
const POSICION_ZONA_RESPALDO = [0, -0.72, 0];
const CAIDA_VERTICAL_ZONA_MANUAL = 0.72;

ViroMaterials.createMaterials({
  objetoPerdidoLinea: {
    lightingModel: 'Lambert',
    diffuseColor: '#7DD3FC',
  },
  objetoPerdidoLineaLejana: {
    lightingModel: 'Lambert',
    diffuseColor: 'rgba(125, 211, 252, 0.52)',
    blendMode: 'Alpha',
    cullMode: 'None',
  },
  objetoPerdidoPista: {
    diffuseColor: '#FDE68A',
  },
  objetoPelotaAzul: {
    diffuseColor: '#38BDF8',
  },
  objetoManzanaRoja: {
    diffuseColor: '#EF4444',
  },
  objetoLibroVerde: {
    diffuseColor: '#22C55E',
  },
  objetoCuboMorado: {
    diffuseColor: '#A855F7',
  },
  objetoLapizNaranja: {
    diffuseColor: '#FB923C',
  },
  objetoEstrellaAmarilla: {
    diffuseColor: '#FACC15',
  },
  objetoCarroRojo: {
    diffuseColor: '#DC2626',
  },
  objetoLlaveDorada: {
    diffuseColor: '#D97706',
  },
  objetoGafasAzules: {
    diffuseColor: '#2563EB',
  },
  objetoCorazonRosado: {
    diffuseColor: '#F472B6',
  },
  objetoTextoOscuro: {
    diffuseColor: '#102A43',
  },
});

const formatearSegundos = (milisegundos) =>
  `${Math.ceil(Math.max(0, milisegundos) / 1000)} s`;

const obtenerMetricaOficial = (respuestaFinalizacionSesion, clave, respaldo) =>
  respuestaFinalizacionSesion?.resumen_oficial?.[clave] ?? respaldo;

const obtenerPosicionDesdePlano = (anchor) =>
  anchor?.position ??
  anchor?.transform?.position ??
  anchor?.anchorTransform?.position ??
  null;

const calcularPosicionZonaCentrada = (cameraTransform, anchor) => {
  const posicion = cameraTransform?.position ?? cameraTransform?.cameraTransform?.position;

  if (!Array.isArray(posicion)) {
    return POSICION_ZONA_RESPALDO;
  }

  const [cameraX = 0, cameraY = 0, cameraZ = 0] = posicion;
  const posicionPlano = obtenerPosicionDesdePlano(anchor);
  const yZona = Array.isArray(posicionPlano)
    ? posicionPlano[1] ?? cameraY - CAIDA_VERTICAL_ZONA_MANUAL
    : cameraY - CAIDA_VERTICAL_ZONA_MANUAL;

  return [
    Number(cameraX.toFixed(2)),
    Number(yZona.toFixed(2)),
    Number(cameraZ.toFixed(2)),
  ];
};

function GuiaTemporal({ mensaje, fase }) {
  const estadoGuia =
    fase === ESTADOS_OBJETO_PERDIDO_AR.rondaCompletada ||
    fase === ESTADOS_OBJETO_PERDIDO_AR.completado
      ? 'feliz'
      : fase === ESTADOS_OBJETO_PERDIDO_AR.jugando
        ? 'atento'
        : 'listo';

  return (
    <View style={styles.guiaFila}>
      <View style={[styles.guiaAvatar, styles[`guiaAvatar_${estadoGuia}`]]}>
        <Ionicons
          name={estadoGuia === 'feliz' ? 'happy' : estadoGuia === 'atento' ? 'eye' : 'sparkles'}
          size={26}
          color="#14314F"
        />
      </View>
      <View style={styles.burbuja}>
        <Text style={styles.burbujaEtiqueta}>Guia LogicKids</Text>
        <Text style={styles.burbujaTexto}>{mensaje}</Text>
      </View>
    </View>
  );
}

const escalaObjeto = (objeto, escalaBase, activo) => {
  const factorActivo = activo ? 1.18 : 1;
  const base = 0.12 * escalaBase * factorActivo;

  if (objeto.tipo3d === 'caja-plana') {
    return [base * 1.2, 0.035, base * 0.82];
  }

  if (objeto.tipo3d === 'caja-larga') {
    return [base * 1.45, 0.04, base * 0.34];
  }

  if (objeto.tipo3d === 'doble-caja') {
    return [base * 0.62, 0.035, base * 0.42];
  }

  if (objeto.tipo3d === 'placa') {
    return [base, 0.026, base];
  }

  return [base, base, base];
};

function Objeto3D({ objeto, activo, escalaBase, onSeleccionarObjeto }) {
  const escala = escalaObjeto(objeto, escalaBase, activo);
  const material = activo ? 'objetoPerdidoPista' : objeto.material;
  const posicionBase = [0, escala[1] / 2 + 0.012, 0];

  if (objeto.tipo3d === 'esfera') {
    return (
      <ViroNode position={objeto.posicion}>
        <ViroSphere
          position={[0, escala[1] / 2 + 0.04, 0]}
          radius={escala[0]}
          materials={[material]}
          onClick={() => onSeleccionarObjeto?.(objeto.id)}
        />
        <EtiquetaObjeto objeto={objeto} />
      </ViroNode>
    );
  }

  if (objeto.tipo3d === 'doble-caja') {
    return (
      <ViroNode position={objeto.posicion}>
        <ViroBox
          position={[-escala[0] * 0.62, escala[1] / 2 + 0.04, 0]}
          scale={escala}
          materials={[material]}
          onClick={() => onSeleccionarObjeto?.(objeto.id)}
        />
        <ViroBox
          position={[escala[0] * 0.62, escala[1] / 2 + 0.04, 0]}
          scale={escala}
          materials={[material]}
          onClick={() => onSeleccionarObjeto?.(objeto.id)}
        />
        <EtiquetaObjeto objeto={objeto} />
      </ViroNode>
    );
  }

  return (
    <ViroNode position={objeto.posicion}>
      <ViroBox
        position={posicionBase}
        scale={escala}
        materials={[material]}
        onClick={() => onSeleccionarObjeto?.(objeto.id)}
      />
      <EtiquetaObjeto objeto={objeto} />
    </ViroNode>
  );
}

function EtiquetaObjeto({ objeto }) {
  return (
    <ViroText
      text={objeto.etiqueta}
      position={[0, 0.22, 0]}
      scale={[0.045, 0.045, 0.045]}
      width={0.8}
      height={0.22}
      style={stylesViro.textoObjeto}
      materials={['objetoTextoOscuro']}
    />
  );
}

function LimitesZonaBusqueda({ zona }) {
  const ancho = zona?.ancho ?? 3;
  const profundidad = zona?.profundidad ?? 3;
  const altura = zona?.alturaMaxima ?? 0.85;
  const grosor = 0.018;
  const yPiso = 0.018;
  const yPoste = altura / 2;

  return (
    <ViroNode>
      <ViroBox
        position={[0, yPiso, -profundidad / 2]}
        scale={[ancho, grosor, grosor]}
        materials={['objetoPerdidoLinea']}
      />
      <ViroBox
        position={[0, yPiso, profundidad / 2]}
        scale={[ancho, grosor, grosor]}
        materials={['objetoPerdidoLineaLejana']}
      />
      <ViroBox
        position={[-ancho / 2, yPiso, 0]}
        scale={[grosor, grosor, profundidad]}
        materials={['objetoPerdidoLinea']}
      />
      <ViroBox
        position={[ancho / 2, yPiso, 0]}
        scale={[grosor, grosor, profundidad]}
        materials={['objetoPerdidoLinea']}
      />
      {[
        [-ancho / 2, yPoste, -profundidad / 2],
        [ancho / 2, yPoste, -profundidad / 2],
        [-ancho / 2, yPoste, profundidad / 2],
        [ancho / 2, yPoste, profundidad / 2],
      ].map((posicion, indice) => (
        <ViroBox
          key={`poste-${indice}`}
          position={posicion}
          scale={[grosor, altura, grosor]}
          materials={['objetoPerdidoLineaLejana']}
        />
      ))}
    </ViroNode>
  );
}

function ContenidoZonaBusqueda({
  objetos,
  estado,
  configuracion,
  onSeleccionarObjeto,
}) {
  return (
    <ViroNode>
      <LimitesZonaBusqueda zona={configuracion.configuracion.zonaBusqueda} />

      {objetos.map((objeto) => (
        <Objeto3D
          key={objeto.id}
          objeto={objeto}
          activo={estado.objetoActivoId === objeto.id}
          escalaBase={configuracion.configuracion.escalaObjeto}
          onSeleccionarObjeto={onSeleccionarObjeto}
        />
      ))}
    </ViroNode>
  );
}

function EscenaObjetoPerdidoAr(props) {
  const viroAppProps =
    props.sceneNavigator?.viroAppProps ?? props.arSceneNavigator?.viroAppProps ?? {};
  const {
    estado,
    configuracion,
    onSeleccionarObjeto,
    onPlaneFound,
    onCameraTransformUpdate,
    mostrarZonaBusqueda,
    posicionZonaBusqueda,
  } = viroAppProps;

  const objetos = estado.rondaActual?.objetos ?? [];

  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesHorizontal']}
      onCameraTransformUpdate={onCameraTransformUpdate}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={520} />
      <ViroDirectionalLight
        color="#FFFFFF"
        direction={[0, -1, -0.3]}
        castsShadow={false}
        intensity={900}
      />

      <ViroARPlane
        alignment="HorizontalUpward"
        minHeight={0.5}
        minWidth={0.5}
        onAnchorFound={onPlaneFound}
        onAnchorUpdated={onPlaneFound}
      />

      {mostrarZonaBusqueda ? (
        <ViroNode position={posicionZonaBusqueda ?? POSICION_ZONA_RESPALDO}>
          <ContenidoZonaBusqueda
            objetos={objetos}
            estado={estado}
            configuracion={configuracion}
            onSeleccionarObjeto={onSeleccionarObjeto}
          />
        </ViroNode>
      ) : null}
    </ViroARScene>
  );
}

export default function ObjetoPerdidoArVistaViro({
  onSalir,
  configuracion,
  estado,
  iniciarActividad,
  reiniciarActividad,
  marcarBuscandoSuperficie,
  seleccionarObjeto,
  usarPista,
  continuarSiguienteRonda,
  puedePedirPista,
  preparandoPartida,
  persistenciaSesion,
  respuestaFinalizacionSesion,
}) {
  const insets = useSafeAreaInsets();
  const [zonaDisponible, setZonaDisponible] = useState(false);
  const [fallbackManualDisponible, setFallbackManualDisponible] = useState(false);
  const [modoColocacion, setModoColocacion] = useState('plano');
  const [posicionZonaBusqueda, setPosicionZonaBusqueda] = useState(POSICION_ZONA_RESPALDO);
  const zonaDisponibleRef = useRef(false);
  const modoColocacionRef = useRef('plano');
  const ultimaCamaraRef = useRef(null);
  const mostrarZonaBusqueda = zonaDisponible && FASES_ZONA_VISIBLE.has(estado.fase);

  const actualizarZonaDisponible = useCallback((anchor) => {
    if (zonaDisponibleRef.current || modoColocacionRef.current === 'manual') {
      return;
    }

    modoColocacionRef.current = 'plano';
    setModoColocacion('plano');
    setPosicionZonaBusqueda(calcularPosicionZonaCentrada(ultimaCamaraRef.current, anchor));
    zonaDisponibleRef.current = true;
    setZonaDisponible(true);
    setFallbackManualDisponible(false);
  }, []);

  useEffect(() => {
    if (!zonaDisponible) {
      marcarBuscandoSuperficie();
    }
  }, [marcarBuscandoSuperficie, zonaDisponible]);

  useEffect(() => {
    if (zonaDisponible) {
      setFallbackManualDisponible(false);
      return undefined;
    }

    const esperaManual = setTimeout(() => {
      setFallbackManualDisponible(true);
    }, TIEMPO_FALLBACK_MANUAL_MS);

    return () => clearTimeout(esperaManual);
  }, [zonaDisponible]);

  const registrarTransformCamara = useCallback((cameraTransform) => {
    ultimaCamaraRef.current = cameraTransform;
  }, []);

  const iniciar = () =>
    iniciarActividad({
      tableroDisponible: () => zonaDisponibleRef.current,
    });

  const iniciarManual = () => {
    const posicionManual = calcularPosicionZonaCentrada(ultimaCamaraRef.current);
    modoColocacionRef.current = 'manual';
    zonaDisponibleRef.current = true;
    setModoColocacion('manual');
    setPosicionZonaBusqueda(posicionManual);
    setZonaDisponible(true);
    setFallbackManualDisponible(false);

    iniciarActividad({
      tableroDisponible: () => true,
    });
  };

  const reiniciar = () =>
    reiniciarActividad({
      tableroDisponible: () => zonaDisponibleRef.current,
    });

  const metricas = useMemo(() => ({
    ronda: `${Math.max(estado.numeroRonda, 1)}/${configuracion.configuracion.rondasPorPartida}`,
    tiempo: formatearSegundos(estado.tiempoRestanteMs),
    puntos: estado.resultado?.estadisticas?.puntaje ?? Math.max(estado.aciertos * 10 - estado.errores * 3, 0),
  }), [
    configuracion.configuracion.rondasPorPartida,
    estado.aciertos,
    estado.errores,
    estado.numeroRonda,
    estado.resultado,
    estado.tiempoRestanteMs,
  ]);

  const resultadoVisible = Boolean(estado.resultado);
  const rondaCompletadaVisible =
    estado.fase === ESTADOS_OBJETO_PERDIDO_AR.rondaCompletada &&
    Boolean(estado.resumenRonda) &&
    !resultadoVisible;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ViroARSceneNavigator
        autofocus
        style={styles.escena}
        initialScene={{ scene: EscenaObjetoPerdidoAr }}
        viroAppProps={{
          estado,
          configuracion,
          mostrarZonaBusqueda,
          modoColocacion,
          posicionZonaBusqueda,
          onSeleccionarObjeto: seleccionarObjeto,
          onPlaneFound: actualizarZonaDisponible,
          onCameraTransformUpdate: registrarTransformCamara,
        }}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.capaHud}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.botonIcono} onPress={onSalir}>
            <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={styles.tituloBloque}>
            <Text style={styles.titulo}>Objeto Perdido AR</Text>
            <Text style={styles.subtitulo}>Nivel {configuracion.dificultad} · {persistenciaSesion?.modo ?? 'local'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.botonIcono, !puedePedirPista && styles.botonIconoDisabled]}
            onPress={usarPista}
            disabled={!puedePedirPista}
          >
            <Ionicons name="bulb" size={22} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricasFila}>
          <Metrica icono="flag" etiqueta="Ronda" valor={metricas.ronda} />
          <Metrica icono="time" etiqueta="Tiempo" valor={metricas.tiempo} />
          <Metrica icono="star" etiqueta="Puntos" valor={metricas.puntos} />
        </View>

        <View style={styles.hudEspaciador} />

        <GuiaTemporal
          mensaje={
            zonaDisponible
              ? estado.mensaje
              : fallbackManualDisponible
                ? 'Si el piso no aparece, centra la zona donde estas.'
                : 'Apunta al piso y quedate en el centro de la zona.'
          }
          fase={estado.fase}
        />

        {!resultadoVisible && !rondaCompletadaVisible ? (
          <View style={styles.panelAccion}>
            {!zonaDisponible ? (
              fallbackManualDisponible ? (
                <TouchableOpacity
                  style={[styles.botonPrincipal, preparandoPartida && styles.botonPrincipalDisabled]}
                  onPress={iniciarManual}
                  disabled={preparandoPartida}
                >
                  {preparandoPartida ? <ActivityIndicator color="#14314F" /> : null}
                  <Ionicons name="locate" size={18} color="#14314F" />
                  <Text style={styles.botonPrincipalTexto}>
                    {preparandoPartida ? 'Preparando' : 'Centrar aqui'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.estadoPlano}>
                  <ActivityIndicator color="#38BDF8" />
                  <Text style={styles.estadoPlanoTexto}>Buscando superficie AR...</Text>
                </View>
              )
            ) : estado.fase === ESTADOS_OBJETO_PERDIDO_AR.jugando ? (
              <Text style={styles.estadoPlanoTexto}>Explora la zona y toca el objeto correcto.</Text>
            ) : (
              <TouchableOpacity
                style={[styles.botonPrincipal, preparandoPartida && styles.botonPrincipalDisabled]}
                onPress={iniciar}
                disabled={preparandoPartida}
              >
                {preparandoPartida ? <ActivityIndicator color="#14314F" /> : null}
                <Text style={styles.botonPrincipalTexto}>
                  {preparandoPartida ? 'Preparando' : 'Comenzar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </SafeAreaView>

      {resultadoVisible ? (
        <View style={styles.resultadoCapa}>
          <View style={styles.resultadoCard}>
            <Text style={styles.resultadoEtiqueta}>Actividad completada</Text>
            <Text style={styles.resultadoTitulo}>Buen trabajo</Text>
            <View style={styles.resultadoMetricas}>
              <MetricaResultado etiqueta="Puntos" valor={obtenerMetricaOficial(respuestaFinalizacionSesion, 'puntaje', estado.resultado.estadisticas.puntaje)} />
              <MetricaResultado etiqueta="Aciertos" valor={obtenerMetricaOficial(respuestaFinalizacionSesion, 'aciertos', estado.resultado.estadisticas.aciertos)} />
              <MetricaResultado etiqueta="Errores" valor={obtenerMetricaOficial(respuestaFinalizacionSesion, 'errores', estado.resultado.estadisticas.errores)} />
              <MetricaResultado etiqueta="Precision" valor={`${estado.resultado.estadisticas.precisionPct}%`} />
            </View>
            {persistenciaSesion?.error ? (
              <Text style={styles.errorPersistencia}>{persistenciaSesion.error}</Text>
            ) : null}
            <View style={styles.resultadoBotones}>
              <TouchableOpacity style={styles.botonSecundario} onPress={reiniciar}>
                <Text style={styles.botonSecundarioTexto}>Repetir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonPrincipal} onPress={onSalir}>
                <Text style={styles.botonPrincipalTexto}>Volver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {rondaCompletadaVisible ? (
        <View style={styles.resultadoCapa}>
          <View style={styles.rondaCard}>
            <View style={styles.rondaIcono}>
              <Ionicons name="cube" size={30} color="#14314F" />
            </View>
            <Text style={styles.resultadoEtiqueta}>Objeto encontrado</Text>
            <Text style={styles.rondaTitulo}>
              Ronda {estado.resumenRonda.numeroRonda} completada
            </Text>
            <Text style={styles.rondaTexto}>
              Encontraste {estado.resumenRonda.objetoObjetivo.nombre}.
            </Text>
            <View style={styles.resultadoMetricas}>
              <MetricaResultado etiqueta="Objeto" valor={estado.resumenRonda.objetoObjetivo.etiqueta} />
              <MetricaResultado etiqueta="Puntos" valor={`+${estado.resumenRonda.puntosGanados}`} />
              <MetricaResultado etiqueta="Tiempo" valor={formatearSegundos(estado.resumenRonda.tiempoRestanteMs)} />
              <MetricaResultado etiqueta="Ronda" valor={`${estado.resumenRonda.numeroRonda}/${estado.resumenRonda.rondasPorPartida}`} />
            </View>
            <TouchableOpacity style={[styles.botonPrincipal, styles.botonRonda]} onPress={continuarSiguienteRonda}>
              <Text style={styles.botonPrincipalTexto}>
                {estado.resumenRonda.esUltimaRonda ? 'Ver resultado' : 'Siguiente reto'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Metrica({ icono, etiqueta, valor }) {
  return (
    <View style={styles.metrica}>
      <Ionicons name={icono} size={13} color="#BAE6FD" />
      <Text style={styles.metricaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.metricaValor}>{valor}</Text>
    </View>
  );
}

function MetricaResultado({ etiqueta, valor }) {
  return (
    <View style={styles.metricaResultado}>
      <Text style={styles.metricaResultadoValor}>{valor}</Text>
      <Text style={styles.metricaResultadoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  escena: { ...StyleSheet.absoluteFillObject },
  capaHud: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  botonIcono: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  botonIconoDisabled: { opacity: 0.42 },
  tituloBloque: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titulo: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  subtitulo: { color: '#BAE6FD', fontSize: 12, marginTop: 2 },
  metricasFila: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  hudEspaciador: { flex: 1 },
  metrica: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 8,
  },
  metricaEtiqueta: { color: '#BAE6FD', fontSize: 10, fontWeight: '800' },
  metricaValor: { color: '#F8FAFC', fontSize: 13, fontWeight: '900' },
  guiaFila: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  guiaAvatar: {
    alignItems: 'center',
    borderColor: '#F8FAFC',
    borderRadius: 26,
    borderWidth: 2,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  guiaAvatar_listo: { backgroundColor: '#FDE68A' },
  guiaAvatar_atento: { backgroundColor: '#BAE6FD' },
  guiaAvatar_feliz: { backgroundColor: '#BBF7D0' },
  burbuja: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: '#E0F2FE',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  burbujaEtiqueta: { color: '#0284C7', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  burbujaTexto: { color: '#0F172A', fontSize: 15, fontWeight: '800', marginTop: 3 },
  panelAccion: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
    padding: 12,
  },
  estadoPlano: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  estadoPlanoTexto: { color: '#F8FAFC', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  botonPrincipal: {
    alignItems: 'center',
    backgroundColor: '#FDE68A',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 22,
  },
  botonPrincipalDisabled: { opacity: 0.7 },
  botonPrincipalTexto: { color: '#14314F', fontSize: 15, fontWeight: '900' },
  resultadoCapa: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.62)',
    justifyContent: 'center',
    padding: 18,
  },
  resultadoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  rondaCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#BAE6FD',
    borderRadius: 8,
    borderWidth: 2,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  rondaIcono: {
    alignItems: 'center',
    backgroundColor: '#FDE68A',
    borderColor: '#F8FAFC',
    borderRadius: 30,
    borderWidth: 3,
    height: 60,
    justifyContent: 'center',
    marginBottom: 10,
    width: 60,
  },
  resultadoEtiqueta: { color: '#0284C7', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  resultadoTitulo: { color: '#0F172A', fontSize: 26, fontWeight: '900', marginTop: 4 },
  rondaTitulo: { color: '#0F172A', fontSize: 24, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  rondaTexto: { color: '#475569', fontSize: 14, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  resultadoMetricas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  metricaResultado: {
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    minWidth: '47%',
    padding: 10,
  },
  metricaResultadoValor: { color: '#0F172A', fontSize: 20, fontWeight: '900' },
  metricaResultadoEtiqueta: { color: '#475569', fontSize: 12, fontWeight: '800' },
  errorPersistencia: { color: '#B91C1C', fontSize: 12, marginTop: 12 },
  resultadoBotones: { flexDirection: 'row', gap: 10, marginTop: 18 },
  botonSecundario: {
    alignItems: 'center',
    borderColor: '#0EA5E9',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  botonSecundarioTexto: { color: '#0369A1', fontSize: 15, fontWeight: '900' },
  botonRonda: {
    marginTop: 18,
    width: '100%',
  },
});

const stylesViro = {
  textoObjeto: {
    color: '#102A43',
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
};
