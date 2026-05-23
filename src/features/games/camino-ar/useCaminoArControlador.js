import { useEffect, useMemo, useRef, useState } from 'react';
import { ESTADOS_CAMINO_AR } from './caminoAr.constants';
import { normalizarConfiguracionCaminoAr } from './caminoArConfiguracion';
import {
  construirResumenPartida,
  crearPatronAleatorio,
  resolverColumnasTablero,
} from './caminoArMotor';

const construirEstadoInicial = (configuracion) => ({
  fase: ESTADOS_CAMINO_AR.listo,
  patron: [],
  indiceRespuesta: 0,
  baldosaActiva: null,
  mensaje: 'Memoriza el recorrido y luego tocalo en el mismo orden.',
  tiempoRestanteMs: configuracion.configuracion.tiempoLimiteMs,
  ayudasRestantes: configuracion.configuracion.ayudasDisponibles,
  resultado: null,
  eventos: [],
  aciertos: 0,
  errores: 0,
  ayudasUsadas: 0,
});

export const useCaminoArControlador = (configuracionInicial) => {
  const configuracion = useMemo(
    () => normalizarConfiguracionCaminoAr(configuracionInicial),
    [configuracionInicial],
  );
  const [estado, setEstado] = useState(() => construirEstadoInicial(configuracion));
  const temporizadoresRef = useRef([]);
  const intervaloConteoRef = useRef(null);
  const marcaInicioRespuestaRef = useRef(null);
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

  const registrarEvento = (tipo, detalle = {}) => {
    setEstado((previo) => ({
      ...previo,
      eventos: [
        ...previo.eventos,
        {
          tipo,
          timestamp: new Date().toISOString(),
          ...detalle,
        },
      ],
    }));
  };

  const finalizarPartida = (exito, motivo) => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();

    setEstado((previo) => {
      const tiempoTranscurridoMs = partidaIniciadaEnRef.current
        ? Date.now() - partidaIniciadaEnRef.current
        : 0;

      const resultado = construirResumenPartida({
        exito,
        configuracion,
        aciertos: previo.aciertos,
        errores: previo.errores,
        ayudasUsadas: previo.ayudasUsadas,
        tiempoTranscurridoMs,
        patron: previo.patron,
      });

      return {
        ...previo,
        fase: exito ? ESTADOS_CAMINO_AR.completado : ESTADOS_CAMINO_AR.fallido,
        baldosaActiva: null,
        resultado,
        mensaje: exito
          ? 'Actividad completada. Tus resultados fueron guardados.'
          : motivo,
      };
    });
  };

  const iniciarCuentaRegresiva = (tiempoInicialMs) => {
    detenerCuentaRegresiva();
    marcaInicioRespuestaRef.current = Date.now();
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
      mensaje: 'Observa con cuidado el orden de las baldosas iluminadas.',
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
        mensaje: 'Ahora repite el recorrido tocando cada baldosa en orden.',
      }));
      iniciarCuentaRegresiva(tiempoReanudacionMs);
    }, demoraAcumulada);

    temporizadoresRef.current.push(cierre);
  };

  const iniciarPartida = () => {
    const patron = crearPatronAleatorio({
      cantidadBaldosas: configuracion.configuracion.cantidadBaldosas,
      longitudPatron: configuracion.configuracion.longitudPatron,
    });

    partidaIniciadaEnRef.current = Date.now();

    setEstado({
      ...construirEstadoInicial(configuracion),
      patron,
      mensaje: 'Observa con cuidado el orden de las baldosas iluminadas.',
    });

    programarReproduccionPatron(patron, configuracion.configuracion.tiempoLimiteMs);
    registrarEvento('partida_iniciada', { patronLongitud: patron.length });
  };

  const reiniciarPartida = () => {
    limpiarTemporizadores();
    detenerCuentaRegresiva();
    partidaIniciadaEnRef.current = null;
    setEstado(construirEstadoInicial(configuracion));
  };

  const usarPista = () => {
    if (
      estado.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta ||
      estado.ayudasRestantes <= 0 ||
      estado.indiceRespuesta > 0
    ) {
      return;
    }

    const tiempoConsumido = Date.now() - marcaInicioRespuestaRef.current;
    const tiempoRestante = Math.max(0, duracionRespuestaRef.current - tiempoConsumido);

    setEstado((previo) => ({
      ...previo,
      ayudasRestantes: previo.ayudasRestantes - 1,
      ayudasUsadas: previo.ayudasUsadas + 1,
      mensaje: 'Pista usada. Mira de nuevo el recorrido antes de tocar.',
    }));

    registrarEvento('pista_usada');
    programarReproduccionPatron(estado.patron, tiempoRestante);
  };

  const seleccionarBaldosa = (indiceBaldosa) => {
    if (estado.fase !== ESTADOS_CAMINO_AR.esperandoRespuesta) {
      return;
    }

    const indiceEsperado = estado.patron[estado.indiceRespuesta];
    const esCorrecta = indiceBaldosa === indiceEsperado;

    registrarEvento('baldosa_tocada', {
      indiceBaldosa,
      indiceEsperado,
      esCorrecta,
    });

    if (!esCorrecta) {
      setEstado((previo) => ({
        ...previo,
        errores: previo.errores + 1,
        baldosaActiva: indiceBaldosa,
      }));

      const temporizadorError = setTimeout(() => {
        finalizarPartida(false, 'Orden incorrecto. Reinicia para intentar otra vez.');
      }, 220);
      temporizadoresRef.current.push(temporizadorError);
      return;
    }

    const siguienteIndice = estado.indiceRespuesta + 1;

    setEstado((previo) => ({
      ...previo,
      aciertos: previo.aciertos + 1,
      indiceRespuesta: siguienteIndice,
      baldosaActiva: indiceBaldosa,
    }));

    const temporizadorAcierto = setTimeout(() => {
      setEstado((previo) => ({
        ...previo,
        baldosaActiva: null,
      }));
    }, 160);
    temporizadoresRef.current.push(temporizadorAcierto);

    if (siguienteIndice >= estado.patron.length) {
      const temporizadorExito = setTimeout(() => {
        finalizarPartida(true, 'Actividad completada. Tus resultados fueron guardados.');
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

  return {
    configuracion,
    estado,
    columnasTablero: resolverColumnasTablero(configuracion.configuracion.cantidadBaldosas),
    iniciarPartida,
    reiniciarPartida,
    seleccionarBaldosa,
    usarPista,
    puedePedirPista:
      estado.fase === ESTADOS_CAMINO_AR.esperandoRespuesta &&
      estado.ayudasRestantes > 0 &&
      estado.indiceRespuesta === 0,
  };
};
