import { useEffect, useMemo, useRef, useState } from 'react';
import { ESTADOS_CAMINO_AR } from './caminoAr.constants';
import { normalizarConfiguracionCaminoAr } from './caminoArConfiguracion';
import {
  construirEventoCaminoAr,
  construirResumenPartida,
  crearPatronAleatorio,
  resolverColumnasTablero,
} from './caminoArMotor';
import { parseCaminoArCheckpointState } from './aplicacion/caminoArCheckpoint';

const construirEstadoInicial = (configuracion) => ({
  fase: ESTADOS_CAMINO_AR.listo,
  patron: [],
  indiceRespuesta: 0,
  baldosaActiva: null,
  mensaje: 'Mira el camino de luces y luego siguelo en el mismo orden.',
  tiempoRestanteMs: configuracion.configuracion.tiempoLimiteMs,
  ayudasRestantes: configuracion.configuracion.ayudasDisponibles,
  resultado: null,
  eventosSesion: [],
  aciertos: 0,
  errores: 0,
  ayudasUsadas: 0,
});

const ejecutarObservadorSeguro = (observador, carga) => {
  if (typeof observador !== 'function') {
    return;
  }

  Promise.resolve()
    .then(() => observador(carga))
    .catch(() => null);
};

export const useCaminoArControlador = (configuracionInicial, observadores = {}) => {
  const configuracion = useMemo(
    () => normalizarConfiguracionCaminoAr(configuracionInicial),
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
  const estadoSuspendidoRef = useRef(null);

  const guardarCheckpointSeguro = (estadoCheckpoint, pendingFinalization = null) => {
    if (typeof observadores.alGuardarCheckpoint !== 'function') {
      return;
    }

    try {
      observadores.alGuardarCheckpoint({
        estado: estadoCheckpoint,
        pendingFinalization,
      });
    } catch {
      // La partida no se interrumpe por un fallo local al preparar persistencia.
    }
  };

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

  const finalizarPartida = (exito, motivo) => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    const estadoActual = estadoRef.current;
    const tiempoTranscurridoMs = partidaIniciadaEnRef.current
      ? Date.now() - partidaIniciadaEnRef.current
      : 0;
    const resultadoBase = construirResumenPartida({
      exito,
      configuracion,
      aciertos: estadoActual.aciertos,
      errores: estadoActual.errores,
      ayudasUsadas: estadoActual.ayudasUsadas,
      tiempoTranscurridoMs,
      patron: estadoActual.patron,
    });
    const finalizacionIdentificada =
      observadores.alPrepararFinalizacion?.(resultadoBase.finalizacionSesion) ??
      resultadoBase.finalizacionSesion;
    const resultadoCalculado = {
      ...resultadoBase,
      finalizacionSesion: finalizacionIdentificada,
    };

    const estadoFinal = {
      ...estadoActual,
      fase: exito ? ESTADOS_CAMINO_AR.completado : ESTADOS_CAMINO_AR.fallido,
      baldosaActiva: null,
      resultado: resultadoCalculado,
      mensaje: exito
        ? 'Ronda completada. Tus resultados fueron guardados.'
        : motivo,
    };

    estadoRef.current = estadoFinal;
    setEstado(estadoFinal);
    guardarCheckpointSeguro(estadoFinal, resultadoCalculado.finalizacionSesion);

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

      setEstado((previo) => ({
        ...previo,
        tiempoRestanteMs: restante,
      }));

      if (restante <= 0) {
        finalizarPartida(false, 'El tiempo se agoto antes de completar el patron.');
      }
    }, 100);
  };

  const programarReproduccionPatron = (patron, tiempoReanudacionMs) => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();

    setEstado((previo) => ({
      ...previo,
      fase: ESTADOS_CAMINO_AR.mostrandoPatron,
      baldosaActiva: null,
      mensaje: 'Mira las luces con calma y recuerda el recorrido.',
    }));

    let demoraAcumulada = 0;

    patron.forEach((indiceBaldosa) => {
      const encender = setTimeout(() => {
        setEstado((previo) => ({
          ...previo,
          baldosaActiva: indiceBaldosa,
        }));
      }, demoraAcumulada);

      temporizadoresRef.current.push(encender);
      demoraAcumulada += configuracion.configuracion.duracionDestelloMs;

      const apagar = setTimeout(() => {
        setEstado((previo) => ({
          ...previo,
          baldosaActiva: null,
        }));
      }, demoraAcumulada);

      temporizadoresRef.current.push(apagar);
      demoraAcumulada += configuracion.configuracion.pausaEntreDestellosMs;
    });

    const cierre = setTimeout(() => {
      setEstado((previo) => ({
        ...previo,
        fase: ESTADOS_CAMINO_AR.esperandoRespuesta,
        mensaje: 'Tu turno: toca las baldosas en el mismo orden.',
      }));
      iniciarCuentaRegresiva(tiempoReanudacionMs);
    }, demoraAcumulada);

    temporizadoresRef.current.push(cierre);
  };

  const iniciarPartida = () => {
    if (bloqueoInicioRef.current || estado.fase !== ESTADOS_CAMINO_AR.listo) {
      return;
    }

    if (estadoSuspendidoRef.current) {
      restaurarPartida(estadoSuspendidoRef.current);
      return;
    }

    bloqueoInicioRef.current = true;

    const patron = crearPatronAleatorio({
      cantidadBaldosas: configuracion.configuracion.cantidadBaldosas,
      longitudPatron: configuracion.configuracion.longitudPatron,
    });

    partidaIniciadaEnRef.current = Date.now();

    const estadoInicial = {
      ...construirEstadoInicial(configuracion),
      patron,
      mensaje: 'Mira las luces con calma y recuerda el recorrido.',
    };

    estadoRef.current = estadoInicial;
    setEstado(estadoInicial);
    guardarCheckpointSeguro({
      ...estadoInicial,
      fase: ESTADOS_CAMINO_AR.mostrandoPatron,
    });

    ejecutarObservadorSeguro(observadores.alIniciarPartida, {
      configuracionPartida: configuracion,
      patronLongitud: patron.length,
    });

    programarReproduccionPatron(patron, configuracion.configuracion.tiempoLimiteMs);
  };

  const restaurarPartida = (checkpointState) => {
    const checkpoint = parseCaminoArCheckpointState(checkpointState);

    if (!checkpoint) {
      return false;
    }

    limpiarTemporizadores();
    detenerCuentaRegresiva();
    estadoSuspendidoRef.current = null;
    bloqueoInicioRef.current = true;
    marcaInicioRespuestaRef.current = null;
    marcaUltimoIntentoRef.current = null;
    duracionRespuestaRef.current = checkpoint.tiempoRestanteMs;
    partidaIniciadaEnRef.current =
      Date.now() - Math.max(
        0,
        configuracion.configuracion.tiempoLimiteMs - checkpoint.tiempoRestanteMs,
      );

    const esTerminal =
      checkpoint.fase === ESTADOS_CAMINO_AR.completado ||
      checkpoint.fase === ESTADOS_CAMINO_AR.fallido;
    const estadoRestaurado = {
      ...construirEstadoInicial(configuracion),
      fase: checkpoint.fase,
      patron: checkpoint.patron,
      indiceRespuesta: checkpoint.indiceRespuesta,
      tiempoRestanteMs: checkpoint.tiempoRestanteMs,
      ayudasRestantes: checkpoint.ayudasRestantes,
      resultado: checkpoint.resultado,
      aciertos: checkpoint.aciertos,
      errores: checkpoint.errores,
      ayudasUsadas: checkpoint.ayudasUsadas,
      mensaje: esTerminal
        ? 'Tu resultado anterior esta listo para sincronizarse.'
        : 'Tablero localizado. Repasemos el camino antes de continuar.',
    };

    estadoRef.current = estadoRestaurado;
    setEstado(estadoRestaurado);

    if (!esTerminal) {
      programarReproduccionPatron(checkpoint.patron, checkpoint.tiempoRestanteMs);
    }

    return true;
  };

  const reiniciarPartida = () => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    bloqueoInicioRef.current = false;
    partidaIniciadaEnRef.current = null;
    marcaInicioRespuestaRef.current = null;
    marcaUltimoIntentoRef.current = null;
    estadoSuspendidoRef.current = null;
    setEstado(construirEstadoInicial(configuracion));
  };

  const cancelarPartidaTecnica = (motivo) => {
    if (
      estadoRef.current.fase !== ESTADOS_CAMINO_AR.mostrandoPatron &&
      estadoRef.current.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta
    ) {
      return;
    }

    limpiarTemporizadores();
    detenerCuentaRegresiva();
    guardarCheckpointSeguro(estadoRef.current);
    estadoSuspendidoRef.current = estadoRef.current;
    bloqueoInicioRef.current = false;
    partidaIniciadaEnRef.current = null;
    marcaInicioRespuestaRef.current = null;
    marcaUltimoIntentoRef.current = null;
    setEstado({
      ...construirEstadoInicial(configuracion),
      mensaje:
        motivo ??
        'El tablero se movio. Busca un piso estable y vuelve a intentarlo.',
    });
  };

  const usarPista = () => {
    const estadoActual = estadoRef.current;

    if (
      estadoActual.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta ||
      estadoActual.ayudasRestantes <= 0 ||
      estadoActual.indiceRespuesta > 0
    ) {
      return;
    }

    const tiempoConsumido = Date.now() - marcaInicioRespuestaRef.current;
    const tiempoRestante = Math.max(0, duracionRespuestaRef.current - tiempoConsumido);

    const estadoConPista = {
      ...estadoActual,
      ayudasRestantes: estadoActual.ayudasRestantes - 1,
      ayudasUsadas: estadoActual.ayudasUsadas + 1,
      mensaje: 'Mira otra vez el recorrido antes de tocar.',
    };

    estadoRef.current = estadoConPista;
    setEstado(estadoConPista);
    guardarCheckpointSeguro(estadoConPista);

    programarReproduccionPatron(estadoActual.patron, tiempoRestante);
  };

  const seleccionarBaldosa = (indiceBaldosa) => {
    const estadoActual = estadoRef.current;

    if (estadoActual.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta) {
      return;
    }

    const indiceEsperado = estadoActual.patron[estadoActual.indiceRespuesta];
    const esCorrecta = indiceBaldosa === indiceEsperado;
    const tiempoReaccionMs = marcaUltimoIntentoRef.current
      ? Date.now() - marcaUltimoIntentoRef.current
      : undefined;

    if (!esCorrecta) {
      registrarEvento(
        construirEventoCaminoAr({
          tipoEvento: 'error',
          tiempoReaccionMs,
          puntos: 0,
          comboEnEvento: 0,
          metadata: {
            pattern_length: estadoActual.patron.length,
            step_flash_ms: configuracion.configuracion.duracionDestelloMs,
            step_gap_ms: configuracion.configuracion.pausaEntreDestellosMs,
            tile_index: indiceBaldosa,
            expected_index: indiceEsperado,
            remaining_time_ms: Math.max(0, Math.round(estadoActual.tiempoRestanteMs)),
          },
        }),
      );
      const estadoConError = {
        ...estadoActual,
        errores: estadoActual.errores + 1,
        baldosaActiva: indiceBaldosa,
      };
      estadoRef.current = estadoConError;
      setEstado(estadoConError);
      guardarCheckpointSeguro(estadoConError);

      const temporizadorError = setTimeout(() => {
        finalizarPartida(false, 'Casi lo logras. Esta ronda ya termino y puedes revisar tu resultado.');
      }, 220);
      temporizadoresRef.current.push(temporizadorError);
      return;
    }

    const siguienteIndice = estadoActual.indiceRespuesta + 1;
    const comboEnEvento = siguienteIndice;

    registrarEvento(
      construirEventoCaminoAr({
        tipoEvento: 'acierto',
        tiempoReaccionMs,
        puntos: 10,
        comboEnEvento,
        metadata: {
          pattern_length: estadoActual.patron.length,
          step_flash_ms: configuracion.configuracion.duracionDestelloMs,
          step_gap_ms: configuracion.configuracion.pausaEntreDestellosMs,
          tile_index: indiceBaldosa,
          expected_index: indiceEsperado,
          remaining_time_ms: Math.max(0, Math.round(estadoActual.tiempoRestanteMs)),
        },
      }),
    );

    marcaUltimoIntentoRef.current = Date.now();

    const estadoConAcierto = {
      ...estadoActual,
      aciertos: estadoActual.aciertos + 1,
      indiceRespuesta: siguienteIndice,
      baldosaActiva: indiceBaldosa,
    };
    estadoRef.current = estadoConAcierto;
    setEstado(estadoConAcierto);
    guardarCheckpointSeguro(estadoConAcierto);

    const temporizadorAcierto = setTimeout(() => {
      setEstado((previo) => ({
        ...previo,
        baldosaActiva: null,
      }));
    }, 160);
    temporizadoresRef.current.push(temporizadorAcierto);

    if (siguienteIndice >= estadoActual.patron.length) {
      const temporizadorExito = setTimeout(() => {
        finalizarPartida(true, 'Ronda completada. Tus resultados fueron guardados.');
      }, 200);
      temporizadoresRef.current.push(temporizadorExito);
    }
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

  return {
    configuracion,
    estado,
    columnasTablero: resolverColumnasTablero(configuracion.configuracion.cantidadBaldosas),
    iniciarPartida,
    restaurarPartida,
    reiniciarPartida,
    cancelarPartidaTecnica,
    seleccionarBaldosa,
    usarPista,
    puedePedirPista:
      estado.fase === ESTADOS_CAMINO_AR.esperandoRespuesta &&
      estado.ayudasRestantes > 0 &&
      estado.indiceRespuesta === 0,
  };
};
