import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTES_ROBOT, NIVELES, PIEZAS_ALTERNATIVAS, obtenerPartesRobot } from '../robotTaller.constants';
import { createHologramMat, sharedTime, sharedScanState } from './materiales/WorkshopShader';
import MarkVILoader from './MarkVILoader';

const CYAN = '#00ffff';
const CYAN_DARK = '#004466';
const CYAN_MID = '#0088ff';
const AMBER = '#ffbf00';
const VERDE_HOLO = '#00FF88';
const ROJO_ERROR = '#FF3355';
const COLOR_BLOQUEADO = '#777777';

function ShaderTimeSync() {
  useFrame((state) => { sharedTime.value = state.clock.elapsedTime; });
  return null;
}

function ScanBeamSync() {
  const ref = useRef();
  const scanMat = useMemo(() => createHologramMat('#ffffff', 0, 6.0, 0, false), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycle = t % 8;
    let y, intensity;
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
  const size = 15; const divisions = 39;
  const positions = useMemo(() => {
    const pts = []; const half = size / 2; const step = size / divisions;
    for (let i = 0; i <= divisions; i++) {
      const p = -half + i * step;
      pts.push(-half, -2, p, half, -2, p);
      pts.push(p, -2, -half, p, -2, half);
    }
    return new Float32Array(pts);
  }, []);
  const lineMat = useMemo(() => createHologramMat(CYAN, 0.25, 1.0, 0, false), []);
  const ringMat = useMemo(() => createHologramMat(CYAN, 0.375, 2.0, 0, false), []);
  return (
    <group>
      <lineSegments>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
        <primitive object={lineMat} attach="material" />
      </lineSegments>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}>
        <ringGeometry args={[7.4, 7.5, 64]} />
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
      <torusGeometry args={[radio, 0.02, 16, 48]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function ArcoAnillo({ innerRadius, outerRadius, thetaSegments = 64, thetaStart = 0, thetaLength = Math.PI * 0.6, color = CYAN, opacity = 0.5, metadata }) {
  const ref = useRef();
  const mat = useMemo(() => createHologramMat(color, opacity, 2.5, 40, true), []);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const speed = metadata?.rotationSpeed ?? 0.3;
    const axis = metadata?.rotationAxis ?? 'y';
    if (axis === 'y') ref.current.rotation.y += speed * delta;
    else if (axis === 'z') ref.current.rotation.z += speed * delta;
    else if (axis === 'x') ref.current.rotation.x += speed * delta;
    if (mat) mat.uniforms.uTime.value = sharedTime.value;
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
  const panelWidth = 1.8; const panelHeight = 1.2; const hw = panelWidth / 2; const hh = panelHeight / 2;
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
  const corners = useMemo(() => [
    { cx: -hw, cy: hh, dx: 1, dy: -1 }, { cx: hw, cy: hh, dx: -1, dy: -1 },
    { cx: -hw, cy: -hh, dx: 1, dy: 1 }, { cx: hw, cy: -hh, dx: -1, dy: 1 },
  ], []);
  return (
    <group ref={groupRef} position={[posX, 0.5, 0]} rotation={[0, rotY, 0]}>
      <mesh geometry={geo}><primitive object={faceMat} attach="material" /></mesh>
      <lineSegments geometry={edges}><primitive object={edgeMat} attach="material" /></lineSegments>
      {corners.map((c, i) => (
        <line key={i}>
          <bufferGeometry><bufferAttribute attach="attributes-position"
            args={[new Float32Array([c.cx, c.cy + 0.15, 0.01, c.cx, c.cy, 0.01, c.cx + 0.15, c.cy, 0.01]), 3]} /></bufferGeometry>
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
  const mat = useMemo(() => createHologramMat(color, 0.4, 2.0, 0, false), []);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * velocidad;
    ref.current.position.x = posBase.current.x + Math.sin(t * 0.5 + fase) * 0.8;
    ref.current.position.y = posBase.current.y + Math.sin(t * 0.7 + fase * 1.3) * 0.8;
    ref.current.position.z = posBase.current.z + Math.sin(t * 0.3 + fase * 0.7) * 0.5;
    ref.current.rotation.x += 0.01; ref.current.rotation.y += 0.02;
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
  const baseY = useRef(posicion[1]); const baseX = useRef(posicion[0]);
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);
  const radioDrift = 0.5 + Math.random() * 0.5;
  const angDrift = useMemo(() => Math.random() * Math.PI * 2, []);
  const mat = useMemo(() => createHologramMat(color, 0.4, 2.0, 50, true, true), []);
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
  const geo = tipo === 'box' ? <boxGeometry args={argsGeo} />
    : tipo === 'cylinder' ? <cylinderGeometry args={argsGeo} />
    : tipo === 'cone' ? <coneGeometry args={argsGeo} />
    : <sphereGeometry args={argsGeo} />;
  return (
    <mesh ref={ref} position={posicion}>
      {geo}
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function FondoHolografico({ colorBase }) {
  const base = colorBase ?? CYAN;
  const dark = '#004466';
  const mid = '#0088ff';
  const particulas = useMemo(() => {
    const cols = [base, mid, '#00ccff', base, '#33ffff', mid];
    const posiciones = [];
    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 1.5 + Math.random() * 4;
      posiciones.push({ pos: [Math.cos(ang) * rad, -1.5 + Math.random() * 3.5, -2 - Math.random() * 3], color: cols[i % cols.length], tam: 0.06 + Math.random() * 0.08, vel: 0.5 + Math.random() * 1 });
    }
    return posiciones;
  }, []);
  const figuras = useMemo(() => [
    { tipo: 'box', argsGeo: [0.8, 0.8, 0.8], pos: [-2.0, 2.0, -2], color: base, spin: [0.08, 0.13, 0.05] },
    { tipo: 'cylinder', argsGeo: [0.25, 0.25, 1.0, 16], pos: [2.0, 0.8, -2.5], color: mid, spin: [0.1, 0.06, 0.14] },
    { tipo: 'sphere', argsGeo: [0.5, 16, 16], pos: [1.2, 2.8, -3], color: '#33ffff', spin: [0.05, 0.18, 0.04] },
    { tipo: 'cone', argsGeo: [0.35, 0.7, 16], pos: [-1.8, -0.5, -2.5], color: base, spin: [0.14, 0.08, 0.06] },
  ], [base]);
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
        <torusGeometry args={[1.44, 0.02, 8, 64]} />
        <primitive object={innerRingMat} attach="material" />
      </mesh>
      {particulas.map((p, i) => <ParticulaFlotante key={i} posicion={p.pos} color={p.color} tamanio={p.tam} velocidad={p.vel} />)}
      <PanelHolografico lado="left" panelIndex={0} />
      <PanelHolografico lado="right" panelIndex={1} />
      {figuras.map((f, i) => <FiguraAlambre key={i} tipo={f.tipo} argsGeo={f.argsGeo} posicion={f.pos} color={f.color} spin={f.spin} />)}
    </group>
  );
}

function AnilloPieza({ posicion }) {
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

function RayoConexion({ desde, hasta }) {
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

function ManoIndicadora({ posicion }) {
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

function RastroDeParticulas({ desde, hasta, activo }) {
  const count = 20;
  const refs = useRef([]);
  const mat = useMemo(() => createHologramMat('#00FF88', 0.6, 4.0, 0, false), []);
  useFrame((state) => {
    if (!activo || !desde || !hasta) {
      for (let i = 0; i < count; i++) {
        const r = refs.current[i];
        if (r) r.visible = false;
      }
      return;
    }
    const tBase = state.clock.elapsedTime * 0.7;
    for (let i = 0; i < count; i++) {
      const r = refs.current[i];
      if (!r) continue;
      r.visible = true;
      const t = (tBase + i / count) % 1;
      const ease = t * t * (3 - 2 * t);
      r.position.set(
        desde[0] + (hasta[0] - desde[0]) * ease + Math.sin(i * 1.5 + t * 4) * 0.05,
        desde[1] + (hasta[1] - desde[1]) * ease + Math.cos(i * 1.7 + t * 3) * 0.05,
        desde[2] + (hasta[2] - desde[2]) * ease
      );
      const alpha = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
      mat.uniforms.uOpacity.value = alpha * 0.7;
      r.scale.setScalar(0.6 + alpha * 0.4);
    }
  });
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={el => refs.current[i] = el}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function ErrorFlash({ visible }) {
  const mat = useMemo(() => createHologramMat(ROJO_ERROR, 0, 3.0, 0, false), []);
  const ref = useRef();
  const timeRef = useRef(0);
  useFrame((state, delta) => {
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
  const subGeo = (() => {
    switch (def.forma) {
      case 'sphere': return <sphereGeometry args={[def.tamanio[0], 12, 12]} />;
      case 'cylinder': return <cylinderGeometry args={[def.tamanio[0], def.tamanio[2] ?? def.tamanio[0], def.tamanio[1], 12]} />;
      case 'cone': return <coneGeometry args={[def.tamanio[0], def.tamanio[1], 12]} />;
      default: return <boxGeometry args={[def.tamanio[0], def.tamanio[1], def.tamanio[2] ?? def.tamanio[0]]} />;
    }
  })();
  return (
    <mesh ref={subRef}>
      {subGeo}
      <meshStandardMaterial color={colorHex} metalness={0.4} roughness={0.3}
        emissive={colorHex} emissiveIntensity={0.3} transparent opacity={0.85} />
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
  const subGeo = (() => {
    switch (def.forma) {
      case 'sphere': return <sphereGeometry args={[def.tamanio[0], 12, 12]} />;
      case 'cylinder': return <cylinderGeometry args={[def.tamanio[0], def.tamanio[2] ?? def.tamanio[0], def.tamanio[1], 12]} />;
      case 'cone': return <coneGeometry args={[def.tamanio[0], def.tamanio[1], 12]} />;
      default: return <boxGeometry args={[def.tamanio[0], def.tamanio[1], def.tamanio[2] ?? def.tamanio[0]]} />;
    }
  })();
  return (
    <mesh ref={subRef}>
      {subGeo}
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function ParteMesh({
  parteDef,
  estadoParte,
  seleccionada,
  esActiva,
  onIniciarArrastre,
  mathTargetId,
  schematicRef,
}) {
  const meshRef = useRef();
  const groupRef = useRef();
  const esMathTarget = estadoParte.bloqueado && parteDef.id === mathTargetId;

  // Todas las piezas se muestran siempre:
  // - Bloqueadas: gris opaco (el math target pulsa para llamar la atención)
  // - Desbloqueadas: color real brillante + pulso para indicar que se puede arrastrar
  // - Ensambladas: verde
  const color = seleccionada
    ? AMBER
    : estadoParte.ensamblada
      ? '#00ff88'
      : estadoParte.bloqueado
        ? COLOR_BLOQUEADO
        : parteDef.color;

  const puedeHacerClic = !estadoParte.ensamblada && !estadoParte.bloqueadoPorMatematicas;

  const _tempTarget = useMemo(() => new THREE.Vector3(), []);
  const _baseColor = useMemo(() => new THREE.Color(), []);
  const _subColor = useMemo(() => new THREE.Color(), []);
  const initializedRef = useRef(false);

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;
    const group = groupRef.current;
    const mesh = meshRef.current;
    const material = mesh.material;

    if (!initializedRef.current) {
      if (!estadoParte.ensamblada && !estadoParte.agarrada) {
        groupRef.current.position.set(...parteDef.posicionExplotada);
      } else if (estadoParte.ensamblada) {
        groupRef.current.position.set(...parteDef.posicionObjetivo);
      } else {
        groupRef.current.position.set(...estadoParte.posicion);
      }
      meshRef.current.position.set(0, 0, 0);
      meshRef.current.rotation.set(0, 0, 0);
      initializedRef.current = true;
    }

    if (estadoParte.ensamblada) {
      _tempTarget.set(...parteDef.posicionObjetivo);
      group.position.lerp(_tempTarget, 0.15);
    } else if (!estadoParte.agarrada) {
      _tempTarget.set(...parteDef.posicionExplotada);
      group.position.lerp(_tempTarget, 0.05);
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
      const wobble = Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      group.position.y += wobble;
    } else if (esDesbloqueadaParaArrastre) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4);
      mesh.scale.setScalar(1);
      material.emissiveIntensity = 0.5 + pulse * 0.5;
    } else if (esIdle) {
      const bobb = Math.sin(state.clock.elapsedTime * 0.8 + parteDef.id.length) * 0.03;
      group.position.y += bobb;
      material.emissiveIntensity = estadoParte.bloqueado ? 0.2 : 0.15;
    } else {
      mesh.scale.setScalar(1);
      material.emissiveIntensity = estadoParte.agarrada ? 0.8 : estadoParte.ensamblada ? 0.7 : estadoParte.bloqueado ? 0.3 : 0.2;
    }
    _baseColor.set(color);
    material.emissive.copy(_baseColor);

    if (groupRef.current && parteDef.detalle) {
      const children = groupRef.current.children;
      for (let i = 0; i < parteDef.detalle.length; i++) {
        const child = children[i + 2];
        if (child && child.isMesh) {
          if (estadoParte.ensamblada) {
            _subColor.set(VERDE_HOLO);
            child.material.emissiveIntensity = 0.6;
          } else if (estadoParte.bloqueado) {
            _subColor.set(COLOR_BLOQUEADO);
            child.material.emissiveIntensity = 0.2;
          } else {
            _subColor.set(parteDef.detalle[i].color);
            child.material.emissiveIntensity = 0.8;
          }
          child.material.emissive.copy(_subColor);
        }
      }
    }
  });

  const colorHex = useMemo(() => new THREE.Color(color), [color]);
  const rot = parteDef.rotacionObjetivo;

  const obtenerPuntoLocal = (event) => {
    if (!schematicRef?.current || !event.raycaster) {
      if (event.point) {
        const temp = new THREE.Vector3(event.point.x, event.point.y, event.point.z);
        if (schematicRef?.current) schematicRef.current.worldToLocal(temp);
        return [temp.x, temp.y, temp.z];
      }
      return null;
    }
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const target = new THREE.Vector3();
    event.raycaster.ray.intersectPlane(plane, target);
    schematicRef.current.worldToLocal(target);
    return [target.x, target.y, target.z];
  };

  const manejarPointerDown = (event) => {
    if (!puedeHacerClic) return;
    event.stopPropagation();

    const posicionInicial = estadoParte.posicion || [...parteDef.posicionExplotada];
    const pointerLocal = obtenerPuntoLocal(event);
    const offset = pointerLocal
      ? [
          posicionInicial[0] - pointerLocal[0],
          posicionInicial[1] - pointerLocal[1],
          posicionInicial[2] - pointerLocal[2],
        ]
      : [0, 0, 0];

    onIniciarArrastre?.(parteDef.id, posicionInicial, offset, groupRef.current);
  };

  const edgesGeom = useMemo(() => {
    let baseGeo;
    switch (parteDef.forma) {
      case 'sphere': baseGeo = new THREE.SphereGeometry(parteDef.tamanio[0], 16, 16); break;
      case 'cylinder': baseGeo = new THREE.CylinderGeometry(parteDef.tamanio[0], parteDef.tamanio[0], parteDef.tamanio[1], 12); break;
      case 'cone': baseGeo = new THREE.ConeGeometry(parteDef.tamanio[0], parteDef.tamanio[1], 12); break;
      default: baseGeo = new THREE.BoxGeometry(...parteDef.tamanio);
    }
    return new THREE.EdgesGeometry(baseGeo, 20);
  }, []);

  const geo = (() => {
    switch (parteDef.forma) {
      case 'sphere': return <sphereGeometry args={[parteDef.tamanio[0], 24, 24]} />;
      case 'cylinder': return <cylinderGeometry args={[parteDef.tamanio[0], parteDef.tamanio[0], parteDef.tamanio[1], 16]} />;
      case 'cone': return <coneGeometry args={[parteDef.tamanio[0], parteDef.tamanio[1], 16]} />;
      default: return <boxGeometry args={parteDef.tamanio} />;
    }
  })();

  return (
    <group ref={groupRef} onPointerDown={manejarPointerDown} rotation={rot}>
      {esActiva && !estadoParte.agarrada && <AnilloPieza posicion={parteDef.posicionExplotada} />}
      <mesh ref={meshRef}>
        {geo}
        <meshStandardMaterial color={colorHex} metalness={0.3} roughness={0.4}
          emissive={colorHex} emissiveIntensity={estadoParte.bloqueado ? 0.6 : estadoParte.agarrada ? 1.0 : estadoParte.ensamblada ? 0.7 : 0.5}
          transparent={estadoParte.bloqueado} opacity={estadoParte.bloqueado ? 0.7 : 1} />
      </mesh>
      {edgesGeom && (
        <lineSegments geometry={edgesGeom}>
          <lineBasicMaterial color={colorHex} transparent opacity={0.35} blending={THREE.AdditiveBlending} />
        </lineSegments>
      )}
      {parteDef.detalle && parteDef.detalle.map((subDef, i) => (
        <SubParteDetalle key={i} def={subDef} color={subDef.color} parentRef={meshRef} />
      ))}
    </group>
  );
}

function SiluetaEnsamblada({ nivel, partesRobot }) {
  const nivelConfig = NIVELES[nivel] ?? NIVELES[1];
  if (!nivelConfig.mostrarSiluetas) return null;
  const partesBase = partesRobot ?? PARTES_ROBOT;
  // Material fantasma más visible para que los niños identifiquen dónde va cada pieza
  return (
    <group>
      {partesBase.map((parteDef) => {
        const baseGeoFactor = 1.0;
        const skeletonMat = createHologramMat('#00E5FF', 0.5, 1.8, 0, false, true);
        skeletonMat.wireframe = true;
        const mainGeo = parteDef.forma === 'sphere'
          ? <sphereGeometry args={[parteDef.tamanio[0] * baseGeoFactor, 16, 16]} />
          : parteDef.forma === 'cylinder'
            ? <cylinderGeometry args={[parteDef.tamanio[0] * baseGeoFactor, parteDef.tamanio[0] * baseGeoFactor, parteDef.tamanio[1] * baseGeoFactor, 12]} />
            : parteDef.forma === 'cone'
              ? <coneGeometry args={[parteDef.tamanio[0] * baseGeoFactor, parteDef.tamanio[1] * baseGeoFactor, 12]} />
              : <boxGeometry args={[parteDef.tamanio[0] * baseGeoFactor, parteDef.tamanio[1] * baseGeoFactor, (parteDef.tamanio[2] ?? parteDef.tamanio[0]) * baseGeoFactor]} />;
        const rot = parteDef.rotacionObjetivo;
        const meshRot = rot;
        return (
          <group key={`skeleton-${parteDef.id}`} position={parteDef.posicionObjetivo}>
            <group rotation={meshRot}>
              {/* Esqueleto interno luminoso */}
              <mesh>
                {mainGeo}
                <primitive object={skeletonMat} attach="material" />
              </mesh>
              {/* Sub-detalles esqueleto */}
              {parteDef.detalle && parteDef.detalle.map((subDef, i) => {
                const subGeo = subDef.forma === 'sphere' ? <sphereGeometry args={[subDef.tamanio[0] * baseGeoFactor, 12, 12]} />
                  : subDef.forma === 'cylinder' ? <cylinderGeometry args={[subDef.tamanio[0] * baseGeoFactor, (subDef.tamanio[2] ?? subDef.tamanio[0]) * baseGeoFactor, subDef.tamanio[1] * baseGeoFactor, 10]} />
                  : subDef.forma === 'cone' ? <coneGeometry args={[subDef.tamanio[0] * baseGeoFactor, subDef.tamanio[1] * baseGeoFactor, 10]} />
                  : <boxGeometry args={[subDef.tamanio[0] * baseGeoFactor, subDef.tamanio[1] * baseGeoFactor, (subDef.tamanio[2] ?? subDef.tamanio[0]) * baseGeoFactor]} />;
                return <mesh key={i} position={subDef.offset}>{subGeo}<primitive object={skeletonMat} attach="material" /></mesh>;
              })}
            </group>
          </group>
        );
      })}
    </group>
  );
}

function SlotGlow({ parteDef, destacado = false }) {
  const ringRef = useRef();
  const beamRef = useRef();
  const shapeRef = useRef();
  const colorSlot = destacado ? '#00FF88' : '#00aaff';
  const ringMat = useMemo(() => createHologramMat(colorSlot, 0.8, 3.0, 0, false), [colorSlot]);
  const beamMat = useMemo(() => createHologramMat(colorSlot, 0.15, 1.5, 0, false), [colorSlot]);
  const shapeMat = useMemo(() => createHologramMat(colorSlot, destacado ? 0.6 : 0.25, 2.0, 0, false, true), [colorSlot, destacado]);
  
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

  const geo = (() => {
    switch (parteDef.forma) {
      case 'sphere': return <sphereGeometry args={[parteDef.tamanio[0], 24, 24]} />;
      case 'cylinder': return <cylinderGeometry args={[parteDef.tamanio[0], parteDef.tamanio[0], parteDef.tamanio[1], 16]} />;
      case 'cone': return <coneGeometry args={[parteDef.tamanio[0], parteDef.tamanio[1], 16]} />;
      default: return <boxGeometry args={parteDef.tamanio} />;
    }
  })();

  const rot = parteDef.rotacionObjetivo ?? [0,0,0];

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
          {geo}
          <primitive object={shapeMat} attach="material" />
        </mesh>
        {parteDef.detalle && parteDef.detalle.map((subDef, i) => (
          <SubParteHolograma key={i} def={subDef} mat={shapeMat} parentRef={shapeRef} />
        ))}
      </group>
    </group>
  );
}

function EfectoCelebracion({ activo, posicion }) {
  const count = 50;
  const refs = useRef([]);
  const ringRef = useRef();
  const ringMat = useMemo(() => createHologramMat('#00FF88', 0, 3.0, 0, false), []);
  const colores = ['#FFD166', '#FF6B35', '#00FF88', '#00E5FF', '#FF006E', '#FFBE0B'];
  const mats = useMemo(() => colores.map(c => createHologramMat(c, 0.9, 5.0, 0, false)), []);
  const tiempoRef = useRef(0);
  const semillas = useMemo(() =>
    Array.from({ length: count }, () => ({
      angulo: Math.random() * Math.PI * 2,
      elevacion: Math.random() * Math.PI - Math.PI / 2,
      velocidad: 1.5 + Math.random() * 2.5,
      distancia: Math.random() * 2.5 + 0.5,
      colorIdx: Math.floor(Math.random() * colores.length),
      esEstrella: Math.random() > 0.5,
    })),
  []);

  useFrame((state, delta) => {
    if (!activo) {
      for (let i = 0; i < count; i++) {
        if (refs.current[i]) refs.current[i].visible = false;
      }
      if (ringRef.current) ringRef.current.visible = false;
      tiempoRef.current = 0;
      return;
    }
    tiempoRef.current += delta;
    const edad = tiempoRef.current;

    if (ringRef.current) {
      ringRef.current.visible = true;
      const expansion = 0.5 + edad * 2;
      ringRef.current.scale.setScalar(expansion);
      ringMat.uniforms.uOpacity.value = Math.max(0, 0.6 * (1 - edad / 1.5));
    }

    for (let i = 0; i < count; i++) {
      const r = refs.current[i];
      if (!r) continue;
      r.visible = true;
      const s = semillas[i];
      const t = edad * s.velocidad;
      const radio = s.distancia * Math.min(t * 0.25, 1);
      r.position.set(
        posicion[0] + Math.cos(s.angulo) * Math.cos(s.elevacion) * radio,
        posicion[1] + Math.sin(s.elevacion) * radio + t * 0.6,
        posicion[2] + Math.sin(s.angulo) * Math.cos(s.elevacion) * radio,
      );
      const esc = Math.max(0, 1 - edad / 1.8);
      r.scale.setScalar(esc);
      if (r.material) r.material.opacity = esc;
    }
  });

  return (
    <group>
      <mesh ref={ringRef} position={[posicion[0], posicion[1] + 0.2, posicion[2]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={el => refs.current[i] = el} visible={false}>
          {semillas[i].esEstrella
            ? <circleGeometry args={[0.07, 5]} />
            : <sphereGeometry args={[0.05, 6, 6]} />}
          <primitive object={mats[semillas[i].colorIdx]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Escena3D({
  estado,
  parteAgarradaId,
  schematicRef,
  nivel,
  slotDestacadoId,
  mathTargetId,
  feedbackQuiz,
  partesRobot,
  alternativas,
  onIniciarArrastre,
}) {
  const targetRotRef = useRef(0);

  useFrame(() => {
    if (!schematicRef.current) return;
  });

  return (
    <group ref={schematicRef} position={[0, 1.5, 0]}>
      <ShaderTimeSync />
      <ScanBeamSync />
      <ambientLight color="#ffffff" intensity={0.5} />
      <pointLight position={[0, 3, 8]} intensity={2.0} color="#ffffff" distance={30} />
      <pointLight position={[0, -2, 5]} intensity={1.0} color={VERDE_HOLO} distance={20} />
      <SiluetaEnsamblada nivel={nivel} partesRobot={partesRobot} />
      {estado.partes.map((estadoParte) => {
        const parteDef = partesRobot.find((p) => p.id === estadoParte.id) ?? alternativas.find((a) => a.id === estadoParte.id);
        if (!parteDef) return null;
        const esActiva = !estadoParte.ensamblada && !estadoParte.agarrada && estadoParte.id === slotDestacadoId;
        return (
          <ParteMesh
            key={estadoParte.id}
            parteDef={parteDef}
            estadoParte={estadoParte}
            seleccionada={parteAgarradaId === estadoParte.id}
            esActiva={esActiva}
            mathTargetId={mathTargetId}
            schematicRef={schematicRef}
            onIniciarArrastre={onIniciarArrastre}
          />
        );
      })}
      <MarkVILoader />
      {estado.partes.filter(p => !p.ensamblada).map((ep) => {
        const pDef = partesRobot.find((p) => p.id === ep.id)
          ?? alternativas.find((p) => p.id === ep.id);
        if (!pDef) return null;
        const esDestacado = ep.id === slotDestacadoId;
        return <SlotGlow key={`slot-${ep.id}`} parteDef={pDef} destacado={esDestacado} />;
      })}
      {slotDestacadoId && !parteAgarradaId && (() => {
        const pDef = partesRobot.find((p) => p.id === slotDestacadoId)
          ?? alternativas.find((p) => p.id === slotDestacadoId);
        if (!pDef) return null;
        return (
          <group key="conexion-activa">
            <ManoIndicadora posicion={pDef.posicionExplotada} />
            <RayoConexion desde={pDef.posicionExplotada} hasta={pDef.posicionObjetivo} />
          </group>
        );
      })()}
      {parteAgarradaId && (() => {
        const parteEstado = estado.partes.find(p => p.id === parteAgarradaId);
        const pDef = partesRobot.find((p) => p.id === parteAgarradaId)
          ?? alternativas.find((a) => a.id === parteAgarradaId);
        if (!parteEstado || !pDef) return null;
        const desde = parteEstado.posicion || pDef.posicionExplotada;
        const hasta = pDef.posicionObjetivo;
        return <RastroDeParticulas key="rastro" desde={desde} hasta={hasta} activo={true} />;
      })()}
      {feedbackQuiz?.tipo === 'correcto' && (() => {
        const pDef = partesRobot.find(p => p.id === feedbackQuiz.parteId)
          ?? alternativas.find(a => a.id === feedbackQuiz.parteId);
        if (!pDef) return null;
        return <EfectoCelebracion key={`celeb-${feedbackQuiz.timestamp}`} activo={true} posicion={pDef.posicionObjetivo} />;
      })()}
    </group>
  );
}

function PlanoArrastre({ arrastreRef, schematicRef, onMoverParte, onSoltarParte }) {
  const planeRef = useRef();
  return (
    <mesh
      ref={planeRef}
      position={[0, 0, 0.1]}
      onPointerMove={(event) => {
        const arrastre = arrastreRef.current;
        if (!arrastre || !schematicRef.current) return;
        event.stopPropagation();
        const punto = event.point.clone();
        schematicRef.current.worldToLocal(punto);
        const nx = punto.x + arrastre.offset[0];
        const ny = punto.y + arrastre.offset[1];
        const nz = punto.z + arrastre.offset[2];
        if (arrastre.mesh) {
          arrastre.mesh.position.set(nx, ny, nz);
        }
        onMoverParte?.(arrastre.idParte, [nx, ny, nz]);
      }}
      onPointerUp={(event) => {
        if (!arrastreRef.current) return;
        event.stopPropagation();
        arrastreRef.current = null;
        onSoltarParte?.();
      }}
    >
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
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
}) {
  const schematicRef = useRef(null);
  const arrastreRef = useRef(null);
  const [errorActivo, setErrorActivo] = useState(false);
  const prevMensajeRef = useRef(estado.mensaje);
  const partesRobot = useMemo(() => obtenerPartesRobot(nivel), [nivel]);
  const alternativas = useMemo(() => PIEZAS_ALTERNATIVAS, []);
  const temaColores = useMemo(() => ({
    1: '#00ffff',
    2: '#00E5FF',
    3: '#00F5D4',
  }), []);
  const colorFondo = temaColores[nivel] ?? '#00ffff';

  useEffect(() => {
    const mensaje = estado.mensaje;
    const prev = prevMensajeRef.current;
    if (prev !== mensaje && mensaje && (
      mensaje.includes('no va') || mensaje.includes('lejos') || mensaje.includes('Casi') || mensaje.includes('No hay lugar')
    )) {
      setErrorActivo(true);
      const timer = setTimeout(() => setErrorActivo(false), 600);
      return () => clearTimeout(timer);
    }
    prevMensajeRef.current = mensaje;
  }, [estado.mensaje]);

  const manejarInicioArrastre = useCallback((idParte, posicionInicial, offset) => {
    const agarro = onAgarrarParte?.(idParte, posicionInicial);
    if (agarro) {
      arrastreRef.current = { idParte, offset };
    }
    return agarro;
  }, [onAgarrarParte]);

  const finalizarArrastre = useCallback(() => {
    if (!arrastreRef.current) return;
    arrastreRef.current = null;
    onSoltarParte?.();
  }, [onSoltarParte]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        onPointerMissed={finalizarArrastre}
      >
        <FondoHolografico colorBase={colorFondo} />
        <ErrorFlash visible={errorActivo} />
        {/* Plano invisible de arrastre: captura pointer move/up en toda la pantalla */}
        <PlanoArrastre
          arrastreRef={arrastreRef}
          schematicRef={schematicRef}
          onMoverParte={onMoverParte}
          onSoltarParte={onSoltarParte}
        />
        <Escena3D
          schematicRef={schematicRef}
          estado={estado}
          parteAgarradaId={estado.parteAgarrada}
          nivel={nivel}
          slotDestacadoId={slotDestacadoId}
          mathTargetId={mathTargetId}
          feedbackQuiz={feedbackQuiz}
          onIniciarArrastre={manejarInicioArrastre}
          partesRobot={partesRobot}
          alternativas={alternativas}
        />
      </Canvas>
    </View>
  );
}
