/**
 * @fileoverview Interactive assembly system for the Iron Man workshop (Babylon.js port).
 *
 * Handles floating parts, grab detection, drag movement, snap-to-position,
 * assembly progress tracking, and math-based challenge unlocks.
 *
 * Babylon port notes:
 * - Part roots are `BABYLON.TransformNode`s; each child mesh carries
 *   `metadata.isAssemblyPart = true` plus a direct back-reference to the
 *   root group via `metadata.group` for cheap O(1) lookup during picking.
 * - The full visual path uses `StandardMaterial` with diffuse + emissive
 *   and additive blending. We deliberately avoid `PBRMaterial` because it
 *   triggers an async IBL/BRDF pipeline that can race with engine.dispose
 *   and throw "Cannot read properties of null (reading 'program')" from
 *   bindSamplers. The workshop's flat-holo look doesn't need PBR realism.
 * - Picking uses `scene.pickWithRay(ray, predicate)` instead of
 *   `THREE.Raycaster.intersectObjects`. The predicate filters down to
 *   assembly meshes belonging to candidate groups only.
 *
 * @module iron-man-workshop/components/AssemblyManager
 */

import {
  Color3,
  Engine,
  Matrix,
  MeshBuilder,
  Ray,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { CreateTube } from '@babylonjs/core/Meshes/Builders/tubeBuilder';
import gsap from 'gsap';
import { SNAP_THRESHOLD, SOFT_SNAP_RANGE, FEEDBACK_THRESHOLDS } from '../data/RobotBlueprints';

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

/**
 * Convert a 0xRRGGBB hex int to a Babylon `Color3`.
 * @param {number} hex
 * @returns {Color3}
 */
function color3FromHex(hex) {
  return new Color3(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  );
}

/**
 * Convert HSL (each component in 0..1) to a Babylon `Color3`.
 * Mirrors Three.js `Color.setHSL` semantics.
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {Color3}
 */
function color3FromHSL(h, s, l) {
  if (s === 0) return new Color3(l, l, l);
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return new Color3(
    hue2rgb(p, q, h + 1 / 3),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1 / 3),
  );
}

/**
 * Linearly interpolate between two `Color3`s and return a new `Color3`.
 * Mirrors Three.js `Color.lerp` (`out = a + (b - a) * t`).
 * @param {Color3} a
 * @param {Color3} b
 * @param {number} t
 * @returns {Color3}
 */
function lerpColor3(a, b, t) {
  return new Color3(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

/**
 * Build an unlit, additive-blended StandardMaterial - the project's standard
 * "holographic" look (matches `createWorkshopMaterial` and the simplified
 * mobile fallback used elsewhere in the workshop module).
 * @param {string} name
 * @param {Scene} scene
 * @param {Color3} color
 * @param {number} alpha
 * @returns {StandardMaterial}
 */
function createHolographicMaterial(name, scene, color, alpha) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color;
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.alpha = alpha;
  mat.alphaMode = Engine.ALPHA_ADD;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  return mat;
}

/**
 * Build the small "peg" mesh that rides along with a floating part and tells
 * the child which slot it fits into. Shape and color come from the part's
 * `peg` field (set by `getPegForOrder` in the blueprint).
 *
 * @param {object} peg - { shape, color }
 * @param {string} id - part id (for naming)
 * @param {Scene} scene
 * @returns {TransformNode}
 */
function createPegMesh(peg, id, scene) {
  const root = new TransformNode(`peg_${id}`, scene);
  const c = color3FromHex(peg.color);

  let mesh;
  const size = 0.28;
  switch (peg.shape) {
    case 'square':
      mesh = MeshBuilder.CreateBox(`peg_${id}_mesh`, { size }, scene);
      break;
    case 'circle':
      mesh = MeshBuilder.CreateCylinder(
        `peg_${id}_mesh`,
        { diameter: size * 1.2, height: 0.04, tessellation: 24 },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    case 'triangle':
      mesh = MeshBuilder.CreateCylinder(
        `peg_${id}_mesh`,
        { diameter: size * 1.3, height: 0.04, tessellation: 3 },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    case 'diamond':
      mesh = MeshBuilder.CreateBox(`peg_${id}_mesh`, { size }, scene);
      mesh.rotation.y = Math.PI / 4;
      break;
    case 'pentagon':
      mesh = MeshBuilder.CreateCylinder(
        `peg_${id}_mesh`,
        { diameter: size * 1.3, height: 0.04, tessellation: 5 },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    case 'hexagon':
      mesh = MeshBuilder.CreateCylinder(
        `peg_${id}_mesh`,
        { diameter: size * 1.3, height: 0.04, tessellation: 6 },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    case 'heptagon':
      mesh = MeshBuilder.CreateCylinder(
        `peg_${id}_mesh`,
        { diameter: size * 1.3, height: 0.04, tessellation: 7 },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    case 'octagon':
      mesh = MeshBuilder.CreateCylinder(
        `peg_${id}_mesh`,
        { diameter: size * 1.3, height: 0.04, tessellation: 8 },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    case 'nonagon':
      mesh = MeshBuilder.CreateCylinder(
        `peg_${id}_mesh`,
        { diameter: size * 1.3, height: 0.04, tessellation: 9 },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    case 'decagon':
      mesh = MeshBuilder.CreateCylinder(
        `peg_${id}_mesh`,
        { diameter: size * 1.3, height: 0.04, tessellation: 10 },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    default:
      mesh = MeshBuilder.CreateBox(`peg_${id}_mesh`, { size }, scene);
  }

  mesh.parent = root;
  mesh.isPickable = false;
  mesh.material = createHolographicMaterial(`peg_${id}_mat`, scene, c, 0.9);
  root.metadata = { mainMesh: mesh };
  return root;
}

/**
 * Build a translucent "socket" mesh that sits at a part's target position
 * and shows the shape the child must match. Drawn dim when inactive, lit
 * in the part's color when active.
 *
 * @param {object} peg - { shape, color }
 * @param {string} id - part id
 * @param {Scene} scene
 * @returns {TransformNode}
 */
function createSocketMesh(peg, id, scene) {
  const root = new TransformNode(`socket_${id}`, scene);
  const c = color3FromHex(peg.color);

  // A wireframe ring of the matching shape, slightly larger than the peg
  // so it's clearly a "hole to drop the peg into".
  let mesh;
  const size = 0.4;
  switch (peg.shape) {
    case 'square':
      mesh = MeshBuilder.CreateBox(`socket_${id}_mesh`, { size }, scene);
      break;
    case 'circle':
    case 'pentagon':
    case 'hexagon':
    case 'heptagon':
    case 'octagon':
    case 'nonagon':
    case 'decagon':
    case 'triangle': {
      const tess = {
        circle: 24, triangle: 3, pentagon: 5, hexagon: 6,
        heptagon: 7, octagon: 8, nonagon: 9, decagon: 10,
      }[peg.shape] || 6;
      mesh = MeshBuilder.CreateCylinder(
        `socket_${id}_mesh`,
        { diameter: size * 1.4, height: 0.02, tessellation: tess },
        scene,
      );
      mesh.rotation.x = Math.PI / 2;
      break;
    }
    case 'diamond':
      mesh = MeshBuilder.CreateBox(`socket_${id}_mesh`, { size }, scene);
      mesh.rotation.y = Math.PI / 4;
      break;
    default:
      mesh = MeshBuilder.CreateBox(`socket_${id}_mesh`, { size }, scene);
  }
  mesh.parent = root;
  mesh.isPickable = false;
  const mat = new StandardMaterial(`socket_${id}_mat`, scene);
  mat.diffuseColor = c;
  mat.emissiveColor = c;
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.alpha = 0.15;
  mat.alphaMode = Engine.ALPHA_ADD;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.wireframe = true;
  mesh.material = mat;
  root.metadata = { mainMesh: mesh, material: mat, color: c };
  return root;
}

/* ---------------------------------------------------------------------------
 * Enums
 * ------------------------------------------------------------------------- */

/**
 * Per-part unlock states. Mirrors the original Three.js module.
 */
const PartState = {
  LOCKED: 'locked',
  CHALLENGE: 'challenge',
  UNLOCKED: 'unlocked',
  PLACED: 'placed',
};

/**
 * Assembly manager high-level states (exported).
 */
export const AssemblyState = {
  INACTIVE: 'inactive',
  ASSEMBLING: 'assembling',
  COMPLETE: 'complete',
};

/* ---------------------------------------------------------------------------
 * Part mesh construction
 * ------------------------------------------------------------------------- */

/**
 * Creates a holographic mesh hierarchy for a robot part.
 *
 * The returned TransformNode has three children:
 * - `mainMesh`: the solid body (PBRMaterial in the full path, unlit
 *   additive StandardMaterial on mobile).
 * - `wireMesh`: a wireframe overlay (unlit, additive, very transparent).
 * - `glowMesh`: an invisible-until-active glow sphere used for proximity
 *   feedback and the locked-shield visual.
 *
 * All three meshes have `metadata.isAssemblyPart = true` and a direct
 * back-reference to the root in `metadata.group` for O(1) group lookup
 * during picking and per-frame updates.
 *
 * @param {object} part - Part definition from `RobotBlueprints`.
 * @param {Color3} baseColor - Tint that the part color is lerped toward.
 * @param {boolean} simplified - Use the lightweight mobile material path.
 * @param {Scene} scene - Babylon scene used for the new meshes.
 * @returns {TransformNode}
 */
/**
 * Build a "detail" sub-mesh — a small box or sphere attached to the main
 * body so the part looks more like an actual robot piece (joint sphere at
 * the end of an arm, visor stripe on a head, etc.).
 *
 * Returns the mesh (already parented + with material assigned); caller
 * just sets `pickMeta` metadata later.
 *
 * @param {string} kind - 'sphere' | 'box' | 'thinBox' | 'flatBox'
 * @param {string} name
 * @param {object} dims - { w, h, d } for boxes, { r } for sphere
 * @param {Vector3} position
 * @param {Color3} color
 * @param {Scene} scene
 * @param {boolean} simplified
 * @returns {Mesh}
 */
function createDetailMesh(kind, name, dims, position, color, scene, simplified) {
  let mesh;
  if (kind === 'sphere') {
    // 8 segments is enough at small detail-mesh scale; saves ~30% of
    // triangle count vs the 10 used by the main body.
    mesh = MeshBuilder.CreateSphere(name, { diameter: dims.r * 2, segments: 8 }, scene);
  } else if (kind === 'flatBox') {
    mesh = MeshBuilder.CreateBox(name, { width: dims.w, height: dims.h, depth: dims.d }, scene);
  } else if (kind === 'thinBox') {
    mesh = MeshBuilder.CreateBox(name, { width: dims.w, height: dims.h, depth: Math.max(0.04, dims.d * 0.25) }, scene);
  } else {
    mesh = MeshBuilder.CreateBox(name, { width: dims.w, height: dims.h, depth: dims.d }, scene);
  }
  mesh.position.copyFrom(position);
  mesh.isPickable = true;
  // Always opaque StandardMaterial with full emissive. Guaranteed
  // visible on any background. See createPartMesh for the full note.
  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color;
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.alpha = simplified ? 0.85 : 1.0;
  mat.disableDepthWrite = false;
  mesh.material = mat;
  return mesh;
}

/**
 * Build sub-mesh details for a part based on its id. The goal isn't
 * anatomical accuracy — just enough visual variety that the floating parts
 * read as "robot pieces" instead of generic cubes.
 *
 * Returns an array of `{ mesh, kind }` pairs (the mesh is already parented
 * nowhere; the caller parents them). `kind` is used later to decide
 * picking behavior.
 */
function createPartDetails(part) {
  const g = part.geometry;
  const id = (part.id || '').toLowerCase();
  const details = [];

  if (id.includes('head') || g.type === 'sphere') {
    // Visor strip on the front
    details.push({ kind: 'thinBox', dims: { w: g.r * 1.1, h: g.r * 0.3, d: g.r * 0.4 }, pos: new Vector3(0, 0, g.r * 0.85) });
    // Ear bolts
    details.push({ kind: 'sphere', dims: { r: g.r * 0.18 }, pos: new Vector3(g.r * 0.9, 0, 0) });
    details.push({ kind: 'sphere', dims: { r: g.r * 0.18 }, pos: new Vector3(-g.r * 0.9, 0, 0) });
    return details;
  }

  if (id.includes('torso')) {
    // Chest plate (smaller box on the front)
    const cw = g.w * 0.55, ch = g.h * 0.45, cd = 0.08;
    details.push({ kind: 'flatBox', dims: { w: cw, h: ch, d: cd }, pos: new Vector3(0, g.h * 0.05, g.d * 0.55) });
    // Arc reactor (small sphere in the center of the chest)
    details.push({ kind: 'sphere', dims: { r: Math.min(g.w, g.h) * 0.10 }, pos: new Vector3(0, g.h * 0.1, g.d * 0.6) });
    // Shoulder pegs
    details.push({ kind: 'sphere', dims: { r: g.w * 0.08 }, pos: new Vector3(g.w * 0.5, g.h * 0.4, 0) });
    details.push({ kind: 'sphere', dims: { r: g.w * 0.08 }, pos: new Vector3(-g.w * 0.5, g.h * 0.4, 0) });
    return details;
  }

  if (id.includes('shoulder')) {
    // Round shoulder ball
    details.push({ kind: 'sphere', dims: { r: g.w * 0.55 }, pos: new Vector3(0, -g.h * 0.3, 0) });
    return details;
  }

  if (id.includes('upperarm') || id.includes('bicep')) {
    // Shoulder ball at top, elbow ball at bottom
    details.push({ kind: 'sphere', dims: { r: g.w * 0.55 }, pos: new Vector3(0, g.h * 0.5, 0) });
    details.push({ kind: 'sphere', dims: { r: g.w * 0.5 }, pos: new Vector3(0, -g.h * 0.5, 0) });
    return details;
  }

  if (id.includes('forearm')) {
    // Elbow ball at top, wrist ball at bottom
    details.push({ kind: 'sphere', dims: { r: g.w * 0.55 }, pos: new Vector3(0, g.h * 0.5, 0) });
    details.push({ kind: 'sphere', dims: { r: g.w * 0.45 }, pos: new Vector3(0, -g.h * 0.5, 0) });
    return details;
  }

  if (id.includes('hand') || id.includes('guante')) {
    // Knuckle ridge
    details.push({ kind: 'sphere', dims: { r: g.r * 0.6 }, pos: new Vector3(0, g.r * 0.7, 0) });
    return details;
  }

  if (id.includes('thigh') || id.includes('muslo')) {
    // Hip joint at top
    details.push({ kind: 'sphere', dims: { r: g.w * 0.55 }, pos: new Vector3(0, g.h * 0.5, 0) });
    // Knee ball at bottom
    details.push({ kind: 'sphere', dims: { r: g.w * 0.5 }, pos: new Vector3(0, -g.h * 0.5, 0) });
    return details;
  }

  if (id.includes('calf') || id.includes('pantorrilla')) {
    // Knee ball at top, ankle ball at bottom
    details.push({ kind: 'sphere', dims: { r: g.w * 0.55 }, pos: new Vector3(0, g.h * 0.5, 0) });
    details.push({ kind: 'sphere', dims: { r: g.w * 0.45 }, pos: new Vector3(0, -g.h * 0.5, 0) });
    return details;
  }

  if (id.includes('feet') || id.includes('foot') || id.includes('boti') || id.includes('boot')) {
    // Toe cap
    details.push({ kind: 'flatBox', dims: { w: g.w * 0.7, h: g.h * 0.5, d: g.d * 0.3 }, pos: new Vector3(0, -g.h * 0.3, g.d * 0.5) });
    return details;
  }

  if (id.includes('arm')) {
    // Generic arm: ball joints at both ends
    details.push({ kind: 'sphere', dims: { r: g.w * 0.55 }, pos: new Vector3(0, g.h * 0.5, 0) });
    details.push({ kind: 'sphere', dims: { r: g.w * 0.5 }, pos: new Vector3(0, -g.h * 0.5, 0) });
    return details;
  }

  if (id.includes('leg')) {
    details.push({ kind: 'sphere', dims: { r: g.w * 0.55 }, pos: new Vector3(0, g.h * 0.5, 0) });
    details.push({ kind: 'sphere', dims: { r: g.w * 0.5 }, pos: new Vector3(0, -g.h * 0.5, 0) });
    return details;
  }

  if (id.includes('wing') || id.includes('ala')) {
    // Wing tip
    details.push({ kind: 'flatBox', dims: { w: g.w * 0.6, h: g.h * 1.1, d: 0.04 }, pos: new Vector3(0, 0, -g.d * 0.5) });
    return details;
  }

  return details;
}

function createPartMesh(part, baseColor, simplified, scene) {
  const root = new TransformNode(`part_${part.id}`, scene);

  const g = part.geometry;
  let mainMesh;
  if (g.type === 'sphere') {
    mainMesh = MeshBuilder.CreateSphere(
      `part_${part.id}_main`,
      { diameter: g.r * 2, segments: 12 },
      scene,
    );
  } else {
    mainMesh = MeshBuilder.CreateBox(
      `part_${part.id}_main`,
      { width: g.w, height: g.h, depth: g.d },
      scene,
    );
  }
  mainMesh.parent = root;
  mainMesh.isPickable = true;

  const partColor = color3FromHex(part.color);
  const tint = lerpColor3(partColor, baseColor, 0.4);

  // Always use opaque StandardMaterial with full emissive so the parts
  // are guaranteed visible. The previous "holographic additive" path
  // was nearly invisible on dark backgrounds.
  const mat = new StandardMaterial(`part_${part.id}_mainMat`, scene);
  mat.diffuseColor = tint;
  mat.emissiveColor = partColor;
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.alpha = simplified ? 0.85 : 1.0;
  mat.disableDepthWrite = false;
  mainMesh.material = mat;

  // Add detail sub-meshes (joints, plates, etc.) so the part looks like
  // a robot piece instead of a generic cube. Each sub-mesh is a child of
  // the same root, so the whole part moves as one TransformNode.
  const partMeshes = [mainMesh];
  const details = createPartDetails(part);
  for (let i = 0; i < details.length; i++) {
    const d = details[i];
    const detailMesh = createDetailMesh(
      d.kind,
      `part_${part.id}_d${i}`,
      d.dims,
      d.pos,
      tint,
      scene,
      simplified,
    );
    detailMesh.parent = root;
    detailMesh.isPickable = true;
    partMeshes.push(detailMesh);
  }

  // Wireframe overlay - shares geometry with the main mesh only.
  const wireMesh = mainMesh.clone(`part_${part.id}_wire`);
  wireMesh.parent = root;
  wireMesh.isPickable = false;
  wireMesh.material = createHolographicMaterial(
    `part_${part.id}_wireMat`,
    scene,
    partColor,
    0.3,
  );
  wireMesh.material.wireframe = true;

  // Glow sphere (inactive until state machine updates it).
  const glowMesh = MeshBuilder.CreateSphere(
    `part_${part.id}_glow`,
    { diameter: part.radius * 3, segments: 8 },
    scene,
  );
  glowMesh.parent = root;
  glowMesh.isPickable = false;
  const glowMat = new StandardMaterial(`part_${part.id}_glowMat`, scene);
  glowMat.diffuseColor = new Color3(0, 0, 0);
  glowMat.emissiveColor = new Color3(1, 0.53, 0); // 0xff8800
  glowMat.specularColor = new Color3(0, 0, 0);
  glowMat.disableLighting = true;
  glowMat.alpha = 0;
  glowMat.alphaMode = Engine.ALPHA_ADD;
  glowMat.backFaceCulling = false;
  glowMat.disableDepthWrite = true;
  glowMesh.material = glowMat;

  // Metadata for picking back-references.
  const pickMeta = { isAssemblyPart: true, group: root };
  mainMesh.metadata = { ...pickMeta, role: 'main' };
  for (let i = 1; i < partMeshes.length; i++) {
    partMeshes[i].metadata = { ...pickMeta, role: `detail${i - 1}` };
  }
  wireMesh.metadata = { ...pickMeta, role: 'wire' };
  glowMesh.metadata = { ...pickMeta, role: 'glow' };

  // Root metadata mirrors the original userData shape.
  root.metadata = {
    partId: part.id,
    partData: part,
    targetPosition: new Vector3(part.position.x, part.position.y, part.position.z),
    mainMesh,
    partMeshes,
    wireMesh,
    glowMesh,
    isAssembled: false,
    isGrabbed: false,
  };

  return root;
}

/* ---------------------------------------------------------------------------
 * Math challenges (pure logic, unchanged from the Three.js version)
 * ------------------------------------------------------------------------- */

/**
 * Generates a random math challenge for a part.
 */
function generateChallenge(partDef, robotLevel) {
  const idx = partDef.order;
  const base = robotLevel;

  let operation, maxNumber;

  if (idx <= 1) {
    operation = '+';
    maxNumber = 3 + base * 2;
  } else if (idx <= 4) {
    operation = '-';
    maxNumber = 5 + base * 2;
  } else {
    operation = '*';
    maxNumber = 3 + base;
  }

  const rand = (max) => Math.floor(Math.random() * Math.max(max, 1)) + 1;
  let a, b, correct;

  if (operation === '+') {
    a = rand(maxNumber);
    b = rand(maxNumber);
    correct = a + b;
  } else if (operation === '-') {
    a = rand(maxNumber + 2);
    b = rand(Math.max(1, a - 1));
    correct = a - b;
  } else {
    a = rand(Math.min(maxNumber, 9));
    b = rand(5) + 1;
    correct = a * b;
  }

  const opts = new Set([correct]);
  let attempts = 0;
  while (opts.size < 3 && attempts < 30) {
    attempts++;
    const delta = rand(4);
    const sign = Math.random() > 0.5 ? 1 : -1;
    const wrong = correct + delta * sign;
    if (wrong >= 0 && wrong <= correct + 10 && wrong !== correct) {
      opts.add(wrong);
    }
  }
  while (opts.size < 3) {
    opts.add(correct + opts.size);
  }

  const options = [...opts];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { operation, numbers: [a, b], correct, options };
}

/* ---------------------------------------------------------------------------
 * AssemblyManager
 * ------------------------------------------------------------------------- */

/**
 * Manages the interactive assembly of robot parts.
 *
 * Public API (called by `WorkshopController`):
 * - `startAssembly(blueprint, robotLevel, alreadyAssembled)`
 * - `stopAssembly()`
 * - `getProgress()`
 * - `tryGrab(handWorldPos)`
 * - `moveGrabbed(handWorldPos)`
 * - `releaseGrabbed()`
 * - `forceRelease()`
 * - `hitTest(ray)` - now takes a `BABYLON.Ray` (was a `THREE.Raycaster`).
 * - `grabPart(partGroup)`
 * - `unlockPart(partId)`
 * - `getChallenge(partId)`
 * - `update(deltaTime)`
 * - `dispose()`
 *
 * Public properties:
 * - `state`, `assembledCount`, `totalParts`, `parts`
 * - `onPartAssembled`, `onAssemblyComplete`, `onPartHover`,
 *   `onChallengeNeeded` (callbacks; the last is assigned externally).
 */
export class AssemblyManager {
  /**
   * @param {import('@babylonjs/core').Scene} scene
   * @param {import('@babylonjs/core').Camera} camera - Stored for parity with
   *   the Three.js version; not currently used internally (Babylon picking
   *   uses the active camera via the scene).
   * @param {object} [config]
   * @param {Color3} [config.baseColor] - Tint for the holographic part body.
   * @param {boolean} [config.simplified] - Use the lightweight mobile path.
   * @param {Function} [config.onPartAssembled]
   * @param {Function} [config.onAssemblyComplete]
   * @param {Function} [config.onPartHover]
   */
  constructor(scene, camera, config = {}) {
    this.scene = scene;
    this.camera = camera;
    this.baseColor = config.baseColor || new Color3(0, 1, 1);
    this._isMobile = config.isMobile || false;

    this.state = AssemblyState.INACTIVE;
    this.parts = [];
    this.assembledCount = 0;
    this.totalParts = 0;
    this.currentBlueprint = null;
    this.robotLevel = 1;

    // Callbacks
    this.onPartAssembled = config.onPartAssembled || null;
    this.onAssemblyComplete = config.onAssemblyComplete || null;
    this.onPartHover = config.onPartHover || null;
    this.onInvalidDrop = null;

    // Challenge system (kept for backwards compatibility; not used in Phase B)
    this.onChallengeNeeded = null;
    this._partStates = new Map();
    this._challenges = new Map();
    this._activeChallengeId = null;
    this._challengeTime = 0;

    // Logical-assembly state (Phase B):
    //   - _receptacles: partId -> socket TransformNode at target position
    //   - _nextOrder: the smallest order not yet placed (== "active slot")
    //   - _orderActiveFor: partId of the part currently allowed to be placed
    //   - _pegNodes: partId -> peg TransformNode floating with the part
    //   - _fxMeshes: in-flight snap feedback (rings + particles) so we
    //     can dispose them if the assembly ends before they finish animating
    this._receptacles = new Map();
    this._pegNodes = new Map();
    this._nextOrder = 0;
    this._orderActiveFor = null;
    this._invalidDropTime = 0;
    this._fxCounter = 0;
    // FX pool: persistent meshes for snap/grab bursts. Reusing the
    // same geometry+material avoids per-snap allocation, GPU upload
    // and JS garbage. Built lazily on first use.
    this._fxPool = {
      snapRing: null,        // single torus for snap ring
      snapParticles: [],     // 6 spheres for snap particles
      grabRing: null,        // single torus for grab ring
      grabParticles: [],     // 4 spheres for grab particles
    };
    this._fxActiveTweens = []; // GSAP tweens to kill on re-trigger

    // Grab state
    this.grabbedPart = null;
    this.grabOffset = new Vector3();
    this._tempVec = new Vector3();

    // Ghost outline for target position
    this.ghostGroup = null;

    // Aim guide: a glowing line from the grabbed part to its target
    // socket. Only visible when the part is in the soft-snap range and
    // is the correct next-in-order piece. Helps kids see exactly where
    // to drop the part even when their hand is far from the target.
    this._aimGuide = null;
    this._aimGuideMat = null;

    // Drop zone ring: a larger pulsing ring around the active target
    // socket. Visible only when a correct part is held in range. Makes
    // the "drop here!" target much more obvious than the small socket.
    this._dropZoneRing = null;
    this._dropZoneMat = null;

    // Hover state: the part currently highlighted by updateHover()
    // (the one the hand is pointing at). Cleared on grab/release.
    this._hoveredPart = null;

    // Simplified rendering (disables expensive materials on mobile).
    this._simplified = config.simplified === true;

    // Audio feedback for grab/snap/error (HU-51, HU-52)
    this.audioManager = config.audioManager || null;
  }

  _playSound(name) {
    if (this.audioManager && this.audioManager.play) {
      try { this.audioManager.play(name); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Start assembly for a given blueprint.
   * @param {object} blueprint - From `RobotBlueprints`.
   * @param {number} robotLevel
   * @param {Array<string>} alreadyAssembled - Part IDs already placed.
   */
  startAssembly(blueprint, robotLevel, alreadyAssembled = []) {
    this.stopAssembly();
    this.currentBlueprint = blueprint;
    this.robotLevel = robotLevel;
    this.assembledCount = 0;
    this.totalParts = blueprint.parts.length;
    this.state = AssemblyState.ASSEMBLING;
    this._partStates = new Map();
    this._challenges = new Map();
    this._activeChallengeId = null;
    this._challengeTime = 0;
    this._receptacles = new Map();
    this._pegNodes = new Map();
    this._nextOrder = 0;
    this._orderActiveFor = null;
    this._invalidDropTime = 0;

    // Create ghost outline showing where the robot goes.
    this._createGhostOutline(blueprint);

    // Create the aim guide line + drop-zone ring (hidden until a
    // correct part is grabbed).
    this._createAimGuide();

    // Compute the smallest unplaced order so we know which slot is "active"
    // (bright and accepting input) at start time.
    const placedOrToPlace = blueprint.parts.filter(
      (p) => !alreadyAssembled.includes(p.id),
    );
    if (placedOrToPlace.length > 0) {
      this._nextOrder = Math.min(...placedOrToPlace.map((p) => p.order));
    }

    // Create floating parts + their receptacles + their pegs.
    for (const partDef of blueprint.parts) {
      const isAlreadyDone = alreadyAssembled.includes(partDef.id);
      const partGroup = createPartMesh(partDef, this.baseColor, this._simplified, this.scene);
      const meta = partGroup.metadata;

      // Peg rides along with the part (visual hint of which slot it fits).
      const peg = createPegMesh(partDef.peg, partDef.id, this.scene);
      peg.position.set(0, 0, 0); // local to the part root
      peg.parent = partGroup;
      this._pegNodes.set(partDef.id, peg);

      // Socket sits at the part's target position.
      const socket = createSocketMesh(partDef.peg, partDef.id, this.scene);
      socket.position.set(
        partDef.position.x,
        partDef.position.y,
        partDef.position.z,
      );
      this._receptacles.set(partDef.id, socket);

      if (isAlreadyDone) {
        partGroup.position.set(
          partDef.position.x,
          partDef.position.y,
          partDef.position.z,
        );
        meta.isAssembled = true;
        this._setPartOpacity(partGroup, 0.4);
        this.assembledCount++;
        this._partStates.set(partDef.id, PartState.PLACED);
        // Hide peg and socket for already-placed parts.
        peg.setEnabled(false);
        socket.setEnabled(false);
      } else {
        partGroup.position.set(
          partDef.explodedOffset.x,
          partDef.explodedOffset.y,
          partDef.explodedOffset.z,
        );
        this._startIdleFloat(partGroup, partDef);
        // All parts start UNLOCKED in Phase B; order validation handles
        // the "what's next" gating instead of math challenges.
        this._partStates.set(partDef.id, PartState.UNLOCKED);
        this._challenges.set(partDef.id, generateChallenge(partDef, robotLevel));
        this._setGlowColor(partGroup, 0x00ff44);
        meta.glowMesh.material.alpha = 0.12;
      }

      this.parts.push(partGroup);
    }

    console.log('[AssemblyManager] startAssembly complete. Parts created:',
      this.parts.length, 'at positions:',
      this.parts.slice(0, 3).map(p => `(${p.position.x.toFixed(1)}, ${p.position.y.toFixed(1)}, ${p.position.z.toFixed(1)})`).join(', '),
      '... Ghost:', !!this.ghostGroup, 'receptacles:', this._receptacles.size);

    // Update which slot glows as the active one.
    this._refreshActiveReceptacle();
  }

  /**
   * Stop assembly and clean up all GPU resources.
   */
  stopAssembly() {
    for (const part of this.parts) {
      this._stopIdleFloat(part);
      this._disposePartNode(part);
    }
    for (const socket of this._receptacles.values()) {
      if (socket && socket.metadata && socket.metadata.mainMesh) {
        if (socket.metadata.mainMesh.material) socket.metadata.mainMesh.material.dispose();
        socket.metadata.mainMesh.dispose();
      }
      if (socket) socket.dispose();
    }
    for (const peg of this._pegNodes.values()) {
      if (peg && peg.metadata && peg.metadata.mainMesh) {
        if (peg.metadata.mainMesh.material) peg.metadata.mainMesh.material.dispose();
        peg.metadata.mainMesh.dispose();
      }
      if (peg) peg.dispose();
    }
    this.parts = [];
    this.grabbedPart = null;
    this.assembledCount = 0;
    this.totalParts = 0;
    this.state = AssemblyState.INACTIVE;
    this._partStates = new Map();
    this._challenges = new Map();
    this._activeChallengeId = null;
    this._receptacles = new Map();
    this._pegNodes = new Map();
    this._nextOrder = 0;
    this._orderActiveFor = null;
    this._hoveredPart = null;
    this._removeGhostOutline();
    this._disposeAimGuide();

    // Hide any in-flight FX pool meshes and kill their tweens.
    // We keep the pool intact so the next assembly session reuses
    // the same geometry/material without re-uploading to the GPU.
    this._resetFxPool();
  }

  /**
   * Get assembly progress (0..1).
   */
  getProgress() {
    return this.totalParts > 0 ? this.assembledCount / this.totalParts : 0;
  }

  /**
   * Try to grab a part near the given hand position (world space).
   *
   * Three-stage picker:
   *   1. PRECISE raycast (NDC): if NDC coords are provided, build a
   *      proper picking ray from the camera through that screen
   *      pixel. This correctly intersects parts at ANY depth (Z)
   *      because the ray goes in the true 3D direction the kid is
   *      pointing. A previous version projected the hand to z=0 and
   *      cast a ray there, which MISSED parts at z≠0 due to
   *      perspective — the kid would point at the correct part on
   *      screen but the ray would pass over it in 3D space.
   *   2. PRECISE raycast (world): fallback if no NDC. Cast from
   *      camera through the hand world position. Still correct for
   *      parts at z=0 only.
   *   3. SOFT sphere fallback: if both raycasts missed (e.g. the
   *      kid's hand is between two parts or occluded), use a small
   *      sphere distance (2.5u) to still allow grabbing. This is
   *      the "fat-finger" forgiveness for shaky hand tracking.
   *
   * @param {Vector3} handWorldPos
   * @param {number} [ndcX]  optional NDC X (-1..1) of the hand on screen
   * @param {number} [ndcY]  optional NDC Y (-1..1) of the hand on screen
   * @returns {boolean}
   */
  tryGrab(handWorldPos, ndcX, ndcY) {
    if (this.state !== AssemblyState.ASSEMBLING) return false;

    let closestPart = null;

    // ---- Stage 0: trust the hover (most accurate) ----
    // When the kid pinches, their index tip moves slightly (the
    // finger curls toward the thumb). The NDC at the moment of
    // grab might be 5-15px off from where the hover was 100ms
    // ago. If we have a hovered part, the kid SAW it highlighted
    // and is pinching to grab THAT one — trust that intent over
    // a fresh raycast. The hovered part is the part under the
    // cursor before the pinch started.
    //
    // IMPORTANT: once Stage 0 finds a hovered part, the later
    // stages MUST NOT overwrite it. The NDC raycast in Stage 1
    // would use the index tip's current position (post-curl),
    // which can be 10-20px off from where the hover was — that's
    // exactly the bug where "I'm pointing at piece A, hover shows
    // A, pinch, but it grabs piece B". The hover is the source
    // of truth for "which piece am I grabbing".
    if (this._hoveredPart) {
      const hm = this._hoveredPart.metadata;
      if (!hm.isAssembled && !hm.isGrabbed
          && this._partStates.get(hm.partId) === PartState.UNLOCKED) {
        closestPart = this._hoveredPart;
      }
    }

    // ---- Stage 1: precise raycast via NDC (only if hover missed) ----
    if (!closestPart
        && this.camera
        && this.scene
        && typeof ndcX === 'number'
        && typeof ndcY === 'number'
        && Number.isFinite(ndcX)
        && Number.isFinite(ndcY)) {
      const engine = this.scene.getEngine();
      const screenX = (ndcX + 1) * 0.5 * engine.getRenderWidth();
      const screenY = (1 - ndcY) * 0.5 * engine.getRenderHeight();
      const ray = this.scene.createPickingRay(
        screenX,
        screenY,
        Matrix.Identity(),
        this.camera,
      );
      const hit = this.hitTest(ray);
      if (hit && hit.group) {
        closestPart = hit.group;
      }
    }

    // ---- Stage 2: precise raycast via world position (fallback) ----
    if (!closestPart && this.camera && this.camera.position && handWorldPos) {
      const dir = handWorldPos.subtract(this.camera.position);
      const len = dir.length();
      if (len > 0.0001) {
        dir.scaleInPlace(1 / len);
        const ray = new Ray(this.camera.position, dir, len + 2.0);
        const hit = this.hitTest(ray);
        if (hit && hit.group) {
          closestPart = hit.group;
        }
      }
    }

    // ---- Stage 3: soft sphere fallback (only if raycast missed) ----
    if (!closestPart) {
      let closestDist2D = Infinity;
      // Tighter than before: the raycast is the primary path, so the
      // fallback only catches "close enough" cases (2.5u). 3.5u+ was
      // accidentally grabbing the wrong part.
      const FALLBACK_RADIUS = 2.5;
      for (const part of this.parts) {
        const meta = part.metadata;
        if (meta.isAssembled || meta.isGrabbed) continue;
        const state = this._partStates.get(meta.partId);
        if (state !== PartState.UNLOCKED) continue;

        const dx = handWorldPos.x - part.position.x;
        const dy = handWorldPos.y - part.position.y;
        const dist2D = Math.hypot(dx, dy);
        if (dist2D < FALLBACK_RADIUS && dist2D < closestDist2D) {
          closestDist2D = dist2D;
          closestPart = part;
        }
      }
    }

    if (closestPart) {
      const meta = closestPart.metadata;
      meta.isGrabbed = true;
      meta.isCorrectOrder = meta.partData.order === this._nextOrder;
      this.grabbedPart = closestPart;
      this.grabOffset.copyFrom(closestPart.position).subtractInPlace(handWorldPos);
      // Clear hover immediately so the kid doesn't see a stale white
      // outline for one more frame after grabbing. The update loop's
      // isGrabbed branch will take over and lerp towards the grabbed
      // targets set by moveGrabbed.
      this._hoveredPart = null;

      // Visual confirmation: expanding ring + particles at the grab
      // point. Tells the kid "yes, you grabbed it!" before the part
      // even starts following the hand.
      this._spawnGrabBurst(closestPart);

      this._setPartOpacity(closestPart, 0.95);
      this._setMainEmissiveIntensity(
        closestPart,
        meta.partData.emissiveIntensity * 1.5,
      );

      // Audio: grab sound (HU-51)
      this._playSound('grab');

      return true;
    }
    return false;
  }

  /**
   * Highlight the part the hand is currently hovering over (the one
   * that WOULD be grabbed on a pinch). This gives the kid immediate
   * visual feedback that the picker is targeting the right piece.
   *
   * Uses the same NDC raycast as tryGrab so what you see is what you
   * get. The actual visual (white outline + 1.08 scale) is applied in
   * the update() loop so it doesn't get overwritten by the per-frame
   * idle-float glow logic.
   *
   * @param {Vector3} handWorldPos
   * @param {number} [ndcX]
   * @param {number} [ndcY]
   */
  updateHover(handWorldPos, ndcX, ndcY) {
    if (this.state !== AssemblyState.ASSEMBLING) return;
    if (this.grabbedPart) {
      // Already holding something — no hover feedback needed.
      this._hoveredPart = null;
      return;
    }

    let hoveredGroup = null;

    // Use the same NDC raycast as tryGrab.
    if (this.camera
        && this.scene
        && typeof ndcX === 'number'
        && typeof ndcY === 'number'
        && Number.isFinite(ndcX)
        && Number.isFinite(ndcY)) {
      const engine = this.scene.getEngine();
      const screenX = (ndcX + 1) * 0.5 * engine.getRenderWidth();
      const screenY = (1 - ndcY) * 0.5 * engine.getRenderHeight();
      const ray = this.scene.createPickingRay(
        screenX,
        screenY,
        Matrix.Identity(),
        this.camera,
      );
      const hit = this.hitTest(ray);
      if (hit && hit.group) {
        hoveredGroup = hit.group;
      }
    }

    // Only update if it changed — avoids redundant work.
    if (this._hoveredPart !== hoveredGroup) {
      this._hoveredPart = hoveredGroup;
    }
  }

  /**
   * Move the grabbed part to follow the hand.
   * @param {Vector3} handWorldPos
   */
  moveGrabbed(handWorldPos) {
    if (!this.grabbedPart) return;

    this.grabbedPart.position.copyFrom(handWorldPos).addInPlace(this.grabOffset);

    const meta = this.grabbedPart.metadata;
    const target = meta.targetPosition;
    // 2D screen-plane distance (ignore Z) — exploded parts sit at varying
    // Z, so 3D distance would always include the z-gap and the proximity
    // glow would never trigger.
    const dx = this.grabbedPart.position.x - target.x;
    const dy = this.grabbedPart.position.y - target.y;
    const dist = Math.hypot(dx, dy);
    const maxDist = 3.0;
    const proximity = Math.max(0, 1 - dist / maxDist);
    const isCorrect = meta.isCorrectOrder !== false;

    // Magnetic snap assist. The part follows the hand freely when far
    // away (kid is in full control), but as it gets closer the target
    // pulls harder. This makes placement feel like the part "wants" to
    // snap in — a strong affordance for kids.
    //   - 0–2.0 u:    STRONG pull (0.45)  — almost guides itself
    //   - 2.0–3.5:    MEDIUM  pull (0.25)
    //   - 3.5–6.0:    GENTLE  pull (0.12) — kid still in control
    //   - 6.0–12.0:   LIGHT   pull (0.04) — slight gravity toward target
    //   - 12.0+:      no pull
    //
    // AUTO-SNAP LOCK: once the part has been in the soft-snap range
    // for any time (_holdInRangeTime > 0), the pull goes to 1.0 —
    // meaning the part is EXACTLY at the target before the auto-snap
    // fires. This fixes the "left near but not at" bug: without the
    // lock, the part was pulled toward the target but still slightly
    // offset (the hand offset + pull factor combo left a residual gap).
    // With the lock, the countdown ring shows the snap is coming AND
    // the part is precisely positioned, so the settle animation lands
    // exactly on the target.
    //
    // WRONG-ORDER parts: ZERO pull. The kid must be able to move a
    // wrong piece freely around the scene (e.g. to "park" it in a
    // corner) without it yanking back toward the target. We still
    // teach the error via the red glow + flash on release, but we
    // never force the wrong piece toward the slot.
    let pullFactor = 0;
    if (isCorrect) {
      if (this._holdInRangeTime > 0) {
        // Auto-snap lock: part is magnetically held at the target.
        // Pull factor ramps from 0.6 → 1.0 as the timer fills, so
        // there's a tiny "settle" feel before the hard lock.
        const threshold = this._isMobile ? 0.5 : 0.35;
        const tProgress = Math.min(1, this._holdInRangeTime / threshold);
        pullFactor = 0.6 + 0.4 * tProgress;
      } else if (dist < 2.0) {
        pullFactor = 0.45;
      } else if (dist < SNAP_THRESHOLD) {
        pullFactor = 0.25;
      } else if (dist < 6.0) {
        pullFactor = 0.12;
      } else if (dist < SOFT_SNAP_RANGE) {
        pullFactor = 0.04;
      }
    }
    if (pullFactor > 0) {
      this.grabbedPart.position.x += (target.x - this.grabbedPart.position.x) * pullFactor;
      this.grabbedPart.position.y += (target.y - this.grabbedPart.position.y) * pullFactor;
      this.grabbedPart.position.z += (target.z - this.grabbedPart.position.z) * pullFactor;
    }

    if (!isCorrect) {
      // Wrong-order part: keep the red glow strong to teach "not this one".
      // Store targets in metadata; the update loop will lerp towards them.
      meta._grabbedTargetScale = 1;
      meta._grabbedTargetGlowAlpha = 0.32;
      meta._grabbedTargetGlowHex = 0xff4444;
      return;
    }

    if (proximity > FEEDBACK_THRESHOLDS.VERY_NEAR) {
      // Stronger glow + scale pulse when *in* snap range, so the kid
      // gets a clear "release me now!" signal. The scale also grows
      // as the auto-snap timer fills, so the user gets a clear
      // "suelta ya" countdown that intensifies.
      meta._grabbedTargetGlowHex = 0x00ff44;
      meta._grabbedTargetGlowAlpha = this._isMobile ? 0.55 : 0.35;
      const holdProgress = Math.min(1, (this._holdInRangeTime || 0) / (this._isMobile ? 0.5 : 0.35));
      const baseAmp = this._isMobile ? 0.10 : 0.04;
      const amp = baseAmp * (1 + holdProgress * 1.5);
      meta._grabbedTargetScale = 1 + amp * Math.sin(this._challengeTime * (8 + holdProgress * 6));
    } else if (proximity > FEEDBACK_THRESHOLDS.NEAR) {
      meta._grabbedTargetGlowHex = 0x88ff00;
      meta._grabbedTargetGlowAlpha = this._isMobile ? 0.35 : 0.2;
      meta._grabbedTargetScale = 1;
    } else {
      meta._grabbedTargetGlowHex = 0xffaa00;
      meta._grabbedTargetGlowAlpha = 0.08;
      meta._grabbedTargetScale = 1;
    }

    // Update the aim guide line + drop-zone ring for visual feedback.
    this._updateAimGuide();
  }

  /**
   * Returns a high-level description of the current grab state, so the
   * WorkshopController can show a kid-friendly hint ("DROP HERE!",
   * "¡ESTA NO ES!", "ACÉRCATE MÁS"). Returns null if no part is grabbed.
   *
   * @returns {{ state: string, dist: number, partId: string } | null}
   */
  getSnapState() {
    if (!this.grabbedPart) return null;
    const meta = this.grabbedPart.metadata;
    const target = meta.targetPosition;
    const dx = this.grabbedPart.position.x - target.x;
    const dy = this.grabbedPart.position.y - target.y;
    const dist = Math.hypot(dx, dy);
    const isCorrect = meta.isCorrectOrder !== false;

    if (!isCorrect) {
      return { state: 'wrong', dist, partId: meta.partId };
    }
    if (dist <= SNAP_THRESHOLD) {
      return { state: 'ready', dist, partId: meta.partId };
    }
    if (dist <= 6.0) {
      return { state: 'close', dist, partId: meta.partId };
    }
    if (dist <= SOFT_SNAP_RANGE) {
      return { state: 'near', dist, partId: meta.partId };
    }
    return { state: 'far', dist, partId: meta.partId };
  }

  /**
   * Release the grabbed part.
   *
   * Three concentric ranges around the target socket:
   *   1. dist <= SNAP_THRESHOLD  → instant snap, snap the part into place.
   *   2. dist <= SOFT_SNAP_RANGE → soft snap: animate the part along an
   *      arc into the socket, then commit it. Forgiving for kids whose
   *      hand wasn't perfectly on the socket at the moment of release.
   *   3. dist >  SOFT_SNAP_RANGE → return the part to its exploded
   *      position (with a small bounce).
   *
   * In all "close enough" cases, the order must still be correct — we
   * never let the child assemble out of sequence, the soft snap is only
   * a positional assist.
   *
   * @returns {string|null} The partId if snapped, null otherwise.
   */
  releaseGrabbed() {
    if (!this.grabbedPart) return null;

    const part = this.grabbedPart;
    const meta = part.metadata;
    const partId = meta.partId;
    meta.isGrabbed = false;
    this.grabbedPart = null;
    // Note: we intentionally DON'T hard-reset scaling/glow here.
    // The update loop will lerp them back to the appropriate idle
    // targets (1.0 scale, dim cyan/yellow glow) over ~80ms. A hard
    // snap is jarring — the smooth lerp feels like the part "settles"
    // back into its idle state.

    // Clear the grabbed targets so the update loop falls through to
    // the idle/active branch logic.
    meta._grabbedTargetScale = undefined;
    meta._grabbedTargetGlowAlpha = undefined;
    meta._grabbedTargetGlowHex = undefined;

    // Reset glow (will be re-set by update or _returnPart).
    meta.glowMesh.material.alpha = 0;

    // Hide the aim guide line + drop-zone ring + countdown ring —
    // the part is no longer being held.
    if (this._aimGuide) this._aimGuide.setEnabled(false);
    if (this._dropZoneRing) this._dropZoneRing.setEnabled(false);
    if (this._countdownRing) this._countdownRing.setEnabled(false);

    const target = meta.targetPosition;
    // 2D screen-plane distance (ignore Z) so the snap works regardless of
    // the part's exploded Z offset.
    const dx = part.position.x - target.x;
    const dy = part.position.y - target.y;
    const dist = Math.hypot(dx, dy);

    // Far away: just send the part back.
    if (dist > SOFT_SNAP_RANGE) {
      this._returnPart(part);
      return null;
    }

    // Must be the next-in-order part. Wrong-order parts NEVER
    // snap back to their original position. The kid should be
    // free to move any wrong piece anywhere — close to a wrong
    // slot, far away, anywhere — to "park" it out of the way.
    // We give feedback (red flash + side-to-side shake) so they
    // know it's the wrong piece, but we do NOT teleport the part
    // back to its home exploded offset. The part stays where
    // dropped; we rebase the idle float to the new Y so it bobs
    // in place.
    if (meta.partData.order !== this._nextOrder) {
      // Visual feedback: red flash + shake. The shake reads as
      // "no!" without yanking the part away. The part stays
      // exactly where the kid dropped it.
      this._flashInvalidDrop(part, 'wrong-order');
      const origX = part.position.x;
      gsap.to(part.position, {
        keyframes: [
          { x: origX - 0.3, duration: 0.06 },
          { x: origX + 0.3, duration: 0.06 },
          { x: origX - 0.2, duration: 0.06 },
          { x: origX + 0.2, duration: 0.06 },
          { x: origX, duration: 0.06 },
        ],
        ease: 'power2.inOut',
      });
      // Rebase idle float to the new position so the parked part
      // bobs in place instead of teleporting back to its origin.
      if (meta._floatAnim) {
        meta._floatAnim.baseY = part.position.y;
        meta._floatAnim.time = 0;
      }
      return null;
    }

    // Close enough to commit. Either an instant snap (if within the
    // strict threshold) or a soft "glide" (within the soft range).
    if (dist <= SNAP_THRESHOLD) {
      this._snapPart(part);
    } else {
      this._softSnapPart(part, dist);
    }
    return partId;
  }

  /**
   * Force release (e.g. hand lost for a frame, or mode switch).
   *
   * Tries to behave like a real release: if the part is close enough to
   * the target AND the order is correct, it snaps. Otherwise it returns
   * to the exploded position. This prevents MediaPipe hiccups from
   * yanking the part back when the kid was already in a good drop pose.
   */
  forceRelease() {
    if (!this.grabbedPart) return;
    // Delegate to releaseGrabbed so the snap / soft-snap / return logic
    // is identical to a normal pinch release.
    this.releaseGrabbed();
  }

  /**
   * Raycast against unlocked part meshes for precise hit detection.
   *
   * @param {import('@babylonjs/core').Ray} ray
   * @returns {{ group: TransformNode, point: Vector3 } | null}
   */
  hitTest(ray) {
    if (this.state !== AssemblyState.ASSEMBLING) return null;

    // Filter to unlocked, not-yet-grabbed, not-yet-placed groups.
    const candidateGroups = this.parts.filter((p) => {
      const m = p.metadata;
      if (m.isAssembled || m.isGrabbed) return false;
      return this._partStates.get(m.partId) === PartState.UNLOCKED;
    });
    if (candidateGroups.length === 0) return null;

    const predicate = (mesh) => {
      if (!mesh.isPickable) return false;
      const md = mesh.metadata;
      return md && md.isAssemblyPart === true && candidateGroups.indexOf(md.group) !== -1;
    };

    const pickResult = this.scene.pickWithRay(ray, predicate);
    if (pickResult && pickResult.hit && pickResult.pickedMesh) {
      return {
        group: pickResult.pickedMesh.metadata.group,
        point: pickResult.pickedPoint,
      };
    }
    return null;
  }

  /**
   * Grab a part directly (mouse fallback path).
   * @param {TransformNode} partGroup
   */
  grabPart(partGroup) {
    if (!partGroup) return false;
    const meta = partGroup.metadata;
    if (meta.isAssembled) return false;
    const state = this._partStates.get(meta.partId);
    if (state !== PartState.UNLOCKED) return false;

    meta.isGrabbed = true;
    meta.isCorrectOrder = meta.partData.order === this._nextOrder;
    this.grabbedPart = partGroup;
    this.grabOffset.set(0, 0, 0);
    this._setPartOpacity(partGroup, 0.95);
    this._setMainEmissiveIntensity(partGroup, meta.partData.emissiveIntensity * 1.5);
    return true;
  }

  /* ---- Challenge system ---- */

  /**
   * Unlock a part after its math challenge is solved.
   * @param {string} partId
   */
  unlockPart(partId) {
    if (this._partStates.get(partId) !== PartState.CHALLENGE) return;

    this._partStates.set(partId, PartState.UNLOCKED);
    this._activeChallengeId = null;

    const part = this.parts.find((p) => p.metadata.partId === partId);
    if (part) {
      // Flash effect on unlock.
      const flashMat = part.metadata.mainMesh.material;
      const origEmi = flashMat.emissiveIntensity ?? 0;
      gsap.to(flashMat, {
        emissiveIntensity: origEmi * 4,
        duration: 0.1,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          flashMat.emissiveIntensity = origEmi;
        },
      });
      // Green glow to indicate ready to grab.
      this._setGlowColor(part, 0x00ff44);
      part.metadata.glowMesh.material.alpha = 0.12;
    }
  }

  /**
   * Get the current challenge data for a part.
   * @param {string} partId
   * @returns {object|null}
   */
  getChallenge(partId) {
    return this._challenges.get(partId) || null;
  }

  /**
   * Advance the active-order counter to the smallest not-yet-placed order.
   * Updates socket visuals so only the next slot glows.
   */
  _advanceNextOrder() {
    const remaining = this.parts
      .filter((p) => this._partStates.get(p.metadata.partId) !== PartState.PLACED)
      .map((p) => p.metadata.partData.order);
    this._nextOrder = remaining.length > 0 ? Math.min(...remaining) : Infinity;
    this._refreshActiveReceptacle();
  }

  /**
   * Update receptacle visuals: only the next-in-order slot lights up; all
   * other slots stay dim outlines.
   */
  _refreshActiveReceptacle() {
    this._orderActiveFor = null;
    for (const [partId, socket] of this._receptacles.entries()) {
      if (!socket || !socket.metadata) continue;
      const part = this.parts.find((p) => p.metadata.partId === partId);
      if (!part) continue;
      const state = this._partStates.get(partId);
      const isActive = state !== PartState.PLACED && part.metadata.partData.order === this._nextOrder;
      const mat = socket.metadata.material;
      if (state === PartState.PLACED) {
        // Hide placed sockets entirely.
        socket.setEnabled(false);
        continue;
      }
      socket.setEnabled(true);
      if (isActive) {
        mat.alpha = 0.55;
        this._orderActiveFor = partId;
        // Also mark the part itself so the renderer can pulse it.
        if (part && part.metadata) {
          part.metadata.isActiveOrder = true;
        }
      } else {
        mat.alpha = 0.12;
        if (part && part.metadata) {
          part.metadata.isActiveOrder = false;
        }
      }
    }
  }

  /**
   * Flash a part red and return it to its starting position. Used when the
   * child drops a part that is not the next-in-order one.
   */
  _flashInvalidDrop(part, reason) {
    this._invalidDropTime = 0.4;
    const meta = part.metadata;
    const mat = meta.mainMesh.material;
    const origEmi = mat.emissiveIntensity ?? 0;
    const origColor = mat.emissiveColor ? mat.emissiveColor.clone() : null;
    const c = color3FromHex(0xff2244);
    mat.emissiveColor = c;
    mat.emissiveIntensity = origEmi * 3;
    gsap.to(mat, {
      emissiveIntensity: origEmi,
      duration: 0.3,
      delay: 0.1,
      onComplete: () => {
        if (origColor) mat.emissiveColor = origColor;
      },
    });
    this._returnPart(part);
    // Audio: error sound (HU-52 wrong piece)
    this._playSound('error');
    if (this.onInvalidDrop) {
      try { this.onInvalidDrop(meta.partId, reason); } catch (e) { /* ignore */ }
    }
  }

  /* ---- Private helpers ---- */

  _snapPart(part) {
    const meta = part.metadata;
    meta.isAssembled = true;
    this.assembledCount++;
    this._partStates.set(meta.partId, PartState.PLACED);

    // Snap animation: if the part is already at the target (auto-snap
    // with pull-lock), the tween is a no-op. If it's still slightly
    // off, the tween is short and smooth. Either way, the part ends
    // up EXACTLY at targetPosition.
    const dx = part.position.x - meta.targetPosition.x;
    const dy = part.position.y - meta.targetPosition.y;
    const dz = part.position.z - meta.targetPosition.z;
    const remainDist = Math.hypot(dx, dy, dz);
    // Duration scales with remaining distance: already-at-target = 0.05s
    // (just a tiny "settle"), 3u away = 0.35s glide.
    const snapDur = Math.min(0.35, 0.05 + remainDist * 0.10);
    gsap.to(part.position, {
      x: meta.targetPosition.x,
      y: meta.targetPosition.y,
      z: meta.targetPosition.z,
      duration: snapDur,
      ease: 'power2.out',
    });

    // Settle bounce: a quick scale punch when the part lands. The part
    // briefly grows to 1.18× then settles to 1.0 with an elastic
    // overshoot — feels like the piece "clicks" into the socket.
    // This is the most satisfying feedback the kid gets.
    gsap.fromTo(
      part.scaling,
      { x: 0.7, y: 0.7, z: 0.7 },
      {
        x: 1, y: 1, z: 1,
        duration: 0.55,
        ease: 'elastic.out(1, 0.55)',
      },
    );

    // Snap feedback: expanding ring at the snap point + bright flash on the
    // part body. Tells the child "yes! that one snapped in correctly".
    this._spawnSnapRing(meta.targetPosition, meta.partData.peg);
    this._spawnSnapParticles(meta.targetPosition, meta.partData.peg);

    // Audio: snap sound (HU-51)
    this._playSound('snap');

    const flashMat = meta.mainMesh.material;
    const origEmissive = flashMat.emissiveIntensity ?? 0;
    gsap.to(flashMat, {
      emissiveIntensity: origEmissive * 3.5,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        flashMat.emissiveIntensity = origEmissive;
      },
    });

    // Same flash on all detail sub-meshes so the whole piece glows.
    if (meta.partMeshes) {
      for (let i = 1; i < meta.partMeshes.length; i++) {
        const m = meta.partMeshes[i].material;
        if (!m) continue;
        const o = m.emissiveIntensity ?? 0;
        gsap.to(m, {
          emissiveIntensity: o * 3.5,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          onComplete: () => { m.emissiveIntensity = o; },
        });
      }
    }

    // Fade the body down to the placed opacity (with a small delay so the
    // flash reads first).
    gsap.to(flashMat, {
      alpha: 0.4,
      duration: 0.5,
      delay: 0.3,
    });

    this._stopIdleFloat(part);

    // Hide glow on placed part.
    meta.glowMesh.material.alpha = 0;

    // Performance: a placed part never moves again, so freeze its world
    // matrix and stop syncing the bounding info on every frame. This skips
    // a chunk of per-frame transform work for every assembled piece.
    if (meta.partMeshes) {
      for (const m of meta.partMeshes) {
        m.freezeWorldMatrix();
      }
      meta.wireMesh.freezeWorldMatrix();
      meta.glowMesh.setEnabled(false);
    }

    if (this.onPartAssembled) {
      this.onPartAssembled(meta.partId, this.assembledCount, this.totalParts);
    }

    if (this.assembledCount >= this.totalParts) {
      this.state = AssemblyState.COMPLETE;
      if (this.onAssemblyComplete) {
        this.onAssemblyComplete(this.robotLevel);
      }
    } else {
      this._advanceNextOrder();
    }
  }

  /**
   * "Soft" snap: the part is within the soft range but outside the
   * strict threshold. Instead of returning it, we animate the part
   * along a small arc into the socket, then commit it as if it had
   * snapped. This is the forgiving mode for kids whose hand wasn't
   * perfectly on the socket at the moment of release.
   *
   * Duration scales with distance (further = slightly longer glide).
   *
   * @param {TransformNode} part
   * @param {number} dist  2D distance from target at release time
   */
  _softSnapPart(part, dist) {
    const meta = part.metadata;
    const target = meta.targetPosition;
    // Slight arc: a quick dip up before sliding in. Reads as "the part
    // was tossed and lands in the socket" rather than teleporting.
    // Animation tuned for smoothness: longer duration (0.5-0.8s) with
    // power2.in-out for a graceful arc.
    const arcHeight = 0.4;
    const midY = Math.max(part.position.y, target.y) + arcHeight;
    const duration = Math.min(0.8, 0.5 + dist * 0.08);

    // Tween X + Z straight to target. Tween Y along a 2-keyframe arc.
    gsap.to(part.position, {
      x: target.x,
      z: target.z,
      duration,
      ease: 'power2.inOut',
    });
    gsap.to(part.position, {
      y: target.y,
      duration,
      ease: 'power2.inOut',
      keyframes: [{ y: midY }, { y: target.y }],
    });

    // Visual feedback: a soft trail + a snap ring when we arrive.
    const trailColor = meta.partData.peg?.color ?? 0x00ff44;
    this._spawnSnapParticles(target, { color: trailColor }, 4);

    // Audio: soft snap sound (HU-51)
    this._playSound('softSnap');

    gsap.delayedCall(duration, () => {
      // Commit just like _snapPart (skip the per-frame tween of
      // _snapPart since we already animated).
      this._commitSnappedPart(part);
    });
  }

  /**
   * Commit a part as "snapped": update state, fire feedback, advance
   * order. Shared between the strict _snapPart and the soft
   * _softSnapPart (which animates the position itself).
   */
  _commitSnappedPart(part) {
    const meta = part.metadata;
    meta.isAssembled = true;
    this.assembledCount++;
    this._partStates.set(meta.partId, PartState.PLACED);

    // Snap feedback at the target.
    this._spawnSnapRing(meta.targetPosition, meta.partData.peg);
    this._spawnSnapParticles(meta.targetPosition, meta.partData.peg);

    // Flash the body emissive briefly.
    const flashMat = meta.mainMesh.material;
    const origEmissive = flashMat.emissiveIntensity ?? 0;
    gsap.to(flashMat, {
      emissiveIntensity: origEmissive * 3.5,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      onComplete: () => { flashMat.emissiveIntensity = origEmissive; },
    });
    if (meta.partMeshes) {
      for (let i = 1; i < meta.partMeshes.length; i++) {
        const m = meta.partMeshes[i].material;
        if (!m) continue;
        const o = m.emissiveIntensity ?? 0;
        gsap.to(m, {
          emissiveIntensity: o * 3.5,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          onComplete: () => { m.emissiveIntensity = o; },
        });
      }
    }

    gsap.to(flashMat, { alpha: 0.4, duration: 0.5, delay: 0.2 });

    this._stopIdleFloat(part);
    meta.glowMesh.material.alpha = 0;

    if (meta.partMeshes) {
      for (const m of meta.partMeshes) m.freezeWorldMatrix();
      meta.wireMesh.freezeWorldMatrix();
      meta.glowMesh.setEnabled(false);
    }

    if (this.onPartAssembled) {
      this.onPartAssembled(meta.partId, this.assembledCount, this.totalParts);
    }

    if (this.assembledCount >= this.totalParts) {
      this.state = AssemblyState.COMPLETE;
      if (this.onAssemblyComplete) {
        this.onAssemblyComplete(this.robotLevel);
      }
    } else {
      this._advanceNextOrder();
    }
  }

  /**
   * Spawn a one-shot expanding ring at the snap position to give the child
   * clear "you did it!" feedback. The ring is parented to a temporary
   * TransformNode at the target and disposes itself after the animation.
   */
  _spawnSnapRing(targetPos, peg) {
    if (!this.scene) return;
    const { ring, mat } = this._getOrCreateSnapRing();
    ring.position.copyFrom(targetPos);
    ring.scaling.set(1, 1, 1);
    const c = color3FromHex(peg?.color ?? 0x00ff44);
    mat.diffuseColor.copyFrom(c);
    mat.emissiveColor.copyFrom(c);
    mat.alpha = 1.0;
    ring.setEnabled(true);

    const t1 = gsap.to(ring.scaling, {
      x: 4.5, y: 4.5, z: 4.5, duration: 0.6, ease: 'power2.out',
    });
    const t2 = gsap.to(mat, {
      alpha: 0, duration: 0.6, ease: 'power2.out',
      onComplete: () => ring.setEnabled(false),
    });
    this._trackFxTween(t1, t2);
  }

  /**
   * Get or lazily create the shared snap ring (torus + material).
   * Pooling: the same mesh+material is reused across every snap.
   * Reset position/scale/alpha on each spawn.
   */
  _getOrCreateSnapRing() {
    if (!this._fxPool.snapRing) {
      const ring = MeshBuilder.CreateTorus('fx_snapRing', {
        diameter: 0.5, thickness: 0.04, tessellation: 16,
      }, this.scene);
      ring.rotation.x = Math.PI / 2;
      ring.isPickable = false;
      const mat = new StandardMaterial('fx_snapRingMat', this.scene);
      mat.specularColor = new Color3(0, 0, 0);
      mat.disableLighting = true;
      mat.alpha = 0;
      mat.alphaMode = Engine.ALPHA_ADD;
      mat.backFaceCulling = false;
      mat.disableDepthWrite = true;
      ring.material = mat;
      this._fxPool.snapRing = { ring, mat };
    }
    return this._fxPool.snapRing;
  }

  /**
   * Spawn 6 small sphere "particles" that fly out from the snap point and
   * fade. Cheap decoration — no physics, just tweened motion.
   */
  _spawnSnapParticles(targetPos, peg, count = 6) {
    if (!this.scene) return;
    const c = color3FromHex(peg?.color ?? 0x00ff44);
    // Ensure pool has at least `count` particles.
    this._ensureSnapParticles(count);
    for (let i = 0; i < count; i++) {
      const { mesh: p, mat: m } = this._fxPool.snapParticles[i];
      p.position.copyFrom(targetPos);
      m.diffuseColor.copyFrom(c);
      m.emissiveColor.copyFrom(c);
      m.alpha = 1.0;
      p.setEnabled(true);
      const angle = (i / count) * Math.PI * 2;
      const dx = Math.cos(angle) * 1.2;
      const dy = Math.sin(angle) * 1.2 + 0.4;
      const t1 = gsap.to(p.position, {
        x: targetPos.x + dx,
        y: targetPos.y + dy,
        z: targetPos.z,
        duration: 0.6, ease: 'power2.out',
      });
      const t2 = gsap.to(m, {
        alpha: 0, duration: 0.6, ease: 'power2.out',
        onComplete: () => p.setEnabled(false),
      });
      this._trackFxTween(t1, t2);
    }
  }

  /**
   * Brief "you grabbed it!" confirmation burst: an expanding ring +
   * a few particles at the part's current position. Gives the kid
   * immediate positive feedback that the grab registered.
   *
   * Cheaper than the snap burst (fewer particles, shorter duration)
   * because grabs happen more often than snaps.
   */
  _spawnGrabBurst(part) {
    if (!this.scene || !part) return;
    const pos = part.position;
    const c = new Color3(1.0, 0.85, 0.3);
    const { ring, mat } = this._getOrCreateGrabRing();
    ring.position.copyFrom(pos);
    ring.scaling.set(1, 1, 1);
    mat.diffuseColor.copyFrom(c);
    mat.emissiveColor.copyFrom(c);
    mat.alpha = 0.9;
    ring.setEnabled(true);
    const t1 = gsap.to(ring.scaling, { x: 2.2, y: 2.2, z: 2.2, duration: 0.35, ease: 'power2.out' });
    const t2 = gsap.to(mat, {
      alpha: 0, duration: 0.35, ease: 'power2.out',
      onComplete: () => ring.setEnabled(false),
    });
    this._trackFxTween(t1, t2);

    // 4 small particles flying out (pooled).
    this._ensureGrabParticles(4);
    for (let i = 0; i < 4; i++) {
      const { mesh: p, mat: pm } = this._fxPool.grabParticles[i];
      p.position.copyFrom(pos);
      pm.diffuseColor.copyFrom(c);
      pm.emissiveColor.copyFrom(c);
      pm.alpha = 1.0;
      p.setEnabled(true);
      const angle = (i / 4) * Math.PI * 2;
      const t1 = gsap.to(p.position, {
        x: pos.x + Math.cos(angle) * 0.6,
        y: pos.y + Math.sin(angle) * 0.6 + 0.2,
        z: pos.z,
        duration: 0.4, ease: 'power2.out',
      });
      const t2 = gsap.to(pm, {
        alpha: 0, duration: 0.4, ease: 'power2.out',
        onComplete: () => p.setEnabled(false),
      });
      this._trackFxTween(t1, t2);
    }
  }

  _getOrCreateGrabRing() {
    if (!this._fxPool.grabRing) {
      const ring = MeshBuilder.CreateTorus('fx_grabRing', {
        diameter: 0.6, thickness: 0.04, tessellation: 16,
      }, this.scene);
      ring.isPickable = false;
      const mat = new StandardMaterial('fx_grabRingMat', this.scene);
      mat.specularColor = new Color3(0, 0, 0);
      mat.disableLighting = true;
      mat.alpha = 0;
      mat.alphaMode = Engine.ALPHA_ADD;
      mat.disableDepthWrite = true;
      ring.material = mat;
      this._fxPool.grabRing = { ring, mat };
    }
    return this._fxPool.grabRing;
  }

  /**
   * Kill any tweens that were targeting the same FX meshes. Without
   * this, a rapid-fire sequence of grabs (kid keeps grabbing/releasing
   * quickly) would stack tweens on the same mesh, causing the alpha
   * to flicker or scale to jump.
   */
  _trackFxTween(...tweens) {
    for (const t of tweens) {
      if (!t) continue;
      this._fxActiveTweens.push(t);
      t.eventCallback('onComplete', () => {
        const i = this._fxActiveTweens.indexOf(t);
        if (i >= 0) this._fxActiveTweens.splice(i, 1);
      });
    }
  }

  /**
   * Kill all in-flight FX tweens and hide all pooled FX meshes.
   * Called from dispose() so the scene is left clean.
   */
  _resetFxPool() {
    for (const t of this._fxActiveTweens) t.kill();
    this._fxActiveTweens.length = 0;
    if (this._fxPool.snapRing) this._fxPool.snapRing.ring.setEnabled(false);
    if (this._fxPool.grabRing) this._fxPool.grabRing.ring.setEnabled(false);
    for (const { mesh } of this._fxPool.snapParticles) mesh.setEnabled(false);
    for (const { mesh } of this._fxPool.grabParticles) mesh.setEnabled(false);
  }

  /**
   * Pre-warm the shader cache by creating the FX pool meshes hidden
   * (alpha=0, disabled) so Babylon compiles their shaders during the
   * loading animation. Without this, the first snap or grab triggers
   * a 50-150ms shader compile hitch on mobile. Called once from
   * WorkshopController.initialize().
   */
  _prewarmFxPool() {
    // Create both rings via the lazy-init helpers.
    const { ring: snapR, mat: snapM } = this._getOrCreateSnapRing();
    snapR.setEnabled(false);
    snapM.alpha = 0;
    const { ring: grabR, mat: grabM } = this._getOrCreateGrabRing();
    grabR.setEnabled(false);
    grabM.alpha = 0;
    // Pre-create particles by simulating a 0-distance spawn at origin.
    // We need the meshes+materials to exist so their shaders compile;
    // we immediately hide them so they don't render.
    this._ensureSnapParticles(6);
    this._ensureGrabParticles(4);
    for (const { mesh } of this._fxPool.snapParticles) mesh.setEnabled(false);
    for (const { mesh } of this._fxPool.grabParticles) mesh.setEnabled(false);
  }

  _ensureSnapParticles(count) {
    while (this._fxPool.snapParticles.length < count) {
      const p = MeshBuilder.CreateSphere(`fx_snapPart_${this._fxPool.snapParticles.length}`, {
        diameter: 0.12, segments: 6,
      }, this.scene);
      p.isPickable = false;
      const m = new StandardMaterial(`fx_snapPartMat_${this._fxPool.snapParticles.length}`, this.scene);
      m.specularColor = new Color3(0, 0, 0);
      m.disableLighting = true;
      m.alphaMode = Engine.ALPHA_ADD;
      p.material = m;
      this._fxPool.snapParticles.push({ mesh: p, mat: m });
    }
  }

  _ensureGrabParticles(count) {
    while (this._fxPool.grabParticles.length < count) {
      const p = MeshBuilder.CreateSphere(`fx_grabPart_${this._fxPool.grabParticles.length}`, {
        diameter: 0.08, segments: 4,
      }, this.scene);
      p.isPickable = false;
      const pm = new StandardMaterial(`fx_grabPartMat_${this._fxPool.grabParticles.length}`, this.scene);
      pm.specularColor = new Color3(0, 0, 0);
      pm.disableLighting = true;
      pm.alphaMode = Engine.ALPHA_ADD;
      p.material = pm;
      this._fxPool.grabParticles.push({ mesh: p, mat: pm });
    }
  }

  _returnPart(part) {
    const meta = part.metadata;
    const offset = meta.partData.explodedOffset;
    // Smoother, gentler return: longer duration + ease-in-out so the
    // part "drifts" back to its exploded position instead of snapping.
    // Kid gets a less punishing feel when they drop in the wrong place.
    gsap.to(part.position, {
      x: offset.x,
      y: offset.y,
      z: offset.z,
      duration: 0.8,
      ease: 'power2.inOut',
    });
    this._setPartOpacity(part, 0.75);
    this._setMainEmissiveIntensity(part, meta.partData.emissiveIntensity * 0.5);

    const state = this._partStates.get(meta.partId);
    if (state === PartState.LOCKED) {
      this._setGlowColor(part, 0xff8800);
      meta.glowMesh.material.alpha = 0.4;
    } else if (state === PartState.UNLOCKED) {
      this._setGlowColor(part, 0x00ff44);
      meta.glowMesh.material.alpha = 0.12;
    }
  }

  _setPartOpacity(partGroup, opacity) {
    partGroup.metadata.mainMesh.material.alpha = opacity;
  }

  _setMainEmissiveIntensity(partGroup, intensity) {
    partGroup.metadata.mainMesh.material.emissiveIntensity = intensity;
  }

  /**
   * Set the glow mesh's emissive + diffuse color from a 0xRRGGBB hex int.
   * Mirrors the original `material.color.setHex(...)` calls.
   */
  _setGlowColor(partGroup, hex) {
    const c = color3FromHex(hex);
    const mat = partGroup.metadata.glowMesh.material;
    mat.emissiveColor = c;
    mat.diffuseColor = c;
  }

  _startIdleFloat(partGroup, partDef) {
    const baseY = partDef.explodedOffset.y;
    const speed = 0.8 + Math.random() * 0.4;
    const amp = 0.08 + Math.random() * 0.06;
    const phase = Math.random() * Math.PI * 2;

    partGroup.metadata._floatAnim = { baseY, speed, amp, phase, time: 0 };
  }

  _stopIdleFloat(partGroup) {
    if (partGroup.metadata._floatAnim) {
      delete partGroup.metadata._floatAnim;
    }
  }

  /**
   * Per-frame update: idle floats + active-socket pulse.
   */
  update(deltaTime) {
    this._challengeTime += deltaTime;
    this._lastDt = deltaTime;
    if (this._invalidDropTime > 0) this._invalidDropTime = Math.max(0, this._invalidDropTime - deltaTime);

    // Frame-rate-independent lerp factor.
    // At 60fps, deltaTime ≈ 0.0167s. With speed=14: 1 - exp(-0.0167*14) ≈ 0.21
    // → ~21% new + 79% old per frame. Reaches ~95% in ~210ms.
    // That feels "snappy but smooth" — no lag, no snap.
    const lerpT = 1 - Math.exp(-deltaTime * 14);

    for (const part of this.parts) {
      const meta = part.metadata;

      // Idle floating (skip if assembled, grabbed).
      if (!meta.isAssembled && !meta.isGrabbed) {
        const anim = meta._floatAnim;
        if (anim) {
          anim.time += deltaTime;
          part.position.y = anim.baseY + Math.sin(anim.time * anim.speed + anim.phase) * anim.amp;
        }
      }

      // Determine TARGET scale + glow for this frame based on state.
      // Then LERP towards it instead of snapping. This makes hover,
      // pulse, and idle transitions all smooth.
      let targetScale = 1;
      let targetGlowAlpha = 0;
      let targetGlowHex = 0x44ddff;
      let applyGlow = false;

      const isHovered = (this._hoveredPart === part);
      if (meta.isGrabbed) {
        // Grabbed part: scale and glow are set by moveGrabbed each
        // frame. Use the stored targets (defaults to 1.0/0 if not
        // set yet — handles the first frame after grab).
        targetScale = meta._grabbedTargetScale ?? 1;
        targetGlowAlpha = meta._grabbedTargetGlowAlpha ?? 0;
        targetGlowHex = meta._grabbedTargetGlowHex ?? 0x44ddff;
        applyGlow = true;
      } else if (!meta.isAssembled && isHovered) {
        // Hover highlight: white outline + 1.08 scale.
        targetScale = 1.08;
        targetGlowAlpha = 0.50;
        targetGlowHex = 0xffffff;
        applyGlow = true;
      } else if (!meta.isAssembled && meta.isActiveOrder) {
        // Active (next-in-order) part: pulse scale + yellow glow.
        targetScale = 1 + 0.10 * Math.sin(this._challengeTime * 4);
        targetGlowAlpha = 0.35 + 0.15 * Math.sin(this._challengeTime * 4);
        targetGlowHex = 0xffee44;
        applyGlow = true;
      } else if (!meta.isAssembled) {
        // Non-active parts: dim cyan glow, no scale pulse.
        targetScale = 1;
        targetGlowAlpha = 0.10;
        targetGlowHex = 0x44ddff;
        applyGlow = true;
      }

      // Smooth scale lerp.
      const cs = part.scaling;
      const ns = cs.x + (targetScale - cs.x) * lerpT;
      // Skip the set if we're already within 0.001 of the target
      // (avoids unnecessary writes that trigger matrix recompute).
      if (Math.abs(ns - cs.x) > 0.001 || Math.abs(ns - cs.y) > 0.001 || Math.abs(ns - cs.z) > 0.001) {
        part.scaling.set(ns, ns, ns);
      }

      // Smooth glow alpha + color lerp.
      if (applyGlow && meta.glowMesh && meta.glowMesh.material) {
        const cur = meta.glowMesh.material.alpha;
        const na = cur + (targetGlowAlpha - cur) * lerpT;
        meta.glowMesh.material.alpha = na;
        // Color lerp (RGB components separately).
        const tgt = color3FromHex(targetGlowHex);
        const ec = meta.glowMesh.material.emissiveColor;
        ec.r += (tgt.r - ec.r) * lerpT;
        ec.g += (tgt.g - ec.g) * lerpT;
        ec.b += (tgt.b - ec.b) * lerpT;
      }
    }

    // Pulse the active receptacle so the child knows which slot is "next".
    // When the correct part is being held AND in range, the receptacle
    // glows much brighter and pulses faster — a clear "drop here now!" cue.
    if (this._orderActiveFor) {
      const socket = this._receptacles.get(this._orderActiveFor);
      if (socket && socket.metadata) {
        let pulse;
        if (this.grabbedPart
            && this.grabbedPart.metadata.partData.order === this._nextOrder
            && this.grabbedPart.metadata.isCorrectOrder !== false) {
          // "Drop here now!" — bright, fast pulse
          pulse = 0.75 + Math.sin(this._challengeTime * 6) * 0.25;
          socket.metadata.material.emissiveColor = color3FromHex(0x00ff66);
        } else {
          // "This is the next slot" — gentle pulse
          pulse = 0.45 + Math.sin(this._challengeTime * 3) * 0.18;
        }
        socket.metadata.material.alpha = pulse;
        // Slow rotation around the up axis for extra "look here" cue.
        socket.rotation.y += deltaTime * 0.6;
      }
    }

    // Auto-snap fallback: if the kid holds the correct part in the soft-
    // snap range for too long (0.5s on mobile, 0.35s on desktop), release
    // it automatically. This rescues kids who can't get the "open
    // fingers" gesture right, or whose hand keeps flickering out of
    // MediaPipe's detection. The timer is short on purpose: with the
    // strong magnetic pull (see moveGrabbed), the part glides into
    // place quickly, and a 0.35-0.5s hold is enough to commit.
    if (this.grabbedPart) {
      const part = this.grabbedPart;
      const meta = part.metadata;
      const target = meta.targetPosition;
      const dx = part.position.x - target.x;
      const dy = part.position.y - target.y;
      const dist = Math.hypot(dx, dy);
      const inRange = dist <= SOFT_SNAP_RANGE && meta.partData.order === this._nextOrder;
      if (inRange) {
        this._holdInRangeTime = (this._holdInRangeTime || 0) + deltaTime;
        const threshold = this._isMobile ? 0.5 : 0.35;
        if (this._holdInRangeTime >= threshold) {
          // Auto-release — releaseGrabbed handles snap/soft-snap/return.
          this.releaseGrabbed();
        }
      } else {
        this._holdInRangeTime = 0;
      }
    } else {
      this._holdInRangeTime = 0;
    }

    // Countdown ring: orbits the grabbed part and fills up as the
    // auto-snap timer counts down. Gives the kid a clear "suelta ya!"
    // visual countdown. Color shifts from yellow → green as it fills.
    // Scale and alpha are LERPED smoothly so the ring grows/fades
    // gracefully rather than snapping.
    if (this._countdownRing && this.grabbedPart) {
      const part = this.grabbedPart;
      const meta = part.metadata;
      const isCorrect = meta.isCorrectOrder !== false;
      if (isCorrect) {
        const target = meta.targetPosition;
        const dx = part.position.x - target.x;
        const dy = part.position.y - target.y;
        const dist = Math.hypot(dx, dy);
        const inRange = dist <= SOFT_SNAP_RANGE && meta.partData.order === this._nextOrder;
        if (inRange) {
          const threshold = this._isMobile ? 0.5 : 0.35;
          const progress = Math.min(1, (this._holdInRangeTime || 0) / threshold);
          // Position the ring around the grabbed part, slightly
          // behind it so it doesn't z-fight with the part itself.
          this._countdownRing.position.set(part.position.x, part.position.y, part.position.z - 0.08);
          // Scale grows as the timer fills (1.0 → 1.4), LERPED.
          const targetScale = 1.0 + 0.4 * progress;
          const cs = this._countdownRing.scaling;
          const ns = cs.x + (targetScale - cs.x) * lerpT;
          this._countdownRing.scaling.set(ns, ns, ns);
          // Alpha: fade in quickly, then pulse faster as it fills.
          this._countdownMat.alpha = 0.35 + 0.45 * progress + 0.12 * Math.sin(this._challengeTime * (4 + progress * 6));
          // Color: yellow → green as progress increases.
          this._countdownMat.emissiveColor.set(
            1.0 - 0.8 * progress,
            0.85 + 0.15 * progress,
            0.2 + 0.2 * progress,
          );
          this._countdownRing.setEnabled(true);
        } else {
          // Out of range — hide ring.
          if (this._countdownRing.isEnabled()) this._countdownRing.setEnabled(false);
        }
      } else {
        // Wrong-order part — no countdown.
        if (this._countdownRing.isEnabled()) this._countdownRing.setEnabled(false);
      }
    } else if (this._countdownRing && this._countdownRing.isEnabled()) {
      this._countdownRing.setEnabled(false);
    }
  }

  _createGhostOutline(blueprint) {
    const ghost = new TransformNode('assemblyGhost', this.scene);
    ghost.setEnabled(false);

    for (const partDef of blueprint.parts) {
      const g = partDef.geometry;
      let mesh;
      if (g.type === 'sphere') {
        mesh = MeshBuilder.CreateSphere(
          `ghost_${partDef.id}`,
          { diameter: g.r * 2 * 1.1, segments: 12 },
          this.scene,
        );
      } else {
        mesh = MeshBuilder.CreateBox(
          `ghost_${partDef.id}`,
          { width: g.w * 1.05, height: g.h * 1.05, depth: g.d * 1.05 },
          this.scene,
        );
      }
      mesh.position.set(partDef.position.x, partDef.position.y, partDef.position.z);
      mesh.parent = ghost;
      mesh.isPickable = false;

      const mat = new StandardMaterial(`ghost_${partDef.id}_mat`, this.scene);
      mat.wireframe = true;
      mat.diffuseColor = new Color3(0.4, 1, 1);
      mat.emissiveColor = new Color3(0.4, 1, 1);
      mat.specularColor = new Color3(0, 0, 0);
      mat.disableLighting = true;
      // Brighter alpha + normal alpha blend so the wireframe ghost
      // is clearly visible. The previous 0.22 + ALPHA_ADD on a dark
      // navy background was nearly invisible.
      mat.alpha = 0.55;
      mat.backFaceCulling = false;
      mesh.material = mat;
    }

    this.ghostGroup = ghost;

    gsap.delayedCall(0.25, () => {
      if (!this.ghostGroup) return;
      this.ghostGroup.setEnabled(true);
      this.ghostGroup.getChildMeshes().forEach((child) => {
        if (child.material) {
          const target = child.material.alpha;
          child.material.alpha = 0;
          gsap.to(child.material, { alpha: target, duration: 0.6 });
        }
      });
    });
  }

  _removeGhostOutline() {
    if (this.ghostGroup) {
      this.ghostGroup.getChildMeshes().forEach((child) => {
        if (child.material) child.material.dispose();
        child.dispose();
      });
      this.ghostGroup.dispose();
      this.ghostGroup = null;
    }
  }

  /**
   * Create the aim guide (a glowing line that connects the grabbed
   * part to its target socket) and the drop-zone ring (a larger
   * pulsing ring around the active socket). Both start hidden; they
   * become visible in `_updateAimGuide` when the kid holds the
   * correct next-in-order part.
   */
  _createAimGuide() {
    // Aim guide: a glowing TUBE that gets recreated every frame in
    // _updateAimGuide. A tube is much more visible than a 1px line
    // (especially on mobile), and its radius can grow as the part
    // gets closer to the target — a subtle "you're almost there!"
    // affordance.
    this._aimGuideMat = new StandardMaterial('aimGuideMat', this.scene);
    this._aimGuideMat.emissiveColor = new Color3(0.0, 1.0, 0.5);
    this._aimGuideMat.diffuseColor = new Color3(0, 0, 0);
    this._aimGuideMat.specularColor = new Color3(0, 0, 0);
    this._aimGuideMat.disableLighting = true;
    this._aimGuideMat.alpha = 0.9;
    this._aimGuideMat.alphaMode = Engine.ALPHA_ADD;
    this._aimGuideMat.disableDepthWrite = true;
    this._aimGuideMat.backFaceCulling = false;
    // Placeholder (will be recreated as a Tube each frame). Using a
    // zero-length line here so dispose() works correctly on first frame.
    this._aimGuide = CreateLineSystem(
      'aimGuide',
      { lines: [[new Vector3(0, 0, 0), new Vector3(0, 0, 0)]] },
      this.scene,
    );
    this._aimGuide.isPickable = false;
    this._aimGuide.setEnabled(false);
    this._aimGuide.renderingGroupId = 1;

    // Drop-zone ring: a thin glowing torus around the active target.
    // Diameter is 2x the SNAP_THRESHOLD so it shows the full snap zone.
    // The ring pulses brighter as the part gets closer.
    // Drop zone ring: thicker and brighter for mobile visibility.
    // diameter 7.0u shows the full snap zone, thickness 0.14 makes it
    // ~2× more visible on small screens. Billboard mode makes the
    // ring always face the camera as a perfect circle, regardless
    // of camera angle (important on mobile where the camera might
    // be tilted or at a different distance).
    const ringDiameter = Math.min(SNAP_THRESHOLD * 2.0, 7.0);
    this._dropZoneRing = MeshBuilder.CreateTorus(
      'dropZoneRing',
      { diameter: ringDiameter, thickness: 0.14, tessellation: 64 },
      this.scene,
    );
    this._dropZoneRing.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    this._dropZoneRing.isPickable = false;
    this._dropZoneMat = new StandardMaterial('dropZoneMat', this.scene);
    this._dropZoneMat.emissiveColor = new Color3(0.0, 1.0, 0.4);
    this._dropZoneMat.diffuseColor = new Color3(0, 0, 0);
    this._dropZoneMat.specularColor = new Color3(0, 0, 0);
    this._dropZoneMat.disableLighting = true;
    this._dropZoneMat.alpha = 0;
    this._dropZoneMat.alphaMode = Engine.ALPHA_ADD;
    this._dropZoneMat.disableDepthWrite = true;
    this._dropZoneMat.backFaceCulling = false;
    this._dropZoneRing.material = this._dropZoneMat;
    this._dropZoneRing.setEnabled(false);
    this._dropZoneRing.renderingGroupId = 1;

    // Countdown ring: orbits the GRABBED part (not the target) and
    // fills up as the auto-snap timer counts down. Thicker (0.10) and
    // larger diameter (1.8) for better mobile visibility. Billboard
    // mode so the ring always faces the camera as a clear circle.
    this._countdownRing = MeshBuilder.CreateTorus(
      'countdownRing',
      { diameter: 1.8, thickness: 0.10, tessellation: 48 },
      this.scene,
    );
    this._countdownRing.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    this._countdownRing.isPickable = false;
    this._countdownMat = new StandardMaterial('countdownMat', this.scene);
    this._countdownMat.diffuseColor = new Color3(0, 0, 0);
    this._countdownMat.emissiveColor = new Color3(1.0, 1.0, 0.2);
    this._countdownMat.specularColor = new Color3(0, 0, 0);
    this._countdownMat.disableLighting = true;
    this._countdownMat.alpha = 0;
    this._countdownMat.alphaMode = Engine.ALPHA_ADD;
    this._countdownMat.disableDepthWrite = true;
    this._countdownMat.backFaceCulling = false;
    this._countdownRing.material = this._countdownMat;
    this._countdownRing.setEnabled(false);
    this._countdownRing.renderingGroupId = 1;
  }

  /**
   * Update the aim guide line + drop-zone ring based on the grabbed
   * part's distance to its target. Called every frame from moveGrabbed.
   * Hidden when no part is grabbed or the part is the wrong order.
   */
  _updateAimGuide() {
    if (!this._aimGuide || !this._dropZoneRing) return;

    // Determine if the guide SHOULD be visible this frame.
    let shouldShow = false;
    let dist = 0;
    let target = null;
    let partPos = null;
    if (this.grabbedPart) {
      const meta = this.grabbedPart.metadata;
      const isCorrect = meta.isCorrectOrder !== false;
      if (isCorrect) {
        target = meta.targetPosition;
        partPos = this.grabbedPart.position;
        const dx = partPos.x - target.x;
        const dy = partPos.y - target.y;
        dist = Math.hypot(dx, dy);
        shouldShow = true;
      }
    }

    // Smoothly lerp the visibility factor (0 = hidden, 1 = shown).
    // Using deltaTime-aware lerp so the fade is frame-rate independent.
    const dt = this._lastDt || 0.0167;
    const lerpT = 1 - Math.exp(-dt * 16); // ~120ms to reach 95%
    const targetVis = shouldShow ? 1 : 0;
    this._aimGuideVis = (this._aimGuideVis || 0) + (targetVis - (this._aimGuideVis || 0)) * lerpT;
    const vis = this._aimGuideVis;

    // Hide entirely when fully faded out (saves rendering).
    if (vis < 0.01) {
      if (this._aimGuide.isEnabled()) this._aimGuide.setEnabled(false);
      if (this._dropZoneRing.isEnabled()) this._dropZoneRing.setEnabled(false);
      return;
    }

    if (target && partPos) {
      // Position the drop-zone ring at the target socket.
      this._dropZoneRing.position.set(target.x, target.y, target.z - 0.05);
      this._dropZoneRing.rotation.x = 0;
      this._dropZoneRing.rotation.y = 0;
      // Pulse: brighter when closer to target. Multiplied by vis for
      // smooth fade-in/out instead of snap on/off.
      const closeness = Math.max(0, 1 - dist / SOFT_SNAP_RANGE);
      this._dropZoneMat.alpha = (0.25 + 0.65 * closeness + 0.10 * Math.sin(this._challengeTime * 4)) * vis;
      this._dropZoneMat.emissiveColor.set(
        0.0,
        1.0,
        0.3 + 0.4 * closeness,
      );
      if (!this._dropZoneRing.isEnabled()) this._dropZoneRing.setEnabled(true);
    }

    // Aim guide line: from part to target. Recreate every frame (cheap).
    if (this._aimGuide) {
      this._aimGuide.dispose();
    }
    if (target && partPos) {
      const start = new Vector3(partPos.x, partPos.y, part.position.z - 0.05);
      const end = new Vector3(target.x, target.y, target.z - 0.05);
      const lineAlpha = (0.9 - 0.6 * Math.min(1, dist / SOFT_SNAP_RANGE)) * vis;
      // Thicker glowing tube — radius scales 0.12 → 0.18 with closeness
      // to the target. On mobile, the kid is far from the screen and
      // a thin tube would be hard to see; the previous 0.06-0.10
      // radius was still too thin on small displays.
      const closeness = Math.max(0, 1 - dist / SOFT_SNAP_RANGE);
      const tubeRadius = 0.12 + 0.06 * closeness;
      this._aimGuide = CreateTube(
        'aimGuide',
        { path: [start, end], radius: tubeRadius, tessellation: 8, cap: 0 },
        this.scene,
      );
      this._aimGuide.material = this._aimGuideMat;
      this._aimGuide.isPickable = false;
      this._aimGuide.renderingGroupId = 1;
      this._aimGuideMat.alpha = lineAlpha;
      // Color shifts toward brighter green as the part gets closer.
      this._aimGuideMat.emissiveColor.set(
        0.0,
        0.7 + 0.3 * closeness,
        0.3 + 0.4 * closeness,
      );
    }
  }

  _disposeAimGuide() {
    if (this._aimGuide) {
      this._aimGuide.dispose();
      this._aimGuide = null;
    }
    if (this._aimGuideMat) {
      this._aimGuideMat.dispose();
      this._aimGuideMat = null;
    }
    if (this._dropZoneRing) {
      this._dropZoneRing.dispose();
      this._dropZoneRing = null;
    }
    if (this._dropZoneMat) {
      this._dropZoneMat.dispose();
      this._dropZoneMat = null;
    }
    if (this._countdownRing) {
      this._countdownRing.dispose();
      this._countdownRing = null;
    }
    if (this._countdownMat) {
      this._countdownMat.dispose();
      this._countdownMat = null;
    }
  }

  /**
   * Dispose a single part TransformNode and all of its descendant meshes
   * and materials. Safe to call multiple times.
   */
  _disposePartNode(partGroup) {
    partGroup.getChildMeshes().forEach((child) => {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      child.dispose();
    });
    partGroup.dispose();
  }

  dispose() {
    this.stopAssembly();
  }
}
