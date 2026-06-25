import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { TIPOS_EVENTO_SESION } from '../core/contratoSesionJuego';
import { useSesionTren3D } from './aplicacion/useSesionTren3D';
import {
  calcularAdaptacionInterNivel,
  generarPatronNivel,
  normalizarConfiguracionTren3D,
  obtenerParametrosDificultad,
  resolverConfiguracionTren3DDesdeBackend,
} from './tren3dConfiguracion';
import {
  calcularPuntaje,
  construirEventoTren3D,
  construirResumenPartidaTren3D,
} from './tren3dMotor';
import { ESTADOS_TREN_3D } from './tren3d.constants';
import Tren3DVistaWebView from './presentacion/Tren3DVistaWebView';
import { useTren3DAudio } from './useTren3DAudio';
import { colores, espaciado, radios, tipografia } from '../../../theme/tokens';

const fondoTrenInicio = require('../../../../assets/images/tren-3d/fondo-tren.avif');

const construirParametrosNivel = ({ dificultad, configuracion }) => {
  const parametrosBackend = configuracion.parametrosNivel;
  const params = parametrosBackend?.dificultad === dificultad
    ? parametrosBackend
    : obtenerParametrosDificultad(dificultad);

  return {
    dificultad,
    velocidadTren: params.velocidadTren,
    vueltasMaximas: params.vueltasMaximas,
    vagonesPorNivel: params.vagonesPorNivel ?? configuracion.vagonesPorNivel,
    maxOpcionesFiguras: params.maxOpcionesFiguras,
    opacidadFiguraGuia: params.opacidadFiguraGuia,
    patron: generarPatronNivel(
      dificultad,
      params.vagonesPorNivel ?? configuracion.vagonesPorNivel,
      params,
    ),
  };
};

const esFaseSeleccionable = (fase) => [
  ESTADOS_TREN_3D.esperando,
  ESTADOS_TREN_3D.jugando,
].includes(fase);

const inyectarNuevoNivel = ({ webViewRef, parametros }) => {
  const script = `
    window.iniciarNuevoNivel && window.iniciarNuevoNivel(${JSON.stringify(parametros)});
    true;
  `;

  webViewRef.current?.injectJavaScript(script);
};

const calcularPrecision = ({ aciertos = 0, errores = 0 }) => {
  const totalIntentos = aciertos + errores;

  if (totalIntentos <= 0) {
    return 0;
  }

  return Number(((aciertos / totalIntentos) * 100).toFixed(2));
};

const calcularEstrellasResultado = (resultado) => {
  const estrellasOficiales =
    resultado?.finalizacionSesion?.estrellas_obtenidas ??
    resultado?.resumen_oficial?.estrellas_obtenidas ??
    resultado?.estrellas_obtenidas;

  if (Number.isFinite(Number(estrellasOficiales))) {
    return Math.max(0, Math.min(3, Math.round(Number(estrellasOficiales))));
  }

  if (resultado?.finalizacionSesion?.estado === 'abandonado') {
    return 0;
  }

  const precision = resultado?.estadisticas?.precisionPct ?? calcularPrecision({
    aciertos: resultado?.estadisticas?.aciertos ?? 0,
    errores: resultado?.estadisticas?.errores ?? 0,
  });

  if (precision >= 90) return 3;
  if (precision >= 70) return 2;
  if (precision > 0) return 1;
  return 0;
};

const SIMBOLOS_FIGURA_PLANA = Object.freeze({
  triangulo: '▲',
  estrella: '★',
});

const ConfettiCelebracionTren = () => {
  const piezas = [
    { id: 'aqua-1', left: '8%', top: 18, color: colores.acento, rotate: '18deg' },
    { id: 'sol-1', left: '19%', top: 54, color: colores.alerta, rotate: '-12deg' },
    { id: 'verde-1', left: '34%', top: 24, color: colores.exito, rotate: '31deg' },
    { id: 'rosa-1', left: '56%', top: 16, color: colores.error, rotate: '-28deg' },
    { id: 'aqua-2', left: '72%', top: 52, color: colores.acento, rotate: '9deg' },
    { id: 'sol-2', left: '88%', top: 28, color: colores.alerta, rotate: '-18deg' },
    { id: 'verde-2', left: '13%', top: 132, color: colores.exito, rotate: '-38deg' },
    { id: 'rosa-2', left: '29%', top: 152, color: colores.error, rotate: '42deg' },
    { id: 'aqua-3', left: '47%', top: 118, color: colores.acento, rotate: '-8deg' },
    { id: 'sol-3', left: '64%', top: 142, color: colores.alerta, rotate: '35deg' },
    { id: 'verde-3', left: '82%', top: 118, color: colores.exito, rotate: '-44deg' },
  ];
  const animacionesRef = useRef(piezas.map(() => new Animated.Value(0)));

  useEffect(() => {
    const animaciones = animacionesRef.current.map((animacion, indice) => (
      Animated.loop(
        Animated.sequence([
          Animated.delay(indice * 90),
          Animated.timing(animacion, {
            toValue: 1,
            duration: 1450,
            useNativeDriver: true,
          }),
          Animated.timing(animacion, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      )
    ));

    animaciones.forEach((animacion) => animacion.start());

    return () => {
      animaciones.forEach((animacion) => animacion.stop());
    };
  }, []);

  return (
    <View pointerEvents="none" style={styles.confettiCapa}>
      {piezas.map((pieza, indice) => {
        const animacion = animacionesRef.current[indice];
        const caida = animacion.interpolate({
          inputRange: [0, 1],
          outputRange: [-32, 150],
        });
        const opacidad = animacion.interpolate({
          inputRange: [0, 0.16, 0.84, 1],
          outputRange: [0, 0.95, 0.95, 0],
        });
        const giro = animacion.interpolate({
          inputRange: [0, 1],
          outputRange: [pieza.rotate, '220deg'],
        });

        return (
          <Animated.View
          key={pieza.id}
          style={[
            styles.confettiPieza,
            {
              backgroundColor: pieza.color,
              left: pieza.left,
              top: pieza.top,
              opacity: opacidad,
              transform: [
                { translateY: caida },
                { rotate: giro },
              ],
            },
          ]}
          />
        );
      })}
    </View>
  );
};

const FiguraPatron = ({ paso, completado }) => {
  const simboloFigura = SIMBOLOS_FIGURA_PLANA[paso.figuraId];
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
      {simboloFigura ? (
        <Text
          style={[
            styles.figuraPatronSimbolo,
            { color: paso.colorHex },
            completado && styles.figuraCompletada,
          ]}
        >
          {simboloFigura}
        </Text>
      ) : (
        <View style={figuraStyle} />
      )}
      <Text style={styles.itemPatronTexto}>{paso.posicion + 1}</Text>
    </View>
  );
};

const TarjetaResultadoTren = ({
  tarjeta,
  sincronizando,
  onContinuar,
  onVolver,
  viewport,
}) => {
  if (!tarjeta) {
    return null;
  }

  const esTarjetaNivel = tarjeta.tipo === 'nivel';
  const esTarjetaFinal = tarjeta.tipo === 'final';
  const esPortraitFinal = esTarjetaFinal && (viewport?.height ?? 0) >= (viewport?.width ?? 999);
  const esCompacta = !esPortraitFinal && (
    (viewport?.height ?? 999) <= 430 || (viewport?.width ?? 999) <= 780
  );
  const esFinalCompacta = esTarjetaFinal && esCompacta;
  const estrellas = Array.from(
    { length: 3 },
    (_, indice) => indice < tarjeta.estrellas,
  );
  const metricasVisibles = esTarjetaNivel
    ? tarjeta.metricas.slice(0, 4)
    : tarjeta.metricas.filter((metrica) => (
      ['Aciertos', 'Precision', 'Puntos', 'Nivel'].includes(metrica.etiqueta)
    ));
  const logrosVisibles = tarjeta.logros;

  return (
    <View style={styles.resultadoOverlay}>
      {tarjeta.mostrarCelebracion ? <ConfettiCelebracionTren /> : null}

      <View pointerEvents="none" style={styles.resultadoDecoracion}>
        <View style={[styles.resultadoBurbujaFondo, styles.resultadoBurbujaAqua]} />
        <View style={[styles.resultadoBurbujaFondo, styles.resultadoBurbujaSol]} />
        <View style={[styles.resultadoBurbujaFondo, styles.resultadoBurbujaRosa]} />
        <Text style={[styles.resultadoIconoFondo, styles.resultadoIconoUno]}>*</Text>
        <Text style={[styles.resultadoIconoFondo, styles.resultadoIconoDos]}>+</Text>
        <Text style={[styles.resultadoIconoFondo, styles.resultadoIconoTres]}>o</Text>
      </View>

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={esPortraitFinal}
        contentContainerStyle={[
          styles.panelResultadoContenido,
          esTarjetaNivel && styles.panelResultadoContenidoNivel,
          esTarjetaFinal && styles.panelResultadoContenidoFinal,
          esPortraitFinal && styles.panelResultadoContenidoFinalPortrait,
          esCompacta && styles.panelResultadoContenidoCompacto,
          esFinalCompacta && styles.panelResultadoContenidoFinalCompacto,
        ]}
      >
        <View
          style={[
            styles.panelResultado,
            esTarjetaNivel && styles.panelResultadoNivel,
            esTarjetaFinal && styles.panelResultadoFinal,
            esPortraitFinal && styles.panelResultadoFinalPortrait,
            esCompacta && styles.panelResultadoCompacto,
            esFinalCompacta && styles.panelResultadoFinalCompacto,
          ]}
        >
          <View
            style={[
              styles.resultadoCinta,
              esTarjetaNivel && styles.resultadoCintaNivel,
              esTarjetaFinal && styles.resultadoCintaFinal,
              esCompacta && styles.resultadoCintaCompacta,
            ]}
          >
            <Text style={[styles.resultadoCintaTexto, esCompacta && styles.resultadoCintaTextoCompacto]}>
              {tarjeta.cinta}
            </Text>
          </View>

          <View
            style={[
              styles.resultadoHero,
              esTarjetaNivel && styles.resultadoHeroNivel,
              esTarjetaFinal && styles.resultadoHeroFinal,
              esPortraitFinal && styles.resultadoHeroFinalPortrait,
              esCompacta && styles.resultadoHeroCompacto,
              esFinalCompacta && styles.resultadoHeroFinalCompacto,
            ]}
          >
            <View style={styles.resultadoAura} />
            <View style={styles.resultadoNivelPill}>
              <Text style={[styles.resultadoNivelTexto, esCompacta && styles.resultadoNivelTextoCompacto]}>
                {tarjeta.insignia}
              </Text>
            </View>

            <Text style={[
              styles.tituloResultado,
              esCompacta && styles.tituloResultadoCompacto,
              esFinalCompacta && styles.tituloResultadoFinalCompacto,
            ]}>
              {tarjeta.titulo}
            </Text>

            <View style={[styles.estrellasResultado, esCompacta && styles.estrellasResultadoCompacta]}>
              {estrellas.map((activa, indice) => (
                <View
                  key={`estrella-tren-${indice}`}
                  style={[
                    styles.estrellaBurbuja,
                    !activa && styles.estrellaBurbujaInactiva,
                    esCompacta && styles.estrellaBurbujaCompacta,
                  ]}
                >
                  <Text
                    style={[
                      styles.estrellaResultado,
                      !activa && styles.estrellaResultadoInactiva,
                      esCompacta && styles.estrellaResultadoCompacta,
                    ]}
                  >
                    *
                  </Text>
                </View>
              ))}
            </View>

            {!esTarjetaNivel ? (
              <View style={[styles.resultadoRecompensa, esCompacta && styles.resultadoRecompensaCompacta]}>
                <Text style={styles.resultadoRecompensaLabel}>Premio del tren</Text>
                <Text style={[styles.resultadoTexto, esCompacta && styles.resultadoTextoCompacto]}>
                  {tarjeta.descripcion}
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.gridMetricasResultado,
              esTarjetaNivel && styles.gridMetricasResultadoNivel,
              esCompacta && styles.gridMetricasResultadoCompacta,
            ]}
          >
            {metricasVisibles.map((metrica, indice) => (
              <View
                key={metrica.etiqueta}
                style={[
                  styles.cardMetricaResultado,
                  styles[`cardMetricaResultado${indice % 3}`],
                  esTarjetaNivel && styles.cardMetricaResultadoNivel,
                  esCompacta && styles.cardMetricaResultadoCompacta,
                ]}
              >
                <Text style={[styles.cardMetricaEtiqueta, esCompacta && styles.cardMetricaEtiquetaCompacta]}>
                  {metrica.etiqueta}
                </Text>
                <Text style={[styles.cardMetricaValor, esCompacta && styles.cardMetricaValorCompacto]}>
                  {metrica.valor}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.panelResumenResultado,
              esTarjetaNivel && styles.panelResumenResultadoNivel,
              esCompacta && styles.panelResumenResultadoCompacto,
            ]}
          >
            <Text style={[styles.resumenResultadoTitulo, esCompacta && styles.resumenResultadoTituloCompacto]}>
              {tarjeta.resumenTitulo}
            </Text>
            <Text style={[styles.resultadoSecundario, esCompacta && styles.resultadoSecundarioCompacto]}>
              {sincronizando
                ? 'Guardando tu viaje...'
                : tarjeta.resumenTexto}
            </Text>
          </View>

          {logrosVisibles?.length ? (
            <View style={[
              styles.listaLogrosResultado,
              esCompacta && styles.listaLogrosResultadoCompacta,
              esFinalCompacta && styles.listaLogrosResultadoFinalCompacta,
            ]}>
              <Text style={[styles.resumenResultadoTitulo, esCompacta && styles.resumenResultadoTituloCompacto]}>
                Premios ganados
              </Text>
              {logrosVisibles.map((logro) => (
                <View
                  key={logro.id ?? logro.nombre_logro ?? logro.nombre}
                  style={[
                    styles.logroResultadoCard,
                    esCompacta && styles.logroResultadoCardCompacta,
                    esFinalCompacta && styles.logroResultadoCardFinalCompacta,
                  ]}
                >
                  <View style={[
                    styles.logroIconoBurbuja,
                    esFinalCompacta && styles.logroIconoBurbujaFinalCompacta,
                  ]}>
                    <Text style={[
                      styles.logroIconoTexto,
                      esFinalCompacta && styles.logroIconoTextoFinalCompacto,
                    ]}>
                      {logro.icono ?? logro.icono_logro ?? logro.emoji ?? '*'}
                    </Text>
                  </View>
                  <View style={styles.logroTextoContenido}>
                    <Text
                      style={[styles.logroResultadoTitulo, esCompacta && styles.logroResultadoTituloCompacto]}
                      numberOfLines={esCompacta ? 1 : undefined}
                    >
                      {logro.nombre_logro ?? logro.nombre}
                    </Text>
                    {logro.descripcion && !esCompacta ? (
                      <Text style={styles.logroResultadoTexto}>{logro.descripcion}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={[styles.resultadoBotones, esCompacta && styles.resultadoBotonesCompacto]}>
            {tarjeta.tipo === 'nivel' ? (
              <TouchableOpacity
                style={[styles.botonContinuar, esCompacta && styles.botonContinuarCompacto]}
                onPress={onContinuar}
              >
                <Text style={[styles.botonContinuarTexto, esCompacta && styles.botonResultadoTextoCompacto]}>
                  Continuar
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                tarjeta.tipo === 'nivel' ? styles.botonResultadoSalir : styles.botonContinuar,
                esCompacta && styles.botonContinuarCompacto,
              ]}
              onPress={tarjeta.tipo === 'nivel' ? onVolver : onVolver}
            >
              <Text
                style={[
                  tarjeta.tipo === 'nivel'
                    ? styles.botonResultadoSalirTexto
                    : styles.botonContinuarTexto,
                  esCompacta && styles.botonResultadoTextoCompacto,
                ]}
              >
                {tarjeta.tipo === 'nivel' ? 'Volver' : 'Volver al tablero'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default function Tren3DScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const viewport = useWindowDimensions();
  const configuracionBase = useMemo(
    () => normalizarConfiguracionTren3D(configuracionInicial),
    [configuracionInicial],
  );
  const [configuracion, setConfiguracion] = useState(configuracionBase);
  const [preparacionLista, setPreparacionLista] = useState(false);
  const [revisionPreparacion, setRevisionPreparacion] = useState(0);
  const [juegoSolicitado, setJuegoSolicitado] = useState(false);
  const [motorListo, setMotorListo] = useState(false);
  const [errorMotor, setErrorMotor] = useState(null);
  const [webViewKey, setWebViewKey] = useState(0);
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
  const partidaIniciadaRef = useRef(false);
  const ultimaMisionCompletadaRef = useRef(true);
  const siguienteNivelPendienteRef = useRef(null);
  const audioTren = useTren3DAudio();

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
    vueltasMaximas: parametrosIniciales.vueltasMaximas,
    vueltasRestantes: parametrosIniciales.vueltasMaximas,
    maxOpcionesFiguras: parametrosIniciales.maxOpcionesFiguras,
    resultado: null,
    seleccionClave: null,
  });
  const [tarjetaResultado, setTarjetaResultado] = useState(null);

  useEffect(() => {
    let vigente = true;

    const prepararPartida = async () => {
      setPreparacionLista(false);
      setJuegoSolicitado(false);
      setMotorListo(false);
      setErrorMotor(null);
      const preparacion = await sesionTren.prepararRonda(configuracionBase.dificultad);

      if (!vigente || !preparacion?.lista) {
        return;
      }

      const configuracionPreparada = resolverConfiguracionTren3DDesdeBackend({
        configuracionLocal: configuracionBase,
        respuestaInicioSesion: preparacion.respuestaInicio,
      });
      const parametros = construirParametrosNivel({
        dificultad: configuracionPreparada.dificultad,
        configuracion: configuracionPreparada,
      });

      dificultadRef.current = configuracionPreparada.dificultad;
      setConfiguracion(configuracionPreparada);
      setEstado((previo) => ({
        ...previo,
        dificultad: configuracionPreparada.dificultad,
        patronActual: parametros.patron,
        vueltasMaximas: parametros.vueltasMaximas,
        vueltasRestantes: parametros.vueltasMaximas,
        maxOpcionesFiguras: parametros.maxOpcionesFiguras,
      }));
      setPreparacionLista(true);
    };

    void prepararPartida();

    return () => {
      vigente = false;
    };
  }, [configuracionBase, revisionPreparacion, sesionTren.prepararRonda]);

  const tarjetaResultadoVisible = useMemo(() => {
    if (!tarjetaResultado || tarjetaResultado.tipo !== 'final') {
      return tarjetaResultado;
    }

    const respuestaFinalizacion = sesionTren.respuestaFinalizacion;

    if (!respuestaFinalizacion) {
      return tarjetaResultado;
    }

    const resultadoConOficial = {
      ...estado.resultado,
      resumen_oficial: respuestaFinalizacion.resumen_oficial,
      logros_desbloqueados: respuestaFinalizacion.logros_desbloqueados,
    };

    return {
      ...tarjetaResultado,
      estrellas: ultimaMisionCompletadaRef.current
        ? calcularEstrellasResultado(resultadoConOficial)
        : Math.min(1, calcularEstrellasResultado(resultadoConOficial)),
      logros: Array.isArray(respuestaFinalizacion.logros_desbloqueados)
        ? respuestaFinalizacion.logros_desbloqueados
        : tarjetaResultado.logros,
      resumenTexto: respuestaFinalizacion.finalizacion_idempotente
        ? 'Tu viaje ya estaba guardado.'
        : 'Tu viaje quedo guardado.',
    };
  }, [estado.resultado, sesionTren.respuestaFinalizacion, tarjetaResultado]);

  useEffect(() => {
    let componenteActivo = true;

    const bloquearLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
      } catch {
        // La orientacion no debe bloquear la partida si el dispositivo no la soporta.
      }
    };

    bloquearLandscape();

    return () => {
      componenteActivo = false;
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        .catch(() => {
          if (componenteActivo) {
            return;
          }
        });
    };
  }, []);

  const opcionesUnicas = useMemo(() => {
    const mapa = {};
    estado.patronActual.forEach((paso) => {
      mapa[paso.clave] = paso;
    });
    const limite = Math.max(1, Math.min(4, Number(estado.maxOpcionesFiguras) || 4));
    return Object.values(mapa).slice(0, limite);
  }, [estado.maxOpcionesFiguras, estado.patronActual]);

  const seleccionarFiguraNativa = (paso) => {
    audioTren.reproducirSeleccion();
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

  const mostrarResultadoFinalEnPortrait = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {
      // El resultado final debe mostrarse aunque no se pueda cambiar orientacion.
    }
  }, []);

  const construirTarjetaFinal = (resultado, misionCompletada = true) => ({
    tipo: 'final',
    cinta: resultado.finalizacionSesion.estado === 'abandonado' ? 'PARTIDA PAUSADA' : 'RETO TERMINADO',
    insignia: 'Tren Patrones',
    titulo:
      resultado.finalizacionSesion.estado === 'abandonado'
        ? 'Volvemos al tablero'
        : misionCompletada
          ? 'El tren llego a la meta'
          : 'El tren volvera mas preparado',
    descripcion:
      resultado.finalizacionSesion.estado === 'abandonado'
        ? 'Puedes volver a intentarlo cuando quieras.'
        : misionCompletada
          ? 'Completaste la secuencia del tren. Buen trabajo.'
          : 'Las vueltas terminaron, pero cada intento entreno tu mirada de patrones.',
    estrellas: calcularEstrellasResultado(resultado),
    mostrarCelebracion:
      resultado.finalizacionSesion.estado === 'completado' && misionCompletada,
    metricas: [
      { etiqueta: 'Aciertos', valor: resultado.estadisticas.aciertos },
      { etiqueta: 'Errores', valor: resultado.estadisticas.errores },
      { etiqueta: 'Combo', valor: `x${resultado.estadisticas.comboMaximo}` },
      { etiqueta: 'Precision', valor: `${resultado.estadisticas.precisionPct}%` },
      { etiqueta: 'Puntos', valor: resultado.estadisticas.puntaje },
      { etiqueta: 'Nivel', valor: `${resultado.estadisticas.nivelAlcanzado}/${configuracion.nivelesPorPartida}` },
    ],
    resumenTitulo: resultado.finalizacionSesion.estado === 'abandonado' ? 'Viaje pausado' : 'Gran trabajo',
    resumenTexto:
      resultado.finalizacionSesion.estado === 'abandonado'
        ? 'Tu avance quedo listo para continuar despues.'
        : 'Tu viaje quedo guardado.',
    logros: resultado.logros_desbloqueados ?? [],
  });

  const finalizarPartida = ({
    estadoFinal = 'completado',
    misionCompletada = true,
  } = {}) => {
    if (finalizadoRef.current) {
      return;
    }

    finalizadoRef.current = true;
    void mostrarResultadoFinalEnPortrait();
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
    ultimaMisionCompletadaRef.current = misionCompletada;
    setTarjetaResultado(construirTarjetaFinal(resultado, misionCompletada));
  };

  const restaurarPortrait = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {
      // Salir del juego tiene prioridad sobre la orientacion.
    }
  }, []);

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

    if (mensaje.nivelCompletado) {
      // El cierre de nivel reproduce su propio sonido de premio.
    } else if (mensaje.tipo === 'acierto') {
      audioTren.reproducirAcierto();
    } else {
      audioTren.reproducirError();
    }

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

  const completarNivel = (mensaje, { misionCompletada = true } = {}) => {
    const vagonesPendientes = Math.max(0, Number(mensaje.vagonesPendientes ?? 0));
    const erroresAdaptativos = Number(mensaje.errores ?? 0) + vagonesPendientes;
    const precisionInteracciones = calcularPrecision({
      aciertos: mensaje.aciertos,
      errores: mensaje.errores,
    });
    const precisionAdaptativa = calcularPrecision({
      aciertos: mensaje.aciertos,
      errores: erroresAdaptativos,
    });

    if (!misionCompletada && vagonesPendientes > 0) {
      Array.from({ length: vagonesPendientes }).forEach((_unused, indice) => {
        sesionTren.observadoresJuego.alRegistrarEvento(
          construirEventoTren3D({
            tipoEvento: TIPOS_EVENTO_SESION.error,
            puntos: 0,
            comboEnEvento: 0,
            metadata: {
              omission: true,
              omission_index: indice + 1,
              reason: mensaje.motivo,
              difficulty: dificultadRef.current,
              mission_number: nivelRef.current,
            },
          }),
        );
      });
    }

    sesionTren.observadoresJuego.alRegistrarEvento(
      construirEventoTren3D({
        tipoEvento: TIPOS_EVENTO_SESION.nivelCompletado,
        puntos: misionCompletada ? 15 : 0,
        comboEnEvento: mensaje.comboMaximo ?? 0,
        metadata: {
          game: configuracion.slug,
          mission_completed: misionCompletada,
          end_reason: misionCompletada ? 'patron_completado' : mensaje.motivo,
          precision_pct: precisionAdaptativa,
          interaction_precision_pct: precisionInteracciones,
          laps_used: mensaje.vueltasConsumidas ?? estado.vueltasMaximas,
          max_laps: mensaje.vueltasMaximas ?? estado.vueltasMaximas,
          pending_wagons: vagonesPendientes,
          difficulty: dificultadRef.current,
          mission_number: nivelRef.current,
        },
      }),
    );

    acumuladoRef.current = {
      ...acumuladoRef.current,
      errores: acumuladoRef.current.errores + vagonesPendientes,
      tiempoTotalMs: acumuladoRef.current.tiempoTotalMs + (mensaje.tiempoNivelMs ?? 0),
      comboMaximo: Math.max(acumuladoRef.current.comboMaximo, mensaje.comboMaximo ?? 0),
    };

    if (nivelRef.current >= configuracion.nivelesPorPartida) {
      audioTren.reproducirFinal();
      finalizarPartida({ misionCompletada });
      return;
    }

    audioTren.reproducirNivel();

    const adaptacion = calcularAdaptacionInterNivel({
      aciertos: mensaje.aciertos,
      errores: erroresAdaptativos,
      dificultadActual: dificultadRef.current,
      misionCompletada,
    });
    const siguienteNivel = nivelRef.current + 1;
    const parametros = {
      dificultad: adaptacion.nuevaDificultad,
      velocidadTren: adaptacion.nuevaVelocidad,
      vueltasMaximas: adaptacion.vueltasMaximas,
      vagonesPorNivel: adaptacion.vagonesPorNivel,
      maxOpcionesFiguras: adaptacion.maxOpcionesFiguras,
      opacidadFiguraGuia: adaptacion.opacidadFiguraGuia,
      patron: generarPatronNivel(
        adaptacion.nuevaDificultad,
        adaptacion.vagonesPorNivel ?? configuracion.vagonesPorNivel,
        obtenerParametrosDificultad(adaptacion.nuevaDificultad),
      ),
    };

    siguienteNivelPendienteRef.current = {
      siguienteNivel,
      dificultad: adaptacion.nuevaDificultad,
      parametros,
    };

    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_TREN_3D.transicionNivel,
      nivel: siguienteNivel,
      dificultad: adaptacion.nuevaDificultad,
      patronActual: parametros.patron,
      vagonesCompletados: 0,
      vagonesResueltos: [],
      seleccionClave: null,
      vueltasMaximas: parametros.vueltasMaximas,
      vueltasRestantes: parametros.vueltasMaximas,
      maxOpcionesFiguras: parametros.maxOpcionesFiguras,
      mensaje: `${adaptacion.descripcionNivel}. Precision: ${adaptacion.precisionPct}%.`,
    }));
    setTarjetaResultado({
      tipo: 'nivel',
      cinta: misionCompletada ? 'NIVEL COMPLETADO' : 'VUELTAS TERMINADAS',
      insignia: `Tren Patrones - Nivel ${nivelRef.current}`,
      titulo: misionCompletada ? 'Buen viaje de patrones' : 'Seguimos aprendiendo',
      descripcion: misionCompletada
        ? `${adaptacion.descripcionNivel}. El siguiente tramo ajusta la dificultad con tu precision.`
        : `Quedaron ${vagonesPendientes} vagones. El siguiente tramo se ajustara para ayudarte.`,
      estrellas: calcularEstrellasResultado({
        estadisticas: {
          aciertos: mensaje.aciertos,
          errores: erroresAdaptativos,
          precisionPct: precisionAdaptativa,
        },
      }),
      mostrarCelebracion: misionCompletada && mensaje.errores === 0,
      metricas: [
        { etiqueta: 'Aciertos', valor: mensaje.aciertos },
        { etiqueta: 'Errores', valor: erroresAdaptativos },
        { etiqueta: 'Combo', valor: `x${mensaje.comboMaximo ?? 0}` },
        { etiqueta: 'Precision', valor: `${precisionAdaptativa}%` },
        { etiqueta: 'Vueltas', valor: mensaje.vueltasConsumidas ?? estado.vueltasMaximas },
        { etiqueta: 'Sigue', valor: `${siguienteNivel}/${configuracion.nivelesPorPartida}` },
        { etiqueta: 'Dificultad', valor: adaptacion.nuevaDificultad },
      ],
      resumenTitulo: 'Siguiente nivel listo',
      resumenTexto: 'Pulsa Continuar para que el tren entre al nuevo tramo.',
      logros: [],
    });
  };

  const continuarNivel = () => {
    const pendiente = siguienteNivelPendienteRef.current;

    if (!pendiente) {
      setTarjetaResultado(null);
      return;
    }

    nivelRef.current = pendiente.siguienteNivel;
    dificultadRef.current = pendiente.dificultad;
    siguienteNivelPendienteRef.current = null;
    setTarjetaResultado(null);
    inyectarNuevoNivel({ webViewRef, parametros: pendiente.parametros });
    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_TREN_3D.esperando,
      mensaje: 'El siguiente tren esta entrando. Preparate.',
    }));
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
      inicioPartidaRef.current = Date.now();
      setMotorListo(true);
      setErrorMotor(null);
      sesionTren.observadoresJuego.alIniciarPartida({
        configuracionPartida: configuracion,
      });
      setEstado((previo) => ({
        ...previo,
        fase: ESTADOS_TREN_3D.esperando,
        mensaje: 'El tren esta entrando. Preparate para completar el patron.',
      }));
      return;
    }

    if (mensaje.tipo === 'acierto' || mensaje.tipo === 'error') {
      registrarJugada(mensaje);
      return;
    }

    if (mensaje.tipo === 'nivelCompletado') {
      completarNivel(mensaje, { misionCompletada: true });
      return;
    }

    if (mensaje.tipo === 'nivelFallido') {
      audioTren.reproducirError();
      completarNivel(mensaje, { misionCompletada: false });
      return;
    }

    if (mensaje.tipo === 'vueltaActualizada') {
      setEstado((previo) => ({
        ...previo,
        fase: mensaje.trenDisponible
          ? ESTADOS_TREN_3D.jugando
          : ESTADOS_TREN_3D.esperando,
        vueltasMaximas: mensaje.vueltasMaximas,
        vueltasRestantes: mensaje.vueltasRestantes,
        mensaje:
          !mensaje.trenDisponible
            ? 'El tren esta dando la vuelta. Prepara tu siguiente figura.'
            : mensaje.vueltasRestantes === 1
            ? 'Ultima vuelta. Completa los vagones que faltan.'
            : `Te quedan ${mensaje.vueltasRestantes} vueltas para completar el tren.`,
      }));
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
      setErrorMotor(mensaje.mensaje ?? 'No fue posible cargar el motor 3D.');
      setEstado((previo) => ({
        ...previo,
        mensaje: mensaje.mensaje ?? 'No fue posible cargar el motor 3D.',
      }));
    }
  };

  const iniciarJuegoDesdePortada = () => {
    setJuegoSolicitado(true);
    setMotorListo(false);
    setErrorMotor(null);
    setEstado((previo) => ({
      ...previo,
      mensaje: 'Preparando el tren...',
    }));
  };

  const reintentarCargaMotor = () => {
    setMotorListo(false);
    setErrorMotor(null);
    setWebViewKey((valor) => valor + 1);
    setEstado((previo) => ({
      ...previo,
      mensaje: 'Preparando el tren...',
    }));
  };

  const salir = async () => {
    if (!finalizadoRef.current && partidaIniciadaRef.current) {
      finalizarPartida({ estadoFinal: 'abandonado' });
    }

    await restaurarPortrait();
    onSalir?.();
  };

  if (!preparacionLista) {
    return (
      <SafeAreaView style={[styles.contenedor, styles.preparacionContenedor]}>
        <Text style={styles.preparacionTitulo}>Preparando el tren</Text>
        <Text style={styles.preparacionTexto}>
          {sesionTren.persistencia.error ?? 'Estamos ajustando la velocidad y las vueltas para ti.'}
        </Text>
        {sesionTren.persistencia.error ? (
          <TouchableOpacity
            style={styles.preparacionBoton}
            onPress={() => setRevisionPreparacion((revision) => revision + 1)}
          >
            <Text style={styles.preparacionBotonTexto}>Intentar de nuevo</Text>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      {juegoSolicitado ? (
        <Tren3DVistaWebView
          key={webViewKey}
          webViewRef={webViewRef}
          onMensaje={manejarMensaje}
          parametrosIniciales={parametrosIniciales}
        />
      ) : null}

      {!juegoSolicitado ? (
        <ImageBackground
          source={fondoTrenInicio}
          resizeMode="cover"
          style={styles.portadaOverlay}
        >
          <View style={styles.portadaSombra} />
          <View style={styles.portadaContenido}>
            <Text style={styles.portadaTitulo}>Tren Patrones</Text>
            <Text style={styles.portadaSubtitulo}>
              Listo para el viaje de patrones.
            </Text>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.botonJugarPortada}
              onPress={iniciarJuegoDesdePortada}
            >
              <Text style={styles.botonJugarPortadaTexto}>Jugar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.botonSalirPortada} onPress={salir}>
            <Text style={styles.botonSalirTexto}>Salir</Text>
          </TouchableOpacity>
        </ImageBackground>
      ) : null}

      {juegoSolicitado && !motorListo ? (
        <ImageBackground
          source={fondoTrenInicio}
          resizeMode="cover"
          style={styles.cargaMotorOverlay}
        >
          <View style={styles.cargaMotorPanel}>
            {errorMotor ? null : <ActivityIndicator color={colores.alerta} size="large" />}
            <Text style={styles.cargaMotorTitulo}>
              {errorMotor ? 'No pudimos cargar el tren' : 'Preparando el tren'}
            </Text>
            <Text style={styles.cargaMotorTexto}>
              {errorMotor ?? 'Un momento mientras llega a la estacion.'}
            </Text>
            {errorMotor ? (
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.botonReintentarMotor}
                onPress={reintentarCargaMotor}
              >
                <Text style={styles.botonReintentarMotorTexto}>Reintentar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ImageBackground>
      ) : null}

      <View style={styles.barraSuperior}>
        <View style={styles.barraSuperiorTexto}>
          <Text style={styles.titulo}>Tren Patrones</Text>
          <Text style={styles.subtitulo} numberOfLines={2}>{estado.mensaje}</Text>
        </View>
        <View style={styles.vueltasBadge}>
          <Text style={styles.vueltasBadgeLabel}>Vueltas</Text>
          <Text style={styles.vueltasBadgeValor}>
            {estado.vueltasRestantes}/{estado.vueltasMaximas}
          </Text>
        </View>
        <TouchableOpacity style={styles.botonSalir} onPress={salir}>
          <Text style={styles.botonSalirTexto}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.barraPatron}>
        <Text style={styles.barraPatronTitulo}>Patron del nivel</Text>
        <ScrollView
          showsVerticalScrollIndicator
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

      <View style={styles.barraBotones}>
        <ScrollView
          showsVerticalScrollIndicator
          contentContainerStyle={styles.listaBotones}
        >
          {opcionesUnicas.map((opcion) => (
            <TouchableOpacity
              key={opcion.clave}
              activeOpacity={0.8}
              disabled={!esFaseSeleccionable(estado.fase)}
              style={[
                styles.botonNativo,
                { backgroundColor: opcion.colorHex },
                estado.seleccionClave === opcion.clave && styles.botonNativoActivo,
                !esFaseSeleccionable(estado.fase) && { opacity: 0.5 },
              ]}
              onPress={() => seleccionarFiguraNativa(opcion)}
            >
              {SIMBOLOS_FIGURA_PLANA[opcion.figuraId] ? (
                <Text style={styles.figuraBotonSimbolo}>
                  {SIMBOLOS_FIGURA_PLANA[opcion.figuraId]}
                </Text>
              ) : (
                <View
                  style={[
                    styles.figuraBoton,
                    opcion.figuraId === 'circulo' && styles.figuraBotonCirculo,
                  ]}
                />
              )}
              <Text style={styles.botonNativoTexto} numberOfLines={1}>
                {opcion.figuraLabel}
              </Text>
            </TouchableOpacity>
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

      <TarjetaResultadoTren
        tarjeta={tarjetaResultadoVisible}
        sincronizando={sesionTren.persistencia.estado === 'finalizando'}
        onContinuar={continuarNivel}
        onVolver={salir}
        viewport={viewport}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#06131f',
  },
  portadaOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portadaSombra: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 19, 31, 0.34)',
  },
  portadaContenido: {
    width: '48%',
    minWidth: 300,
    maxWidth: 430,
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: 22,
    paddingHorizontal: 28,
    borderRadius: 18,
    backgroundColor: 'rgba(7,28,43,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  portadaTitulo: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  portadaSubtitulo: {
    color: '#DFF6FF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
  },
  botonJugarPortada: {
    marginTop: 6,
    minWidth: 190,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 34,
    alignItems: 'center',
    backgroundColor: colores.alerta,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#6D4D00',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  botonJugarPortadaTexto: {
    color: '#06131f',
    fontSize: 20,
    fontWeight: '900',
  },
  botonSalirPortada: {
    position: 'absolute',
    top: 24,
    right: 18,
    backgroundColor: 'rgba(7,28,43,0.82)',
    borderRadius: radios.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  cargaMotorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargaMotorPanel: {
    minWidth: 300,
    maxWidth: 420,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 26,
    borderRadius: 18,
    backgroundColor: 'rgba(7,28,43,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  cargaMotorTitulo: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  cargaMotorTexto: {
    color: '#DFF6FF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  botonReintentarMotor: {
    marginTop: 6,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colores.alerta,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  botonReintentarMotorTexto: {
    color: '#06131f',
    fontWeight: '900',
  },
  preparacionContenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  preparacionTitulo: {
    color: colores.alerta,
    fontSize: 24,
    fontWeight: '900',
  },
  preparacionTexto: {
    color: colores.textoPrincipal,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  preparacionBoton: {
    borderRadius: radios.pill,
    backgroundColor: colores.acento,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  preparacionBotonTexto: {
    color: '#06131f',
    fontWeight: '900',
  },
  barraSuperior: {
    position: 'absolute',
    top: 24,
    left: 12,
    width: 390,
    backgroundColor: 'rgba(7,28,43,0.78)',
    borderColor: 'rgba(130,215,255,0.42)',
    borderWidth: 1,
    borderRadius: radios.md,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
  },
  barraSuperiorTexto: {
    flex: 1,
    minWidth: 0,
  },
  vueltasBadge: {
    minWidth: 72,
    borderRadius: radios.md,
    borderWidth: 2,
    borderColor: colores.alerta,
    backgroundColor: '#17324d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  vueltasBadgeLabel: {
    color: colores.textoSecundario,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  vueltasBadgeValor: {
    color: colores.alerta,
    fontSize: 17,
    fontWeight: '900',
  },
  titulo: {
    color: colores.textoPrincipal,
    fontSize: 15,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.textoSecundario,
    fontSize: 11,
    lineHeight: 15,
  },
  botonSalir: {
    backgroundColor: colores.alerta,
    borderRadius: radios.md,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  botonSalirTexto: {
    color: '#06131f',
    fontWeight: '900',
  },
  barraPatron: {
    position: 'absolute',
    top: 118,
    left: 12,
    bottom: 82,
    width: 88,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(255,216,107,0.72)',
    borderWidth: 2,
    borderRadius: radios.md,
    padding: 7,
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
    alignItems: 'center',
    paddingBottom: 8,
  },
  itemPatron: {
    width: 48,
    height: 48,
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
  figuraPatronSimbolo: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(21,52,77,0.36)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
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
    left: 124,
    right: 124,
    bottom: 10,
    flexDirection: 'row',
    gap: 7,
  },
  metrica: {
    flex: 1,
    backgroundColor: 'rgba(7,28,43,0.9)',
    borderColor: 'rgba(255,216,107,0.42)',
    borderWidth: 1,
    borderRadius: radios.md,
    paddingVertical: 7,
    alignItems: 'center',
  },
  metricaValor: {
    color: colores.alerta,
    fontWeight: '900',
    fontSize: 16,
  },
  metricaLabel: {
    color: colores.textoSecundario,
    fontSize: tipografia.etiqueta,
    fontWeight: '800',
  },
  barraBotones: {
    position: 'absolute',
    right: 42,
    top: 42,
    bottom: 54,
    width: 132,
    padding: 8,
    backgroundColor: 'rgba(7,28,43,0.82)',
    borderColor: 'rgba(130,215,255,0.3)',
    borderWidth: 1,
    borderRadius: radios.md,
  },
  listaBotones: {
    gap: 6,
    paddingBottom: 8,
  },
  botonNativo: {
    minHeight: 52,
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
    transform: [{ scale: 0.98 }],
    borderColor: '#ffffff',
    borderWidth: 3,
  },
  figuraBoton: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: 'rgba(6,19,31,0.86)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  figuraBotonSimbolo: {
    color: 'rgba(6,19,31,0.92)',
    fontSize: 27,
    lineHeight: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
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
  resultadoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
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
    backgroundColor: colores.acento,
  },
  resultadoBurbujaSol: {
    width: 220,
    height: 220,
    right: -86,
    top: 72,
    backgroundColor: colores.alerta,
  },
  resultadoBurbujaRosa: {
    width: 260,
    height: 260,
    bottom: -120,
    left: 38,
    backgroundColor: colores.error,
  },
  resultadoIconoFondo: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.13)',
    fontWeight: '900',
  },
  resultadoIconoUno: {
    top: 76,
    left: 48,
    fontSize: 42,
    transform: [{ rotate: '-14deg' }],
  },
  resultadoIconoDos: {
    top: 188,
    right: 64,
    fontSize: 34,
    transform: [{ rotate: '20deg' }],
  },
  resultadoIconoTres: {
    bottom: 76,
    left: 92,
    fontSize: 28,
  },
  panelResultadoContenido: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 78,
    paddingVertical: 24,
  },
  panelResultadoContenidoNivel: {
    paddingHorizontal: 96,
    paddingVertical: 28,
  },
  panelResultadoContenidoFinal: {
    paddingHorizontal: 112,
    paddingVertical: 30,
  },
  panelResultadoContenidoFinalPortrait: {
    paddingHorizontal: 18,
    paddingVertical: 34,
  },
  panelResultadoContenidoCompacto: {
    paddingHorizontal: 118,
    paddingVertical: 18,
  },
  panelResultadoContenidoFinalCompacto: {
    paddingHorizontal: 136,
    paddingVertical: 16,
  },
  panelResultado: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: '#FFF8DE',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    paddingTop: 30,
    paddingHorizontal: 12,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  panelResultadoFinal: {
    maxWidth: 560,
  },
  panelResultadoFinalPortrait: {
    maxWidth: 390,
    borderRadius: 24,
    paddingTop: 34,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  panelResultadoCompacto: {
    maxWidth: 520,
    borderRadius: 16,
    paddingTop: 22,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  panelResultadoFinalCompacto: {
    maxWidth: 470,
    paddingTop: 20,
    paddingBottom: 8,
  },
  panelResultadoNivel: {
    maxWidth: 500,
    borderRadius: 18,
    borderWidth: 3,
    paddingTop: 28,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  resultadoCinta: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    minWidth: 214,
    paddingVertical: 10,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.pill,
    backgroundColor: '#FF3E8A',
    borderWidth: 3,
    borderColor: colores.alerta,
    shadowColor: '#6D1446',
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
  },
  resultadoCintaNivel: {
    top: -18,
    minWidth: 190,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  resultadoCintaFinal: {
    top: -18,
    minWidth: 206,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  resultadoCintaCompacta: {
    top: -14,
    minWidth: 170,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 2,
  },
  resultadoCintaTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },
  resultadoCintaTextoCompacto: {
    fontSize: 13,
  },
  resultadoHero: {
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#8BE8FF',
    gap: 8,
  },
  resultadoHeroNivel: {
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 6,
  },
  resultadoHeroFinal: {
    gap: 6,
  },
  resultadoHeroFinalPortrait: {
    borderRadius: 18,
    paddingVertical: 12,
    gap: 8,
  },
  resultadoHeroCompacto: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    gap: 4,
  },
  resultadoHeroFinalCompacto: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 12,
    gap: 3,
  },
  resultadoAura: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -146,
    backgroundColor: '#FFF1A8',
  },
  resultadoNivelPill: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radios.pill,
    backgroundColor: '#32236C',
    borderWidth: 2,
    borderColor: '#A897FF',
  },
  resultadoNivelTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  resultadoNivelTextoCompacto: {
    fontSize: 9,
  },
  tituloResultado: {
    color: '#251B57',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  tituloResultadoCompacto: {
    fontSize: 18,
  },
  tituloResultadoFinalCompacto: {
    fontSize: 16,
  },
  resultadoTexto: {
    color: '#31516D',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  resultadoTextoCompacto: {
    fontSize: 11,
    lineHeight: 15,
  },
  resultadoRecompensa: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EAFBFF',
    borderWidth: 2,
    borderColor: '#A9EFFF',
    gap: 4,
  },
  resultadoRecompensaCompacta: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 2,
  },
  resultadoRecompensaLabel: {
    color: '#FF3E8A',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0,
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
  },
  estrellasResultado: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 2,
  },
  estrellasResultadoCompacta: {
    gap: 6,
    paddingTop: 0,
  },
  estrellaBurbuja: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  estrellaBurbujaCompacta: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },
  estrellaBurbujaInactiva: {
    backgroundColor: '#EEF2F7',
    borderColor: '#D4DCE8',
  },
  estrellaResultado: {
    color: '#FFB703',
    fontSize: 34,
    fontWeight: '900',
  },
  estrellaResultadoCompacta: {
    fontSize: 25,
  },
  estrellaResultadoInactiva: {
    color: '#A8B3C3',
  },
  gridMetricasResultado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  gridMetricasResultadoNivel: {
    flexWrap: 'nowrap',
    gap: 7,
  },
  gridMetricasResultadoCompacta: {
    gap: 5,
    marginTop: 6,
    flexWrap: 'nowrap',
  },
  cardMetricaResultado: {
    minWidth: '22%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    gap: 4,
    alignItems: 'center',
  },
  cardMetricaResultadoNivel: {
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  cardMetricaResultadoCompacta: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 1,
    gap: 1,
  },
  cardMetricaResultado0: {
    backgroundColor: '#EAFBFF',
    borderColor: '#A9EFFF',
  },
  cardMetricaResultado1: {
    backgroundColor: '#FFF2C7',
    borderColor: '#FFD166',
  },
  cardMetricaResultado2: {
    backgroundColor: '#F1E9FF',
    borderColor: '#C7B5FF',
  },
  cardMetricaEtiqueta: {
    color: '#324B66',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontWeight: '800',
  },
  cardMetricaEtiquetaCompacta: {
    fontSize: 8,
  },
  cardMetricaValor: {
    color: '#251B57',
    fontSize: 16,
    fontWeight: '900',
  },
  cardMetricaValorCompacto: {
    fontSize: 13,
  },
  panelResumenResultado: {
    marginTop: 8,
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#FFF2C7',
    borderWidth: 2,
    borderColor: '#FFD166',
    gap: espaciado.xs,
  },
  panelResumenResultadoNivel: {
    borderRadius: 14,
    paddingVertical: 8,
  },
  panelResumenResultadoCompacto: {
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    gap: 1,
  },
  resumenResultadoTitulo: {
    color: '#251B57',
    fontWeight: '900',
    textAlign: 'center',
  },
  resumenResultadoTituloCompacto: {
    fontSize: 12,
  },
  resultadoSecundario: {
    color: '#405C78',
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultadoSecundarioCompacto: {
    fontSize: 11,
    lineHeight: 14,
  },
  listaLogrosResultado: {
    marginTop: 8,
    gap: 6,
  },
  listaLogrosResultadoCompacta: {
    marginTop: 5,
    gap: 4,
  },
  listaLogrosResultadoFinalCompacta: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 5,
  },
  logroResultadoCard: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#F1E9FF',
    borderWidth: 2,
    borderColor: '#C7B5FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  logroResultadoCardCompacta: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 11,
    borderWidth: 1,
  },
  logroResultadoCardFinalCompacta: {
    flex: 1,
    minHeight: 34,
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 5,
  },
  logroIconoBurbuja: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.alerta,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  logroIconoBurbujaFinalCompacta: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  logroIconoTexto: {
    fontSize: 22,
  },
  logroIconoTextoFinalCompacto: {
    fontSize: 16,
  },
  logroTextoContenido: {
    flex: 1,
    gap: 3,
  },
  logroResultadoTitulo: {
    color: '#251B57',
    fontWeight: '900',
  },
  logroResultadoTituloCompacto: {
    fontSize: 12,
  },
  logroResultadoTexto: {
    color: '#405C78',
    lineHeight: 16,
  },
  resultadoBotones: {
    flexDirection: 'row',
    gap: espaciado.sm,
    marginTop: espaciado.sm,
  },
  resultadoBotonesCompacto: {
    marginTop: 6,
    gap: 7,
  },
  botonContinuar: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#36D990',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#0B8B55',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  botonContinuarCompacto: {
    paddingVertical: 9,
    borderRadius: 13,
    borderWidth: 2,
  },
  botonContinuarTexto: {
    color: '#073B2A',
    fontWeight: '900',
    fontSize: 15,
  },
  botonResultadoTextoCompacto: {
    fontSize: 13,
  },
  botonResultadoSalir: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#4EC8FF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#146D93',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  botonResultadoSalirTexto: {
    color: '#083451',
    fontWeight: '900',
    fontSize: 15,
  },
});

