import React, { useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TIPOS_EVENTO_SESION } from '../core/contratoSesionJuego';
import { useSesionTren3D } from './aplicacion/useSesionTren3D';
import {
  calcularAdaptacionInterNivel,
  generarPatronNivel,
  normalizarConfiguracionTren3D,
  obtenerParametrosDificultad,
} from './tren3dConfiguracion';
import {
  calcularPuntaje,
  construirEventoTren3D,
  construirResumenPartidaTren3D,
} from './tren3dMotor';
import { ESTADOS_TREN_3D } from './tren3d.constants';
import Tren3DVistaWebView from './presentacion/Tren3DVistaWebView';
import { colores, espaciado, radios, tipografia } from '../../../theme/tokens';

const construirParametrosNivel = ({ dificultad, configuracion }) => {
  const params = obtenerParametrosDificultad(dificultad);

  return {
    dificultad,
    velocidadTren: params.velocidadTren,
    patron: generarPatronNivel(dificultad, configuracion.vagonesPorNivel),
  };
};

const inyectarNuevoNivel = ({ webViewRef, parametros }) => {
  const script = `
    window.iniciarNuevoNivel && window.iniciarNuevoNivel(${JSON.stringify(parametros)});
    true;
  `;

  webViewRef.current?.injectJavaScript(script);
};

const FiguraPatron = ({ paso, completado }) => {
  const figuraStyle = [
    styles.figuraPatron,
    { backgroundColor: paso.colorHex },
    paso.figuraId === 'circulo' && styles.figuraCirculo,
    paso.figuraId === 'triangulo' && styles.figuraTriangulo,
    paso.figuraId === 'triangulo' && { borderBottomColor: paso.colorHex },
    paso.figuraId === 'estrella' && styles.figuraEstrella,
    completado && styles.figuraCompletada,
  ];

  return (
    <View style={styles.itemPatron}>
      <View style={figuraStyle} />
      <Text style={styles.itemPatronTexto}>{paso.posicion + 1}</Text>
    </View>
  );
};

export default function Tren3DScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const configuracion = useMemo(
    () => normalizarConfiguracionTren3D(configuracionInicial),
    [configuracionInicial],
  );
  const webViewRef = useRef(null);
  const inicioPartidaRef = useRef(Date.now());
  const acumuladoRef = useRef({
    aciertos: 0,
    errores: 0,
    comboMaximo: 0,
    tiempoTotalMs: 0,
  });
  const nivelRef = useRef(1);
  const dificultadRef = useRef(configuracion.dificultad);
  const partidaIniciadaRef = useRef(false);
  const finalizadoRef = useRef(false);

  const parametrosIniciales = useMemo(
    () =>
      construirParametrosNivel({
        dificultad: configuracion.dificultad,
        configuracion,
      }),
    [configuracion],
  );

  const sesionTren = useSesionTren3D({
    configuracion,
    contextoSesion,
  });

  const [estado, setEstado] = useState({
    fase: ESTADOS_TREN_3D.esperando,
    nivel: 1,
    dificultad: configuracion.dificultad,
    aciertos: 0,
    errores: 0,
    comboMaximo: 0,
    puntaje: 0,
    patronActual: parametrosIniciales.patron,
    vagonesCompletados: 0,
    vagonesResueltos: [],
    mensaje: 'Toca una figura y luego el vagon que quieres completar.',
    resultado: null,
    seleccionClave: null,
  });

  const opcionesUnicas = useMemo(() => {
    const mapa = {};
    estado.patronActual.forEach((paso) => {
      mapa[paso.clave] = paso;
    });
    return Object.values(mapa);
  }, [estado.patronActual]);

  const seleccionarFiguraNativa = (paso) => {
    const script = `
      window.establecerSeleccion && window.establecerSeleccion(${JSON.stringify(paso)});
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
    setEstado((previo) => ({
      ...previo,
      seleccionClave: paso.clave,
      mensaje: 'Figura lista. Toca el vagon que tenga esa figura.',
    }));
  };

  const finalizarPartida = ({ estadoFinal = 'completado' } = {}) => {
    if (finalizadoRef.current) {
      return;
    }

    finalizadoRef.current = true;
    const acumulado = acumuladoRef.current;
    const resultado = construirResumenPartidaTren3D({
      configuracion,
      aciertos: acumulado.aciertos,
      errores: acumulado.errores,
      comboMaximo: acumulado.comboMaximo,
      nivelAlcanzado: nivelRef.current,
      tiempoTotalMs: Date.now() - inicioPartidaRef.current,
      dificultadFinal: dificultadRef.current,
      estado: estadoFinal,
    });

    sesionTren.observadoresJuego.alFinalizarPartida(resultado);
    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_TREN_3D.finalizado,
      puntaje: resultado.estadisticas.puntaje,
      resultado,
      mensaje: 'Partida finalizada. Buen trabajo con los patrones.',
    }));
  };

  const registrarJugada = (mensaje) => {
    const tipoEvento =
      mensaje.tipo === 'acierto'
        ? TIPOS_EVENTO_SESION.acierto
        : TIPOS_EVENTO_SESION.error;
    const evento = construirEventoTren3D({
      tipoEvento,
      tiempoReaccionMs: mensaje.tiempoReaccionMs,
      puntos: mensaje.puntos,
      comboEnEvento: mensaje.comboEnEvento,
      metadata: {
        vagonIndex: mensaje.vagonIndex,
        figuraSolicitada: mensaje.figuraSolicitada,
        colorSolicitado: mensaje.colorSolicitado,
        figuraIngresada: mensaje.figuraIngresada,
        colorIngresado: mensaje.colorIngresado,
      },
    });

    sesionTren.observadoresJuego.alRegistrarEvento(evento);

    acumuladoRef.current = {
      ...acumuladoRef.current,
      aciertos:
        acumuladoRef.current.aciertos + (mensaje.tipo === 'acierto' ? 1 : 0),
      errores: acumuladoRef.current.errores + (mensaje.tipo === 'error' ? 1 : 0),
      comboMaximo: Math.max(acumuladoRef.current.comboMaximo, mensaje.comboEnEvento ?? 0),
    };

    setEstado((previo) => {
      const aciertos = previo.aciertos + (mensaje.tipo === 'acierto' ? 1 : 0);
      const errores = previo.errores + (mensaje.tipo === 'error' ? 1 : 0);
      const vagonesResueltos =
        mensaje.tipo === 'acierto'
          ? [...new Set([...previo.vagonesResueltos, mensaje.vagonIndex])]
          : previo.vagonesResueltos;

      return {
        ...previo,
        fase: ESTADOS_TREN_3D.jugando,
        aciertos,
        errores,
        comboMaximo: Math.max(previo.comboMaximo, mensaje.comboEnEvento ?? 0),
        puntaje: calcularPuntaje({ aciertos, errores }),
        vagonesCompletados: vagonesResueltos.length,
        vagonesResueltos,
        mensaje:
          mensaje.tipo === 'acierto'
            ? 'Correcto. Puedes elegir otra figura y otro vagon.'
            : 'Ese vagon no corresponde. Mira el patron e intenta otra vez.',
        seleccionClave: null,
      };
    });
  };

  const completarNivel = (mensaje) => {
    acumuladoRef.current = {
      ...acumuladoRef.current,
      tiempoTotalMs: acumuladoRef.current.tiempoTotalMs + (mensaje.tiempoNivelMs ?? 0),
      comboMaximo: Math.max(acumuladoRef.current.comboMaximo, mensaje.comboMaximo ?? 0),
    };

    if (nivelRef.current >= configuracion.nivelesPorPartida) {
      finalizarPartida();
      return;
    }

    const adaptacion = calcularAdaptacionInterNivel({
      aciertos: mensaje.aciertos,
      errores: mensaje.errores,
      dificultadActual: dificultadRef.current,
    });
    const siguienteNivel = nivelRef.current + 1;
    const parametros = {
      dificultad: adaptacion.nuevaDificultad,
      velocidadTren: adaptacion.nuevaVelocidad,
      patron: generarPatronNivel(adaptacion.nuevaDificultad, configuracion.vagonesPorNivel),
    };

    nivelRef.current = siguienteNivel;
    dificultadRef.current = adaptacion.nuevaDificultad;

    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_TREN_3D.transicionNivel,
      nivel: siguienteNivel,
      dificultad: adaptacion.nuevaDificultad,
      patronActual: parametros.patron,
      vagonesCompletados: 0,
      vagonesResueltos: [],
      seleccionClave: null,
      mensaje: `${adaptacion.descripcionNivel}. Precision: ${adaptacion.precisionPct}%.`,
    }));

    setTimeout(() => {
      inyectarNuevoNivel({ webViewRef, parametros });
      setEstado((previo) => ({
        ...previo,
        fase: ESTADOS_TREN_3D.jugando,
      }));
    }, 2500);
  };

  const manejarMensaje = (eventoWebView) => {
    let mensaje;

    try {
      mensaje = JSON.parse(eventoWebView.nativeEvent.data);
    } catch {
      return;
    }

    if (mensaje.tipo === 'motorListo') {
      partidaIniciadaRef.current = true;
      sesionTren.observadoresJuego.alIniciarPartida({
        configuracionPartida: configuracion,
      });
      setEstado((previo) => ({
        ...previo,
        fase: ESTADOS_TREN_3D.jugando,
        mensaje: 'Elige una figura de abajo y toca el vagon correcto.',
      }));
      return;
    }

    if (mensaje.tipo === 'acierto' || mensaje.tipo === 'error') {
      registrarJugada(mensaje);
      return;
    }

    if (mensaje.tipo === 'nivelCompletado') {
      completarNivel(mensaje);
      return;
    }

    if (mensaje.tipo === 'seleccionActualizada') {
      setEstado((previo) => ({
        ...previo,
        seleccionClave: mensaje.clave,
      }));
      return;
    }

    if (mensaje.tipo === 'errorMotor') {
      setEstado((previo) => ({
        ...previo,
        mensaje: mensaje.mensaje ?? 'No fue posible cargar el motor 3D.',
      }));
    }
  };

  const salir = () => {
    if (!finalizadoRef.current && partidaIniciadaRef.current) {
      finalizarPartida({ estadoFinal: 'abandonado' });
    }

    onSalir?.();
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <Tren3DVistaWebView
        webViewRef={webViewRef}
        onMensaje={manejarMensaje}
        parametrosIniciales={parametrosIniciales}
      />

      <View style={styles.barraSuperior}>
        <View>
          <Text style={styles.titulo}>Tren 3D de Patrones</Text>
          <Text style={styles.subtitulo}>{estado.mensaje}</Text>
        </View>
        <TouchableOpacity style={styles.botonSalir} onPress={salir}>
          <Text style={styles.botonSalirTexto}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.barraPatron}>
        <Text style={styles.barraPatronTitulo}>Patron del nivel</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listaPatron}
        >
          {estado.patronActual.map((paso) => (
            <FiguraPatron
              key={`${paso.posicion}-${paso.clave}`}
              paso={paso}
              completado={estado.vagonesResueltos.includes(paso.posicion)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Selector nativo horizontal opcional para accesibilidad */}
      <View style={styles.barraBotones}>
        {opcionesUnicas.map((opcion) => (
          <TouchableOpacity
            key={opcion.clave}
            activeOpacity={0.8}
            disabled={estado.fase !== ESTADOS_TREN_3D.jugando}
            style={[
              styles.botonNativo,
              { backgroundColor: opcion.colorHex },
              estado.seleccionClave === opcion.clave && styles.botonNativoActivo,
              estado.fase !== ESTADOS_TREN_3D.jugando && { opacity: 0.5 }
            ]}
            onPress={() => seleccionarFiguraNativa(opcion)}
          >
            <View
              style={[
                styles.figuraBoton,
                opcion.figuraId === 'circulo' && styles.figuraBotonCirculo,
                opcion.figuraId === 'triangulo' && styles.figuraBotonTriangulo,
                opcion.figuraId === 'triangulo' && { borderBottomColor: opcion.colorHex },
                opcion.figuraId === 'estrella' && styles.figuraBotonEstrella,
              ]}
            />
            <Text style={styles.botonNativoTexto}>{opcion.figuraLabel}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.panelMetricas}>
        <View style={styles.metrica}>
          <Text style={styles.metricaValor}>{estado.nivel}/{configuracion.nivelesPorPartida}</Text>
          <Text style={styles.metricaLabel}>Nivel</Text>
        </View>
        <View style={styles.metrica}>
          <Text style={styles.metricaValor}>{estado.dificultad}</Text>
          <Text style={styles.metricaLabel}>Dificultad</Text>
        </View>
        <View style={styles.metrica}>
          <Text style={styles.metricaValor}>{estado.aciertos}</Text>
          <Text style={styles.metricaLabel}>Aciertos</Text>
        </View>
        <View style={styles.metrica}>
          <Text style={styles.metricaValor}>{estado.errores}</Text>
          <Text style={styles.metricaLabel}>Errores</Text>
        </View>
        <View style={styles.metrica}>
          <Text style={styles.metricaValor}>{estado.puntaje}</Text>
          <Text style={styles.metricaLabel}>Puntos</Text>
        </View>
      </View>

      {estado.resultado ? (
        <View style={styles.resultado}>
          <Text style={styles.resultadoTitulo}>Resultado</Text>
          <Text style={styles.resultadoTexto}>
            Puntaje {estado.resultado.estadisticas.puntaje} - Precision {estado.resultado.estadisticas.precisionPct}%
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#06131f',
  },
  barraSuperior: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(7,28,43,0.86)',
    borderColor: 'rgba(130,215,255,0.42)',
    borderWidth: 1,
    borderRadius: radios.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  titulo: {
    color: colores.textoPrincipal,
    fontSize: tipografia.subtitulo,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.textoSecundario,
    lineHeight: 19,
    maxWidth: 238,
  },
  botonSalir: {
    backgroundColor: colores.alerta,
    borderRadius: radios.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  botonSalirTexto: {
    color: '#06131f',
    fontWeight: '900',
  },
  barraPatron: {
    position: 'absolute',
    top: 122,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,216,107,0.72)',
    borderWidth: 2,
    borderRadius: radios.md,
    padding: 10,
  },
  barraPatronTitulo: {
    color: '#15344d',
    fontSize: tipografia.etiqueta,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  listaPatron: {
    gap: 8,
    paddingRight: 4,
  },
  itemPatron: {
    width: 42,
    height: 52,
    borderRadius: radios.md,
    backgroundColor: '#eaf7ff',
    borderColor: 'rgba(21,52,77,0.14)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  figuraPatron: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(21,52,77,0.18)',
  },
  figuraCirculo: {
    borderRadius: 999,
  },
  figuraTriangulo: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#18C47A',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  figuraEstrella: {
    transform: [{ rotate: '45deg' }],
  },
  figuraCompletada: {
    opacity: 0.28,
  },
  itemPatronTexto: {
    color: '#15344d',
    fontSize: 10,
    fontWeight: '900',
  },
  panelMetricas: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    gap: 8,
  },
  metrica: {
    flex: 1,
    backgroundColor: 'rgba(7,28,43,0.9)',
    borderColor: 'rgba(255,216,107,0.42)',
    borderWidth: 1,
    borderRadius: radios.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  metricaValor: {
    color: colores.alerta,
    fontWeight: '900',
    fontSize: 17,
  },
  metricaLabel: {
    color: colores.textoSecundario,
    fontSize: tipografia.etiqueta,
    fontWeight: '800',
  },
  resultado: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '42%',
    backgroundColor: 'rgba(6,19,31,0.94)',
    borderColor: colores.exito,
    borderWidth: 1,
    borderRadius: radios.md,
    padding: espaciado.lg,
    alignItems: 'center',
  },
  resultadoTitulo: {
    color: colores.textoPrincipal,
    fontSize: 22,
    fontWeight: '900',
  },
  resultadoTexto: {
    color: colores.textoSecundario,
    marginTop: 6,
  },
  barraBotones: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 92,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 10,
    backgroundColor: 'rgba(7,28,43,0.85)',
    borderColor: 'rgba(130,215,255,0.3)',
    borderWidth: 1,
    borderRadius: radios.md,
  },
  botonNativo: {
    flex: 1,
    maxWidth: 96,
    minHeight: 68,
    borderRadius: radios.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  botonNativoActivo: {
    transform: [{ translateY: -4 }],
    borderColor: '#ffffff',
    borderWidth: 4,
  },
  figuraBoton: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: 'rgba(6,19,31,0.86)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  figuraBotonCirculo: {
    borderRadius: 999,
  },
  figuraBotonTriangulo: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(6,19,31,0.86)',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  figuraBotonEstrella: {
    transform: [{ rotate: '45deg' }],
  },
  botonNativoTexto: {
    color: '#06131f',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
});

