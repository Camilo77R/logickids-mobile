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
  ESTADOS_OBJETO_PERDIDO_AR.zonaIdentificada,
  ESTADOS_OBJETO_PERDIDO_AR.mostrandoMision,
  ESTADOS_OBJETO_PERDIDO_AR.cuentaRegresiva,
  ESTADOS_OBJETO_PERDIDO_AR.jugando,
  ESTADOS_OBJETO_PERDIDO_AR.rondaCompletada,
  ESTADOS_OBJETO_PERDIDO_AR.completado,
]);

const TIEMPO_ESCANEO_MINIMO_MS = 4200;
const MUESTRAS_DIRECCION_NECESARIAS = 9;
const POSICION_ZONA_RESPALDO = [0, 0, 0];

ViroMaterials.createMaterials({
  objetoPerdidoLinea: {
    lightingModel: 'Lambert',
    diffuseColor: 'rgba(125, 211, 252, 0.7)',
    blendMode: 'Alpha',
    cullMode: 'None',
  },
  objetoPerdidoLineaLejana: {
    lightingModel: 'Lambert',
    diffuseColor: 'rgba(125, 211, 252, 0.28)',
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
  objetoManzanaHoja: {
    diffuseColor: '#15803D',
  },
  objetoLibroVerde: {
    diffuseColor: '#22C55E',
  },
  objetoLibroAzul: {
    diffuseColor: '#2563EB',
  },
  objetoLibroPaginas: {
    diffuseColor: '#F8FAFC',
  },
  objetoCuboMorado: {
    diffuseColor: '#A855F7',
  },
  objetoBloqueAmarillo: {
    diffuseColor: '#FACC15',
  },
  objetoOsoCafe: {
    diffuseColor: '#B45309',
  },
  objetoOsoClaro: {
    diffuseColor: '#F59E0B',
  },
  objetoLapizNaranja: {
    diffuseColor: '#FB923C',
  },
  objetoLapizPunta: {
    diffuseColor: '#111827',
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
  objetoGloboAzul: {
    diffuseColor: '#38BDF8',
  },
  objetoGloboBase: {
    diffuseColor: '#64748B',
  },
  objetoTextoOscuro: {
    diffuseColor: '#102A43',
  },
});

const RADIO_TOQUE_OBJETO = 0.24;

const formatearSegundos = (milisegundos) =>
  `${Math.ceil(Math.max(0, milisegundos) / 1000)} s`;

const obtenerMetricaOficial = (respuestaFinalizacionSesion, clave, respaldo) =>
  respuestaFinalizacionSesion?.resumen_oficial?.[clave] ?? respaldo;

const calcularYawDesdeCamara = (cameraTransform) => {
  const forward = cameraTransform?.forward ?? cameraTransform?.cameraTransform?.forward;

  if (!Array.isArray(forward)) {
    return null;
  }

  const [x = 0, , z = -1] = forward;
  return Math.atan2(x, -z);
};

const calcularIndiceDireccion = (yaw) => {
  if (!Number.isFinite(yaw)) {
    return null;
  }

  const normalizado = yaw < 0 ? yaw + Math.PI * 2 : yaw;
  return Math.floor((normalizado / (Math.PI * 2)) * 12);
};

const escaneoCompleto = (inicioEscaneo, direccionesEscaneadas) => {
  const tiempoEscaneo = inicioEscaneo ? Date.now() - inicioEscaneo : 0;
  return (
    tiempoEscaneo >= TIEMPO_ESCANEO_MINIMO_MS &&
    direccionesEscaneadas.size >= MUESTRAS_DIRECCION_NECESARIAS
  );
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
  const factorActivo = activo ? 1.08 : 1;
  const escalaFigura = objeto.escalaFigura ?? 1;
  return 0.2 * escalaBase * escalaFigura * factorActivo;
};

function Objeto3D({ objeto, activo, escalaBase, onSeleccionarObjeto }) {
  const escala = escalaObjeto(objeto, escalaBase, activo);
  const material = activo ? 'objetoPerdidoPista' : objeto.material;
  const click = () => onSeleccionarObjeto?.(objeto.id);

  return (
    <ViroNode position={objeto.posicion}>
      <ViroSphere
        position={[0, 0, 0]}
        radius={RADIO_TOQUE_OBJETO}
        materials={['objetoPerdidoPista']}
        opacity={0.01}
        onClick={click}
      />
      {activo ? (
        <ViroSphere
          position={[0, 0, 0]}
          radius={RADIO_TOQUE_OBJETO * 0.72}
          materials={['objetoPerdidoPista']}
          opacity={0.16}
        />
      ) : null}
      <FiguraObjeto objeto={objeto} material={material} escala={escala} onClick={click} />
      <EtiquetaObjeto objeto={objeto} />
    </ViroNode>
  );
}

function FiguraObjeto({ objeto, material, escala, onClick }) {
  if (objeto.tipo3d === 'manzana') {
    return (
      <ViroNode>
        <ViroSphere radius={escala} materials={[material]} onClick={onClick} />
        <ViroBox
          position={[escala * 0.72, escala * 0.25, 0]}
          scale={[escala * 0.32, escala * 0.18, escala * 0.16]}
          materials={['objetoManzanaHoja']}
          onClick={onClick}
        />
      </ViroNode>
    );
  }

  if (objeto.tipo3d === 'oso-simple') {
    return (
      <ViroNode>
        <ViroSphere position={[0, escala * 0.16, 0]} radius={escala * 0.78} materials={[material]} onClick={onClick} />
        <ViroSphere position={[-escala * 0.46, escala * 0.86, 0]} radius={escala * 0.28} materials={[material]} onClick={onClick} />
        <ViroSphere position={[escala * 0.46, escala * 0.86, 0]} radius={escala * 0.28} materials={[material]} onClick={onClick} />
        <ViroSphere position={[0, escala * 0.12, -escala * 0.46]} radius={escala * 0.26} materials={['objetoOsoClaro']} onClick={onClick} />
      </ViroNode>
    );
  }

  if (objeto.tipo3d === 'libro') {
    return (
      <ViroNode>
        <ViroBox
          position={[0, 0, 0]}
          scale={[escala * 1.45, escala * 0.18, escala * 1.0]}
          materials={[material]}
          onClick={onClick}
        />
        <ViroBox
          position={[0, escala * 0.11, -escala * 0.08]}
          scale={[escala * 1.2, escala * 0.035, escala * 0.72]}
          materials={['objetoLibroPaginas']}
          onClick={onClick}
        />
      </ViroNode>
    );
  }

  if (objeto.tipo3d === 'lapiz') {
    return (
      <ViroNode rotation={[0, 0, -24]}>
        <ViroBox
          position={[0, 0, 0]}
          scale={[escala * 1.8, escala * 0.18, escala * 0.18]}
          materials={[material]}
          onClick={onClick}
        />
        <ViroBox
          position={[escala * 1.02, 0, 0]}
          scale={[escala * 0.24, escala * 0.14, escala * 0.14]}
          materials={['objetoLapizPunta']}
          onClick={onClick}
        />
      </ViroNode>
    );
  }

  if (objeto.tipo3d === 'globo') {
    return (
      <ViroNode>
        <ViroSphere position={[0, escala * 0.18, 0]} radius={escala * 0.82} materials={[material]} onClick={onClick} />
        <ViroBox
          position={[0, -escala * 0.58, 0]}
          scale={[escala * 0.16, escala * 0.72, escala * 0.16]}
          materials={['objetoGloboBase']}
          onClick={onClick}
        />
      </ViroNode>
    );
  }

  return (
    <ViroBox
      position={[0, 0, 0]}
      scale={[escala, escala, escala]}
      materials={[material]}
      onClick={onClick}
    />
  );
}

function EtiquetaObjeto({ objeto }) {
  return (
    <ViroText
      text={objeto.etiqueta}
      position={[0, objeto.etiquetaOffsetY ?? 0.18, 0]}
      scale={[0.038, 0.038, 0.038]}
      width={0.8}
      height={0.22}
      style={stylesViro.textoObjeto}
      materials={['objetoTextoOscuro']}
    />
  );
}

function LimitesZonaBusqueda({ zona }) {
  const radio = zona?.radioMaximo ?? 3.8;
  const alturaMinima = zona?.alturaMinima ?? -1.05;
  const alturaMaxima = zona?.alturaMaxima ?? -0.3;
  const grosor = 0.008;
  const largoMarcador = 0.52;
  const yGuia = alturaMinima + (alturaMaxima - alturaMinima) * 0.5;
  const esquinas = [
    [-radio, yGuia, -radio],
    [radio, yGuia, -radio],
    [-radio, yGuia, radio],
    [radio, yGuia, radio],
  ];

  return (
    <ViroNode>
      <ViroBox
        position={[0, yGuia, -radio]}
        scale={[radio * 2, grosor, grosor]}
        materials={['objetoPerdidoLinea']}
      />
      <ViroBox
        position={[0, yGuia, radio]}
        scale={[radio * 2, grosor, grosor]}
        materials={['objetoPerdidoLineaLejana']}
      />
      <ViroBox
        position={[-radio, yGuia, 0]}
        scale={[grosor, grosor, radio * 2]}
        materials={['objetoPerdidoLinea']}
      />
      <ViroBox
        position={[radio, yGuia, 0]}
        scale={[grosor, grosor, radio * 2]}
        materials={['objetoPerdidoLinea']}
      />
      {esquinas.map(([x, y, z], indice) => (
        <ViroNode key={`esquina-${indice}`} position={[x, y, z]}>
          <ViroBox
            position={[x < 0 ? largoMarcador / 2 : -largoMarcador / 2, 0, 0]}
            scale={[largoMarcador, grosor, grosor]}
            materials={['objetoPerdidoLinea']}
          />
          <ViroBox
            position={[0, 0, z < 0 ? largoMarcador / 2 : -largoMarcador / 2]}
            scale={[grosor, grosor, largoMarcador]}
            materials={['objetoPerdidoLinea']}
          />
        </ViroNode>
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
  const objetosVisibles =
    estado.fase === ESTADOS_OBJETO_PERDIDO_AR.jugando ||
    estado.fase === ESTADOS_OBJETO_PERDIDO_AR.rondaCompletada ||
    estado.fase === ESTADOS_OBJETO_PERDIDO_AR.completado;

  return (
    <ViroNode>
      <LimitesZonaBusqueda zona={configuracion.configuracion.zonaBusqueda} />

      {objetosVisibles ? objetos.map((objeto) => (
        <Objeto3D
          key={objeto.id}
          objeto={objeto}
          activo={estado.objetoActivoId === objeto.id}
          escalaBase={configuracion.configuracion.escalaObjeto}
          onSeleccionarObjeto={onSeleccionarObjeto}
        />
      )) : null}
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
    onCameraTransformUpdate,
    mostrarZonaBusqueda,
    posicionZonaBusqueda,
  } = viroAppProps;

  const objetos = estado.rondaActual?.objetos ?? [];

  return (
    <ViroARScene
      onCameraTransformUpdate={onCameraTransformUpdate}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={520} />
      <ViroDirectionalLight
        color="#FFFFFF"
        direction={[0, -1, -0.3]}
        castsShadow={false}
        intensity={900}
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
  marcarEscaneandoZona,
  marcarZonaIdentificada,
  seleccionarObjeto,
  usarPista,
  iniciarCuentaRegresivaRonda,
  continuarSiguienteRonda,
  puedePedirPista,
  preparandoPartida,
  persistenciaSesion,
  respuestaFinalizacionSesion,
}) {
  const insets = useSafeAreaInsets();
  const [zonaDisponible, setZonaDisponible] = useState(false);
  const [escaneoIniciado, setEscaneoIniciado] = useState(false);
  const [progresoEscaneo, setProgresoEscaneo] = useState(0);
  const [modoColocacion, setModoColocacion] = useState('envolvente-360');
  const [posicionZonaBusqueda, setPosicionZonaBusqueda] = useState(POSICION_ZONA_RESPALDO);
  const zonaDisponibleRef = useRef(false);
  const ultimaCamaraRef = useRef(null);
  const direccionesEscaneadasRef = useRef(new Set());
  const inicioEscaneoRef = useRef(null);
  const mostrarZonaBusqueda = zonaDisponible && FASES_ZONA_VISIBLE.has(estado.fase);

  const registrarTransformCamara = useCallback((cameraTransform) => {
    ultimaCamaraRef.current = cameraTransform;

    if (!escaneoIniciado || zonaDisponibleRef.current) {
      return;
    }

    const indiceDireccion = calcularIndiceDireccion(calcularYawDesdeCamara(cameraTransform));

    if (indiceDireccion != null) {
      direccionesEscaneadasRef.current.add(indiceDireccion);
    }

    const tiempoEscaneo = inicioEscaneoRef.current ? Date.now() - inicioEscaneoRef.current : 0;
    const progresoPorTiempo = Math.min(45, Math.round((tiempoEscaneo / TIEMPO_ESCANEO_MINIMO_MS) * 45));
    const progresoPorDirecciones = Math.min(
      55,
      Math.round((direccionesEscaneadasRef.current.size / MUESTRAS_DIRECCION_NECESARIAS) * 55),
    );
    const siguienteProgreso = Math.min(100, progresoPorTiempo + progresoPorDirecciones);
    setProgresoEscaneo((previo) => Math.max(previo, siguienteProgreso));

    if (escaneoCompleto(inicioEscaneoRef.current, direccionesEscaneadasRef.current)) {
      setPosicionZonaBusqueda(POSICION_ZONA_RESPALDO);
      zonaDisponibleRef.current = true;
      setZonaDisponible(true);
      setProgresoEscaneo(100);
      marcarZonaIdentificada();
    }
  }, [escaneoIniciado, marcarZonaIdentificada]);

  const iniciarEscaneo = () => {
    direccionesEscaneadasRef.current = new Set();
    inicioEscaneoRef.current = Date.now();
    zonaDisponibleRef.current = false;
    setZonaDisponible(false);
    setProgresoEscaneo(0);
    setEscaneoIniciado(true);
    setModoColocacion('envolvente-360');
    marcarEscaneandoZona();
  };

  const iniciar = () =>
    iniciarActividad({
      tableroDisponible: () => zonaDisponibleRef.current,
    });

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
              : escaneoIniciado
                ? 'Gira despacio para reconocer el lugar donde vas a buscar.'
                : 'Parate en un lugar seguro. Cuando estes listo, inicia el escaneo.'
          }
          fase={estado.fase}
        />

        {!resultadoVisible && !rondaCompletadaVisible ? (
          <View style={styles.panelAccion}>
            {!zonaDisponible ? (
              escaneoIniciado ? (
                <View style={styles.estadoPlano}>
                  <ActivityIndicator color="#38BDF8" />
                  <Text style={styles.estadoPlanoTexto}>
                    Escaneando zona... {progresoEscaneo}%
                  </Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.botonPrincipal} onPress={iniciarEscaneo}>
                  <Ionicons name="scan" size={18} color="#14314F" />
                  <Text style={styles.botonPrincipalTexto}>Iniciar escaneo</Text>
                </TouchableOpacity>
              )
            ) : estado.fase === ESTADOS_OBJETO_PERDIDO_AR.jugando ? (
              <Text style={styles.estadoPlanoTexto}>Explora la zona y toca el objeto correcto.</Text>
            ) : estado.fase === ESTADOS_OBJETO_PERDIDO_AR.mostrandoMision ? (
              <TouchableOpacity style={styles.botonPrincipal} onPress={iniciarCuentaRegresivaRonda}>
                <Ionicons name="play" size={18} color="#14314F" />
                <Text style={styles.botonPrincipalTexto}>Estoy listo</Text>
              </TouchableOpacity>
            ) : estado.fase === ESTADOS_OBJETO_PERDIDO_AR.cuentaRegresiva ? (
              <Text style={styles.estadoPlanoTexto}>Los objetos apareceran cuando termine la cuenta.</Text>
            ) : (
              <TouchableOpacity
                style={[styles.botonPrincipal, preparandoPartida && styles.botonPrincipalDisabled]}
                onPress={iniciar}
                disabled={preparandoPartida}
              >
                {preparandoPartida ? <ActivityIndicator color="#14314F" /> : null}
                <Text style={styles.botonPrincipalTexto}>
                  {preparandoPartida ? 'Preparando' : 'Jugar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </SafeAreaView>

      {estado.fase === ESTADOS_OBJETO_PERDIDO_AR.cuentaRegresiva ? (
        <View pointerEvents="none" style={styles.cuentaRegresivaCapa}>
          <Text style={styles.cuentaRegresivaTexto}>{estado.cuentaRegresiva}</Text>
        </View>
      ) : null}

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
  cuentaRegresivaCapa: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.22)',
    justifyContent: 'center',
  },
  cuentaRegresivaTexto: {
    color: '#FDE68A',
    fontSize: 96,
    fontWeight: '900',
    textShadowColor: 'rgba(15, 23, 42, 0.86)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 18,
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
