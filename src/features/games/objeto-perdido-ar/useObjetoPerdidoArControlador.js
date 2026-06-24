import { useEffect, useMemo, useRef, useState } from 'react';
import { ESTADOS_OBJETO_PERDIDO_AR } from './objetoPerdidoAr.constants';
import { normalizarConfiguracionObjetoPerdidoAr } from './objetoPerdidoArConfiguracion';
import {
  construirEventoObjetoPerdidoAr,
  construirResumenObjetoPerdidoAr,
  crearRondaObjetoPerdidoAr,
} from './objetoPerdidoArMotor';
import {
  createObjetoPerdidoArCheckpointState,
  restoreObjetoPerdidoArLogicalState,
} from './aplicacion/objetoPerdidoArCheckpoint';

const CHECKPOINT_TIME_SLICE_MS = 5000;

const construirEstadoInicial = (configuracion) => ({
  fase: ESTADOS_OBJETO_PERDIDO_AR.listo,
  rondaActual: null,
  numeroRonda: 0,
  mensaje: 'Quedate en el centro. Los objetos apareceran alrededor.',
  tiempoRestanteMs: configuracion.configuracion.tiempoLimiteMs,
  ayudasRestantes: configuracion.configuracion.ayudasDisponibles,
  resultado: null,
  resumenRonda: null,
  eventosSesion: [],
  aciertos: 0,
  errores: 0,
  ayudasUsadas: 0,
  comboActual: 0,
  comboMaximo: 0,
  objetoActivoId: null,
});

const aplicarRestauracionLogica = ({ estadoPrevio, fase, mensaje, restauracion }) => ({
  ...estadoPrevio,
  fase,
  rondaActual: restauracion.rondaActual,
  numeroRonda: restauracion.numeroRonda,
  tiempoRestanteMs: restauracion.tiempoRestanteMs,
  ayudasRestantes: restauracion.ayudasRestantes,
  resumenRonda: restauracion.resumenRonda,
  resultado: restauracion.resultado,
  aciertos: restauracion.aciertos,
  errores: restauracion.errores,
  ayudasUsadas: restauracion.ayudasUsadas,
  comboActual: restauracion.comboActual,
  comboMaximo: restauracion.comboMaximo,
  objetoActivoId: null,
  mensaje,
});

const ejecutarObservadorSeguro = (observador, carga) => {
  if (typeof observador !== 'function') {
    return;
  }

  Promise.resolve()
    .then(() => observador(carga))
    .catch(() => null);
};

export const useObjetoPerdidoArControlador = (
  configuracionInicial,
  observadores = {},
  checkpointRemoto = {},
) => {
  const configuracion = useMemo(
    () => normalizarConfiguracionObjetoPerdidoAr(configuracionInicial),
    [configuracionInicial],
  );
  const [estado, setEstado] = useState(() => construirEstadoInicial(configuracion));
  const estadoRef = useRef(construirEstadoInicial(configuracion));
  const intervaloConteoRef = useRef(null);
  const temporizadoresRef = useRef([]);
  const inicioPartidaRef = useRef(null);
  const inicioRondaRef = useRef(null);
  const restauracionPendienteRef = useRef(null);
  const checkpointSessionRef = useRef(null);
  const ultimoCheckpointJsonRef = useRef(null);
  const guardarCheckpointRef = useRef(observadores.alGuardarCheckpoint);

  useEffect(() => {
    guardarCheckpointRef.current = observadores.alGuardarCheckpoint;
  }, [observadores.alGuardarCheckpoint]);

  const limpiarTemporizadores = () => {
    temporizadoresRef.current.forEach((temporizador) => clearTimeout(temporizador));
    temporizadoresRef.current = [];
  };

  const detenerCuentaRegresiva = () => {
    if (intervaloConteoRef.current) {
      clearInterval(intervaloConteoRef.current);
      intervaloConteoRef.current = null;
    }
  };

  const registrarEvento = (evento) => {
    setEstado((previo) => ({
      ...previo,
      eventosSesion: [
        ...previo.eventosSesion,
        {
          ...evento,
          timestamp: new Date().toISOString(),
        },
      ],
    }));

    ejecutarObservadorSeguro(observadores.alRegistrarEvento, evento);
  };

  const finalizarPartida = (motivo = 'Actividad completada. Tus resultados fueron guardados.') => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();

    const estadoActual = estadoRef.current;
    const tiempoTranscurridoMs = inicioPartidaRef.current
      ? Date.now() - inicioPartidaRef.current
      : 0;
    const resultadoCalculado = construirResumenObjetoPerdidoAr({
      configuracion,
      aciertos: estadoActual.aciertos,
      errores: estadoActual.errores,
      ayudasUsadas: estadoActual.ayudasUsadas,
      comboMaximo: estadoActual.comboMaximo,
      rondasCompletadas: estadoActual.numeroRonda,
      tiempoTranscurridoMs,
    });

    const estadoFinal = {
      ...estadoActual,
      fase: ESTADOS_OBJETO_PERDIDO_AR.completado,
      resultado: resultadoCalculado,
      objetoActivoId: null,
      mensaje: motivo,
    };
    const checkpointState = createObjetoPerdidoArCheckpointState({
      estado: estadoFinal,
      pendingFinalization: resultadoCalculado.finalizacionSesion,
      tiempoTranscurridoMs,
    });

    setEstado(estadoFinal);

    ejecutarObservadorSeguro(observadores.alFinalizarPartida, {
      checkpointState,
      resultado: resultadoCalculado,
    });
  };

  const iniciarCuentaRegresiva = (tiempoInicialMs) => {
    detenerCuentaRegresiva();
    const marcaInicio = Date.now();

    intervaloConteoRef.current = setInterval(() => {
      const restante = Math.max(0, tiempoInicialMs - (Date.now() - marcaInicio));

      setEstado((previo) => ({
        ...previo,
        tiempoRestanteMs: restante,
      }));

      if (restante <= 0) {
        detenerCuentaRegresiva();
        setEstado((previo) => ({
          ...previo,
          errores: previo.errores + 1,
          comboActual: 0,
          mensaje: 'Se acabo el tiempo. Vamos con el siguiente reto.',
        }));

        const siguiente = setTimeout(() => avanzarDespuesDeRonda(), 550);
        temporizadoresRef.current.push(siguiente);
      }
    }, 100);
  };

  const iniciarRonda = (numeroRonda) => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();

    const ronda = crearRondaObjetoPerdidoAr({
      configuracion,
      numeroRonda,
    });

    inicioRondaRef.current = Date.now();

    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_OBJETO_PERDIDO_AR.jugando,
      rondaActual: ronda,
      resumenRonda: null,
      numeroRonda,
      objetoActivoId: null,
      tiempoRestanteMs: configuracion.configuracion.tiempoLimiteMs,
      ayudasRestantes: Math.max(previo.ayudasRestantes, 0),
      mensaje: ronda.mision,
    }));

    iniciarCuentaRegresiva(configuracion.configuracion.tiempoLimiteMs);
  };

  const iniciarPartida = () => {
    if (
      estadoRef.current.fase !== ESTADOS_OBJETO_PERDIDO_AR.listo &&
      estadoRef.current.fase !== ESTADOS_OBJETO_PERDIDO_AR.buscandoSuperficie
    ) {
      return;
    }

    inicioPartidaRef.current = Date.now();
    ejecutarObservadorSeguro(observadores.alIniciarPartida, {
      configuracionPartida: configuracion,
    });

    const restauracion = restauracionPendienteRef.current;
    if (restauracion) {
      restauracionPendienteRef.current = null;
      inicioPartidaRef.current = Date.now() - restauracion.tiempoTranscurridoMs;
      inicioRondaRef.current = Date.now();

      setEstado((previo) => aplicarRestauracionLogica({
        estadoPrevio: previo,
        fase: restauracion.faseReanudacion,
        mensaje:
          restauracion.faseReanudacion === ESTADOS_OBJETO_PERDIDO_AR.jugando
            ? restauracion.rondaActual.mision
            : previo.mensaje,
        restauracion,
      }));

      if (restauracion.faseReanudacion === ESTADOS_OBJETO_PERDIDO_AR.jugando) {
        iniciarCuentaRegresiva(restauracion.tiempoRestanteMs);
      }
      return;
    }

    iniciarRonda(1);
  };

  const reiniciarPartida = () => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    inicioPartidaRef.current = null;
    inicioRondaRef.current = null;
    restauracionPendienteRef.current = null;
    ultimoCheckpointJsonRef.current = null;
    setEstado(construirEstadoInicial(configuracion));
  };

  const marcarBuscandoSuperficie = () => {
    if (estadoRef.current.fase !== ESTADOS_OBJETO_PERDIDO_AR.listo) {
      return;
    }

    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_OBJETO_PERDIDO_AR.buscandoSuperficie,
      mensaje: 'Apunta al piso sin moverte mucho. Luego busca alrededor.',
    }));
  };

  const avanzarDespuesDeRonda = () => {
    const estadoActual = estadoRef.current;

    if (estadoActual.numeroRonda >= configuracion.configuracion.rondasPorPartida) {
      finalizarPartida();
      return;
    }

    iniciarRonda(estadoActual.numeroRonda + 1);
  };

  const seleccionarObjeto = (objetoId) => {
    const estadoActual = estadoRef.current;

    if (estadoActual.fase !== ESTADOS_OBJETO_PERDIDO_AR.jugando || !estadoActual.rondaActual) {
      return;
    }

    const ronda = estadoActual.rondaActual;
    const objetoTocado = ronda.objetos.find((objeto) => objeto.id === objetoId);
    const esCorrecto = objetoId === ronda.objetivoId;
    const tiempoReaccionMs = inicioRondaRef.current ? Date.now() - inicioRondaRef.current : undefined;

    if (!esCorrecto) {
      registrarEvento(
        construirEventoObjetoPerdidoAr({
          tipoEvento: 'error',
          tiempoReaccionMs,
          puntos: 0,
          comboEnEvento: 0,
          metadata: {
            ronda: ronda.numeroRonda,
            objetoObjetivo: ronda.objetivoId,
            objetoTocado: objetoId,
            nombreObjetoTocado: objetoTocado?.nombre ?? null,
            tiempoRestanteMs: Math.max(0, Math.round(estadoActual.tiempoRestanteMs)),
            ayudaUsada: false,
          },
        }),
      );

      setEstado((previo) => ({
        ...previo,
        errores: previo.errores + 1,
        comboActual: 0,
        objetoActivoId: objetoId,
        mensaje: 'Casi. Mira de nuevo dentro de la zona.',
      }));

      const apagarError = setTimeout(() => {
        setEstado((previo) => ({
          ...previo,
          objetoActivoId: null,
          mensaje: previo.rondaActual?.mision ?? previo.mensaje,
        }));
      }, 550);
      temporizadoresRef.current.push(apagarError);
      return;
    }

    const combo = estadoActual.comboActual + 1;
    registrarEvento(
      construirEventoObjetoPerdidoAr({
        tipoEvento: 'acierto',
        tiempoReaccionMs,
        puntos: 10,
        comboEnEvento: combo,
        metadata: {
          ronda: ronda.numeroRonda,
          objetoObjetivo: ronda.objetivoId,
          objetoTocado: objetoId,
          nombreObjetoTocado: objetoTocado?.nombre ?? null,
          tiempoRestanteMs: Math.max(0, Math.round(estadoActual.tiempoRestanteMs)),
          ayudaUsada: estadoActual.ayudasUsadas > 0,
        },
      }),
    );

    registrarEvento(
      construirEventoObjetoPerdidoAr({
        tipoEvento: 'nivel_completado',
        tiempoReaccionMs,
        puntos: 0,
        comboEnEvento: combo,
        metadata: {
          ronda: ronda.numeroRonda,
          objetoObjetivo: ronda.objetivoId,
          tiempoRestanteMs: Math.max(0, Math.round(estadoActual.tiempoRestanteMs)),
        },
      }),
    );

    detenerCuentaRegresiva();
    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_OBJETO_PERDIDO_AR.rondaCompletada,
      aciertos: previo.aciertos + 1,
      comboActual: combo,
      comboMaximo: Math.max(previo.comboMaximo, combo),
      objetoActivoId: objetoId,
      mensaje: 'Muy bien, lo encontraste.',
    }));

    setEstado((previo) => ({
      ...previo,
      resumenRonda: {
        numeroRonda: ronda.numeroRonda,
        rondasPorPartida: configuracion.configuracion.rondasPorPartida,
        objetoObjetivo: ronda.objetivo,
        puntosGanados: 10,
        tiempoRestanteMs: Math.max(0, Math.round(estadoActual.tiempoRestanteMs)),
        esUltimaRonda: ronda.numeroRonda >= configuracion.configuracion.rondasPorPartida,
      },
    }));
  };

  const usarPista = () => {
    const estadoActual = estadoRef.current;

    if (
      estadoActual.fase !== ESTADOS_OBJETO_PERDIDO_AR.jugando ||
      estadoActual.ayudasRestantes <= 0 ||
      !estadoActual.rondaActual
    ) {
      return;
    }

    setEstado((previo) => ({
      ...previo,
      ayudasRestantes: previo.ayudasRestantes - 1,
      ayudasUsadas: previo.ayudasUsadas + 1,
      objetoActivoId: previo.rondaActual.objetivoId,
      mensaje: `Pista: gira la camara y busca algo de color ${previo.rondaActual.objetivo.color}.`,
    }));

    const quitarPista = setTimeout(() => {
      setEstado((previo) => ({
        ...previo,
        objetoActivoId: null,
        mensaje: previo.rondaActual?.mision ?? previo.mensaje,
      }));
    }, 1200);
    temporizadoresRef.current.push(quitarPista);
  };

  useEffect(() => () => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
  }, []);

  useEffect(() => {
    reiniciarPartida();
  }, [configuracion]);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  useEffect(() => {
    const sessionId = checkpointRemoto.sessionId;
    if (
      !sessionId ||
      checkpointRemoto.phase !== 'ready' ||
      checkpointSessionRef.current === sessionId
    ) {
      return;
    }

    checkpointSessionRef.current = sessionId;
    const restored = restoreObjetoPerdidoArLogicalState(checkpointRemoto.state);
    if (!restored) {
      ultimoCheckpointJsonRef.current = null;
      return;
    }

    limpiarTemporizadores();
    detenerCuentaRegresiva();
    ultimoCheckpointJsonRef.current = JSON.stringify(checkpointRemoto.state);
    inicioPartidaRef.current = Date.now() - restored.tiempoTranscurridoMs;

    if (restored.pendingFinalization) {
      setEstado((previo) => aplicarRestauracionLogica({
        estadoPrevio: previo,
        fase: ESTADOS_OBJETO_PERDIDO_AR.completado,
        mensaje: previo.mensaje,
        restauracion: restored,
      }));
      return;
    }

    restauracionPendienteRef.current = restored;
    setEstado((previo) => aplicarRestauracionLogica({
      estadoPrevio: previo,
      fase: ESTADOS_OBJETO_PERDIDO_AR.buscandoSuperficie,
      mensaje: 'Vuelve a localizar una superficie para continuar la misma ronda.',
      restauracion: restored,
    }));
  }, [
    checkpointRemoto.phase,
    checkpointRemoto.sessionId,
    checkpointRemoto.state,
  ]);

  const checkpointTimeSlice = Math.ceil(
    estado.tiempoRestanteMs / CHECKPOINT_TIME_SLICE_MS,
  );

  useEffect(() => {
    if (
      typeof guardarCheckpointRef.current !== 'function' ||
      !estado.rondaActual ||
      ![
        ESTADOS_OBJETO_PERDIDO_AR.jugando,
        ESTADOS_OBJETO_PERDIDO_AR.rondaCompletada,
      ].includes(estado.fase)
    ) {
      return;
    }

    const tiempoTranscurridoMs = inicioPartidaRef.current
      ? Date.now() - inicioPartidaRef.current
      : 0;
    const checkpointState = createObjetoPerdidoArCheckpointState({
      estado,
      tiempoTranscurridoMs,
    });
    const serialized = JSON.stringify(checkpointState);

    if (serialized === ultimoCheckpointJsonRef.current) {
      return;
    }

    ultimoCheckpointJsonRef.current = serialized;
    ejecutarObservadorSeguro(guardarCheckpointRef.current, checkpointState);
  }, [
    checkpointTimeSlice,
    estado.aciertos,
    estado.ayudasRestantes,
    estado.ayudasUsadas,
    estado.comboActual,
    estado.comboMaximo,
    estado.errores,
    estado.fase,
    estado.numeroRonda,
    estado.resumenRonda,
    estado.rondaActual,
  ]);

  return {
    configuracion,
    estado,
    iniciarPartida,
    reiniciarPartida,
    marcarBuscandoSuperficie,
    seleccionarObjeto,
    usarPista,
    continuarSiguienteRonda: avanzarDespuesDeRonda,
    puedePedirPista:
      estado.fase === ESTADOS_OBJETO_PERDIDO_AR.jugando && estado.ayudasRestantes > 0,
  };
};
