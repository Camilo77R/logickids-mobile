import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ESTADOS_FINALIZACION_SESION,
  TIPOS_EVENTO_SESION,
} from '../../core/contratoSesionJuego';
import {
  obtenerConfiguracionBaseMercado,
  resolverConfiguracionMercadoDesdeBackend,
} from '../mercadoConfiguracion';
import {
  construirEventoMercado,
  construirResumenPartidaMercado,
  evaluarSeleccionMercado,
  generarRondaMercado,
} from '../mercadoMotor';
import { useMercadoFeedback } from '../useMercadoFeedback';
import {
  calcularEstrellasVisualesMercado,
  crearModeloVisualNivelMercado,
  resolverEstadoVisualEvaluacionMercado,
  resolverMensajeEvaluacionMercado,
  resolverMensajeSeleccionMercado,
} from './mercadoPremiumPresentacion';
import {
  ESTADOS_PERSISTENCIA_MERCADO,
  useSesionMercado,
} from './useSesionMercado';

const FASES_MERCADO_PREMIUM = Object.freeze({
  preparando: 'preparando',
  jugando: 'jugando',
  completado: 'completado',
  bloqueado: 'bloqueado',
});

const normalizarEnteroPositivo = (valor, respaldo = 1) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : respaldo;
};

const resolverNivelSesion = ({ respuestaInicio, contextoSesion }) =>
  normalizarEnteroPositivo(
    respuestaInicio?.sesion?.nivel_en_bloque ??
      contextoSesion?.sesionNivelEnBloque ??
      contextoSesion?.sesionPasoActual,
    1,
  );

const resolverTotalNivelesSesion = (contextoSesion) =>
  normalizarEnteroPositivo(contextoSesion?.sesionTotalPasos, 1);

const construirEstadoInicial = (configuracion) => ({
  fase: FASES_MERCADO_PREMIUM.preparando,
  ronda: generarRondaMercado({ configuracion, indiceRonda: 0 }),
  seleccionadosIds: [],
  aciertos: 0,
  errores: 0,
  comboActual: 0,
  comboMaximo: 0,
  ayudasUsadas: 0,
  mensaje: 'Preparando el mercado.',
  resultado: null,
  feedbackEscena: null,
  tuvoErrorAntesDeAcierto: false,
});

export const useMercadoPremiumController = ({
  configuracionInicial,
  contextoSesion,
  onSalir,
}) => {
  const configuracionBase = useMemo(
    () => obtenerConfiguracionBaseMercado(configuracionInicial),
    [configuracionInicial],
  );
  const [configuracionActiva, setConfiguracionActiva] = useState(configuracionBase);
  const [estado, setEstado] = useState(() => construirEstadoInicial(configuracionBase));
  const [revisionPreparacion, setRevisionPreparacion] = useState(0);

  const sesionMercado = useSesionMercado({
    configuracion: configuracionActiva,
    contextoSesion,
  });
  const {
    observadoresJuego,
    persistencia,
    persistenciaRemotaHabilitada,
    prepararNuevaRonda,
    prepararRonda,
    respuestaFinalizacion,
    respuestaInicio,
  } = sesionMercado;
  const feedback = useMercadoFeedback();
  const inicioPartidaRef = useRef(Date.now());
  const inicioRondaRef = useRef(Date.now());
  const finalizadoRef = useRef(false);
  const preparacionIdRef = useRef(0);

  const prepararNivel = useCallback(async () => {
    const preparacionId = preparacionIdRef.current + 1;
    preparacionIdRef.current = preparacionId;
    finalizadoRef.current = false;
    inicioPartidaRef.current = Date.now();

    setEstado((previo) => ({
      ...previo,
      fase: FASES_MERCADO_PREMIUM.preparando,
      seleccionadosIds: [],
      aciertos: 0,
      errores: 0,
      comboActual: 0,
      comboMaximo: 0,
      ayudasUsadas: 0,
      mensaje: 'Preparando el mercado.',
      resultado: null,
      feedbackEscena: null,
      tuvoErrorAntesDeAcierto: false,
    }));

    const preparacion = await prepararRonda(configuracionBase.dificultad);

    if (preparacionIdRef.current !== preparacionId) {
      return;
    }

    if (persistenciaRemotaHabilitada && !preparacion?.lista) {
      setEstado((previo) => ({
        ...previo,
        fase: FASES_MERCADO_PREMIUM.bloqueado,
        mensaje: 'No pudimos abrir la sesion. Vuelve al tablero y revisa la conexion.',
      }));
      return;
    }

    const configuracion = resolverConfiguracionMercadoDesdeBackend({
      configuracionLocal: configuracionBase,
      respuestaInicioSesion: preparacion?.respuestaInicio,
    });
    const nivel = resolverNivelSesion({
      respuestaInicio: preparacion?.respuestaInicio,
      contextoSesion,
    });
    const ronda = generarRondaMercado({
      configuracion,
      indiceRonda: Math.max(0, nivel - 1),
    });

    setConfiguracionActiva(configuracion);
    inicioRondaRef.current = Date.now();
    setEstado((previo) => ({
      ...previo,
      fase: FASES_MERCADO_PREMIUM.jugando,
      ronda,
      seleccionadosIds: [],
      mensaje: ronda.objetivo.textoGuia,
      feedbackEscena: null,
    }));
  }, [configuracionBase, contextoSesion, persistenciaRemotaHabilitada, prepararRonda]);

  useEffect(() => {
    void prepararNivel();

    return () => {
      preparacionIdRef.current += 1;
    };
  }, [prepararNivel, revisionPreparacion]);

  const registrarEvento = useCallback(({
    tipoEvento,
    puntos,
    comboEnEvento,
    metadata,
  }) => {
    observadoresJuego.alRegistrarEvento(
      construirEventoMercado({
        tipoEvento,
        tiempoReaccionMs: Date.now() - inicioRondaRef.current,
        puntos,
        comboEnEvento,
        metadata,
      }),
    );
  }, [observadoresJuego]);

  const finalizar = useCallback(({
    resumenEstado,
    estadoFinal = ESTADOS_FINALIZACION_SESION.completado,
    mostrarCompletado = true,
  }) => {
    if (finalizadoRef.current) {
      return;
    }

    finalizadoRef.current = true;
    const resultado = construirResumenPartidaMercado({
      configuracion: configuracionActiva,
      aciertos: resumenEstado.aciertos,
      errores: resumenEstado.errores,
      comboMaximo: resumenEstado.comboMaximo,
      rondasCompletadas: estadoFinal === ESTADOS_FINALIZACION_SESION.completado ? 1 : 0,
      tiempoTotalMs: Date.now() - inicioPartidaRef.current,
      ayudasUsadas: resumenEstado.ayudasUsadas,
      estado: estadoFinal,
    });

    observadoresJuego.alFinalizarPartida(resultado);

    if (mostrarCompletado) {
      setEstado((previo) => ({
        ...previo,
        fase: FASES_MERCADO_PREMIUM.completado,
        resultado,
      }));
    }
  }, [configuracionActiva, observadoresJuego]);

  const alternarProducto = useCallback((productoId) => {
    setEstado((previo) => {
      if (previo.fase !== FASES_MERCADO_PREMIUM.jugando) {
        return previo;
      }

      const seleccionado = previo.seleccionadosIds.includes(productoId);
      const seleccionadosIds = seleccionado
        ? previo.seleccionadosIds.filter((id) => id !== productoId)
        : [...previo.seleccionadosIds, productoId];

      feedback.reproducirToque();

      return {
        ...previo,
        seleccionadosIds,
        feedbackEscena: null,
        mensaje: resolverMensajeSeleccionMercado({
          ronda: previo.ronda,
          seleccionadosIds,
        }),
      };
    });
  }, [feedback]);

  const reiniciarNivel = useCallback(() => {
    if (estado.fase !== FASES_MERCADO_PREMIUM.jugando) {
      return;
    }

    feedback.reproducirToque();
    setEstado((previo) => ({
      ...previo,
      seleccionadosIds: [],
      mensaje: previo.ronda.objetivo.textoGuia,
      feedbackEscena: { state: 'reset' },
    }));
  }, [estado.fase, feedback]);

  const solicitarPista = useCallback(() => {
    if (estado.fase !== FASES_MERCADO_PREMIUM.jugando) {
      return;
    }

    const maximoAyudas = configuracionActiva.configuracion.ayudasDisponibles;

    setEstado((previo) => {
      if (previo.ayudasUsadas >= maximoAyudas) {
        return {
          ...previo,
          mensaje: 'Ya usaste la pista. Prueba una combinacion.',
        };
      }

      return {
        ...previo,
        ayudasUsadas: previo.ayudasUsadas + 1,
        mensaje: `Pista: busca ${previo.ronda.objetivo.cantidadObjetivos} productos que cumplan la mision.`,
      };
    });
    feedback.reproducirToque();
  }, [configuracionActiva.configuracion.ayudasDisponibles, estado.fase, feedback]);

  const comprar = useCallback(() => {
    if (
      estado.fase !== FASES_MERCADO_PREMIUM.jugando ||
      estado.seleccionadosIds.length === 0
    ) {
      return;
    }

    const evaluacion = evaluarSeleccionMercado({
      ronda: estado.ronda,
      productosSeleccionadosIds: estado.seleccionadosIds,
    });
    const combo = evaluacion.exito ? estado.comboActual + 1 : 0;

    registrarEvento({
      tipoEvento: evaluacion.exito ? TIPOS_EVENTO_SESION.acierto : TIPOS_EVENTO_SESION.error,
      puntos: evaluacion.exito ? (estado.tuvoErrorAntesDeAcierto ? 10 : 12) : 0,
      comboEnEvento: combo,
      metadata: {
        modoObjetivo: estado.ronda.objetivo.modo,
        totalGastado: evaluacion.totalGastado,
        presupuestoObjetivo: estado.ronda.objetivo.presupuestoObjetivo,
        cantidadSeleccionada: evaluacion.cantidadSeleccionada,
        motivoError: evaluacion.motivoError,
        productosSeleccionadosIds: estado.seleccionadosIds,
      },
    });

    if (!evaluacion.exito) {
      feedback.reproducirAjuste();
      setEstado((previo) => ({
        ...previo,
        errores: previo.errores + 1,
        comboActual: 0,
        tuvoErrorAntesDeAcierto: true,
        mensaje: resolverMensajeEvaluacionMercado(evaluacion),
        feedbackEscena: { state: resolverEstadoVisualEvaluacionMercado(evaluacion) },
      }));
      return;
    }

    feedback.reproducirExito();
    registrarEvento({
      tipoEvento: TIPOS_EVENTO_SESION.nivelCompletado,
      puntos: 18,
      comboEnEvento: combo,
      metadata: {
        totalGastado: evaluacion.totalGastado,
        correccion: estado.tuvoErrorAntesDeAcierto,
      },
    });

    const resumenEstado = {
      ...estado,
      aciertos: estado.aciertos + 1,
      comboActual: combo,
      comboMaximo: Math.max(estado.comboMaximo, combo),
      mensaje: resolverMensajeEvaluacionMercado(evaluacion),
      feedbackEscena: { state: 'success' },
    };

    setEstado(resumenEstado);
    finalizar({ resumenEstado });
  }, [estado, feedback, finalizar, registrarEvento]);

  const salir = useCallback(() => {
    if (
      !finalizadoRef.current &&
      estado.fase !== FASES_MERCADO_PREMIUM.preparando &&
      estado.fase !== FASES_MERCADO_PREMIUM.bloqueado
    ) {
      finalizar({
        resumenEstado: estado,
        estadoFinal: ESTADOS_FINALIZACION_SESION.abandonado,
        mostrarCompletado: false,
      });
    }

    onSalir?.();
  }, [estado, finalizar, onSalir]);

  const resultadoSincronizado =
    !persistenciaRemotaHabilitada ||
    persistencia.estado === ESTADOS_PERSISTENCIA_MERCADO.finalizada ||
    persistencia.estado === ESTADOS_PERSISTENCIA_MERCADO.error;

  const continuarNivel = useCallback(() => {
    if (
      estado.fase !== FASES_MERCADO_PREMIUM.completado ||
      !resultadoSincronizado
    ) {
      return;
    }

    prepararNuevaRonda();
    setRevisionPreparacion((revision) => revision + 1);
  }, [estado.fase, prepararNuevaRonda, resultadoSincronizado]);

  const nivel = resolverNivelSesion({
    respuestaInicio,
    contextoSesion,
  });
  const totalNiveles = resolverTotalNivelesSesion(contextoSesion);
  const estrellasOficiales = Number(
    respuestaFinalizacion?.resumen_oficial?.estrellas_obtenidas,
  );
  const estrellas = Number.isFinite(estrellasOficiales)
    ? Math.max(0, Math.min(3, estrellasOficiales))
    : calcularEstrellasVisualesMercado(estado);

  const modeloVisual = useMemo(
    () =>
      crearModeloVisualNivelMercado({
        ronda: estado.ronda,
        nivel,
        totalNiveles,
        seleccionadosIds: estado.seleccionadosIds,
        mensaje: estado.mensaje,
        estrellas,
        combo: estado.comboActual,
      }),
    [estado, estrellas, nivel, totalNiveles],
  );

  return {
    fase: estado.fase,
    sincronizandoResultado:
      estado.fase === FASES_MERCADO_PREMIUM.completado && !resultadoSincronizado,
    modeloVisual,
    feedbackEscena: estado.feedbackEscena,
    resultado: estado.resultado,
    acciones: {
      alternarProducto,
      comprar,
      reiniciarNivel,
      solicitarPista,
      continuarNivel,
      reintentarPreparacion: () => setRevisionPreparacion((revision) => revision + 1),
      salir,
    },
  };
};

export { FASES_MERCADO_PREMIUM };
