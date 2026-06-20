import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createHologramMat, sharedTime } from './materiales/WorkshopShader';

const VERDE_HOLO = '#00FF88';

export default function MarkVILoader() {
  const [modelGroup, setModelGroup] = useState(null);
  const shaderMeshesRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const asset = Asset.fromModule(require('../assets/mark-vi-schematic.glb'));
        await asset.downloadAsync();

        const response = await fetch(asset.localUri);
        const buffer = await response.arrayBuffer();

        const loader = new GLTFLoader();
        loader.parse(buffer, '', (gltf) => {
          if (cancelled) return;
          const model = gltf.scene;

          const group = new THREE.Group();
          const meshes = [];

          const edgeMat = new THREE.LineBasicMaterial({
            color: VERDE_HOLO,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
          });

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = createHologramMat(VERDE_HOLO, 0.1, 2.5, 60, true);
              child.material = mat;
              child.renderOrder = 10;

              const edges = new THREE.EdgesGeometry(child.geometry, 20);
              const wireframe = new THREE.LineSegments(edges, edgeMat.clone());
              wireframe.renderOrder = 11;
              child.add(wireframe);

              meshes.push(child);
            }
          });

          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          model.position.y = 0.2;
          model.scale.setScalar(3.0);
          model.rotation.y = -Math.PI / 2;

          group.add(model);
          shaderMeshesRef.current = meshes;
          setModelGroup(group);
        }, (err) => {
          if (!cancelled) console.error('[MarkVILoader]', err.message);
        });
      } catch (e) {
        if (!cancelled) console.error('[MarkVILoader]', e.message);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  useFrame(() => {
    const t = sharedTime.value;
    for (const mesh of shaderMeshesRef.current) {
      if (mesh.material?.uniforms?.uTime) {
        mesh.material.uniforms.uTime.value = t;
      }
    }
  });

  if (!modelGroup) return null;
  return <primitive object={modelGroup} />;
}
