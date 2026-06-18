import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizarConfiguracionRobotTaller } from './robotTallerConfiguracion';
import {
  construirEventoEnsamblaje,
  construirResumenPartidaEnsamblaje,
  detectarSnap,
} from './robotTallerMotor';
import { PARTES_ROBOT, FASES_ENSAMBLAGE } from './robotTaller.constants';

const construirEstadoInicial = () => ({
  fase: FASES_ENSAMBLAGE.explotado,
  partes: PARTES_ROBOT.map((p) => ({
    id: p.id,
    posicion: [...p.posicionExplotada],
    rotacion: [0, 0, 0],
    ensamblada: false,
    agarrada: false,
  })),
  parteAgarrada: null,
  contadorEnsambladas: 0,
  mensaje: 'Toma una pieza con tu mano y colocala en su lugar.',
  resultado: null,
  eventosSesion: [],
});

const ejecutarObservadorSeguro = (observador, carga) => {
  if (typeof observador !== 'function') return;
  Promise.resolve().then(() => observador(carga)).catch(() => null);
};

export const useRobotTallerControlador = (configuracionInicial, observadores = {}) => {
  const configuracion = useMemo(
    () => normalizarConfiguracionRobotTaller(configuracionInicial),
    [configuracionInicial],
  );

  const [estado, setEstado] = useState(construirEstadoInicial);
  const estadoRef = useRef(construirEstadoInicial());
  const marcaInicioRef = useRef(null);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  const reiniciarPartida = useCallback(() => {
    marcaInicioRef.current = null;
    setEstado(construirEstadoInicial());
  }, []);

  const registrarEvento = (evento) => {
    setEstado((previo) => ({
      ...previo,
      eventosSesion: [...previo.eventosSesion, { ...evento, timestamp: new Date().toISOString() }],
    }));
    ejecutarObservadorSeguro(observadores.alRegistrarEvento, evento);
  };

  const finalizarPartida = (exito) => {
    const estadoActual = estadoRef.current;
    const tiempoTranscurridoMs = marcaInicioRef.current
      ? Date.now() - marcaInicioRef.current
      : 0;
    const resultado = construirResumenPartidaEnsamblaje({
      exito,
      configuracion,
      partesEnsambladas: estadoActual.contadorEnsambladas,
      tiempoTranscurridoMs,
    });
    setEstado((previo) => ({
      ...previo,
      fase: FASES_ENSAMBLAGE.completado,
      parteAgarrada: null,
      resultado,
      mensaje: exito ? 'Robot armado correctamente.' : 'Sigue intentando.',
    }));
    ejecutarObservadorSeguro(observadores.alFinalizarPartida, resultado);
  };

  const agarrarParte = useCallback((idParte) => {
    const estadoActual = estadoRef.current;
    const parte = estadoActual.partes.find((p) => p.id === idParte);
    if (!parte || parte.ensamblada || estadoActual.parteAgarrada) return;

    if (!marcaInicioRef.current) {
      marcaInicioRef.current = Date.now();
    }

    setEstado((previo) => ({
      ...previo,
      parteAgarrada: idParte,
      partes: previo.partes.map((p) =>
        p.id === idParte ? { ...p, agarrada: true } : p,
      ),
      mensaje: `Coloca ${PARTES_ROBOT.find((pr) => pr.id === idParte)?.nombre ?? ''} en su lugar.`,
    }));



    ejecutarObservadorSeguro(observadores.alIniciarPartida, {
      configuracionPartida: configuracion,
      parteId: idParte,
    });
  }, [configuracion, observadores]);

  const moverParte = useCallback((idParte, nuevaPosicion) => {
    setEstado((previo) => {
      if (previo.parteAgarrada !== idParte) return previo;
      return {
        ...previo,
        partes: previo.partes.map((p) =>
          p.id === idParte ? { ...p, posicion: nuevaPosicion } : p,
        ),
      };
    });
  }, []);

  const soltarParte = useCallback(() => {
    const estadoActual = estadoRef.current;
    const idParte = estadoActual.parteAgarrada;
    if (!idParte) return;

    const parte = estadoActual.partes.find((p) => p.id === idParte);
    if (!parte) return;

    const resultadoSnap = detectarSnap(parte.posicion);

    if (resultadoSnap && resultadoSnap.ensamblada) {
      const parteDef = PARTES_ROBOT.find((p) => p.id === idParte);
      const nuevoContador = estadoActual.contadorEnsambladas + 1;
      const todasEnsambladas = nuevoContador >= PARTES_ROBOT.length;

      setEstado((previo) => ({
        ...previo,
        parteAgarrada: null,
        partes: previo.partes.map((p) =>
          p.id === idParte
            ? { ...p, posicion: [...parteDef.posicionObjetivo], rotacion: [...parteDef.rotacionObjetivo], ensamblada: true, agarrada: false }
            : p,
        ),
        contadorEnsambladas: nuevoContador,
        mensaje: todasEnsambladas
          ? 'Robot armado completamente.'
          : `${nuevoContador} de ${PARTES_ROBOT.length} piezas colocadas.`,
      }));

      registrarEvento(
        construirEventoEnsamblaje({
          tipoEvento: 'acierto',
          puntos: 15,
          comboEnEvento: nuevoContador,
          metadata: { parte_id: idParte },
        }),
      );

      if (todasEnsambladas) {
        setTimeout(() => finalizarPartida(true), 500);
      }
    } else {
      const parteDef = PARTES_ROBOT.find((p) => p.id === idParte);
      setEstado((previo) => ({
        ...previo,
        parteAgarrada: null,
        partes: previo.partes.map((p) =>
          p.id === idParte
            ? {
                ...p,
                posicion: [...parteDef.posicionExplotada],
                rotacion: [0, 0, 0],
                agarrada: false,
              }
            : p,
        ),
        mensaje: 'Esa pieza no va ahi. Intent con otra.',
      }));

      registrarEvento(
        construirEventoEnsamblaje({
          tipoEvento: 'error',
          puntos: 0,
          metadata: { parte_id: idParte },
        }),
      );
    }
  }, [observadores]);

  return {
    configuracion,
    estado,
    agarrarParte,
    moverParte,
    soltarParte,
    reiniciarPartida,
    iniciarPartida: agarrarParte,
  };
};
