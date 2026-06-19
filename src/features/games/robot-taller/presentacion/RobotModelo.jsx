import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createHologramMat, sharedTime, sharedScanState } from './materiales/WorkshopShader';
import { PARTES_ROBOT } from '../robotTaller.constants';

const VERDE_HOLO = '#00FF88';

function SubParte({ def, mat, wireMat }) {
  const meshRef = useRef();
  useFrame(() => {
    if (meshRef.current) {
      const m = meshRef.current.material;
      m.uniforms.uTime.value = sharedTime.value;
      m.uniforms.uScanY.value = sharedScanState.y;
      m.uniforms.uScanIntensity.value = sharedScanState.intensity;
    }
  });
  const geo = (() => {
    switch (def.forma) {
      case 'sphere': return new THREE.SphereGeometry(def.tamanio[0], 12, 12);
      case 'cylinder': return new THREE.CylinderGeometry(def.tamanio[0], def.tamanio[2] ?? def.tamanio[0], def.tamanio[1], 12);
      case 'cone': return new THREE.ConeGeometry(def.tamanio[0], def.tamanio[1], 12);
      default: return new THREE.BoxGeometry(def.tamanio[0], def.tamanio[1], def.tamanio[2] ?? def.tamanio[0]);
    }
  })();
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 20), [geo]);
  return (
    <group position={def.offset}>
      <mesh geometry={geo} material={mat} frustumCulled={false} ref={meshRef} />
      <lineSegments geometry={edges} material={wireMat} frustumCulled={false} />
    </group>
  );
}

export default function MoldEsquematico() {
  const hologramMat = useMemo(() => {
    const m = createHologramMat(VERDE_HOLO, 0.1, 2.5, 60, true);
    m.side = THREE.FrontSide;
    return m;
  }, []);
  const wireMat = useMemo(() => {
    const m = createHologramMat(VERDE_HOLO, 0.35, 1.0, 0, false);
    return m;
  }, []);

  return (
    <group>
      {PARTES_ROBOT.filter((p) => p.detalle).map((piece) => (
        <group key={piece.id} position={piece.posicionObjetivo} rotation={piece.rotacionObjetivo}>
          {piece.detalle.map((subDef, i) => (
            <SubParte key={i} def={subDef} mat={hologramMat} wireMat={wireMat} />
          ))}
        </group>
      ))}
    </group>
  );
}
