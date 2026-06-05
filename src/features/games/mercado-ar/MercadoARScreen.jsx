import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radii, shadows, spacing } from '../../../constants/theme';
import { TIPOS_EVENTO_SESION } from '../core/contratoSesionJuego';
import { useSesionMercadoAr } from './aplicacion/useSesionMercadoAr';
import {
  obtenerConfiguracionBaseMercadoAr,
  resolverConfiguracionMercadoArDesdeBackend,
} from './mercadoArConfiguracion';
import { construirEscenaEspacialMercado } from './mercadoArEscenaEspacial';
import {
  construirEventoMercadoAr,
  construirResumenPartidaMercadoAr,
  evaluarSeleccionMercado,
  generarRondaMercado,
} from './mercadoArMotor';
import MercadoArVistaArPreview from './presentacion/MercadoArVistaArPreview';
import { mercadoArTheme, resolverTemaCategoriaMercado } from './mercadoArTheme';

const FASES_MERCADO_AR = Object.freeze({
  preparando: 'preparando',
  jugando: 'jugando',
  transicion: 'transicion',
  finalizado: 'finalizado',
});

const buildProductAccent = (categoria) => {
  switch (categoria) {
    case 'frutas':
      return { fondo: '#FFE6D8', borde: '#F49E58', tinta: '#8B3D00' };
    case 'verduras':
      return { fondo: '#E5F6DC', borde: '#7BB661', tinta: '#2D5A1C' };
    case 'lacteos':
      return { fondo: '#E4F0FF', borde: '#73A7E8', tinta: '#1E4D7A' };
    case 'panaderia':
    default:
      return { fondo: '#FFF0D9', borde: '#DDA24F', tinta: '#7A4B08' };
  }
};

const formatearModoPersistencia = (persistencia) =>
  persistencia ? 'Sesion conectada al backend' : 'Modo local de prototipo';

export default function MercadoARScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const configuracionBase = useMemo(
    () => obtenerConfiguracionBaseMercadoAr(configuracionInicial),
    [configuracionInicial],
  );
  const [configuracionActiva, setConfiguracionActiva] = useState(configuracionBase);
  const [estado, setEstado] = useState(() => ({
    fase: FASES_MERCADO_AR.preparando,
    indiceRonda: 0,
    ronda: generarRondaMercado({ configuracion: configuracionBase, indiceRonda: 0 }),
    seleccionadosIds: [],
    aciertos: 0,
    errores: 0,
    comboActual: 0,
    comboMaximo: 0,
    ayudasUsadas: 0,
    mensaje: 'Estamos preparando el mercado sobre tu mesa.',
    resultado: null,
    ultimaEvaluacion: null,
  }));
  const sesionMercado = useSesionMercadoAr({
    configuracion: configuracionActiva,
    contextoSesion,
  });
  const escenaEspacial = useMemo(
    () =>
      construirEscenaEspacialMercado({
        ronda: estado.ronda,
        seleccionadosIds: estado.seleccionadosIds,
        objetivoTexto: estado.mensaje,
        modoPresentacion: configuracionActiva.modoPresentacion,
      }),
    [configuracionActiva.modoPresentacion, estado.mensaje, estado.ronda, estado.seleccionadosIds],
  );
  const inicioPartidaRef = useRef(Date.now());
  const finalizadoRef = useRef(false);
  const { prepararRonda, prepararNuevaRonda, observadoresJuego } = sesionMercado;

  useEffect(() => {
    let cancelado = false;
    inicioPartidaRef.current = Date.now();
    finalizadoRef.current = false;

    const prepararPrimeraRonda = async () => {
      setEstado((previo) => ({
        ...previo,
        fase: FASES_MERCADO_AR.preparando,
        mensaje: 'Sincronizando la primera ronda del mercado.',
      }));

      const resultadoPreparacion = await prepararRonda(configuracionBase.dificultad);

      if (cancelado) {
        return;
      }

      const configuracionDesdeBackend = resolverConfiguracionMercadoArDesdeBackend({
        configuracionLocal: configuracionBase,
        respuestaInicioSesion: resultadoPreparacion?.respuestaInicio,
      });
      const primeraRonda = generarRondaMercado({
        configuracion: configuracionDesdeBackend,
        indiceRonda: 0,
      });

      setConfiguracionActiva(configuracionDesdeBackend);
      setEstado((previo) => ({
        ...previo,
        fase: FASES_MERCADO_AR.jugando,
        ronda: primeraRonda,
        mensaje: primeraRonda.objetivo.textoGuia,
      }));
    };

    prepararPrimeraRonda();

    return () => {
      cancelado = true;
    };
  }, [configuracionBase, prepararRonda]);

  const toggleProducto = (productoId) => {
    if (estado.fase !== FASES_MERCADO_AR.jugando) {
      return;
    }

    setEstado((previo) => {
      const yaSeleccionado = previo.seleccionadosIds.includes(productoId);

      return {
        ...previo,
        seleccionadosIds: yaSeleccionado
          ? previo.seleccionadosIds.filter((id) => id !== productoId)
          : [...previo.seleccionadosIds, productoId],
      };
    });
  };

  const gastarAyuda = () => {
    if (estado.fase !== FASES_MERCADO_AR.jugando) {
      return;
    }

    if (estado.ayudasUsadas >= configuracionActiva.configuracion.ayudasDisponibles) {
      setEstado((previo) => ({
        ...previo,
        mensaje: 'Ya usaste todas las ayudas disponibles en esta partida.',
      }));
      return;
    }

    setEstado((previo) => ({
      ...previo,
      ayudasUsadas: previo.ayudasUsadas + 1,
      mensaje: `Pista: revisa ${previo.ronda.objetivo.cantidadObjetivos} productos y compara el total con ${previo.ronda.objetivo.presupuestoObjetivo} monedas.`,
    }));
  };

  const avanzarRonda = async (indiceSiguiente) => {
    if (indiceSiguiente >= configuracionActiva.rondasPorPartida) {
      return false;
    }

    prepararNuevaRonda();

    setEstado((previo) => ({
      ...previo,
      fase: FASES_MERCADO_AR.transicion,
      mensaje: 'Preparamos un nuevo puesto del mercado para la siguiente ronda.',
      seleccionadosIds: [],
      ultimaEvaluacion: null,
    }));

    const resultadoPreparacion = await prepararRonda(configuracionActiva.dificultad);
    const configuracionDesdeBackend = resolverConfiguracionMercadoArDesdeBackend({
      configuracionLocal: configuracionActiva,
      respuestaInicioSesion: resultadoPreparacion?.respuestaInicio,
    });
    const nuevaRonda = generarRondaMercado({
      configuracion: configuracionDesdeBackend,
      indiceRonda: indiceSiguiente,
    });

    setConfiguracionActiva(configuracionDesdeBackend);
    setEstado((previo) => ({
      ...previo,
      fase: FASES_MERCADO_AR.jugando,
      indiceRonda: indiceSiguiente,
      ronda: nuevaRonda,
      mensaje: nuevaRonda.objetivo.textoGuia,
    }));

    return true;
  };

  const finalizarPartida = ({ rondasCompletadas = estado.indiceRonda } = {}) => {
    if (finalizadoRef.current) {
      return;
    }

    finalizadoRef.current = true;
    const resultado = construirResumenPartidaMercadoAr({
      configuracion: configuracionActiva,
      aciertos: estado.aciertos,
      errores: estado.errores,
      comboMaximo: estado.comboMaximo,
      rondasCompletadas,
      tiempoTotalMs: Date.now() - inicioPartidaRef.current,
      ayudasUsadas: estado.ayudasUsadas,
    });

    observadoresJuego.alFinalizarPartida(resultado);

    setEstado((previo) => ({
      ...previo,
      fase: FASES_MERCADO_AR.finalizado,
      resultado,
      mensaje: 'Mercado completado. Revisa tu puntaje y vuelve al tablero cuando quieras.',
    }));
  };

  const confirmarSeleccion = async () => {
    if (estado.fase !== FASES_MERCADO_AR.jugando) {
      return;
    }

    const evaluacion = evaluarSeleccionMercado({
      ronda: estado.ronda,
      productosSeleccionadosIds: estado.seleccionadosIds,
    });
    const esAcierto = evaluacion.exito;
    const comboEnEvento = esAcierto ? estado.comboActual + 1 : 0;
    const puntos = esAcierto ? 12 : 0;
    const eventoResultado = construirEventoMercadoAr({
      tipoEvento: esAcierto ? TIPOS_EVENTO_SESION.acierto : TIPOS_EVENTO_SESION.error,
      tiempoReaccionMs: Date.now() - inicioPartidaRef.current,
      puntos,
      comboEnEvento,
      metadata: {
        ronda: estado.indiceRonda + 1,
        modoObjetivo: estado.ronda.objetivo.modo,
        totalGastado: evaluacion.totalGastado,
        presupuestoObjetivo: estado.ronda.objetivo.presupuestoObjetivo,
        cantidadSeleccionada: evaluacion.cantidadSeleccionada,
        motivoError: evaluacion.motivoError,
        productosSeleccionadosIds: estado.seleccionadosIds,
      },
    });

    observadoresJuego.alRegistrarEvento(eventoResultado);

    if (esAcierto) {
      observadoresJuego.alRegistrarEvento(
        construirEventoMercadoAr({
          tipoEvento: TIPOS_EVENTO_SESION.nivelCompletado,
          tiempoReaccionMs: Date.now() - inicioPartidaRef.current,
          puntos: 18,
          comboEnEvento,
          metadata: {
            ronda: estado.indiceRonda + 1,
            totalGastado: evaluacion.totalGastado,
          },
        }),
      );
    }

    const siguienteEstado = {
      aciertos: estado.aciertos + (esAcierto ? 1 : 0),
      errores: estado.errores + (esAcierto ? 0 : 1),
      comboActual: esAcierto ? comboEnEvento : 0,
      comboMaximo: Math.max(estado.comboMaximo, comboEnEvento),
    };

    setEstado((previo) => ({
      ...previo,
      ...siguienteEstado,
      ultimaEvaluacion: evaluacion,
      mensaje: esAcierto
        ? `Muy bien. Compraste correctamente con ${evaluacion.totalGastado} monedas.`
        : `Revisa tu canasta. Motivo: ${evaluacion.motivoError?.replace(/_/g, ' ') ?? 'intento invalido'}.`,
    }));

    if (!esAcierto) {
      return;
    }

    const indiceSiguiente = estado.indiceRonda + 1;
    const pudoAvanzar = await avanzarRonda(indiceSiguiente);

    if (!pudoAvanzar) {
      setEstado((previo) => ({
        ...previo,
        ...siguienteEstado,
        ultimaEvaluacion: evaluacion,
      }));
      finalizarPartida({ rondasCompletadas: indiceSiguiente });
    }
  };

  const salir = () => {
    if (!finalizadoRef.current) {
      finalizarPartida();
    }

    onSalir?.();
  };

  const totalSeleccionado = useMemo(
    () =>
      estado.seleccionadosIds.reduce((acumulado, productoId) => {
        const producto = estado.ronda.oferta.find((item) => item.id === productoId);
        return acumulado + (producto?.precio ?? 0);
      }, 0),
    [estado.ronda.oferta, estado.seleccionadosIds],
  );

  const presupuestoRestante = estado.ronda.objetivo.presupuestoObjetivo - totalSeleccionado;

  if (configuracionActiva.modoPresentacion === 'ar-superficie-preview') {
    return (
      <MercadoArVistaArPreview
        onSalir={salir}
        escenaEspacial={escenaEspacial}
        rondaLabel={`${estado.indiceRonda + 1}/${configuracionActiva.rondasPorPartida}`}
        presupuestoLabel={`${estado.ronda.objetivo.presupuestoObjetivo}`}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.eyebrow}>Mercado Inteligente AR</Text>
            <Text style={styles.title}>Compra con cabeza y cuida tus monedas</Text>
            <Text style={styles.body}>{estado.mensaje}</Text>
            <Text style={styles.helperText}>
              {formatearModoPersistencia(sesionMercado.persistenciaRemotaHabilitada)}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.9} onPress={salir} style={styles.exitButton}>
            <Text style={styles.exitButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="Ronda" value={`${estado.indiceRonda + 1}/${configuracionActiva.rondasPorPartida}`} />
          <MetricCard label="Presupuesto" value={`${estado.ronda.objetivo.presupuestoObjetivo}`} />
          <MetricCard label="Carrito" value={`${totalSeleccionado}`} />
          <MetricCard label="Restan" value={`${presupuestoRestante}`} />
          <MetricCard label="Aciertos" value={`${estado.aciertos}`} />
        </View>

        <View style={styles.objectiveCard}>
          <Text style={styles.sectionTitle}>Objetivo actual</Text>
          <Text style={styles.objectiveText}>{estado.ronda.objetivo.textoGuia}</Text>
          <Text style={styles.objectiveMeta}>
            Ayudas: {configuracionActiva.configuracion.ayudasDisponibles - estado.ayudasUsadas} disponibles
          </Text>
        </View>

        {sesionMercado.persistencia.estado === 'iniciando' || estado.fase === FASES_MERCADO_AR.preparando ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.purple} />
            <Text style={styles.loadingText}>Preparando la ronda con el contrato oficial de sesiones.</Text>
          </View>
        ) : null}

        <View style={styles.marketCard}>
          <Text style={styles.sectionTitle}>Puesto del mercado</Text>
          <View style={styles.marketStage}>
            <View style={styles.marketGlowA} />
            <View style={styles.marketGlowB} />
            <View style={styles.marketStand}>
              <View style={styles.marketBanner}>
                <Text style={styles.marketBannerText}>Escena lista para AR</Text>
              </View>
              <View style={styles.marketAwning} />
              <View style={styles.marketPoleLeft} />
              <View style={styles.marketPoleRight} />
              <View style={styles.marketCounter}>
                <View style={styles.productGrid}>
                  {estado.ronda.oferta.map((producto) => (
                    <ProductCard
                      key={producto.id}
                      producto={producto}
                      selected={estado.seleccionadosIds.includes(producto.id)}
                      disabled={estado.fase !== FASES_MERCADO_AR.jugando}
                      onPress={() => toggleProducto(producto.id)}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.marketBasket}>
                <Text style={styles.marketBasketText}>Canasta</Text>
                <Text style={styles.marketBasketCount}>{estado.seleccionadosIds.length}</Text>
              </View>
              <View style={styles.marketShadow} />
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity activeOpacity={0.88} onPress={gastarAyuda} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Pedir pista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={confirmarSeleccion}
            disabled={estado.fase !== FASES_MERCADO_AR.jugando}
            style={[
              styles.primaryButton,
              estado.fase !== FASES_MERCADO_AR.jugando && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>Confirmar compra</Text>
          </TouchableOpacity>
        </View>

        {sesionMercado.persistencia.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Persistencia</Text>
            <Text style={styles.errorText}>{sesionMercado.persistencia.error}</Text>
          </View>
        ) : null}

        {estado.ultimaEvaluacion ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.sectionTitle}>Ultima validacion</Text>
            <Text style={styles.feedbackText}>
              Total gastado: {estado.ultimaEvaluacion.totalGastado} monedas
            </Text>
            <Text style={styles.feedbackText}>
              Resultado: {estado.ultimaEvaluacion.exito ? 'Correcto' : estado.ultimaEvaluacion.motivoError}
            </Text>
          </View>
        ) : null}

        {estado.resultado ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Resumen oficial local</Text>
            <Text style={styles.resultText}>Puntaje: {estado.resultado.estadisticas.puntaje}</Text>
            <Text style={styles.resultText}>Precision: {estado.resultado.estadisticas.precisionPct}%</Text>
            <Text style={styles.resultText}>Rondas completadas: {estado.resultado.detalles.rondasCompletadas}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ProductCard({ producto, selected, disabled, onPress }) {
  const accent = resolverTemaCategoriaMercado(producto.categoria) ?? buildProductAccent(producto.categoria);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.productCard,
        { backgroundColor: accent.fondo, borderColor: selected ? accent.tinta : accent.borde },
        selected && styles.productCardSelected,
        disabled && styles.productCardDisabled,
      ]}
    >
      <Text style={[styles.productCategory, { color: accent.tinta }]}>{producto.categoria}</Text>
      <View style={[styles.productOrb, { backgroundColor: accent.techo ?? accent.borde }]} />
      <Text style={[styles.productName, { color: accent.tinta }]}>{producto.nombre}</Text>
      <Text style={[styles.productPrice, { color: accent.tinta }]}>{producto.precio} monedas</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mercadoArTheme.fondos.cielo,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  hero: {
    borderRadius: radii.lg,
    backgroundColor: '#F4A63C',
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadows.soft,
  },
  heroTextBlock: {
    flex: 1,
  },
  eyebrow: {
    color: '#6B3D00',
    fontFamily: fonts.black,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 24,
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  body: {
    color: '#FFF7E8',
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  helperText: {
    color: '#FFE6BB',
    fontFamily: fonts.bold,
    fontSize: 11,
    marginTop: spacing.sm,
  },
  exitButton: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    backgroundColor: '#6B3D00',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exitButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: '22%',
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.soft,
  },
  metricValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 20,
  },
  metricLabel: {
    color: colors.textGray,
    fontFamily: fonts.bold,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  objectiveCard: {
    borderRadius: radii.md,
    backgroundColor: '#FFF1D8',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F0C27B',
  },
  sectionTitle: {
    color: '#6B3D00',
    fontFamily: fonts.black,
    fontSize: 15,
  },
  objectiveText: {
    color: '#7A5A2E',
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  objectiveMeta: {
    color: '#A16C1D',
    fontFamily: fonts.bold,
    fontSize: 11,
    marginTop: spacing.sm,
  },
  loadingCard: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    flex: 1,
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  marketCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  marketStage: {
    borderRadius: 28,
    backgroundColor: '#FFECC9',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  marketGlowA: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
    top: -20,
    left: -20,
  },
  marketGlowB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    top: 90,
    right: -10,
  },
  marketStand: {
    minHeight: 340,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  marketBanner: {
    position: 'absolute',
    top: 4,
    borderRadius: radii.md,
    backgroundColor: '#FFF7E8',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: '#F6C77A',
  },
  marketBannerText: {
    color: mercadoArTheme.tintas.alerta,
    fontFamily: fonts.black,
    fontSize: 12,
  },
  marketAwning: {
    position: 'absolute',
    top: 48,
    width: '86%',
    height: 48,
    borderRadius: 20,
    backgroundColor: mercadoArTheme.fondos.toldo,
  },
  marketPoleLeft: {
    position: 'absolute',
    top: 84,
    left: '16%',
    width: 10,
    height: 160,
    borderRadius: 8,
    backgroundColor: '#C67B2C',
  },
  marketPoleRight: {
    position: 'absolute',
    top: 84,
    right: '16%',
    width: 10,
    height: 160,
    borderRadius: 8,
    backgroundColor: '#C67B2C',
  },
  marketCounter: {
    width: '92%',
    minHeight: 184,
    borderRadius: 28,
    backgroundColor: mercadoArTheme.fondos.mostrador,
    padding: spacing.md,
    justifyContent: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  productCard: {
    width: '30%',
    minHeight: 120,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCardSelected: {
    transform: [{ translateY: -2 }],
    shadowColor: '#B76E00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productCategory: {
    fontFamily: fonts.black,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  productOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  productName: {
    fontFamily: fonts.black,
    fontSize: 13,
    textAlign: 'center',
  },
  productPrice: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  marketBasket: {
    position: 'absolute',
    right: 14,
    bottom: 30,
    width: 84,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#D89B48',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F6D2A3',
  },
  marketBasketText: {
    color: '#6B3D00',
    fontFamily: fonts.black,
    fontSize: 11,
  },
  marketBasketCount: {
    color: '#4A2A00',
    fontFamily: fonts.black,
    fontSize: 18,
  },
  marketShadow: {
    position: 'absolute',
    bottom: 6,
    width: '76%',
    height: 24,
    borderRadius: 999,
    backgroundColor: mercadoArTheme.fondos.sombra,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: '#D8B06A',
    backgroundColor: '#FFF4DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#87591E',
    fontFamily: fonts.black,
    fontSize: 13,
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: '#E56B1F',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 14,
  },
  errorCard: {
    borderRadius: radii.md,
    backgroundColor: '#FFE4E7',
    borderWidth: 1,
    borderColor: '#FFC8CF',
    padding: spacing.md,
  },
  errorTitle: {
    color: colors.danger,
    fontFamily: fonts.black,
    fontSize: 13,
  },
  errorText: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  feedbackCard: {
    borderRadius: radii.md,
    backgroundColor: '#F7EDFF',
    padding: spacing.md,
  },
  feedbackText: {
    color: colors.purpleDark,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  resultCard: {
    borderRadius: radii.lg,
    backgroundColor: '#2B173D',
    padding: spacing.lg,
    ...shadows.soft,
  },
  resultTitle: {
    color: '#FFD36C',
    fontFamily: fonts.black,
    fontSize: 18,
  },
  resultText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
});
