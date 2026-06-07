/**
 * @fileoverview Holographic robot schematic loader (Babylon.js).
 *
 * Loads the Mark VI suit GLB model and reparents the loaded hierarchy
 * under a single TransformNode group. The material is semi-transparent
 * (alpha 0.4) so the floating assembly parts BEHIND the mold are still
 * visible — a solid mold would hide the parts the child needs to grab.
 *
 * Three-pass reparenting handles the three common GLB structures:
 *   - meshes nested under a root TransformNode
 *   - meshes at scene root
 *   - a mix of both
 *
 * If the GLB fails to load, falls back to a primitive humanoid so the
 * user always sees something.
 *
 * @module iron-man-workshop/components/MarkVIModel
 */

import {
  Color3,
  Color4,
  Vector3,
  TransformNode,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Engine,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import modelUrl from '../assets/mark-vi-schematic-original.glb?url';

const DEFAULT_CONFIG = {
  color: new Color3(0, 1, 0.5),
  scale: 1.0,
  simplified: false,
};

/* ---------------------------------------------------------------------------
 * Primitive fallback (used only if the GLB fails to load)
 * ------------------------------------------------------------------------- */

function buildPrimitivePart(name, geom, pos, color, scene) {
  let mesh;
  if (geom.type === 'sphere') {
    mesh = MeshBuilder.CreateSphere(name, { diameter: geom.r * 2, segments: 12 }, scene);
  } else {
    mesh = MeshBuilder.CreateBox(name, { width: geom.w, height: geom.h, depth: geom.d }, scene);
  }
  mesh.position.copyFrom(pos);
  // Primitive fallback is not pickable either (same reason as GLB
  // schematic — these are the mold, not the parts).
  mesh.isPickable = false;
  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color;
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.backFaceCulling = true;
  mat.alpha = 0.4;
  mat.alphaMode = Engine.ALPHA_COMBINE;
  mat.disableDepthWrite = true;
  mesh.material = mat;
  // Freeze the primitive material + world matrix: identical to the
  // GLB path, no runtime changes, so we save the per-frame cost.
  mat.freeze();
  mesh.freezeWorldMatrix();
  mesh.doNotSyncBoundingInfo = true;
  return mesh;
}

function buildPrimitiveSchematic(scene, color, scale) {
  const group = new TransformNode('markVI_primitive', scene);
  group.scaling.set(scale, scale, scale);
  const parts = [
    { name: 'head',       geom: { type: 'box', w: 0.7,  h: 0.7,  d: 0.7  }, pos: new Vector3( 0.00,  1.60, 0.00) },
    { name: 'torso',      geom: { type: 'box', w: 1.2,  h: 1.2,  d: 0.7  }, pos: new Vector3( 0.00,  0.40, 0.00) },
    { name: 'shoulder_L', geom: { type: 'box', w: 0.35, h: 0.35, d: 0.35 }, pos: new Vector3(-1.00,  1.00, 0.00) },
    { name: 'shoulder_R', geom: { type: 'box', w: 0.35, h: 0.35, d: 0.35 }, pos: new Vector3( 1.00,  1.00, 0.00) },
    { name: 'upperarm_L', geom: { type: 'box', w: 0.3,  h: 0.85, d: 0.3  }, pos: new Vector3(-1.15,  0.30, 0.00) },
    { name: 'upperarm_R', geom: { type: 'box', w: 0.3,  h: 0.85, d: 0.3  }, pos: new Vector3( 1.15,  0.30, 0.00) },
    { name: 'thigh_L',    geom: { type: 'box', w: 0.38, h: 0.95, d: 0.38 }, pos: new Vector3(-0.35, -0.65, 0.00) },
    { name: 'thigh_R',    geom: { type: 'box', w: 0.38, h: 0.95, d: 0.38 }, pos: new Vector3( 0.35, -0.65, 0.00) },
    { name: 'calf_L',     geom: { type: 'box', w: 0.34, h: 0.85, d: 0.34 }, pos: new Vector3(-0.35, -1.60, 0.00) },
    { name: 'calf_R',     geom: { type: 'box', w: 0.34, h: 0.85, d: 0.34 }, pos: new Vector3( 0.35, -1.60, 0.00) },
  ];
  const shaderMeshes = [];
  for (const p of parts) {
    const m = buildPrimitivePart(`primitive_${p.name}`, p.geom, p.pos, color, scene);
    m.parent = group;
    shaderMeshes.push(m);
  }
  group.metadata = { shaderMeshes, hitVolumes: [] };
  console.log('[MarkVIModel] Built PRIMITIVE fallback (', shaderMeshes.length, 'meshes)');
  return group;
}

/* ---------------------------------------------------------------------------
 * GLB loader
 * ------------------------------------------------------------------------- */

function buildGlbSchematic(scene, color, scale, simplified) {
  const group = new TransformNode('markVI_glb', scene);
  group.scaling.set(scale, scale, scale);

  const loadPromise = (async () => {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync(modelUrl, '', scene);
      container.addAllToScene();

      // Pass 1: rootNodes → group
      for (const rootNode of container.rootNodes.slice()) {
        if (rootNode && rootNode !== group) rootNode.parent = group;
      }
      // Pass 2: loose meshes at scene root → group
      for (const mesh of container.meshes) {
        if (!mesh) continue;
        if (mesh.parent === null || mesh.parent === scene || mesh.parent === undefined) {
          mesh.parent = group;
        }
      }
      // Pass 3: reparent children of reparented transformNodes
      for (const node of [...container.rootNodes, ...container.transformNodes]) {
        if (!node || node.parent !== group) continue;
        for (const child of node.getChildren().slice()) {
          if (child && (child.parent === null || child.parent === scene)) {
            child.parent = group;
          }
        }
      }
      // Recompute world matrices
      group.computeWorldMatrix(true);
      for (const m of group.getChildMeshes()) m.computeWorldMatrix(true);

      // Last-ditch orphan sweep
      let finalChildCount = group.getChildMeshes().length;
      if (finalChildCount === 0) {
        const orphans = scene.meshes.filter(
          (m) => m && m !== group && (m.parent === null || m.parent === scene) &&
                 m.name && !m.name.startsWith('cw-') && !m.name.startsWith('hit_'),
        );
        for (const m of orphans) m.parent = group;
        finalChildCount = group.getChildMeshes().length;
      }

      console.log('[MarkVIModel] GLB reparented. Group has', finalChildCount,
        'mesh children out of', container.meshes.length, 'total.');

      if (finalChildCount === 0) {
        throw new Error('GLB reparenting produced an empty group');
      }

      // Apply SEMI-TRANSPARENT holographic material so parts behind the
      // mold are still visible. The mold is the "blueprint" — it should
      // be readable, not opaque.
      const edgeColor = new Color4(color.r, color.g, color.b, 1);
      const shaderMeshes = [];
      for (const mesh of container.meshes) {
        if (!(mesh instanceof Mesh)) continue;
        const mat = new StandardMaterial(`schematic_${mesh.name}_mat`, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = color;
        mat.specularColor = new Color3(0, 0, 0);
        mat.disableLighting = true;
        // Backface culling ON: the schematic is a blueprint with convex
        // parts. Rendering back faces doubles fragment shader work for
        // zero visual benefit (the "ghost" look comes from alpha, not
        // from back faces). Saves ~30-40% fragment cost on mobile GPUs.
        mat.backFaceCulling = true;
        mat.alpha = simplified ? 0.55 : 0.4;
        mat.alphaMode = Engine.ALPHA_COMBINE;
        mat.disableDepthWrite = true;
        mesh.material = mat;
        // Freeze the material: emissive/diffuse/alpha never change at
        // runtime, so the shader doesn't need to re-evaluate uniforms.
        // On mobile, this saves a measurable amount of CPU per frame.
        mat.freeze();

        if (!simplified) {
          mesh.enableEdgesRendering(0.95);
          mesh.edgesWidth = 1.0;
          mesh.edgesColor = edgeColor;
        }
        // Freeze the world matrix: the schematic never moves, so we
        // can skip per-frame matrix recompute for every mesh in the
        // GLB. Combined with `doNotSyncBoundingInfo`, this is the
        // biggest single optimization for static geometry.
        mesh.freezeWorldMatrix();
        mesh.doNotSyncBoundingInfo = true;
        // The schematic is the blueprint mold — it should NOT be
        // pickable, otherwise the raycast would hit the mold when
        // trying to grab parts behind it. The assembly parts are
        // separate meshes managed by AssemblyManager.
        mesh.isPickable = false;
        shaderMeshes.push(mesh);
      }

      // Center the model at origin
      const worldMin = new Vector3(Infinity, Infinity, Infinity);
      const worldMax = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const m of group.getChildMeshes()) {
        const b = m.getBoundingInfo().boundingBox;
        if (b.minimumWorld.x < worldMin.x) worldMin.x = b.minimumWorld.x;
        if (b.minimumWorld.y < worldMin.y) worldMin.y = b.minimumWorld.y;
        if (b.minimumWorld.z < worldMin.z) worldMin.z = b.minimumWorld.z;
        if (b.maximumWorld.x > worldMax.x) worldMax.x = b.maximumWorld.x;
        if (b.maximumWorld.y > worldMax.y) worldMax.y = b.maximumWorld.y;
        if (b.maximumWorld.z > worldMax.z) worldMax.z = b.maximumWorld.z;
      }
      if (Number.isFinite(worldMin.x)) {
        const centerX = (worldMin.x + worldMax.x) * 0.5;
        const centerY = (worldMin.y + worldMax.y) * 0.5;
        const centerZ = (worldMin.z + worldMax.z) * 0.5;
        group.position.x -= centerX;
        group.position.y -= centerY;
        group.position.z -= centerZ;
      }
      group.rotation.y = 0;

      group.metadata = group.metadata || {};
      group.metadata.shaderMeshes = shaderMeshes;
      group.metadata.hitVolumes = [];

      console.log('[MarkVIModel] GLB model loaded successfully.');
    } catch (err) {
      console.error('[MarkVIModel] GLB load failed, falling back to primitives:', err);
      // IMPORTANT: dispose the empty group, then add primitive meshes
      // to the SAME group reference (not a new one). The WorkshopController
      // already has a reference to `group`, so we can't return a different
      // object — the fallback must populate the existing group.
      const primitiveGroup = buildPrimitiveSchematic(scene, color, scale);
      // Copy primitive children into the original group
      for (const child of primitiveGroup.getChildMeshes()) {
        child.parent = group;
      }
      primitiveGroup.dispose();
      group.metadata = { shaderMeshes: group.getChildMeshes(), hitVolumes: [] };
    }
  })();

  return { group, loadPromise };
}

/**
 * Loads and configures the holographic robot schematic.
 *
 * @param scene
 * @param config - { color: Color3, scale: number, simplified: boolean }
 * @returns {{ group: TransformNode, loadPromise: Promise<void> }}
 */
export function loadMarkVIModel(scene, config = {}) {
  const { color, scale, simplified } = { ...DEFAULT_CONFIG, ...config };
  return buildGlbSchematic(scene, color, scale, simplified);
}

/**
 * Updates shader time uniforms using a pre-cached mesh array.
 * No-op. Kept for API compatibility.
 */
export function updateMarkVIModelCached(_cachedMeshes, _time) {
  // no-op
}
