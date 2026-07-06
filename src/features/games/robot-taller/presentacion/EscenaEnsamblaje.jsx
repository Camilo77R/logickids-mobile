import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PIEZAS_ALTERNATIVAS, obtenerPartesRobot } from '../robotTaller.constants';
import {
  ErrorFlash,
  EfectoCelebracion,
  FondoHolografico,
  ManoIndicadora,
  RastroDeParticulas,
  RayoConexion,
  ScanBeamSync,
  ShaderTimeSync,
} from './escena/RobotTallerSceneVisuals';
import { ParteMesh, SlotGlow } from './escena/RobotTallerPieceNodes';
import { ROBOT_CANVAS_DPR } from './escena/robotTallerSceneConfig';

function Escena3D({
  estado,
  parteAgarradaId,
  schematicRef,
  slotDestacadoId,
  mathTargetId,
  feedbackQuiz,
  partesRobot,
  alternativas,
  arrastreRef,
  onIniciarArrastre,
  onMoverParte,
  onSoltarParte,
  interaccionesBloqueadas,
}) {
  useFrame(() => {
    if (!schematicRef.current) return;
  });

  return (
    <group ref={schematicRef} position={[0, 1.5, 0]}>
      <ShaderTimeSync />
      <ScanBeamSync />
      <ambientLight color="#ffffff" intensity={0.5} />
      <pointLight position={[0, 3, 8]} intensity={2.0} color="#ffffff" distance={30} />
      <pointLight position={[0, -2, 5]} intensity={1.0} color="#00FF88" distance={20} />

      {estado.partes.map((estadoParte) => {
        const parteDef =
          partesRobot.find((piece) => piece.id === estadoParte.id) ??
          alternativas.find((piece) => piece.id === estadoParte.id);
        if (!parteDef) return null;

        const esActiva =
          !estadoParte.ensamblada &&
          !estadoParte.agarrada &&
          estadoParte.id === slotDestacadoId;

        return (
          <ParteMesh
            key={estadoParte.id}
            parteDef={parteDef}
            estadoParte={estadoParte}
            seleccionada={parteAgarradaId === estadoParte.id}
            esActiva={esActiva}
            mathTargetId={mathTargetId}
            schematicRef={schematicRef}
            arrastreRef={arrastreRef}
            onIniciarArrastre={onIniciarArrastre}
            onMoverParte={onMoverParte}
            onSoltarParte={onSoltarParte}
            interaccionesBloqueadas={interaccionesBloqueadas}
          />
        );
      })}

      {estado.partes
        .filter((parte) => !parte.ensamblada)
        .map((parteEstado) => {
          const parteDef =
            partesRobot.find((piece) => piece.id === parteEstado.id) ??
            alternativas.find((piece) => piece.id === parteEstado.id);
          if (!parteDef) return null;
          return (
            <SlotGlow
              key={`slot-${parteEstado.id}`}
              parteDef={parteDef}
              destacado={parteEstado.id === slotDestacadoId}
            />
          );
        })}

      {slotDestacadoId && !parteAgarradaId
        ? (() => {
            const parteDef =
              partesRobot.find((piece) => piece.id === slotDestacadoId) ??
              alternativas.find((piece) => piece.id === slotDestacadoId);
            if (!parteDef) return null;
            return (
              <group key="conexion-activa">
                <ManoIndicadora posicion={parteDef.posicionExplotada} />
                <RayoConexion desde={parteDef.posicionExplotada} hasta={parteDef.posicionObjetivo} />
              </group>
            );
          })()
        : null}

      {parteAgarradaId
        ? (() => {
            const parteEstado = estado.partes.find((piece) => piece.id === parteAgarradaId);
            const parteDef =
              partesRobot.find((piece) => piece.id === parteAgarradaId) ??
              alternativas.find((piece) => piece.id === parteAgarradaId);
            if (!parteEstado || !parteDef) return null;
            const desde = parteEstado.posicion || parteDef.posicionExplotada;
            return (
              <RastroDeParticulas
                key="rastro"
                desde={desde}
                hasta={parteDef.posicionObjetivo}
                activo
              />
            );
          })()
        : null}

      {feedbackQuiz?.tipo === 'correcto'
        ? (() => {
            const parteDef =
              partesRobot.find((piece) => piece.id === feedbackQuiz.parteId) ??
              alternativas.find((piece) => piece.id === feedbackQuiz.parteId);
            if (!parteDef) return null;
            return (
              <EfectoCelebracion
                key={`celeb-${feedbackQuiz.timestamp}`}
                activo
                posicion={parteDef.posicionObjetivo}
              />
            );
          })()
        : null}
    </group>
  );
}

function buildThemeColors() {
  return {
    1: '#00ffff',
    2: '#00E5FF',
    3: '#00F5D4',
  };
}

export default function EscenaEnsamblaje({
  estado,
  nivel = 1,
  slotDestacadoId,
  mathTargetId,
  feedbackQuiz,
  onAgarrarParte,
  onMoverParte,
  onSoltarParte,
  interaccionesBloqueadas = false,
}) {
  const schematicRef = useRef(null);
  const arrastreRef = useRef(null);
  const [errorActivo, setErrorActivo] = useState(false);
  const prevMensajeRef = useRef(estado.mensaje);
  const prevNivelRef = useRef(nivel);
  const prevFaseRef = useRef(estado.fase);
  const partesRobot = useMemo(() => obtenerPartesRobot(nivel), [nivel]);
  const alternativas = useMemo(() => PIEZAS_ALTERNATIVAS, []);
  const colorFondo = useMemo(() => buildThemeColors()[nivel] ?? '#00ffff', [nivel]);

  useEffect(() => {
    const mensaje = estado.mensaje;
    const anterior = prevMensajeRef.current;
    if (
      anterior !== mensaje &&
      mensaje &&
      (mensaje.includes('no va') ||
        mensaje.includes('lejos') ||
        mensaje.includes('Casi') ||
        mensaje.includes('No hay lugar'))
    ) {
      setErrorActivo(true);
      const timer = setTimeout(() => setErrorActivo(false), 600);
      return () => clearTimeout(timer);
    }
    prevMensajeRef.current = mensaje;
    return undefined;
  }, [estado.mensaje]);

  const manejarInicioArrastre = useCallback(
    (idParte, posicionInicial, offset, node, pointerId = null, zFijo = 0) => {
      if (interaccionesBloqueadas) return false;

      const agarro = onAgarrarParte?.(idParte, posicionInicial);
      if (!agarro) return false;

      arrastreRef.current = {
        idParte,
        offset,
        node,
        pointerId,
        zFijo,
      };
      return true;
    },
    [interaccionesBloqueadas, onAgarrarParte],
  );

  const finalizarArrastre = useCallback(() => {
    if (!arrastreRef.current) return;
    arrastreRef.current = null;
    onSoltarParte?.();
  }, [onSoltarParte]);

  useEffect(() => {
    const cambioDeNivel = prevNivelRef.current !== nivel;
    const cambioDeFase = prevFaseRef.current !== estado.fase;

    if (cambioDeNivel || cambioDeFase) {
      arrastreRef.current = null;
    }

    prevNivelRef.current = nivel;
    prevFaseRef.current = estado.fase;
  }, [nivel, estado.fase]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        dpr={ROBOT_CANVAS_DPR}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        onPointerMissed={finalizarArrastre}
      >
        <FondoHolografico colorBase={colorFondo} />
        <ErrorFlash visible={errorActivo} />
        <Escena3D
          schematicRef={schematicRef}
          estado={estado}
          parteAgarradaId={estado.parteAgarrada}
          slotDestacadoId={slotDestacadoId}
          mathTargetId={mathTargetId}
          feedbackQuiz={feedbackQuiz}
          partesRobot={partesRobot}
          alternativas={alternativas}
          arrastreRef={arrastreRef}
          onIniciarArrastre={manejarInicioArrastre}
          onMoverParte={onMoverParte}
          onSoltarParte={onSoltarParte}
          interaccionesBloqueadas={interaccionesBloqueadas}
        />
      </Canvas>
    </View>
  );
}
