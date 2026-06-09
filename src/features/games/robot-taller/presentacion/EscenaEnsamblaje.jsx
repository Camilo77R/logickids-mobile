import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTES_ROBOT } from '../robotTaller.constants';

function ParteMesh({ parteDef, estadoParte, seleccionada, onPress }) {
  const meshRef = useRef();
  const color = seleccionada ? '#FFD166' : estadoParte.ensamblada ? '#00E676' : parteDef.color;

  const posicion = useMemo(() => {
    if (estadoParte.ensamblada) return new THREE.Vector3(...parteDef.posicionObjetivo);
    if (estadoParte.agarrada) return new THREE.Vector3(...estadoParte.posicion);
    return new THREE.Vector3(...parteDef.posicionExplotada);
  }, [estadoParte.ensamblada, estadoParte.agarrada, estadoParte.posicion]);

  useFrame(() => {
    if (!meshRef.current) return;
    const objetivo = new THREE.Vector3(
      ...(estadoParte.ensamblada
        ? parteDef.posicionObjetivo
        : estadoParte.agarrada
          ? estadoParte.posicion
          : parteDef.posicionExplotada),
    );
    meshRef.current.position.lerp(objetivo, 0.08);

    if (estadoParte.ensamblada) {
      const rot = parteDef.rotacionObjetivo;
      meshRef.current.rotation.x += (rot[0] - meshRef.current.rotation.x) * 0.08;
      meshRef.current.rotation.y += (rot[1] - meshRef.current.rotation.y) * 0.08;
      meshRef.current.rotation.z += (rot[2] - meshRef.current.rotation.z) * 0.08;
    }
  });

  const construirMesh = () => {
    const colorHex = new THREE.Color(color);
    switch (parteDef.forma) {
      case 'sphere':
        return (
          <mesh
            ref={meshRef}
            position={posicion}
            onClick={!estadoParte.ensamblada ? onPress : undefined}
          >
            <sphereGeometry args={[parteDef.tamanio[0], 24, 24]} />
            <meshStandardMaterial color={colorHex} metalness={0.3} roughness={0.4} />
          </mesh>
        );
      case 'cylinder':
        return (
          <mesh
            ref={meshRef}
            position={posicion}
            rotation={estadoParte.ensamblada ? parteDef.rotacionObjetivo : [0, 0, Math.PI / 2]}
            onClick={!estadoParte.ensamblada ? onPress : undefined}
          >
            <cylinderGeometry args={[parteDef.tamanio[0], parteDef.tamanio[0], parteDef.tamanio[1], 16]} />
            <meshStandardMaterial color={colorHex} metalness={0.3} roughness={0.4} />
          </mesh>
        );
      case 'cone':
        return (
          <mesh
            ref={meshRef}
            position={posicion}
            onClick={!estadoParte.ensamblada ? onPress : undefined}
          >
            <coneGeometry args={[parteDef.tamanio[0], parteDef.tamanio[1], 16]} />
            <meshStandardMaterial color={colorHex} metalness={0.3} roughness={0.4} />
          </mesh>
        );
      default:
        return (
          <mesh
            ref={meshRef}
            position={posicion}
            rotation={estadoParte.ensamblada ? parteDef.rotacionObjetivo : [0, 0, 0]}
            onClick={!estadoParte.ensamblada ? onPress : undefined}
          >
            <boxGeometry args={parteDef.tamanio} />
            <meshStandardMaterial color={colorHex} metalness={0.3} roughness={0.4} />
          </mesh>
        );
    }
  };

  return construirMesh();
}

function SiluetaEnsamblada() {
  return (
    <group>
      {PARTES_ROBOT.map((parteDef) => (
        <mesh key={`ghost-${parteDef.id}`} position={new THREE.Vector3(...parteDef.posicionObjetivo)}>
          {parteDef.forma === 'sphere' ? (
            <sphereGeometry args={[parteDef.tamanio[0] * 1.15, 16, 16]} />
          ) : parteDef.forma === 'cylinder' ? (
            <cylinderGeometry args={[parteDef.tamanio[0] * 1.15, parteDef.tamanio[0] * 1.15, parteDef.tamanio[1] * 1.15, 12]} />
          ) : parteDef.forma === 'cone' ? (
            <coneGeometry args={[parteDef.tamanio[0] * 1.15, parteDef.tamanio[1] * 1.15, 12]} />
          ) : (
            <boxGeometry args={parteDef.tamanio.map((t) => t * 1.15)} />
          )}
          <meshBasicMaterial color="#00E676" transparent opacity={0.12} wireframe />
        </mesh>
      ))}
    </group>
  );
}

function Escena3D({ estado, onAgarrarParte, onSoltarParte, parteAgarradaId }) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.x = 5 * Math.sin(Date.now() * 0.0002);
    camera.position.z = 5 * Math.cos(Date.now() * 0.0002);
    camera.lookAt(0, 0, 0);
  });

  const handlePress = (idParte) => {
    if (parteAgarradaId === idParte) {
      onSoltarParte?.();
    } else if (!parteAgarradaId) {
      onAgarrarParte?.(idParte);
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <SiluetaEnsamblada />
      {PARTES_ROBOT.map((parteDef) => {
        const estadoParte = estado.partes.find((p) => p.id === parteDef.id);
        if (!estadoParte) return null;
        return (
          <ParteMesh
            key={parteDef.id}
            parteDef={parteDef}
            estadoParte={estadoParte}
            seleccionada={parteAgarradaId === parteDef.id}
            onPress={() => handlePress(parteDef.id)}
          />
        );
      })}
    </>
  );
}

export default function EscenaEnsamblaje({ estado, onAgarrarParte, onMoverParte, onSoltarParte, cursorPosition, isPinching }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      style={{ backgroundColor: '#1A1A2E' }}
      gl={{ alpha: false }}
    >
      <Escena3D
        estado={estado}
        onAgarrarParte={onAgarrarParte}
        onMoverParte={onMoverParte}
        onSoltarParte={onSoltarParte}
        parteAgarradaId={estado.parteAgarrada}
      />
      {cursorPosition && (
        <mesh position={cursorPosition}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshBasicMaterial
            color={isPinching ? '#FF6B35' : '#00E676'}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
    </Canvas>
  );
}
