import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createHologramMat, sharedScanState, sharedTime } from '../materiales/WorkshopShader';
import {
  BACKGROUND_PARTICLE_COUNT,
  CELEBRATION_PARTICLE_COUNT,
  CYAN,
  GRID_DIVISIONS_MOBILE,
  HOLOGRAM_RING_SEGMENTS,
  HOLOGRAM_TORUS_RADIAL_SEGMENTS,
  HOLOGRAM_TORUS_TUBULAR_SEGMENTS,
  ROJO_ERROR,
} from './robotTallerSceneConfig';

export function ShaderTimeSync() {
  useFrame((state) => {
    sharedTime.value = state.clock.elapsedTime;
  });
  return null;
}

export function ScanBeamSync() {
  const ref = useRef();
  const scanMat = useMemo(() => createHologramMat('#ffffff', 0, 6.0, 0, false), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycle = t % 8;
    let y;
    let intensity;

    if (cycle < 2) {
      const p = cycle / 2;
      y = -3 + p * 6;
      intensity = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;
    } else if (cycle < 3) {
      y = 3;
      intensity = 1 - (cycle - 2) * 0.6;
    } else if (cycle < 5) {
      const p = (cycle - 3) / 2;
      y = 3 - p * 6;
      intensity = p < 0.1 ? 0.4 * (1 - p / 0.1) : 0;
    } else {
      y = -3;
      intensity = 0;
    }

    sharedScanState.y = y;
    sharedScanState.intensity = intensity;

    if (ref.current) {
      ref.current.position.y = y;
      scanMat.uniforms.uOpacity.value = intensity * 0.6;
    }
  });

  return (
    <mesh ref={ref}>
      <planeGeometry args={[5, 0.04]} />
      <primitive object={scanMat} attach="material" />
    </mesh>
  );
}

function ParrillaHolografica() {
  const size = 15;
  const divisions = GRID_DIVISIONS_MOBILE;
  const positions = useMemo(() => {
    const pts = [];
    const half = size / 2;
    const step = size / divisions;

    for (let i = 0; i <= divisions; i += 1) {
      const p = -half + i * step;
      pts.push(-half, -2, p, half, -2, p);
      pts.push(p, -2, -half, p, -2, half);
    }

    return new Float32Array(pts);
  }, [divisions, size]);

  const lineMat = useMemo(() => createHologramMat(CYAN, 0.25, 1.0, 0, false), []);
  const ringMat = useMemo(() => createHologramMat(CYAN, 0.375, 2.0, 0, false), []);

  return (
    <group>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <primitive object={lineMat} attach="material" />
      </lineSegments>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}>
        <ringGeometry args={[7.4, 7.5, HOLOGRAM_RING_SEGMENTS]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
    </group>
  );
}

function ScannerRing({ radio, color, cycle = 2.4, phase = 0 }) {
  const ref = useRef();
  const mat = useMemo(() => createHologramMat(color, 0.6, 3.0, 0, false), [color]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime / cycle) + phase) % 1;
    ref.current.scale.setScalar(0.4 + t * 1.5);
    mat.uniforms.uOpacity.value = t < 0.15 ? (t / 0.15) * 0.6 : (1 - t) * 0.6;
  });

  return (
    <mesh ref={ref} position={[0, -2, 0]}>
      <torusGeometry args={[radio, 0.02, HOLOGRAM_TORUS_RADIAL_SEGMENTS, HOLOGRAM_TORUS_TUBULAR_SEGMENTS]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function ArcoAnillo({
  innerRadius,
  outerRadius,
  thetaSegments = HOLOGRAM_RING_SEGMENTS,
  thetaStart = 0,
  thetaLength = Math.PI * 0.6,
  color = CYAN,
  opacity = 0.5,
  metadata,
}) {
  const ref = useRef();
  const mat = useMemo(() => createHologramMat(color, opacity, 2.5, 40, true), [color, opacity]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const speed = metadata?.rotationSpeed ?? 0.3;
    const axis = metadata?.rotationAxis ?? 'y';
    if (axis === 'y') ref.current.rotation.y += speed * delta;
    else if (axis === 'z') ref.current.rotation.z += speed * delta;
    else if (axis === 'x') ref.current.rotation.x += speed * delta;
    mat.uniforms.uTime.value = sharedTime.value;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[innerRadius, outerRadius, thetaSegments, 1, thetaStart, thetaLength]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function PanelHolografico({ lado, panelIndex }) {
  const groupRef = useRef();
  const floatOffset = useMemo(() => panelIndex * Math.PI * 0.5, [panelIndex]);
  const panelWidth = 1.8;
  const panelHeight = 1.2;
  const hw = panelWidth / 2;
  const hh = panelHeight / 2;
  const posX = lado === 'left' ? -2.5 : 2.5;
  const rotY = lado === 'left' ? THREE.MathUtils.degToRad(27) : -THREE.MathUtils.degToRad(27);
  const geo = useMemo(() => new THREE.PlaneGeometry(panelWidth, panelHeight), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  const faceMat = useMemo(() => createHologramMat(CYAN, 0.15, 1.2, 80, true), []);
  const edgeMat = useMemo(() => createHologramMat(CYAN, 0.8, 1.0, 0, false), []);
  const bracketMat = useMemo(() => createHologramMat(CYAN, 1.0, 1.0, 0, false), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 0.5 + floatOffset) * 0.05;
    faceMat.uniforms.uTime.value = sharedTime.value;
  });

  const corners = useMemo(
    () => [
      { cx: -hw, cy: hh },
      { cx: hw, cy: hh },
      { cx: -hw, cy: -hh },
      { cx: hw, cy: -hh },
    ],
    [hh, hw],
  );

  return (
    <group ref={groupRef} position={[posX, 0.5, 0]} rotation={[0, rotY, 0]}>
      <mesh geometry={geo}>
        <primitive object={faceMat} attach="material" />
      </mesh>
      <lineSegments geometry={edges}>
        <primitive object={edgeMat} attach="material" />
      </lineSegments>
      {corners.map((corner, index) => (
        <line key={index}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  corner.cx,
                  corner.cy + 0.15,
                  0.01,
                  corner.cx,
                  corner.cy,
                  0.01,
                  corner.cx + (corner.cx < 0 ? 0.15 : -0.15),
                  corner.cy,
                  0.01,
                ]),
                3,
              ]}
            />
          </bufferGeometry>
          <primitive object={bracketMat} attach="material" />
        </line>
      ))}
    </group>
  );
}

function ParticulaFlotante({ posicion, color, tamanio = 0.08, velocidad = 1 }) {
  const ref = useRef();
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);
  const posBase = useRef(new THREE.Vector3(...posicion));
  const mat = useMemo(() => createHologramMat(color, 0.4, 2.0, 0, false), [color]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * velocidad;
    ref.current.position.x = posBase.current.x + Math.sin(t * 0.5 + fase) * 0.8;
    ref.current.position.y = posBase.current.y + Math.sin(t * 0.7 + fase * 1.3) * 0.8;
    ref.current.position.z = posBase.current.z + Math.sin(t * 0.3 + fase * 0.7) * 0.5;
    ref.current.rotation.x += 0.01;
    ref.current.rotation.y += 0.02;
  });

  return (
    <mesh ref={ref} position={posicion}>
      <octahedronGeometry args={[tamanio]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function FiguraAlambre({ tipo, argsGeo, posicion, color, spin }) {
  const ref = useRef();
  const baseY = useRef(posicion[1]);
  const baseX = useRef(posicion[0]);
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);
  const radioDrift = 0.5 + Math.random() * 0.5;
  const angDrift = useMemo(() => Math.random() * Math.PI * 2, []);
  const mat = useMemo(() => createHologramMat(color, 0.4, 2.0, 50, true, true), [color]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x += (spin?.[0] ?? 0.05) * 0.01;
    ref.current.rotation.y += (spin?.[1] ?? 0.1) * 0.01;
    ref.current.rotation.z += (spin?.[2] ?? 0.03) * 0.01;
    ref.current.position.y = baseY.current + Math.sin(t * 0.3 + fase) * 0.45;
    ref.current.position.x = baseX.current + Math.cos(t * 0.12 + angDrift) * radioDrift;
    mat.uniforms.uOpacity.value = 0.4 * (0.55 + 0.45 * Math.sin(t * 0.5 + fase));
  });

  return (
    <mesh ref={ref} position={posicion}>
      {tipo === 'box' ? <boxGeometry args={argsGeo} /> : null}
      {tipo === 'cylinder' ? <cylinderGeometry args={argsGeo} /> : null}
      {tipo === 'cone' ? <coneGeometry args={argsGeo} /> : null}
      {tipo === 'sphere' ? <sphereGeometry args={argsGeo} /> : null}
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function FondoHolografico({ colorBase }) {
  const base = colorBase ?? CYAN;
  const dark = '#004466';
  const mid = '#0088ff';
  const particulas = useMemo(() => {
    const cols = [base, mid, '#00ccff', base, '#33ffff', mid];
    const posiciones = [];

    for (let i = 0; i < BACKGROUND_PARTICLE_COUNT; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 1.5 + Math.random() * 4;
      posiciones.push({
        pos: [Math.cos(ang) * rad, -1.5 + Math.random() * 3.5, -2 - Math.random() * 3],
        color: cols[i % cols.length],
        tam: 0.06 + Math.random() * 0.08,
        vel: 0.5 + Math.random() * 1,
      });
    }

    return posiciones;
  }, [base, mid]);

  const figuras = useMemo(
    () => [
      { tipo: 'box', argsGeo: [0.8, 0.8, 0.8], pos: [-2.0, 2.0, -2], color: base, spin: [0.08, 0.13, 0.05] },
      { tipo: 'cylinder', argsGeo: [0.25, 0.25, 1.0, 10], pos: [2.0, 0.8, -2.5], color: mid, spin: [0.1, 0.06, 0.14] },
      { tipo: 'sphere', argsGeo: [0.5, 10, 10], pos: [1.2, 2.8, -3], color: '#33ffff', spin: [0.05, 0.18, 0.04] },
      { tipo: 'cone', argsGeo: [0.35, 0.7, 10], pos: [-1.8, -0.5, -2.5], color: base, spin: [0.14, 0.08, 0.06] },
    ],
    [base, mid],
  );

  const innerRingMat = useMemo(() => createHologramMat(base, 0.7, 2.0, 0, false), [base]);

  return (
    <group>
      <ParrillaHolografica />
      <ScannerRing radio={2.0} color={base} cycle={2.4} phase={0} />
      <ScannerRing radio={2.0} color={dark} cycle={1.8} phase={0.5} />
      <ArcoAnillo innerRadius={1.8} outerRadius={2.0} opacity={0.5} metadata={{ rotationSpeed: 0.3, rotationAxis: 'y' }} />
      <ArcoAnillo innerRadius={2.1} outerRadius={2.3} thetaStart={Math.PI * 2 / 3} opacity={0.4} metadata={{ rotationSpeed: 0.4, rotationAxis: 'z' }} />
      <ArcoAnillo innerRadius={2.4} outerRadius={2.6} thetaStart={Math.PI * 4 / 3} opacity={0.3} metadata={{ rotationSpeed: 0.5, rotationAxis: 'y' }} />
      <mesh rotation={[Math.PI / -2, 0, 0]}>
        <torusGeometry args={[1.44, 0.02, HOLOGRAM_TORUS_RADIAL_SEGMENTS, HOLOGRAM_TORUS_TUBULAR_SEGMENTS]} />
        <primitive object={innerRingMat} attach="material" />
      </mesh>
      {particulas.map((particula, index) => (
        <ParticulaFlotante
          key={index}
          posicion={particula.pos}
          color={particula.color}
          tamanio={particula.tam}
          velocidad={particula.vel}
        />
      ))}
      <PanelHolografico lado="left" panelIndex={0} />
      <PanelHolografico lado="right" panelIndex={1} />
      {figuras.map((figura, index) => (
        <FiguraAlambre
          key={index}
          tipo={figura.tipo}
          argsGeo={figura.argsGeo}
          posicion={figura.pos}
          color={figura.color}
          spin={figura.spin}
        />
      ))}
    </group>
  );
}

export function AnilloPieza({ posicion }) {
  const ref = useRef();
  const mat = useMemo(() => createHologramMat('#FFD166', 0.6, 3.0, 0, false), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = 0.6 + 0.3 * Math.sin(t * 2.5);
    ref.current.scale.setScalar(s);
    mat.uniforms.uOpacity.value = 0.2 + 0.5 * Math.sin(t * 2.5);
  });

  return (
    <mesh ref={ref} position={[posicion[0], posicion[1] - 0.3, posicion[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.65, 24]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function RayoConexion({ desde, hasta }) {
  const ref = useRef();
  const mat = useMemo(() => createHologramMat('#FFD166', 0.3, 2.0, 0, false), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    mat.uniforms.uOpacity.value = 0.1 + 0.2 * Math.sin(t * 2);
    const midX = (desde[0] + hasta[0]) / 2;
    const midY = (desde[1] + hasta[1]) / 2;
    const midZ = (desde[2] + hasta[2]) / 2;
    ref.current.position.set(midX, midY, midZ);
    const dx = hasta[0] - desde[0];
    const dy = hasta[1] - desde[1];
    const dz = hasta[2] - desde[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    ref.current.scale.set(1, dist / 3, 1);
    ref.current.lookAt(hasta[0], hasta[1], hasta[2]);
  });

  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.02, 0.08, 3, 6]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function ManoIndicadora({ posicion }) {
  const groupRef = useRef();
  const ringRef = useRef();
  const pulsoMat = useMemo(() => createHologramMat('#FFD166', 0.9, 5.0, 0, false), []);
  const anilloMat = useMemo(() => createHologramMat('#FFD166', 0.4, 3.0, 0, false), []);

  useFrame((state) => {
    if (!groupRef.current || !ringRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = posicion[1] + 1.8 + Math.sin(t * 2.5) * 0.35;
    groupRef.current.rotation.z = 0.15 + Math.sin(t * 2) * 0.04;
    const s = 0.8 + 0.35 * Math.sin(t * 3);
    ringRef.current.scale.setScalar(s);
    anilloMat.uniforms.uOpacity.value = 0.2 + 0.4 * Math.sin(t * 3);
  });

  return (
    <group>
      <mesh ref={ringRef} position={[posicion[0], posicion[1], posicion[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.55, 24]} />
        <primitive object={anilloMat} attach="material" />
      </mesh>
      <group ref={groupRef} position={[posicion[0], posicion[1] + 1.8, posicion[2]]}>
        <mesh rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.25, 0.5, 4]} />
          <primitive object={pulsoMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 4]} />
          <primitive object={pulsoMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

export function RastroDeParticulas({ desde, hasta, activo }) {
  const count = 10;
  const refs = useRef([]);
  const mat = useMemo(() => createHologramMat('#00FF88', 0.6, 4.0, 0, false), []);

  useFrame((state) => {
    if (!activo || !desde || !hasta) {
      for (let i = 0; i < count; i += 1) {
        const ref = refs.current[i];
        if (ref) ref.visible = false;
      }
      return;
    }

    const tBase = state.clock.elapsedTime * 0.7;
    for (let i = 0; i < count; i += 1) {
      const ref = refs.current[i];
      if (!ref) continue;
      ref.visible = true;
      const t = (tBase + i / count) % 1;
      const ease = t * t * (3 - 2 * t);
      ref.position.set(
        desde[0] + (hasta[0] - desde[0]) * ease + Math.sin(i * 1.5 + t * 4) * 0.05,
        desde[1] + (hasta[1] - desde[1]) * ease + Math.cos(i * 1.7 + t * 3) * 0.05,
        desde[2] + (hasta[2] - desde[2]) * ease,
      );
      const alpha = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
      mat.uniforms.uOpacity.value = alpha * 0.7;
      ref.scale.setScalar(0.6 + alpha * 0.4);
    }
  });

  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <mesh key={index} ref={(element) => { refs.current[index] = element; }}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

export function ErrorFlash({ visible }) {
  const mat = useMemo(() => createHologramMat(ROJO_ERROR, 0, 3.0, 0, false), []);
  const ref = useRef();
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current || !visible) {
      if (ref.current) ref.current.visible = false;
      return;
    }

    ref.current.visible = true;
    timeRef.current += delta;
    const vida = 0.5;

    if (timeRef.current > vida) {
      ref.current.visible = false;
      timeRef.current = 0;
      return;
    }

    const progreso = 1 - timeRef.current / vida;
    mat.uniforms.uOpacity.value = progreso * 0.5;
    ref.current.scale.setScalar(1 + (1 - progreso) * 2);
  });

  return (
    <mesh ref={ref} position={[0, 1.5, 0]} visible={false}>
      <sphereGeometry args={[2, 16, 16]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function EfectoCelebracion({ activo, posicion }) {
  const refs = useRef([]);
  const ringRef = useRef();
  const ringMat = useMemo(() => createHologramMat('#00FF88', 0, 3.0, 0, false), []);
  const colores = ['#FFD166', '#FF6B35', '#00FF88', '#00E5FF', '#FF006E', '#FFBE0B'];
  const mats = useMemo(() => colores.map((color) => createHologramMat(color, 0.9, 5.0, 0, false)), []);
  const tiempoRef = useRef(0);
  const semillas = useMemo(
    () =>
      Array.from({ length: CELEBRATION_PARTICLE_COUNT }, () => ({
        angulo: Math.random() * Math.PI * 2,
        elevacion: Math.random() * Math.PI - Math.PI / 2,
        velocidad: 1.5 + Math.random() * 2.5,
        distancia: Math.random() * 2.5 + 0.5,
        colorIdx: Math.floor(Math.random() * colores.length),
        esEstrella: Math.random() > 0.5,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (!activo) {
      refs.current.forEach((ref) => {
        if (ref) ref.visible = false;
      });
      if (ringRef.current) ringRef.current.visible = false;
      tiempoRef.current = 0;
      return;
    }

    tiempoRef.current += delta;
    const edad = tiempoRef.current;

    if (ringRef.current) {
      ringRef.current.visible = true;
      ringRef.current.scale.setScalar(0.5 + edad * 2);
      ringMat.uniforms.uOpacity.value = Math.max(0, 0.6 * (1 - edad / 1.5));
    }

    refs.current.forEach((ref, index) => {
      if (!ref) return;
      ref.visible = true;
      const semilla = semillas[index];
      const t = edad * semilla.velocidad;
      const radio = semilla.distancia * Math.min(t * 0.25, 1);
      ref.position.set(
        posicion[0] + Math.cos(semilla.angulo) * Math.cos(semilla.elevacion) * radio,
        posicion[1] + Math.sin(semilla.elevacion) * radio + t * 0.6,
        posicion[2] + Math.sin(semilla.angulo) * Math.cos(semilla.elevacion) * radio,
      );
      const escala = Math.max(0, 1 - edad / 1.8);
      ref.scale.setScalar(escala);
      if (ref.material) ref.material.opacity = escala;
    });
  });

  return (
    <group>
      <mesh ref={ringRef} position={[posicion[0], posicion[1] + 0.2, posicion[2]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
      {Array.from({ length: CELEBRATION_PARTICLE_COUNT }, (_, index) => (
        <mesh key={index} ref={(element) => { refs.current[index] = element; }} visible={false}>
          {semillas[index].esEstrella ? <circleGeometry args={[0.07, 5]} /> : <sphereGeometry args={[0.05, 6, 6]} />}
          <primitive object={mats[semillas[index].colorIdx]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
