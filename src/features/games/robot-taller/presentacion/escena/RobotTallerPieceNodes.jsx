import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createHologramMat } from '../materiales/WorkshopShader';
import {
  AMBER,
  COLOR_BLOQUEADO,
  VERDE_HOLO,
} from './robotTallerSceneConfig';
import {
  aplicarMovimientoArrastre,
  crearHitAreaPieza,
  crearOffsetDeArrastre,
  esPointerActivo,
  obtenerPuntoLocalDesdeEvento,
} from '../robotTallerDrag';
import { AnilloPieza } from './RobotTallerSceneVisuals';

function renderizarGeometriaParte(forma, tamanio, detalle = false) {
  switch (forma) {
    case 'sphere':
      return <sphereGeometry args={[tamanio[0], detalle ? 12 : 24, detalle ? 12 : 24]} />;
    case 'cylinder':
      return (
        <cylinderGeometry
          args={[
            tamanio[0],
            detalle ? tamanio[2] ?? tamanio[0] : tamanio[0],
            tamanio[1],
            detalle ? 12 : 16,
          ]}
        />
      );
    case 'cone':
      return <coneGeometry args={[tamanio[0], tamanio[1], detalle ? 12 : 16]} />;
    default:
      return <boxGeometry args={detalle ? [tamanio[0], tamanio[1], tamanio[2] ?? tamanio[0]] : tamanio} />;
  }
}

function SubParteDetalle({ def, color, parentRef }) {
  const subRef = useRef();
  const colorHex = useMemo(() => new THREE.Color(color), [color]);

  useFrame(() => {
    if (!subRef.current || !parentRef.current) return;
    subRef.current.position.copy(parentRef.current.position);
    subRef.current.position.x += def.offset[0];
    subRef.current.position.y += def.offset[1];
    subRef.current.position.z += def.offset[2];
    subRef.current.rotation.copy(parentRef.current.rotation);
  });

  return (
    <mesh ref={subRef}>
      {renderizarGeometriaParte(def.forma, def.tamanio, true)}
      <meshStandardMaterial
        color={colorHex}
        metalness={0.4}
        roughness={0.3}
        emissive={colorHex}
        emissiveIntensity={0.3}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function SubParteHolograma({ def, mat, parentRef }) {
  const subRef = useRef();

  useFrame(() => {
    if (!subRef.current || !parentRef.current) return;
    subRef.current.position.copy(parentRef.current.position);
    subRef.current.position.x += def.offset[0];
    subRef.current.position.y += def.offset[1];
    subRef.current.position.z += def.offset[2];
    subRef.current.rotation.copy(parentRef.current.rotation);
  });

  return (
    <mesh ref={subRef}>
      {renderizarGeometriaParte(def.forma, def.tamanio, true)}
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function SlotGlow({ parteDef, destacado = false }) {
  const ringRef = useRef();
  const beamRef = useRef();
  const shapeRef = useRef();
  const colorSlot = destacado ? '#00FF88' : '#00aaff';
  const ringMat = useMemo(() => createHologramMat(colorSlot, 0.8, 3.0, 0, false), [colorSlot]);
  const beamMat = useMemo(() => createHologramMat(colorSlot, 0.15, 1.5, 0, false), [colorSlot]);
  const shapeMat = useMemo(
    () => createHologramMat(colorSlot, destacado ? 0.6 : 0.25, 2.0, 0, false, true),
    [colorSlot, destacado],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = destacado ? 3 : 1.5;
    const pulse = 0.5 + 0.5 * Math.sin(t * speed);

    if (ringRef.current) {
      ringMat.uniforms.uOpacity.value = destacado ? 0.3 + 0.7 * pulse : 0.15 + 0.25 * pulse;
      ringRef.current.scale.setScalar(destacado ? 0.8 + 0.3 * pulse : 0.5 + 0.1 * pulse);
    }

    if (beamRef.current) {
      beamMat.uniforms.uOpacity.value = destacado ? 0.08 + 0.12 * pulse : 0.03 + 0.05 * pulse;
      beamRef.current.position.y = -0.5 + pulse * 0.5;
    }

    if (shapeRef.current) {
      shapeMat.uniforms.uOpacity.value = destacado ? 0.4 + 0.6 * pulse : 0.2 + 0.3 * pulse;
    }
  });

  const rot = parteDef.rotacionObjetivo ?? [0, 0, 0];

  return (
    <group position={parteDef.posicionObjetivo}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[destacado ? 0.8 : 0.5, destacado ? 1.2 : 0.7, 32]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
      <mesh ref={beamRef}>
        <cylinderGeometry args={[0.03, destacado ? 0.15 : 0.08, destacado ? 3.0 : 1.5, 8]} />
        <primitive object={beamMat} attach="material" />
      </mesh>
      <group rotation={rot}>
        <mesh ref={shapeRef}>
          {renderizarGeometriaParte(parteDef.forma, parteDef.tamanio)}
          <primitive object={shapeMat} attach="material" />
        </mesh>
        {parteDef.detalle?.map((subDef, index) => (
          <SubParteHolograma key={index} def={subDef} mat={shapeMat} parentRef={shapeRef} />
        ))}
      </group>
    </group>
  );
}

export function ParteMesh({
  parteDef,
  estadoParte,
  seleccionada,
  esActiva,
  onIniciarArrastre,
  onMoverParte,
  onSoltarParte,
  arrastreRef,
  mathTargetId,
  schematicRef,
  interaccionesBloqueadas = false,
}) {
  const meshRef = useRef();
  const groupRef = useRef();
  const esMathTarget = estadoParte.bloqueado && parteDef.id === mathTargetId;
  const color = seleccionada
    ? AMBER
    : estadoParte.ensamblada
      ? '#00ff88'
      : estadoParte.bloqueado
        ? COLOR_BLOQUEADO
        : parteDef.color;
  const puedeHacerClic = !estadoParte.ensamblada && !interaccionesBloqueadas;
  const targetPositionRef = useMemo(() => new THREE.Vector3(), []);
  const baseColorRef = useMemo(() => new THREE.Color(), []);
  const subColorRef = useMemo(() => new THREE.Color(), []);
  const initializedRef = useRef(false);

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return;
    const group = groupRef.current;
    const mesh = meshRef.current;
    const material = mesh.material;

    if (!initializedRef.current) {
      if (!estadoParte.ensamblada && !estadoParte.agarrada) {
        group.position.set(...parteDef.posicionExplotada);
      } else if (estadoParte.ensamblada) {
        group.position.set(...parteDef.posicionObjetivo);
      } else {
        group.position.set(...estadoParte.posicion);
      }
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      initializedRef.current = true;
    }

    if (estadoParte.ensamblada) {
      targetPositionRef.set(...parteDef.posicionObjetivo);
      group.position.copy(targetPositionRef);
    } else if (!estadoParte.agarrada) {
      targetPositionRef.set(...(estadoParte.posicion ?? parteDef.posicionExplotada));
      group.position.lerp(targetPositionRef, 0.14);
    }

    const esDesbloqueadaParaArrastre = !estadoParte.bloqueado && !estadoParte.ensamblada;
    const esIdle = !estadoParte.ensamblada && !estadoParte.agarrada && !esActiva && !esMathTarget;

    if (esMathTarget) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3);
      mesh.scale.setScalar(1);
      material.emissiveIntensity = 0.3 + pulse * 0.7;
    } else if (esActiva) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 5);
      mesh.scale.setScalar(1 + 0.06 * Math.sin(state.clock.elapsedTime * 5));
      material.emissiveIntensity = 0.6 + pulse * 0.8;
      group.position.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
    } else if (esDesbloqueadaParaArrastre) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4);
      mesh.scale.setScalar(1);
      material.emissiveIntensity = 0.5 + pulse * 0.5;
    } else if (esIdle) {
      group.position.y += Math.sin(state.clock.elapsedTime * 0.8 + parteDef.id.length) * 0.03;
      material.emissiveIntensity = estadoParte.bloqueado ? 0.2 : 0.15;
    } else {
      mesh.scale.setScalar(1);
      material.emissiveIntensity = estadoParte.agarrada
        ? 0.8
        : estadoParte.ensamblada
          ? 0.7
          : estadoParte.bloqueado
            ? 0.3
            : 0.2;
    }

    baseColorRef.set(color);
    material.emissive.copy(baseColorRef);

    if (groupRef.current && parteDef.detalle) {
      const children = groupRef.current.children;
      for (let i = 0; i < parteDef.detalle.length; i += 1) {
        const child = children[i + 2];
        if (!child?.isMesh) continue;
        if (estadoParte.ensamblada) {
          subColorRef.set(VERDE_HOLO);
          child.material.emissiveIntensity = 0.6;
        } else if (estadoParte.bloqueado) {
          subColorRef.set(COLOR_BLOQUEADO);
          child.material.emissiveIntensity = 0.2;
        } else {
          subColorRef.set(parteDef.detalle[i].color);
          child.material.emissiveIntensity = 0.8;
        }
        child.material.emissive.copy(subColorRef);
      }
    }
  });

  const colorHex = useMemo(() => new THREE.Color(color), [color]);
  const hitAreaSize = useMemo(() => crearHitAreaPieza(parteDef), [parteDef]);
  const edgesGeom = useMemo(() => {
    let baseGeo;
    switch (parteDef.forma) {
      case 'sphere':
        baseGeo = new THREE.SphereGeometry(parteDef.tamanio[0], 16, 16);
        break;
      case 'cylinder':
        baseGeo = new THREE.CylinderGeometry(parteDef.tamanio[0], parteDef.tamanio[0], parteDef.tamanio[1], 12);
        break;
      case 'cone':
        baseGeo = new THREE.ConeGeometry(parteDef.tamanio[0], parteDef.tamanio[1], 12);
        break;
      default:
        baseGeo = new THREE.BoxGeometry(...parteDef.tamanio);
        break;
    }
    return new THREE.EdgesGeometry(baseGeo, 20);
  }, [parteDef.forma, parteDef.tamanio]);

  const iniciarArrastre = (event) => {
    if (!puedeHacerClic) return;
    event.stopPropagation();
    event.target?.setPointerCapture?.(event.pointerId);
    const posicionInicial = estadoParte.posicion || [...parteDef.posicionExplotada];
    const pointerLocal = obtenerPuntoLocalDesdeEvento(event, schematicRef?.current);
    const offset = crearOffsetDeArrastre(posicionInicial, pointerLocal);
    const agarro = onIniciarArrastre?.(
      parteDef.id,
      posicionInicial,
      offset,
      groupRef.current,
      event.pointerId ?? null,
      posicionInicial?.[2] ?? 0,
    );

    if (!agarro) {
      event.target?.releasePointerCapture?.(event.pointerId);
    }
  };

  const moverArrastre = (event) => {
    const arrastre = arrastreRef?.current;
    if (!arrastre || arrastre.idParte !== parteDef.id) return;
    if (!esPointerActivo(arrastre, event.pointerId)) return;
    event.stopPropagation();
    aplicarMovimientoArrastre({
      event,
      arrastre,
      schematicNode: schematicRef?.current,
      onMoverParte,
    });
  };

  const finalizarArrastre = (event) => {
    const arrastre = arrastreRef?.current;
    if (!arrastre || arrastre.idParte !== parteDef.id) return;
    if (!esPointerActivo(arrastre, event.pointerId)) return;
    moverArrastre(event);
    event.stopPropagation();
    event.target?.releasePointerCapture?.(event.pointerId);
    arrastreRef.current = null;
    onSoltarParte?.();
  };

  const interactionHandlers = {
    onPointerDown: iniciarArrastre,
    onPointerMove: moverArrastre,
    onPointerUp: finalizarArrastre,
    onPointerCancel: finalizarArrastre,
  };

  return (
    <group ref={groupRef} rotation={parteDef.rotacionObjetivo}>
      {esActiva && !estadoParte.agarrada ? <AnilloPieza posicion={parteDef.posicionExplotada} /> : null}
      <mesh {...interactionHandlers}>
        <boxGeometry args={hitAreaSize} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef} {...interactionHandlers}>
        {renderizarGeometriaParte(parteDef.forma, parteDef.tamanio)}
        <meshStandardMaterial
          color={colorHex}
          metalness={0.3}
          roughness={0.4}
          emissive={colorHex}
          emissiveIntensity={estadoParte.bloqueado ? 0.6 : estadoParte.agarrada ? 1.0 : estadoParte.ensamblada ? 0.7 : 0.5}
          transparent={estadoParte.bloqueado}
          opacity={estadoParte.bloqueado ? 0.7 : 1}
        />
      </mesh>
      {edgesGeom ? (
        <lineSegments geometry={edgesGeom}>
          <lineBasicMaterial color={colorHex} transparent opacity={0.35} blending={THREE.AdditiveBlending} />
        </lineSegments>
      ) : null}
      {parteDef.detalle?.map((subDef, index) => (
        <SubParteDetalle key={index} def={subDef} color={subDef.color} parentRef={meshRef} />
      ))}
    </group>
  );
}
