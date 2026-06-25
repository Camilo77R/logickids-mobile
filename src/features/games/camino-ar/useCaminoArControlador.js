import { useEffect, useMemo, useRef, useState } from 'react';
import { ESTADOS_CAMINO_AR } from './caminoAr.constants';
import { TIPOS_EVENTO_SESION } from '../core/contratoSesionJuego';
import { normalizarConfiguracionCaminoAr } from './caminoArConfiguracion';
import {
  construirEventoCaminoAr,
  construirMetadataResultadoCaminoAr,
  construirResumenPartida,
  crearPatronAleatorio,
  MOTIVOS_FIN_CAMINO_AR,
  resolverColumnasTablero,
} from './caminoArMotor';

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
  const bloqueoSeleccionRef = useRef(false);
  const partidaFinalizadaRef = useRef(false);
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
        {
          ...evento,
          timestamp: new Date().toISOString(),
        },
      ],
    }));

    ejecutarObservadorSeguro(observadores.alRegistrarEvento, evento);
  };

  const finalizarPartida = (exito, motivo, motivoFin, resumenEstado = estadoRef.current) => {
    if (partidaFinalizadaRef.current) {
      return;
    }

    partidaFinalizadaRef.current = true;
    bloqueoSeleccionRef.current = true;
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    const estadoActual = resumenEstado;
    const tiempoTranscurridoMs = partidaIniciadaEnRef.current
      ? Date.now() - partidaIniciadaEnRef.current
      : 0;
    const resultadoCalculado = construirResumenPartida({
      exito,
      configuracion,
      aciertos: estadoActual.aciertos,
      errores: estadoActual.errores,
      ayudasUsadas: estadoActual.ayudasUsadas,
      tiempoTranscurridoMs,
      patron: estadoActual.patron,
    });

    registrarEvento(
      construirEventoCaminoAr({
        tipoEvento: TIPOS_EVENTO_SESION.nivelCompletado,
        puntos: exito ? 15 : 0,
        comboEnEvento: exito ? estadoActual.aciertos : 0,
        metadata: construirMetadataResultadoCaminoAr({
          exito,
          motivoFin,
          patron: estadoActual.patron,
          aciertos: estadoActual.aciertos,
          errores: estadoActual.errores,
          ayudasUsadas: estadoActual.ayudasUsadas,
        }),
      }),
    );

    setEstado((previo) => ({
      ...previo,
      fase: exito ? ESTADOS_CAMINO_AR.completado : ESTADOS_CAMINO_AR.fallido,
      baldosaActiva: null,
      resultado: resultadoCalculado,
      mensaje: exito
        ? 'Ronda completada. Tus resultados fueron guardados.'
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

      setEstado((previo) => ({
        ...previo,
        tiempoRestanteMs: restante,
      }));

      if (restante <= 0) {
        finalizarPartida(
          false,
          'El tiempo se agoto antes de completar el patron.',
          MOTIVOS_FIN_CAMINO_AR.tiempoAgotado,
        );
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

    bloqueoInicioRef.current = true;
    bloqueoSeleccionRef.current = false;
    partidaFinalizadaRef.current = false;

    const patron = crearPatronAleatorio({
      cantidadBaldosas: configuracion.configuracion.cantidadBaldosas,
      longitudPatron: configuracion.configuracion.longitudPatron,
    });

    partidaIniciadaEnRef.current = Date.now();

    setEstado({
      ...construirEstadoInicial(configuracion),
      patron,
      mensaje: 'Mira las luces con calma y recuerda el recorrido.',
    });

    ejecutarObservadorSeguro(observadores.alIniciarPartida, {
      configuracionPartida: configuracion,
      patronLongitud: patron.length,
    });

    programarReproduccionPatron(patron, configuracion.configuracion.tiempoLimiteMs);
  };

  const reiniciarPartida = () => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    bloqueoInicioRef.current = false;
    bloqueoSeleccionRef.current = false;
    partidaFinalizadaRef.current = false;
    partidaIniciadaEnRef.current = null;
    marcaInicioRespuestaRef.current = null;
    marcaUltimoIntentoRef.current = null;
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
    bloqueoInicioRef.current = false;
    bloqueoSeleccionRef.current = false;
    partidaFinalizadaRef.current = false;
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

    setEstado((previo) => ({
      ...previo,
      ayudasRestantes: previo.ayudasRestantes - 1,
      ayudasUsadas: previo.ayudasUsadas + 1,
      mensaje: 'Mira otra vez el recorrido antes de tocar.',
    }));

    programarReproduccionPatron(estadoActual.patron, tiempoRestante);
  };

  const seleccionarBaldosa = (indiceBaldosa) => {
    const estadoActual = estadoRef.current;

    if (
      estadoActual.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta ||
      bloqueoSeleccionRef.current ||
      partidaFinalizadaRef.current
    ) {
      return;
    }

    bloqueoSeleccionRef.current = true;

    const indiceEsperado = estadoActual.patron[estadoActual.indiceRespuesta];
    const esCorrecta = indiceBaldosa === indiceEsperado;
    const tiempoReaccionMs = marcaUltimoIntentoRef.current
      ? Date.now() - marcaUltimoIntentoRef.current
      : undefined;

    if (!esCorrecta) {
      const errores = estadoActual.errores + 1;
      const resumenEstado = { ...estadoActual, errores };
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
      setEstado((previo) => ({
        ...previo,
        errores,
        baldosaActiva: indiceBaldosa,
        mensaje:
          errores < configuracion.configuracion.erroresPermitidos
            ? 'Esa baldosa no era. Respira y continua desde el mismo paso.'
            : previo.mensaje,
      }));

      if (errores < configuracion.configuracion.erroresPermitidos) {
        marcaUltimoIntentoRef.current = Date.now();
        const temporizadorCorreccion = setTimeout(() => {
          bloqueoSeleccionRef.current = false;
          setEstado((previo) => ({ ...previo, baldosaActiva: null }));
        }, 220);
        temporizadoresRef.current.push(temporizadorCorreccion);
        return;
      }

      const temporizadorError = setTimeout(() => {
        finalizarPartida(
          false,
          'Casi lo logras. Esta ronda ya termino y puedes revisar tu resultado.',
          MOTIVOS_FIN_CAMINO_AR.errorSecuencia,
          resumenEstado,
        );
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

    setEstado((previo) => ({
      ...previo,
      aciertos: previo.aciertos + 1,
      indiceRespuesta: siguienteIndice,
      baldosaActiva: indiceBaldosa,
    }));

    const temporizadorAcierto = setTimeout(() => {
      if (siguienteIndice < estadoActual.patron.length) {
        bloqueoSeleccionRef.current = false;
      }
      setEstado((previo) => ({
        ...previo,
        baldosaActiva: null,
      }));
    }, 160);
    temporizadoresRef.current.push(temporizadorAcierto);

    if (siguienteIndice >= estadoActual.patron.length) {
      const resumenEstado = {
        ...estadoActual,
        aciertos: estadoActual.aciertos + 1,
        indiceRespuesta: siguienteIndice,
      };
      const temporizadorExito = setTimeout(() => {
        finalizarPartida(
          true,
          'Ronda completada. Tus resultados fueron guardados.',
          MOTIVOS_FIN_CAMINO_AR.completado,
          resumenEstado,
        );
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
