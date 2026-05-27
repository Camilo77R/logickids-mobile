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
import { useSesionTrenFiguras } from './aplicacion/useSesionTrenFiguras';
import {
  calcularAdaptacionInterNivel,
  generarPatronNivel,
  normalizarConfiguracionTrenFiguras,
  obtenerParametrosDificultad,
} from './trenFigurasConfiguracion';
import {
  calcularPuntaje,
  construirEventoTrenFiguras,
  construirResumenPartidaTren,
} from './trenFigurasMotor';
import { ESTADOS_TREN_FIGURAS } from './trenFiguras.constants';
import TrenFigurasVistaWebView from './presentacion/TrenFigurasVistaWebView';
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

export default function TrenFigurasScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const configuracion = useMemo(
    () => normalizarConfiguracionTrenFiguras(configuracionInicial),
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
  const finalizadoRef = useRef(false);

  const parametrosIniciales = useMemo(
    () =>
      construirParametrosNivel({
        dificultad: configuracion.dificultad,
        configuracion,
      }),
    [configuracion],
  );

  const sesionTren = useSesionTrenFiguras({
    configuracion,
    contextoSesion,
  });

  const [estado, setEstado] = useState({
    fase: ESTADOS_TREN_FIGURAS.esperando,
    nivel: 1,
    dificultad: configuracion.dificultad,
    aciertos: 0,
    errores: 0,
    comboMaximo: 0,
    puntaje: 0,
    patronActual: parametrosIniciales.patron,
    vagonesCompletados: 0,
    mensaje: 'Toca una figura y luego el vagon que quieres completar.',
    resultado: null,
  });

  const finalizarPartida = ({ estadoFinal = 'completado' } = {}) => {
    if (finalizadoRef.current) {
      return;
    }

    finalizadoRef.current = true;
    const acumulado = acumuladoRef.current;
    const resultado = construirResumenPartidaTren({
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
      fase: ESTADOS_TREN_FIGURAS.finalizado,
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
    const evento = construirEventoTrenFiguras({
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

      return {
        ...previo,
        fase: ESTADOS_TREN_FIGURAS.jugando,
        aciertos,
        errores,
        comboMaximo: Math.max(previo.comboMaximo, mensaje.comboEnEvento ?? 0),
        puntaje: calcularPuntaje({ aciertos, errores }),
        vagonesCompletados:
          mensaje.tipo === 'acierto'
            ? Math.min(previo.vagonesCompletados + 1, previo.patronActual.length)
            : previo.vagonesCompletados,
        mensaje:
          mensaje.tipo === 'acierto'
            ? 'Correcto. Sigue el siguiente vagon del patron.'
            : 'Mira la barra de patron y vuelve a intentarlo.',
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
      fase: ESTADOS_TREN_FIGURAS.transicionNivel,
      nivel: siguienteNivel,
      dificultad: adaptacion.nuevaDificultad,
      patronActual: parametros.patron,
      vagonesCompletados: 0,
      mensaje: `${adaptacion.descripcionNivel}. Precision: ${adaptacion.precisionPct}%.`,
    }));

    setTimeout(() => inyectarNuevoNivel({ webViewRef, parametros }), 700);
  };

  const manejarMensaje = (eventoWebView) => {
    let mensaje;

    try {
      mensaje = JSON.parse(eventoWebView.nativeEvent.data);
    } catch {
      return;
    }

    if (mensaje.tipo === 'motorListo') {
      sesionTren.observadoresJuego.alIniciarPartida({
        configuracionPartida: configuracion,
      });
      setEstado((previo) => ({
        ...previo,
        fase: ESTADOS_TREN_FIGURAS.jugando,
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

    if (mensaje.tipo === 'errorMotor') {
      setEstado((previo) => ({
        ...previo,
        mensaje: mensaje.mensaje ?? 'No fue posible cargar el motor 3D.',
      }));
    }
  };

  const salir = () => {
    if (!finalizadoRef.current && acumuladoRef.current.aciertos + acumuladoRef.current.errores > 0) {
      finalizarPartida({ estadoFinal: 'abandonado' });
    }

    onSalir?.();
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <TrenFigurasVistaWebView
        webViewRef={webViewRef}
        onMensaje={manejarMensaje}
        parametrosIniciales={parametrosIniciales}
      />

      <View style={styles.barraSuperior}>
        <View>
          <Text style={styles.titulo}>Tren de Figuras</Text>
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
              completado={paso.posicion < estado.vagonesCompletados}
            />
          ))}
        </ScrollView>
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
});
