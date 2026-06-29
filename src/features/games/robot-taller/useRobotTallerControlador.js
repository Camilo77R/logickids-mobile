import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizarConfiguracionRobotTaller } from './robotTallerConfiguracion';
import {
  construirEventoEnsamblaje,
  construirResumenPartidaEnsamblaje,
  detectarSnap,
  validarSnapPorNivel,
  obtenerSiguienteEsperado,
  obtenerPiezasPorNivel,
} from './robotTallerMotor';
import { PARTES_ROBOT, FASES_ENSAMBLAGE, PIEZAS_ALTERNATIVAS, DATOS_FUNCION_PIEZA, EXPLICACIONES_ERROR, DATOS_PROBLEMA_MATEMATICO, obtenerPartesRobot, obtenerNombreRobot } from './robotTaller.constants';
import { GAME_CHECKPOINT_PHASES } from '../core/useGameCheckpoint';
import {
  createRobotTallerCheckpointState,
  parseRobotTallerCheckpointState,
  restoreRobotTallerCheckpointState,
} from './aplicacion/robotTallerCheckpoint';

const construirEstadoInicial = (nivel, idMision) => {
  const piezas = obtenerPiezasPorNivel(nivel, idMision);
  return {
    fase: FASES_ENSAMBLAGE.explotado,
    partes: piezas.map((p) => ({
      id: p.id,
      posicion: [...p.posicionExplotada],
      rotacion: [0, 0, 0],
      ensamblada: false,
      agarrada: false,
      esAlternativa: PIEZAS_ALTERNATIVAS.some((a) => a.id === p.id),
      bloqueado: true,
      bloqueadoPorMatematicas: true,
    })),
    parteAgarrada: null,
    contadorEnsambladas: 0,
    erroresAcumulados: 0,
    ordenActual: 0,
    mensaje: 'Toma una pieza con tu mano y colocala en su lugar.',
    resultado: null,
    eventosSesion: [],
    preguntasMatematicas: {},
  };
};

const obtenerPiezasDesbloqueadasPendientes = (estadoActual) =>
  estadoActual.partes.filter((parte) => !parte.ensamblada && !parte.bloqueado);

function mezclar(arr) {
  const m = [...arr];
  for (let i = m.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [m[i], m[j]] = [m[j], m[i]];
  }
  return m;
}

function generarOpciones(parteCorrectaId, partesDisponibles, piezasDef) {
  const correcta = piezasDef.find((p) => p.id === parteCorrectaId);
  if (!correcta) return [];
  const distractores = mezclar(
    piezasDef.filter((p) => p.id !== parteCorrectaId && partesDisponibles.some((pd) => pd.id === p.id && !pd.ensamblada))
  ).slice(0, 2);
  const opciones = mezclar([
    {
      id: correcta.id,
      nombre: correcta.nombre,
      color: correcta.color,
      funcionDesc: DATOS_FUNCION_PIEZA[correcta.id]?.descripcion ?? '',
    },
    ...distractores.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      color: d.color,
      funcionDesc: DATOS_FUNCION_PIEZA[d.id]?.descripcion ?? '',
    })),
  ]);
  return opciones;
}

const ejecutarObservadorSeguro = (observador, carga) => {
  if (typeof observador !== 'function') return;
  Promise.resolve().then(() => observador(carga)).catch(() => null);
};

export const useRobotTallerControlador = (
  configuracionInicial,
  observadores = {},
  checkpointRuntime = null,
) => {
  const configuracion = useMemo(
    () => normalizarConfiguracionRobotTaller(configuracionInicial),
    [configuracionInicial],
  );

  const [estado, setEstado] = useState(() =>
    construirEstadoInicial(configuracion.nivel, configuracion.idMision),
  );
  const estadoRef = useRef(estado);
  const intentosRef = useRef({});
  const marcaInicioRef = useRef(null);
  const ultimaPosicionGrabadaRef = useRef({});
  const finalizadoRef = useRef(false);
  const observadoresRef = useRef(observadores);
  const checkpointSessionRef = useRef(null);
  const ultimaFirmaLogicaCheckpointRef = useRef(null);
  const omitirAutoguardadoDeHidratacionRef = useRef(false);
  const finalizacionPendienteRef = useRef(null);

  const [preguntaActual, setPreguntaActual] = useState(null);
  const [feedbackQuiz, setFeedbackQuiz] = useState(null);
  const [problemaMatematico, setProblemaMatematico] = useState(null);
  const [feedbackMatematica, setFeedbackMatematica] = useState(null);
  const [mostrarModalMatematica, setMostrarModalMatematica] = useState(false);
  const [tiempoRestanteRestauradoMs, setTiempoRestanteRestauradoMs] = useState(null);
  const estadoRefMath = useRef(problemaMatematico);
  const primerProblemaGeneradoRef = useRef(false);

  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  useEffect(() => {
    observadoresRef.current = observadores;
  }, [observadores]);

  useEffect(() => {
    if (estado.fase === FASES_ENSAMBLAGE.explotado && !estado.resultado && !primerProblemaGeneradoRef.current) {
      const nuevoProblema = generarPreguntaMatematica();
      if (nuevoProblema) {
        setProblemaMatematico(nuevoProblema);
        setMostrarModalMatematica(true);
        primerProblemaGeneradoRef.current = true;
      }
    }
  }, [estado.fase, estado.resultado]);

  const partesBase = useMemo(() => obtenerPartesRobot(configuracion.nivel), [configuracion.nivel]);
  const temaNombre = useMemo(() => obtenerNombreRobot(configuracion.nivel), [configuracion.nivel]);
  const todasLasPiezasDef = useMemo(() => {
    const extras = configuracion.nivel >= 3 ? [...PIEZAS_ALTERNATIVAS] : [];
    return [...partesBase, ...extras];
  }, [configuracion.nivel, partesBase]);

  const checkpointPhase = checkpointRuntime?.phase ?? null;
  const checkpointSessionId = checkpointRuntime?.sessionId ?? null;
  const checkpointState = checkpointRuntime?.checkpointState ?? null;
  const saveCheckpoint = checkpointRuntime?.saveCheckpoint ?? null;

  const calcularTiempoTranscurridoMs = useCallback(() => (
    marcaInicioRef.current ? Math.max(0, Date.now() - marcaInicioRef.current) : 0
  ), []);

  useEffect(() => {
    if (
      !checkpointSessionId ||
      checkpointPhase !== GAME_CHECKPOINT_PHASES.ready ||
      checkpointSessionRef.current === checkpointSessionId
    ) {
      return;
    }

    checkpointSessionRef.current = checkpointSessionId;
    const parsed = parseRobotTallerCheckpointState(checkpointState, configuracion);

    if (!parsed) {
      ultimaFirmaLogicaCheckpointRef.current = null;
      setTiempoRestanteRestauradoMs(null);
      return;
    }

    const resultadoRestaurado = parsed.pendingFinalization
      ? {
          ...construirResumenPartidaEnsamblaje({
            exito: parsed.contadorEnsambladas >= partesBase.length,
            configuracion,
            partesEnsambladas: parsed.contadorEnsambladas,
            tiempoTranscurridoMs: parsed.tiempoTranscurridoMs,
            partesBase,
            erroresReales: parsed.erroresAcumulados,
          }),
          finalizacionSesion: parsed.pendingFinalization,
        }
      : null;
    const restored = restoreRobotTallerCheckpointState({
      checkpoint: parsed,
      configuracion,
      definicionesPiezas: todasLasPiezasDef,
      resultado: resultadoRestaurado,
    });

    if (!restored) {
      ultimaFirmaLogicaCheckpointRef.current = null;
      setTiempoRestanteRestauradoMs(null);
      return;
    }

    estadoRef.current = restored.estado;
    intentosRef.current = restored.intentosMatematicos;
    finalizacionPendienteRef.current = restored.pendingFinalization;
    marcaInicioRef.current = restored.tiempoTranscurridoMs > 0
      ? Date.now() - restored.tiempoTranscurridoMs
      : null;
    finalizadoRef.current = Boolean(restored.pendingFinalization);
    primerProblemaGeneradoRef.current = Boolean(
      restored.problemaMatematico || restored.pendingFinalization,
    );
    omitirAutoguardadoDeHidratacionRef.current = true;
    ultimaFirmaLogicaCheckpointRef.current = JSON.stringify({
      ...parsed,
      tiempoTranscurridoMs: 0,
    });

    setEstado(restored.estado);
    setPreguntaActual(restored.preguntaActual);
    setFeedbackQuiz(null);
    setProblemaMatematico(restored.problemaMatematico);
    setFeedbackMatematica(null);
    setMostrarModalMatematica(restored.mostrarModalMatematica);
    setTiempoRestanteRestauradoMs(restored.tiempoRestanteMs);

    if (restored.pendingFinalization) {
      ejecutarObservadorSeguro(
        observadoresRef.current.alReanudarFinalizacion,
        restored.pendingFinalization,
      );
    }
  }, [
    checkpointPhase,
    checkpointSessionId,
    checkpointState,
    configuracion,
    partesBase,
    todasLasPiezasDef,
  ]);

  useEffect(() => {
    if (
      !checkpointSessionId ||
      checkpointPhase !== GAME_CHECKPOINT_PHASES.ready ||
      checkpointSessionRef.current !== checkpointSessionId ||
      typeof saveCheckpoint !== 'function'
    ) {
      return;
    }

    if (omitirAutoguardadoDeHidratacionRef.current) {
      omitirAutoguardadoDeHidratacionRef.current = false;
      return;
    }

    const snapshot = createRobotTallerCheckpointState({
      configuracion,
      estado,
      intentosMatematicos: intentosRef.current,
      mostrarModalMatematica,
      pendingFinalization: finalizacionPendienteRef.current,
      preguntaActual,
      problemaMatematico,
      tiempoTranscurridoMs: calcularTiempoTranscurridoMs(),
    });
    const logicalSignature = JSON.stringify({
      ...snapshot,
      tiempoTranscurridoMs: 0,
    });

    if (logicalSignature === ultimaFirmaLogicaCheckpointRef.current) {
      return;
    }

    ultimaFirmaLogicaCheckpointRef.current = logicalSignature;
    saveCheckpoint(snapshot);
  }, [
    calcularTiempoTranscurridoMs,
    checkpointPhase,
    checkpointSessionId,
    configuracion,
    estado,
    mostrarModalMatematica,
    preguntaActual,
    problemaMatematico,
    saveCheckpoint,
  ]);

  const generarPreguntaMatematica = useCallback((idEspecifico) => {
    const est = estadoRef.current;
    const partesBloqueadas = est.partes.filter(p => !p.ensamblada && p.bloqueado);
    if (partesBloqueadas.length === 0) return null;

    let parteElegida = null;
    if (idEspecifico) {
      parteElegida = partesBloqueadas.find(p => p.id === idEspecifico);
    }
    
    const esSecuencial = configuracion.nivel === 2;
    if (!parteElegida && esSecuencial) {
      const esperado = ['torso', 'pierna_izq', 'pierna_der', 'brazo_izq', 'brazo_der', 'cabeza', 'antena'][est.contadorEnsambladas];
      parteElegida = partesBloqueadas.find(p => p.id === esperado);
    }

    if (!parteElegida) {
      parteElegida = partesBloqueadas[Math.floor(Math.random() * partesBloqueadas.length)];
    }

    let operadores = ['+', '-'];
    let min = 1;
    let max = 10;
    
    if (configuracion.nivel === 2) {
      operadores = ['x', '/'];
      min = 2;
      max = 12;
    } else if (configuracion.nivel === 3) {
      operadores = ['+', '-', 'x', '/'];
      min = 3;
      max = 15;
    }
    
    const operadorElegido = operadores[Math.floor(Math.random() * operadores.length)];
    let a, b, respuesta;
    
    if (operadorElegido === '+') {
      a = min + Math.floor(Math.random() * (max - min));
      b = min + Math.floor(Math.random() * (max - min));
      respuesta = a + b;
    } else if (operadorElegido === '-') {
      a = min + Math.floor(Math.random() * (max - min + 10));
      b = min + Math.floor(Math.random() * (a - min));
      if (a < b) { const temp = a; a = b; b = temp; }
      respuesta = a - b;
    } else if (operadorElegido === 'x') {
      a = min + Math.floor(Math.random() * (max - min));
      b = min + Math.floor(Math.random() * (max - min));
      respuesta = a * b;
    } else if (operadorElegido === '/') {
      b = min + Math.floor(Math.random() * (max - min));
      respuesta = min + Math.floor(Math.random() * (max - min));
      a = b * respuesta;
    }
    
    return {
      idParte: parteElegida.id,
      operador: operadorElegido,
      a,
      b,
      respuesta,
      timestamp: Date.now(),
    };
  }, []);

  const manejarCorrectaMatematica = useCallback((idParte) => {
    setMostrarModalMatematica(false);
    setProblemaMatematico(null);
    intentosRef.current[idParte] = 0;

    const nuevoEstado = {
      ...estadoRef.current,
      partes: estadoRef.current.partes.map((p) =>
        p.ensamblada
          ? p
          : p.id === idParte
            ? { ...p, bloqueado: false, bloqueadoPorMatematicas: false }
            : { ...p, bloqueado: true, bloqueadoPorMatematicas: true }
      ),
      mensaje: '¡Pieza desbloqueada! Arrástrala hasta el lugar iluminado.',
      eventosSesion: [...estadoRef.current.eventosSesion, {
        tipoEvento: 'desbloqueo_matematico',
        habilidad: 'Lógica',
        tiempoReaccionMs: null,
        puntos: 10,
        comboEnEvento: 0,
        metadata: { parte_id: idParte, via_matematica: true },
        timestamp: new Date().toISOString(),
      }],
    };
    estadoRef.current = nuevoEstado;
    setEstado(nuevoEstado);
    
  }, []);

  const manejarIncorrectaMatematica = useCallback((payload) => {
    const idParte = typeof payload === 'string' ? payload : payload?.idParte;
    const exhausted = Boolean(payload?.exhausted);

    if (!idParte) {
      return;
    }

    intentosRef.current[idParte] = (intentosRef.current[idParte] || 0) + 1;

    const nuevoEstado = {
      ...estadoRef.current,
      erroresAcumulados: (estadoRef.current.erroresAcumulados || 0) + 1,
      mensaje: exhausted
        ? 'Intentemos una nueva cuenta para desbloquear la pieza.'
        : 'Respuesta incorrecta. Intenta otra vez.',
    };
    estadoRef.current = nuevoEstado;
    setEstado(nuevoEstado);

    registrarEvento(
      construirEventoEnsamblaje({
        tipoEvento: 'error',
        puntos: 0,
        metadata: {
          parte_id: idParte,
          origen: 'reto_matematico',
          agotado: exhausted,
          intentos: intentosRef.current[idParte],
        },
      }),
    );

    if (!exhausted) {
      return;
    }

    const nuevoProblema = generarPreguntaMatematica(idParte);
    setProblemaMatematico(nuevoProblema);
    setMostrarModalMatematica(Boolean(nuevoProblema));
  }, [generarPreguntaMatematica]);



  const generarPregunta = useCallback(() => {
    const est = estadoRef.current;
    const disponibles = obtenerPiezasDesbloqueadasPendientes(est);
    if (disponibles.length === 0) {
      setPreguntaActual(null);
      return;
    }
    const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];
    const opciones = generarOpciones(elegida.id, est.partes, todasLasPiezasDef);
    const funcionDato = DATOS_FUNCION_PIEZA[elegida.id];
    setPreguntaActual({
      parteCorrectaId: elegida.id,
      opciones,
      funcionNecesaria: funcionDato?.funcion ?? '',
    });
    setFeedbackQuiz(null);
  }, [todasLasPiezasDef]);

  const ensamblarPiezaQuiz = useCallback((idParte) => {
    const estadoActual = estadoRef.current;
    const parteDef = todasLasPiezasDef.find((p) => p.id === idParte);
    if (!parteDef) return;
    const posObj = parteDef.posicionObjetivo;
    const rotObj = parteDef.rotacionObjetivo ?? [0, 0, 0];
    const nuevoContador = estadoActual.contadorEnsambladas + 1;
    const todasEnsambladas = nuevoContador >= partesBase.length;

    if (!marcaInicioRef.current) {
      marcaInicioRef.current = Date.now();
    }

    setEstado((previo) => ({
      ...previo,
      parteAgarrada: null,
      partes: previo.partes.map((p) =>
        p.id === idParte
          ? { ...p, posicion: [...posObj], rotacion: [...rotObj], ensamblada: true, agarrada: false }
          : p,
      ),
      contadorEnsambladas: nuevoContador,
      mensaje: todasEnsambladas
        ? 'Robot armado completamente.'
        : `${nuevoContador} de ${partesBase.length} piezas colocadas.`,
    }));

    registrarEvento(
      construirEventoEnsamblaje({
        tipoEvento: 'acierto',
        puntos: 15,
        comboEnEvento: nuevoContador,
        metadata: { parte_id: idParte, nivel: configuracion.nivel },
      }),
    );

    if (todasEnsambladas) {
      setTimeout(() => finalizarPartida(true), 400);
    } else {
      setTimeout(() => generarPregunta(), 600);
    }
  }, [configuracion, todasLasPiezasDef, partesBase, observadores]);

  const responderQuiz = useCallback((idParte) => {
    if (!preguntaActual || feedbackQuiz?.tipo === 'correcto') return;
    const esCorrecta = idParte === preguntaActual.parteCorrectaId;

    if (esCorrecta) {
      setFeedbackQuiz({ tipo: 'correcto', mensaje: '¡Bien hecho! Pieza colocada correctamente.', parteId: idParte, timestamp: Date.now() });
      ensamblarPiezaQuiz(idParte);
    } else {
      const parteDef = todasLasPiezasDef.find((p) => p.id === preguntaActual.parteCorrectaId);
      const opcionDef = todasLasPiezasDef.find((p) => p.id === idParte);
      const funcionEsperada = DATOS_FUNCION_PIEZA[preguntaActual.parteCorrectaId];
      const funcionElegida = DATOS_FUNCION_PIEZA[idParte];
      let mensaje = EXPLICACIONES_ERROR[preguntaActual.parteCorrectaId] ?? 'Esa pieza no es la correcta. Sigue intentando.';
      if (opcionDef && funcionEsperada && funcionElegida) {
        mensaje = `No, el ${opcionDef.nombre.toLowerCase()} ${funcionElegida.descripcion}. El ${parteDef?.nombre?.toLowerCase() ?? 'espacio'} necesita una pieza que ${funcionEsperada.funcion}.`;
      }
      setFeedbackQuiz({ tipo: 'error', mensaje, parteId: idParte, timestamp: Date.now() });
      setTimeout(() => setFeedbackQuiz((prev) => prev?.tipo === 'error' ? null : prev), 2500);
      const nuevoEstado = {
        ...estadoRef.current,
        erroresAcumulados: (estadoRef.current.erroresAcumulados || 0) + 1,
      };
      estadoRef.current = nuevoEstado;
      setEstado(nuevoEstado);
    }
  }, [preguntaActual, feedbackQuiz, todasLasPiezasDef]);

  const reiniciarPartida = useCallback(() => {
    marcaInicioRef.current = null;
    finalizadoRef.current = false;
    finalizacionPendienteRef.current = null;
    ultimaFirmaLogicaCheckpointRef.current = null;
    omitirAutoguardadoDeHidratacionRef.current = false;
    primerProblemaGeneradoRef.current = false;
    setFeedbackQuiz(null);
    setPreguntaActual(null);
    setProblemaMatematico(null);
    setMostrarModalMatematica(false);
    setTiempoRestanteRestauradoMs(null);
    setEstado(construirEstadoInicial(configuracion.nivel, configuracion.idMision));
  }, [configuracion.nivel, configuracion.idMision]);

  const registrarEvento = (evento) => {
    setEstado((previo) => ({
      ...previo,
      eventosSesion: [...previo.eventosSesion, { ...evento, timestamp: new Date().toISOString() }],
    }));
    ejecutarObservadorSeguro(observadores.alRegistrarEvento, evento);
  };

  const finalizarPartida = (exito) => {
    if (finalizadoRef.current) {
      return;
    }

    finalizadoRef.current = true;
    const estadoActual = estadoRef.current;
    const tiempoTranscurridoMs = marcaInicioRef.current
      ? Date.now() - marcaInicioRef.current
      : 0;
    const resultadoBase = construirResumenPartidaEnsamblaje({
      exito,
      configuracion,
      partesEnsambladas: estadoActual.contadorEnsambladas,
      tiempoTranscurridoMs,
      partesBase,
      erroresReales: estadoActual.erroresAcumulados,
    });
    const finalizacionIdentificada =
      observadoresRef.current.alPrepararFinalizacion?.(
        resultadoBase.finalizacionSesion,
      ) ?? resultadoBase.finalizacionSesion;
    const resultado = {
      ...resultadoBase,
      finalizacionSesion: finalizacionIdentificada,
    };
    const estadoFinal = {
      ...estadoActual,
      fase: FASES_ENSAMBLAGE.completado,
      parteAgarrada: null,
      resultado,
      mensaje: exito ? 'Robot armado correctamente.' : 'Sigue intentando.',
    };

    finalizacionPendienteRef.current = finalizacionIdentificada;
    estadoRef.current = estadoFinal;
    setEstado(estadoFinal);
    setPreguntaActual(null);
    setFeedbackQuiz(null);
    setProblemaMatematico(null);
    setFeedbackMatematica(null);
    setMostrarModalMatematica(false);

    if (
      checkpointSessionRef.current === checkpointSessionId &&
      typeof saveCheckpoint === 'function'
    ) {
      const pendingSnapshot = createRobotTallerCheckpointState({
        configuracion,
        estado: estadoFinal,
        intentosMatematicos: intentosRef.current,
        mostrarModalMatematica: false,
        pendingFinalization: finalizacionIdentificada,
        preguntaActual: null,
        problemaMatematico: null,
        tiempoTranscurridoMs,
      });
      ultimaFirmaLogicaCheckpointRef.current = JSON.stringify({
        ...pendingSnapshot,
        tiempoTranscurridoMs: 0,
      });
      saveCheckpoint(pendingSnapshot);
    }

    ejecutarObservadorSeguro(observadoresRef.current.alFinalizarPartida, resultado);
  };

  const agarrarParte = useCallback((idParte, posicionInicial = null) => {
    const estadoActual = estadoRef.current;
    if (estadoActual.fase !== FASES_ENSAMBLAGE.explotado && estadoActual.fase !== FASES_ENSAMBLAGE.ensamblando) return false;

    const parte = estadoActual.partes.find((p) => p.id === idParte);
    if (!parte || parte.ensamblada || estadoActual.parteAgarrada) {
      return false;
    }

    const piezasPendientesDesbloqueadas = obtenerPiezasDesbloqueadasPendientes(estadoActual);
    const piezaActivaPendienteId = piezasPendientesDesbloqueadas[0]?.id ?? null;

    if (parte.bloqueado) {
      if (piezaActivaPendienteId && piezaActivaPendienteId !== idParte) {
        const siguienteEstado = {
          ...estadoActual,
          mensaje: 'Primero coloca la pieza que ya desbloqueaste.',
        };
        estadoRef.current = siguienteEstado;
        setEstado(siguienteEstado);
        return false;
      }

      const nuevoProblema = generarPreguntaMatematica(idParte);
      if (nuevoProblema) {
        setProblemaMatematico(nuevoProblema);
        setMostrarModalMatematica(true);
      }
      return false;
    }

    if (!marcaInicioRef.current) {
      marcaInicioRef.current = Date.now();
    }

    ultimaPosicionGrabadaRef.current[idParte] = posicionInicial ?? parte.posicion;

    const siguienteEstado = {
      ...estadoActual,
      parteAgarrada: idParte,
      partes: estadoActual.partes.map((p) =>
        p.id === idParte
          ? { ...p, agarrada: true, agarradaPosInicial: posicionInicial ?? p.posicion }
          : p,
      ),
    };

    estadoRef.current = siguienteEstado;
    setEstado(siguienteEstado);


    ejecutarObservadorSeguro(observadores.alIniciarPartida, {
      configuracionPartida: configuracion,
      parteId: idParte,
    });

    return true;
  }, [configuracion, observadores, generarPreguntaMatematica]);

  const moverParte = useCallback((idParte, nuevaPosicion) => {
    ultimaPosicionGrabadaRef.current[idParte] = nuevaPosicion;
  }, []);

  const soltarParte = useCallback(() => {
    const estadoActual = estadoRef.current;
    const idParte = estadoActual.parteAgarrada;
    if (!idParte) return;

    const parte = estadoActual.partes.find((p) => p.id === idParte);
    if (!parte) return;

    const posFinal = ultimaPosicionGrabadaRef.current[idParte] || parte.posicion;

    const validacion = validarSnapPorNivel({
      idParte,
      posicionParte: posFinal,
      nivel: configuracion.nivel,
      ordenActual: estadoActual.ordenActual,
      partesEnsambladas: estadoActual.contadorEnsambladas,
      partesBase,
      alternativas: configuracion.nivel >= 3 ? [...PIEZAS_ALTERNATIVAS] : [],
    });

    if (validacion.permitido && validacion.ensamblada) {
      const posObj = validacion.posicionObjetivo;
      const rotObj = validacion.rotacionObjetivo ?? [0, 0, 0];
      const nuevoContador = estadoActual.contadorEnsambladas + 1;
      const nuevoOrden = configuracion.nivel === 2
        ? estadoActual.ordenActual + 1
        : estadoActual.ordenActual;
      const siguienteEsperado = obtenerSiguienteEsperado(nuevoContador, configuracion.nivel);
    const todasEnsambladas = nuevoContador >= partesBase.length;

      const siguienteEstado = {
        ...estadoActual,
        parteAgarrada: null,
        partes: estadoActual.partes.map((p) =>
          p.id === idParte
            ? { ...p, posicion: [...posObj], rotacion: [...rotObj], ensamblada: true, agarrada: false }
            : p,
        ),
        contadorEnsambladas: nuevoContador,
        ordenActual: nuevoOrden,
        mensaje: todasEnsambladas
          ? 'Robot armado completamente.'
          : siguienteEsperado
            ? `Ahora coloca: ${siguienteEsperado}`
            : `${nuevoContador} de ${partesBase.length} piezas colocadas.`,
      };

      estadoRef.current = siguienteEstado;
      setEstado(siguienteEstado);

      registrarEvento(
        construirEventoEnsamblaje({
          tipoEvento: 'acierto',
          puntos: 15,
          comboEnEvento: nuevoContador,
          metadata: { parte_id: idParte, nivel: configuracion.nivel },
        }),
      );

      if (todasEnsambladas) {
        setTimeout(() => finalizarPartida(true), 300);
      } else {
        setTimeout(() => {
          const nuevoProblema = generarPreguntaMatematica();
          if (nuevoProblema) {
            setProblemaMatematico(nuevoProblema);
            setMostrarModalMatematica(true);
          }
        }, 500);
      }
    } else {
      const parteDef = partesBase.find((p) => p.id === idParte)
        ?? PIEZAS_ALTERNATIVAS.find((a) => a.id === idParte);

      const siguienteEstado = {
        ...estadoActual,
        parteAgarrada: null,
        erroresAcumulados: (estadoActual.erroresAcumulados || 0) + 1,
        partes: estadoActual.partes.map((p) =>
          p.id === idParte
            ? {
                ...p,
                posicion: [...(parteDef?.posicionExplotada ?? [0, 0, 0])],
                rotacion: [0, 0, 0],
                agarrada: false,
              }
            : p,
        ),
        mensaje: validacion.mensaje ?? (
          validacion.casiSnap
            ? `¡Casi lo logras! La pieza está cerquita, muévela un poquito más.`
            : '¡Ups! Esa pieza no va ahí. ¡Sigue intentando!'
        ),
      };

      estadoRef.current = siguienteEstado;
      setEstado(siguienteEstado);

      registrarEvento(
        construirEventoEnsamblaje({
          tipoEvento: 'error',
          puntos: 0,
          metadata: { parte_id: idParte, motivo: validacion.mensaje },
        }),
      );
    }
  }, [configuracion, observadores, partesBase, generarPreguntaMatematica]);

  return {
    configuracion,
    estado,
    agarrarParte,
    moverParte,
    soltarParte,
    reiniciarPartida,
    finalizarPorTiempo: () => finalizarPartida(false),
    iniciarPartida: agarrarParte,
    modoQuiz: false,
    preguntaActual,
    feedbackQuiz,
    responderQuiz,
    problemaMatematico,
    feedbackMatematica,
    mostrarModalMatematica,
    setMostrarModalMatematica,
    manejarCorrectaMatematica,
    manejarIncorrectaMatematica,
    partesBase,
    temaNombre,
    tiempoRestanteRestauradoMs,
  };
};
