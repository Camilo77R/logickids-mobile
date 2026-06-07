import { useEffect, useMemo, useRef, useState } from 'react';
import { ESTADOS_ROBOT_TALLER } from './robotTaller.constants';
import { normalizarConfiguracionRobotTaller } from './robotTallerConfiguracion';
import {
  construirEventoRobotTaller,
  construirResumenPartidaRobotTaller,
  crearPatronPiezasAleatorio,
  resolverCantidadColumnas,
} from './robotTallerMotor';

const construirEstadoInicial = (configuracion) => ({
  fase: ESTADOS_ROBOT_TALLER.listo,
  patron: [],
  indiceRespuesta: 0,
  piezaActiva: null,
  piezasColocadas: [],
  mensaje:
    'Cuando estes listo, toca "Armar" y observa el orden de las piezas brillantes.',
  tiempoRestanteMs: configuracion.configuracion.tiempoLimiteMs,
  resultado: null,
  eventosSesion: [],
  aciertos: 0,
  errores: 0,
});

const ejecutarObservadorSeguro = (observador, carga) => {
  if (typeof observador !== 'function') {
    return;
  }
  Promise.resolve()
    .then(() => observador(carga))
    .catch(() => null);
};

export const useRobotTallerControlador = (configuracionInicial, observadores = {}) => {
  const configuracion = useMemo(
    () => normalizarConfiguracionRobotTaller(configuracionInicial),
    [configuracionInicial],
  );

  const [estado, setEstado] = useState(() => construirEstadoInicial(configuracion));
  const estadoRef = useRef(construirEstadoInicial(configuracion));
  const bloqueoInicioRef = useRef(false);
  const temporizadoresRef = useRef([]);
  const intervaloConteoRef = useRef(null);
  const marcaInicioRespuestaRef = useRef(null);
  const marcaUltimoIntentoRef = useRef(null);
  const duracionRespuestaRef = useRef(configuracion.configuracion.tiempoLimiteMs);
  const partidaIniciadaEnRef = useRef(null);

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
        { ...evento, timestamp: new Date().toISOString() },
      ],
    }));
    ejecutarObservadorSeguro(observadores.alRegistrarEvento, evento);
  };

  const finalizarPartida = (exito, motivo) => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    const estadoActual = estadoRef.current;
    const tiempoTranscurridoMs = partidaIniciadaEnRef.current
      ? Date.now() - partidaIniciadaEnRef.current
      : 0;
    const resultadoCalculado = construirResumenPartidaRobotTaller({
      exito,
      configuracion,
      aciertos: estadoActual.aciertos,
      errores: estadoActual.errores,
      tiempoTranscurridoMs,
      patron: estadoActual.patron,
    });
    setEstado((previo) => ({
      ...previo,
      fase: exito ? ESTADOS_ROBOT_TALLER.completado : ESTADOS_ROBOT_TALLER.fallido,
      piezaActiva: null,
      resultado: resultadoCalculado,
      mensaje: exito
        ? 'Robot armado. Tus resultados fueron guardados.'
        : motivo,
    }));
    ejecutarObservadorSeguro(observadores.alFinalizarPartida, resultadoCalculado);
  };

  const iniciarCuentaRegresiva = (tiempoInicialMs) => {
    detenerCuentaRegresiva();
    marcaInicioRespuestaRef.current = Date.now();
    marcaUltimoIntentoRef.current = Date.now();
    duracionRespuestaRef.current = tiempoInicialMs;

    intervaloConteoRef.current = setInterval(() => {
      const tiempoConsumido = Date.now() - marcaInicioRespuestaRef.current;
      const restante = Math.max(0, duracionRespuestaRef.current - tiempoConsumido);
      setEstado((previo) => ({ ...previo, tiempoRestanteMs: restante }));
      if (restante <= 0) {
        finalizarPartida(false, 'El tiempo se agoto antes de armar el robot.');
      }
    }, 100);
  };

  const programarReproduccionPatron = (patron) => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_ROBOT_TALLER.mostrandoPatron,
      piezaActiva: null,
      mensaje: 'Observa con calma el orden en que brillan las piezas.',
    }));

    let demoraAcumulada = 0;
    patron.forEach((indicePieza) => {
      const encender = setTimeout(() => {
        setEstado((previo) => ({ ...previo, piezaActiva: indicePieza }));
      }, demoraAcumulada);
      temporizadoresRef.current.push(encender);
      demoraAcumulada += configuracion.configuracion.duracionDestelloMs;

      const apagar = setTimeout(() => {
        setEstado((previo) => ({ ...previo, piezaActiva: null }));
      }, demoraAcumulada);
      temporizadoresRef.current.push(apagar);
      demoraAcumulada += configuracion.configuracion.pausaEntreDestellosMs;
    });

    const cierre = setTimeout(() => {
      setEstado((previo) => ({
        ...previo,
        fase: ESTADOS_ROBOT_TALLER.esperandoRespuesta,
        mensaje: 'Tu turno: toca las piezas en el mismo orden.',
      }));
      iniciarCuentaRegresiva(configuracion.configuracion.tiempoLimiteMs);
    }, demoraAcumulada);
    temporizadoresRef.current.push(cierre);
  };

  const iniciarPartida = () => {
    if (
      bloqueoInicioRef.current ||
      estadoRef.current.fase !== ESTADOS_ROBOT_TALLER.listo
    ) {
      return;
    }
    bloqueoInicioRef.current = true;
    const patron = crearPatronPiezasAleatorio({
      cantidadPiezas: configuracion.configuracion.cantidadPiezas,
      longitudPatron: configuracion.configuracion.longitudPatron,
    });
    partidaIniciadaEnRef.current = Date.now();
    setEstado({
      ...construirEstadoInicial(configuracion),
      patron,
      mensaje: 'Observa con calma el orden en que brillan las piezas.',
    });
    ejecutarObservadorSeguro(observadores.alIniciarPartida, {
      configuracionPartida: configuracion,
      patronLongitud: patron.length,
    });
    programarReproduccionPatron(patron);
  };

  const reiniciarPartida = () => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    bloqueoInicioRef.current = false;
    partidaIniciadaEnRef.current = null;
    marcaInicioRespuestaRef.current = null;
    marcaUltimoIntentoRef.current = null;
    setEstado(construirEstadoInicial(configuracion));
  };

  const seleccionarPieza = (indicePieza) => {
    if (estadoRef.current.fase !== ESTADOS_ROBOT_TALLER.esperandoRespuesta) {
      return;
    }
    if (estadoRef.current.piezasColocadas.includes(indicePieza)) {
      return;
    }
    const estadoActual = estadoRef.current;
    const indiceEsperado = estadoActual.patron[estadoActual.indiceRespuesta];
    const esCorrecta = indicePieza === indiceEsperado;
    const tiempoReaccionMs = marcaUltimoIntentoRef.current
      ? Date.now() - marcaUltimoIntentoRef.current
      : undefined;

    if (!esCorrecta) {
      registrarEvento(
        construirEventoRobotTaller({
          tipoEvento: 'error',
          tiempoReaccionMs,
          puntos: 0,
          comboEnEvento: 0,
          metadata: {
            pattern_length: estadoActual.patron.length,
            step_flash_ms: configuracion.configuracion.duracionDestelloMs,
            step_gap_ms: configuracion.configuracion.pausaEntreDestellosMs,
            pieza_seleccionada: indicePieza,
            pieza_esperada: indiceEsperado,
            remaining_time_ms: Math.max(
              0,
              Math.round(estadoActual.tiempoRestanteMs),
            ),
          },
        }),
      );
      setEstado((previo) => ({
        ...previo,
        errores: previo.errores + 1,
        piezaActiva: indicePieza,
      }));
      const temporizadorError = setTimeout(() => {
        finalizarPartida(
          false,
          'Esa pieza no va aqui. Esta ronda ya termino y tu intento quedo guardado.',
        );
      }, 220);
      temporizadoresRef.current.push(temporizadorError);
      return;
    }

    const siguienteIndice = estadoActual.indiceRespuesta + 1;
    const comboEnEvento = siguienteIndice;
    registrarEvento(
      construirEventoRobotTaller({
        tipoEvento: 'acierto',
        tiempoReaccionMs,
        puntos: 12,
        comboEnEvento,
        metadata: {
          pattern_length: estadoActual.patron.length,
          step_flash_ms: configuracion.configuracion.duracionDestelloMs,
          step_gap_ms: configuracion.configuracion.pausaEntreDestellosMs,
          pieza_seleccionada: indicePieza,
          pieza_esperada: indiceEsperado,
          remaining_time_ms: Math.max(0, Math.round(estadoActual.tiempoRestanteMs)),
        },
      }),
    );
    marcaUltimoIntentoRef.current = Date.now();
    setEstado((previo) => ({
      ...previo,
      aciertos: previo.aciertos + 1,
      indiceRespuesta: siguienteIndice,
      piezaActiva: indicePieza,
      piezasColocadas: [...previo.piezasColocadas, indicePieza],
    }));

    const temporizadorAcierto = setTimeout(() => {
      setEstado((previo) => ({ ...previo, piezaActiva: null }));
    }, 160);
    temporizadoresRef.current.push(temporizadorAcierto);

    if (siguienteIndice >= estadoActual.patron.length) {
      const temporizadorExito = setTimeout(() => {
        finalizarPartida(
          true,
          'Robot armado. Tus resultados fueron guardados.',
        );
      }, 200);
      temporizadoresRef.current.push(temporizadorExito);
    }
  };

  useEffect(
    () => () => {
      limpiarTemporizadores();
      detenerCuentaRegresiva();
    },
    [],
  );

  useEffect(() => {
    reiniciarPartida();
  }, [configuracion]);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  return {
    configuracion,
    estado,
    columnasTablero: resolverCantidadColumnas(configuracion.configuracion.cantidadPiezas),
    iniciarPartida,
    reiniciarPartida,
    seleccionarPieza,
  };
};
