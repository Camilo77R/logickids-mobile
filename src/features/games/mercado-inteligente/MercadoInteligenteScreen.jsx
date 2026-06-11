import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radii, spacing } from '../../../constants/theme';
import {
  ESTADOS_FINALIZACION_SESION,
  TIPOS_EVENTO_SESION,
} from '../core/contratoSesionJuego';
import {
  ESTADOS_PERSISTENCIA_MERCADO,
  useSesionMercado,
} from './aplicacion/useSesionMercado';
import {
  obtenerConfiguracionBaseMercado,
  resolverConfiguracionMercadoDesdeBackend,
} from './mercadoConfiguracion';
import {
  construirEventoMercado,
  construirResumenPartidaMercado,
  evaluarSeleccionMercado,
  generarRondaMercado,
} from './mercadoMotor';
import Mercado3DWebView from './presentacion/Mercado3DWebView';
import MercadoHudSuperior from './presentacion/componentes/MercadoHudSuperior';
import MercadoMisionCard from './presentacion/componentes/MercadoMisionCard';
import MercadoPanelInferior from './presentacion/componentes/MercadoPanelInferior';
import MercadoResultadoOverlay from './presentacion/componentes/MercadoResultadoOverlay';
import { useMercadoFeedback } from './useMercadoFeedback';

const FASES_MERCADO = Object.freeze({
  preparando: 'preparando',
  jugando: 'jugando',
  finalizado: 'finalizado',
  bloqueado: 'bloqueado',
});

const MENSAJES_EXITO = Object.freeze([
  'Compra perfecta. El mercadito celebra contigo.',
  'Gran cálculo. Tu canasta quedó lista.',
  'Súper compra. Elegiste con cabeza.',
  'Excelente ajuste. Ese total funciona muy bien.',
]);

const normalizarEnteroPositivo = (valor, respaldo = 1) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : respaldo;
};

const calcularTotal = ({ ronda, seleccionadosIds }) =>
  seleccionadosIds.reduce((total, productoId) => {
    const producto = ronda.oferta.find((item) => item.id === productoId);
    return total + (producto?.precio ?? 0);
  }, 0);

const obtenerCantidadObjetivo = (ronda) =>
  normalizarEnteroPositivo(ronda?.objetivo?.cantidadObjetivos, 2);

const crearResumenCanasta = ({ ronda, seleccionadosIds }) => {
  if (!seleccionadosIds.length) {
    return 'Toca productos para llenar la canasta.';
  }

  return seleccionadosIds
    .map((productoId) => {
      const producto = ronda.oferta.find((item) => item.id === productoId);

      if (!producto) {
        return null;
      }

      return `${producto.nombre} ${producto.precio}m`;
    })
    .filter(Boolean)
    .join('  +  ');
};

const calcularEstrellasVisuales = ({ aciertos = 0, errores = 0 }) => {
  const intentos = aciertos + errores;

  if (intentos <= 0 || aciertos <= 0) {
    return 0;
  }

  const precision = aciertos / intentos;

  if (precision >= 0.9) {
    return 3;
  }

  if (precision >= 0.7) {
    return 2;
  }

  return 1;
};

const resolverIndiceNivelOficial = ({ respuestaInicioSesion, contextoSesion }) => {
  const nivelEnBloque = respuestaInicioSesion?.sesion?.nivel_en_bloque;
  const pasoActual = contextoSesion?.sesionPasoActual ?? contextoSesion?.sesionNivelEnBloque;
  const nivel = normalizarEnteroPositivo(nivelEnBloque ?? pasoActual, 1);

  return Math.max(0, nivel - 1);
};

const construirEtiquetaNivelOficial = ({ respuestaInicioSesion, contextoSesion }) => {
  const nivelActual = normalizarEnteroPositivo(
    respuestaInicioSesion?.sesion?.nivel_en_bloque ??
      contextoSesion?.sesionNivelEnBloque ??
      contextoSesion?.sesionPasoActual,
    1,
  );

  const totalNiveles = normalizarEnteroPositivo(contextoSesion?.sesionTotalPasos, null);

  return totalNiveles ? `${nivelActual}/${totalNiveles}` : `${nivelActual}`;
};

const haySiguienteNivelMismoJuegoPrevisto = ({ respuestaInicioSesion, contextoSesion }) => {
  const nivelActual = normalizarEnteroPositivo(
    respuestaInicioSesion?.sesion?.nivel_en_bloque ??
      contextoSesion?.sesionNivelEnBloque ??
      contextoSesion?.sesionPasoActual,
    1,
  );

  const totalNiveles = normalizarEnteroPositivo(contextoSesion?.sesionTotalPasos, null);

  return Boolean(totalNiveles && nivelActual < totalNiveles);
};

const construirCierreSesionMercado = ({
  respuestaInicioSesion,
  respuestaFinalizacionSesion,
}) => {
  if (!respuestaFinalizacionSesion) {
    return null;
  }

  const progreso = respuestaFinalizacionSesion.progreso_ruta ?? null;
  const siguientePaso = progreso?.siguientePaso ?? null;
  const minijuegoActualId = Number(respuestaInicioSesion?.sesion?.minijuego_id ?? 0);
  const siguienteMinijuegoId = Number(siguientePaso?.minijuego_id ?? 0);
  const siguienteEsMismoJuego =
    Boolean(siguientePaso) &&
    minijuegoActualId > 0 &&
    siguienteMinijuegoId > 0 &&
    minijuegoActualId === siguienteMinijuegoId;

  return {
    haySiguientePaso: Boolean(progreso?.haySiguientePaso),
    siguienteEsMismoJuego,
    participanteEstado: progreso?.participanteEstado ?? null,
    resumenOficial: respuestaFinalizacionSesion?.resumen_oficial ?? null,
    logros: Array.isArray(respuestaFinalizacionSesion?.logros_desbloqueados)
      ? respuestaFinalizacionSesion.logros_desbloqueados
      : [],
  };
};

const resolverCopyResultadoMercado = ({ cierreSesion, siguienteNivelPrevisto = false }) => {
  if (!cierreSesion) {
    return {
      mensaje: 'Tus estrellas están listas. Estamos avisando al tablero del tutor.',
      etiquetaPrimaria: siguienteNivelPrevisto ? 'Preparando nivel...' : null,
      etiquetaSecundaria: 'Volver al tablero',
      esperandoBackend: true,
    };
  }

  if (cierreSesion.haySiguientePaso && cierreSesion.siguienteEsMismoJuego) {
    return {
      mensaje: 'Nivel guardado. El siguiente reto del mercado está listo.',
      etiquetaPrimaria: 'Siguiente nivel',
      etiquetaSecundaria: 'Volver al tablero',
      esperandoBackend: false,
    };
  }

  if (cierreSesion.haySiguientePaso) {
    return {
      mensaje: 'Mercado listo. Vuelve al tablero para continuar la ruta.',
      etiquetaPrimaria: null,
      etiquetaSecundaria: 'Volver al tablero',
      esperandoBackend: false,
    };
  }

  return {
    mensaje:
      cierreSesion.participanteEstado === 'completado'
        ? 'Actividad completada. Tus resultados quedaron guardados.'
        : 'La actividad quedó cerrada para este estudiante.',
    etiquetaPrimaria: null,
    etiquetaSecundaria: 'Volver al inicio',
    esperandoBackend: false,
  };
};

const resolverMensajeCarrito = ({ ronda, seleccionadosIds }) => {
  if (seleccionadosIds.length === 0) {
    return 'Toca productos del mercadito para empezar.';
  }

  const cantidadObjetivo = obtenerCantidadObjetivo(ronda);
  const total = calcularTotal({ ronda, seleccionadosIds });
  const presupuesto = ronda.objetivo.presupuestoObjetivo;
  const diferencia = presupuesto - total;

  if (seleccionadosIds.length < cantidadObjetivo) {
    return `Llevas ${seleccionadosIds.length}/${cantidadObjetivo} productos. Sigue eligiendo.`;
  }

  if (diferencia < 0) {
    return `Casi. Te pasaste por ${Math.abs(diferencia)} monedas. Cambia un producto.`;
  }

  if (diferencia === 0) {
    return 'Total exacto. Prueba la compra cuando estés listo.';
  }

  return `Vas en ${total} de ${presupuesto} monedas. Te faltan ${diferencia}.`;
};

const resolverMensajeIntentoMercado = (evaluacion) => {
  if (evaluacion.exito) {
    return MENSAJES_EXITO[evaluacion.totalGastado % MENSAJES_EXITO.length];
  }

  if (evaluacion.excesoPresupuesto > 0) {
    return `Casi. Te pasaste por ${evaluacion.excesoPresupuesto} monedas. Quita o cambia un producto.`;
  }

  if (evaluacion.faltantePresupuesto > 0) {
    return `Casi. Te faltan ${evaluacion.faltantePresupuesto} monedas. Cambia tu elección.`;
  }

  if (evaluacion.motivoError === 'cantidad_incorrecta') {
    const cantidadSeleccionada = evaluacion.productosSeleccionados?.length ?? 0;

    return `Casi. Elegiste ${cantidadSeleccionada} productos y el pedido busca otra cantidad.`;
  }

  if (evaluacion.motivoError === 'categoria_incorrecta') {
    return 'Casi. Revisa la categoría que pidió el mercadito.';
  }

  return 'Casi. Ajusta la canasta y prueba de nuevo.';
};

const resolverEstadoGuardado = (persistencia) => {
  if (!persistencia) {
    return 'Resultado listo.';
  }

  switch (persistencia.estado) {
    case ESTADOS_PERSISTENCIA_MERCADO.finalizada:
      return 'Progreso guardado.';
    case ESTADOS_PERSISTENCIA_MERCADO.finalizando:
    case ESTADOS_PERSISTENCIA_MERCADO.sincronizando:
      return 'Guardando en segundo plano.';
    case ESTADOS_PERSISTENCIA_MERCADO.error:
      return 'Resultado listo. Revisaremos la conexión al volver.';
    default:
      return persistencia.modo === 'remota'
        ? 'Resultado listo.'
        : 'Modo práctica: no se guarda en tablero.';
  }
};

const resolverEstadoVisualError = (evaluacion) => {
  if (evaluacion.excesoPresupuesto > 0) {
    return 'over_budget';
  }

  if (evaluacion.faltantePresupuesto > 0) {
    return 'under_budget';
  }

  return 'adjust';
};

export default function MercadoInteligenteScreen({
  onSalir,
  configuracionInicial,
  contextoSesion,
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const configuracionBase = useMemo(
    () => obtenerConfiguracionBaseMercado(configuracionInicial),
    [configuracionInicial],
  );

  const [configuracionActiva, setConfiguracionActiva] = useState(configuracionBase);
  const [revisionPreparacion, setRevisionPreparacion] = useState(0);
  const [preparandoNivel, setPreparandoNivel] = useState(false);
  const [feedbackEscena, setFeedbackEscena] = useState(null);

  const [estado, setEstado] = useState(() => ({
    fase: FASES_MERCADO.preparando,
    indiceRonda: 0,
    ronda: generarRondaMercado({ configuracion: configuracionBase, indiceRonda: 0 }),
    seleccionadosIds: [],
    aciertos: 0,
    errores: 0,
    comboActual: 0,
    comboMaximo: 0,
    ayudasUsadas: 0,
    mensaje: 'Compra exacto, prueba, corrige y gana estrellas.',
    resultado: null,
    ultimaEvaluacion: null,
    tuvoErrorAntesDeAcierto: false,
  }));

  const sesionMercado = useSesionMercado({
    configuracion: configuracionActiva,
    contextoSesion,
  });

  const feedbackMercado = useMercadoFeedback();

  useEffect(() => {
    const bloquearHorizontal = async () => {
      try {
        StatusBar.setHidden(true, 'fade');
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch {
        // La orientación no debe romper el juego.
      }
    };

    bloquearHorizontal();

    return () => {
      StatusBar.setHidden(false, 'fade');
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => null);
    };
  }, []);

  const inicioPartidaRef = useRef(Date.now());
  const inicioRondaRef = useRef(Date.now());
  const finalizadoRef = useRef(false);
  const preparacionNivelIdRef = useRef(0);

  const {
    prepararRonda,
    prepararNuevaRonda,
    observadoresJuego,
    persistenciaRemotaHabilitada,
  } = sesionMercado;

  const prepararNivelActual = useCallback(async ({
    reiniciarSesion = false,
    mensajePreparacion = 'Abriendo el mercadito.',
  } = {}) => {
    const idPreparacion = preparacionNivelIdRef.current + 1;
    preparacionNivelIdRef.current = idPreparacion;

    if (reiniciarSesion) {
      prepararNuevaRonda();
    }

    const preparacionSigueVigente = () => preparacionNivelIdRef.current === idPreparacion;

    setPreparandoNivel(true);
    setFeedbackEscena(null);
    inicioPartidaRef.current = Date.now();
    inicioRondaRef.current = Date.now();
    finalizadoRef.current = false;

    setEstado((previo) => ({
      ...previo,
      fase: FASES_MERCADO.preparando,
      seleccionadosIds: [],
      aciertos: 0,
      errores: 0,
      comboActual: 0,
      comboMaximo: 0,
      ayudasUsadas: 0,
      resultado: null,
      ultimaEvaluacion: null,
      tuvoErrorAntesDeAcierto: false,
      mensaje: mensajePreparacion,
    }));

    try {
      const resultadoPreparacion = await prepararRonda(configuracionBase.dificultad);

      if (!preparacionSigueVigente()) {
        return false;
      }

      if (persistenciaRemotaHabilitada && !resultadoPreparacion?.lista) {
        setEstado((previo) => ({
          ...previo,
          fase: FASES_MERCADO.bloqueado,
          mensaje: 'No pudimos abrir la sesión de juego. Vuelve al tablero y revisa la conexión.',
        }));

        return false;
      }

      const configuracionDesdeBackend = resolverConfiguracionMercadoDesdeBackend({
        configuracionLocal: configuracionBase,
        respuestaInicioSesion: resultadoPreparacion?.respuestaInicio,
      });

      const indiceNivelOficial = resolverIndiceNivelOficial({
        respuestaInicioSesion: resultadoPreparacion?.respuestaInicio,
        contextoSesion,
      });

      const rondaNivel = generarRondaMercado({
        configuracion: configuracionDesdeBackend,
        indiceRonda: indiceNivelOficial,
      });

      setConfiguracionActiva(configuracionDesdeBackend);
      inicioRondaRef.current = Date.now();

      setEstado((previo) => ({
        ...previo,
        fase: FASES_MERCADO.jugando,
        indiceRonda: indiceNivelOficial,
        ronda: rondaNivel,
        seleccionadosIds: [],
        mensaje: rondaNivel.objetivo.textoGuia,
      }));

      return true;
    } finally {
      if (preparacionSigueVigente()) {
        setPreparandoNivel(false);
      }
    }
  }, [
    configuracionBase,
    contextoSesion,
    persistenciaRemotaHabilitada,
    prepararNuevaRonda,
    prepararRonda,
  ]);

  useEffect(() => {
    void prepararNivelActual({
      mensajePreparacion: 'Sincronizando el nivel actual del mercado.',
    });

    return () => {
      preparacionNivelIdRef.current += 1;
    };
  }, [prepararNivelActual, revisionPreparacion]);

  const finalizarPartida = useCallback(({
    rondasCompletadas = 1,
    resumenEstado,
    estadoFinal = ESTADOS_FINALIZACION_SESION.completado,
    mostrarResultado = true,
  } = {}) => {
    if (finalizadoRef.current) {
      return;
    }

    finalizadoRef.current = true;

    const baseResumen = resumenEstado ?? estado;
    const resultado = construirResumenPartidaMercado({
      configuracion: configuracionActiva,
      aciertos: baseResumen.aciertos,
      errores: baseResumen.errores,
      comboMaximo: baseResumen.comboMaximo,
      rondasCompletadas,
      tiempoTotalMs: Date.now() - inicioPartidaRef.current,
      ayudasUsadas: baseResumen.ayudasUsadas,
      estado: estadoFinal,
    });

    observadoresJuego.alFinalizarPartida(resultado);

    if (!mostrarResultado) {
      return;
    }

    setEstado((previo) => ({
      ...previo,
      fase: FASES_MERCADO.finalizado,
      resultado,
      mensaje:
        estadoFinal === ESTADOS_FINALIZACION_SESION.abandonado
          ? 'Mercado cerrado. Puedes volver al tablero.'
          : 'Mercado completado. Buen trabajo con tus monedas.',
    }));
  }, [configuracionActiva, estado, observadoresJuego]);

  const toggleProducto = useCallback((productoId) => {
    setEstado((previo) => {
      if (previo.fase !== FASES_MERCADO.jugando) {
        return previo;
      }

      const estaSeleccionado = previo.seleccionadosIds.includes(productoId);
      setFeedbackEscena(null);

      feedbackMercado.reproducirToque();

      const seleccionadosIds = estaSeleccionado
        ? previo.seleccionadosIds.filter((id) => id !== productoId)
        : [...previo.seleccionadosIds, productoId];

      return {
        ...previo,
        seleccionadosIds,
        mensaje: resolverMensajeCarrito({ ronda: previo.ronda, seleccionadosIds }),
      };
    });
  }, [feedbackMercado]);

  const gastarAyuda = useCallback(() => {
    if (estado.fase !== FASES_MERCADO.jugando) {
      return;
    }

    if (estado.ayudasUsadas >= configuracionActiva.configuracion.ayudasDisponibles) {
      feedbackMercado.reproducirAjuste();

      setEstado((previo) => ({
        ...previo,
        mensaje: 'Ya usaste la pista de este reto. Prueba una combinación.',
      }));

      return;
    }

    feedbackMercado.reproducirToque();

    setEstado((previo) => ({
      ...previo,
      ayudasUsadas: previo.ayudasUsadas + 1,
      mensaje: `Pista: revisa el total y busca ${obtenerCantidadObjetivo(previo.ronda)} productos.`,
    }));
  }, [
    configuracionActiva.configuracion.ayudasDisponibles,
    estado.ayudasUsadas,
    estado.fase,
    feedbackMercado,
  ]);

  const confirmarSeleccion = useCallback(() => {
    if (estado.fase !== FASES_MERCADO.jugando) {
      return;
    }

    if (estado.seleccionadosIds.length === 0) {
      feedbackMercado.reproducirAjuste();

      setEstado((previo) => ({
        ...previo,
        mensaje: 'Toca un producto del mercadito antes de probar la compra.',
      }));

      return;
    }

    const evaluacion = evaluarSeleccionMercado({
      ronda: estado.ronda,
      productosSeleccionadosIds: estado.seleccionadosIds,
    });

    const esAcierto = evaluacion.exito;
    const comboEnEvento = esAcierto ? estado.comboActual + 1 : 0;
    const puntos = esAcierto ? (estado.tuvoErrorAntesDeAcierto ? 10 : 12) : 0;

    if (esAcierto) {
      feedbackMercado.reproducirExito();
      setFeedbackEscena({ state: 'success' });
    } else {
      feedbackMercado.reproducirAjuste();
      setFeedbackEscena({ state: resolverEstadoVisualError(evaluacion) });
    }

    observadoresJuego.alRegistrarEvento(
      construirEventoMercado({
        tipoEvento: esAcierto ? TIPOS_EVENTO_SESION.acierto : TIPOS_EVENTO_SESION.error,
        tiempoReaccionMs: Date.now() - inicioRondaRef.current,
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
      }),
    );

    if (!esAcierto) {
      setEstado((previo) => ({
        ...previo,
        errores: previo.errores + 1,
        comboActual: 0,
        ultimaEvaluacion: evaluacion,
        tuvoErrorAntesDeAcierto: true,
        mensaje: resolverMensajeIntentoMercado(evaluacion),
      }));

      return;
    }

    observadoresJuego.alRegistrarEvento(
      construirEventoMercado({
        tipoEvento: TIPOS_EVENTO_SESION.nivelCompletado,
        tiempoReaccionMs: Date.now() - inicioRondaRef.current,
        puntos: 18,
        comboEnEvento,
        metadata: {
          ronda: estado.indiceRonda + 1,
          totalGastado: evaluacion.totalGastado,
          correccion: estado.tuvoErrorAntesDeAcierto,
        },
      }),
    );

    const resumenEstadoFinal = {
      ...estado,
      aciertos: estado.aciertos + 1,
      comboActual: comboEnEvento,
      comboMaximo: Math.max(estado.comboMaximo, comboEnEvento),
      ultimaEvaluacion: evaluacion,
    };

    setEstado((previo) => ({
      ...previo,
      aciertos: resumenEstadoFinal.aciertos,
      comboActual: comboEnEvento,
      comboMaximo: resumenEstadoFinal.comboMaximo,
      ultimaEvaluacion: evaluacion,
      mensaje: resolverMensajeIntentoMercado(evaluacion),
    }));

    finalizarPartida({
      rondasCompletadas: 1,
      resumenEstado: resumenEstadoFinal,
    });
  }, [estado, feedbackMercado, finalizarPartida, observadoresJuego]);

  const salir = useCallback(() => {
    const debeCerrarSesionIniciada =
      !finalizadoRef.current &&
      estado.fase !== FASES_MERCADO.bloqueado &&
      estado.fase !== FASES_MERCADO.preparando;

    if (debeCerrarSesionIniciada) {
      finalizarPartida({
        estadoFinal: ESTADOS_FINALIZACION_SESION.abandonado,
        mostrarResultado: false,
      });
    }

    onSalir?.();
  }, [estado.fase, finalizarPartida, onSalir]);

  const reintentarPreparacion = useCallback(() => {
    setRevisionPreparacion((revisionActual) => revisionActual + 1);
  }, []);

  const continuarNivel = useCallback(() => {
    if (preparandoNivel) {
      return;
    }

    void prepararNivelActual({
      reiniciarSesion: true,
      mensajePreparacion: 'Abriendo el siguiente reto del mercado.',
    });
  }, [preparandoNivel, prepararNivelActual]);

  const manejarMensajeEscena = useCallback((mensaje) => {
    if (mensaje.type === 'PRODUCT_TOGGLED') {
      toggleProducto(mensaje.productId);
    }
  }, [toggleProducto]);

  const totalSeleccionado = useMemo(
    () => calcularTotal({ ronda: estado.ronda, seleccionadosIds: estado.seleccionadosIds }),
    [estado.ronda, estado.seleccionadosIds],
  );

  const presupuesto = estado.ronda.objetivo.presupuestoObjetivo;
  const cantidadObjetivo = obtenerCantidadObjetivo(estado.ronda);
  const monedasRestantes = Math.max(0, presupuesto - totalSeleccionado);
  const productosSeleccionados = useMemo(
    () =>
      estado.seleccionadosIds
        .map((productoId) => estado.ronda.oferta.find((producto) => producto.id === productoId))
        .filter(Boolean),
    [estado.ronda.oferta, estado.seleccionadosIds],
  );

  const cierreSesion = useMemo(
    () =>
      construirCierreSesionMercado({
        respuestaInicioSesion: sesionMercado.respuestaInicio,
        respuestaFinalizacionSesion: sesionMercado.respuestaFinalizacion,
      }),
    [sesionMercado.respuestaFinalizacion, sesionMercado.respuestaInicio],
  );

  const copyResultado = useMemo(
    () =>
      resolverCopyResultadoMercado({
        cierreSesion,
        siguienteNivelPrevisto: haySiguienteNivelMismoJuegoPrevisto({
          respuestaInicioSesion: sesionMercado.respuestaInicio,
          contextoSesion,
        }),
      }),
    [cierreSesion, contextoSesion, sesionMercado.respuestaInicio],
  );

  const etiquetaNivelActual = useMemo(
    () =>
      construirEtiquetaNivelOficial({
        respuestaInicioSesion: sesionMercado.respuestaInicio,
        contextoSesion,
      }),
    [contextoSesion, sesionMercado.respuestaInicio],
  );

  const estrellasOficiales = Number(
    sesionMercado.respuestaFinalizacion?.resumen_oficial?.estrellas_obtenidas,
  );

  const estrellasVisuales = Number.isFinite(estrellasOficiales)
    ? Math.max(0, Math.min(3, estrellasOficiales))
    : calcularEstrellasVisuales({
        aciertos: estado.aciertos,
        errores: estado.errores,
      });

  const estadoGuardado = resolverEstadoGuardado(sesionMercado.persistencia);
  const confirmarDeshabilitado =
    estado.fase !== FASES_MERCADO.jugando || estado.seleccionadosIds.length === 0;

  if (estado.fase === FASES_MERCADO.bloqueado) {
    return (
      <PantallaSesionBloqueada
        mensaje={estado.mensaje}
        onReintentar={reintentarPreparacion}
        onSalir={salir}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.escena}>
        <Mercado3DWebView
          ronda={estado.ronda}
          seleccionadosIds={estado.seleccionadosIds}
          estadoCompra={feedbackEscena}
          onMensaje={manejarMensajeEscena}
        />
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.hudSafeArea,
          {
            left: Math.max(safeAreaInsets.left, spacing.sm),
            right: Math.max(safeAreaInsets.right, spacing.xxl),
          },
        ]}
      >
        <MercadoHudSuperior
          nivel={etiquetaNivelActual}
          presupuesto={`${presupuesto}`}
          estrellas={estrellasVisuales}
          combo={estado.comboActual}
          cantidadSeleccionada={estado.seleccionadosIds.length}
          cantidadObjetivo={cantidadObjetivo}
          onSalir={salir}
        />

        <MercadoMisionCard ronda={estado.ronda} />

        <MercadoPanelInferior
          total={totalSeleccionado}
          productosSeleccionados={productosSeleccionados}
          onConfirmar={confirmarSeleccion}
          onReiniciar={reintentarPreparacion}
          onSalir={salir}
          confirmarDeshabilitado={confirmarDeshabilitado}
        />
      </View>

      {estado.fase === FASES_MERCADO.preparando ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#ffb000" />
          <Text style={styles.loadingText}>{estado.mensaje}</Text>
        </View>
      ) : null}

      {estado.resultado ? (
        <MercadoResultadoOverlay
          resultado={estado.resultado}
          estrellas={estrellasVisuales}
          mensaje={copyResultado.mensaje}
          estadoGuardado={estadoGuardado}
          etiquetaPrimaria={copyResultado.etiquetaPrimaria}
          etiquetaSecundaria={copyResultado.etiquetaSecundaria}
          esperandoBackend={copyResultado.esperandoBackend}
          presupuesto={presupuesto}
          monedasUsadas={totalSeleccionado}
          nivel={etiquetaNivelActual}
          onContinuar={continuarNivel}
          onSalir={salir}
        />
      ) : null}
    </SafeAreaView>
  );
}

function PantallaSesionBloqueada({ mensaje, onReintentar, onSalir }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.blockedWrapper}>
        <View style={styles.blockedCard}>
          <Text style={styles.blockedEyebrow}>Mercado en pausa</Text>
          <Text style={styles.blockedTitle}>No abrimos el puesto todavía</Text>
          <Text style={styles.blockedText}>{mensaje}</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={onReintentar} style={styles.blockedPrimaryButton}>
            <Text style={styles.blockedPrimaryText}>Intentar otra vez</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={onSalir} style={styles.blockedSecondaryButton}>
            <Text style={styles.blockedSecondaryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#D38A4A',
  },
  escena: {
    ...StyleSheet.absoluteFillObject,
  },
  hudSafeArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
  loadingOverlay: {
    position: 'absolute',
    zIndex: 90,
    left: spacing.lg,
    right: spacing.lg,
    top: '38%',
    borderRadius: 30,
    backgroundColor: 'rgba(255, 247, 230, 0.98)',
    borderWidth: 4,
    borderColor: '#8CD83A',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: '#4A2504',
    fontFamily: fonts.black,
    fontSize: 18,
    textAlign: 'center',
  },
  blockedWrapper: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  blockedCard: {
    borderRadius: 34,
    backgroundColor: '#FFF7E8',
    padding: spacing.xl,
    borderWidth: 4,
    borderColor: '#8CD83A',
  },
  blockedEyebrow: {
    color: '#B96B1E',
    fontFamily: fonts.black,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  blockedTitle: {
    color: '#4A2504',
    fontFamily: fonts.black,
    fontSize: 31,
    lineHeight: 36,
    marginTop: spacing.xs,
  },
  blockedText: {
    color: '#7B542B',
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  blockedPrimaryButton: {
    minHeight: 64,
    borderRadius: radii.pill,
    backgroundColor: '#8CD83A',
    borderWidth: 4,
    borderColor: '#3B8E18',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  blockedPrimaryText: {
    color: '#FFFDF7',
    fontFamily: fonts.black,
    fontSize: 20,
  },
  blockedSecondaryButton: {
    minHeight: 62,
    borderRadius: radii.pill,
    backgroundColor: '#49B5FF',
    borderWidth: 4,
    borderColor: '#1C71BF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  blockedSecondaryText: {
    color: '#FFFDF7',
    fontFamily: fonts.black,
    fontSize: 19,
  },
});
