/**
 * @fileoverview Animated technological atmosphere for the workshop.
 *
 * Adds motion behind the schematic:
 *   1. Drifting cyan particle dust (sparse, "data flow" feel)
 *   2. Wireframe geometric shapes (icosahedrons, dodecahedrons, torus
 *      knots) that rotate and bob around the schematic at different
 *      depths and phases
 *   3. Volumetric-style light cones from above (soft "spotlight" beams)
 *
 * Mobile budget: particles and shapes are reduced; light cones and
 * thin-instanced particles are skipped on devices that may not support
 * them. Each builder is wrapped in a try/catch so a single failure
 * never breaks the rest of the workshop.
 *
 * @module iron-man-workshop/components/WorkshopAtmosphere
 */

import {
  Color3,
  Engine,
  Matrix,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
} from '@babylonjs/core';

export class WorkshopAtmosphere {
  constructor(scene, isMobile = false) {
    this.scene = scene;
    this._isMobile = isMobile;
    this.root = new TransformNode('workshopAtmosphere', scene);

    this._materials = [];
    this._shapes = [];
    this._particles = null;
    this._time = 0;

    // Each builder is wrapped in its own try/catch: if a builder fails
    // (e.g. thin-instance support is missing on this device), the rest
    // of the workshop still works.
    this._safeBuild(() => this._buildParticles(), 'particles');
    this._safeBuild(() => this._buildShapes(), 'shapes');
    this._safeBuild(() => this._buildLightCones(), 'lightCones');
  }

  _safeBuild(fn, label) {
    try {
      fn();
    } catch (err) {
      console.warn(`[WorkshopAtmosphere] ${label} build failed:`, err);
    }
  }

  /**
   * Per-frame animation tick.
   * @param {number} deltaTime in seconds
   */
  update(deltaTime) {
    this._time += deltaTime;

    for (let i = 0; i < this._shapes.length; i++) {
      const s = this._shapes[i];
      s.mesh.rotation.x += deltaTime * s.spin.x;
      s.mesh.rotation.y += deltaTime * s.spin.y;
      s.mesh.rotation.z += deltaTime * s.spin.z;
      s.mesh.position.y = s.baseY + Math.sin(this._time * s.bobSpeed + s.bobPhase) * 0.45;
      s.mesh.position.x = s.baseX + Math.cos(this._time * s.driftSpeed + s.driftPhase) * s.driftRadius;
      const pulse = 0.55 + 0.45 * Math.sin(this._time * s.pulse + s.pulsePhase);
      s.mesh.material.emissiveColor = s.baseColor.scale(pulse);
    }

    if (this._particles) {
      this._particles.parent.rotation.y = this._time * 0.04;
      this._particles.parent.position.y = 0.4 + Math.sin(this._time * 0.25) * 0.3;
    }
  }

  setVisible(visible) {
    this.root.setEnabled(visible);
  }

  dispose() {
    for (const m of this._materials) m.dispose();
    this._materials = [];
    for (const s of this._shapes) s.mesh.dispose();
    this._shapes = [];
    if (this._particles) { this._particles.dispose(); this._particles = null; }
    this.root.dispose();
  }

  // ----------------- private builders -----------------

  _buildParticles() {
    // On mobile, skip the instanced particle field — it can hang on
    // some devices (thin-instance buffer is WebGL2 / extension-dependent)
    // and visually the dust adds little to the small mobile viewport.
    if (this._isMobile) return;

    const proto = MeshBuilder.CreateSphere('atmoParticle', { diameter: 0.07, segments: 6 }, this.scene);
    const mat = new StandardMaterial('atmoParticleMat', this.scene);
    mat.emissiveColor = new Color3(0.45, 0.95, 1.0);
    mat.diffuseColor = new Color3(0, 0, 0);
    mat.specularColor = new Color3(0, 0, 0);
    mat.disableLighting = true;
    mat.alpha = 0.9;
    mat.alphaMode = Engine.ALPHA_ADD;
    mat.disableDepthWrite = true;
    this._materials.push(mat);
    proto.material = mat;
    proto.isPickable = false;

    const PARTICLE_COUNT = 180;
    const matrices = new Float32Array(PARTICLE_COUNT * 16);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const m = Matrix.Identity();
      const r = 4 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 12 + 1;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r - 2;
      Matrix.TranslationToRef(x, y, z, m);
      m.copyToArray(matrices, i * 16);
    }
    proto.thinInstanceSetBuffer('matrix', matrices, 16, true);
    proto.parent = this.root;
    this._particles = proto;
  }

  _buildShapes() {
    // 3 shapes on mobile (saves draw calls), 6 on desktop
    const DEFS = [
      { kind: 'icosahedron', size: 1.2, spin: [0.08, 0.13, 0.05], color: new Color3(0, 0.7, 0.95) },
      { kind: 'dodecahedron', size: 0.95, spin: [0.05, 0.18, 0.04], color: new Color3(0, 0.9, 0.7) },
      { kind: 'torusKnot', size: 0.55, spin: [0.10, 0.06, 0.14], color: new Color3(0.3, 0.6, 1.0) },
      { kind: 'octahedron', size: 0.85, spin: [0.14, 0.08, 0.06], color: new Color3(0, 0.8, 0.85) },
      { kind: 'icosahedron', size: 0.7, spin: [0.20, 0.12, 0.18], color: new Color3(0.4, 0.9, 0.7) },
      { kind: 'torusKnot', size: 0.4, spin: [0.16, 0.10, 0.22], color: new Color3(0, 0.6, 0.95) },
    ];
    const count = this._isMobile ? 3 : DEFS.length;

    for (let i = 0; i < count; i++) {
      const def = DEFS[i];
      const angle = (i / count) * Math.PI * 2 + (i * 0.4);
      const radius = 7 + (i % 3) * 1.8;
      const baseX = Math.cos(angle) * radius;
      const baseY = 1.5 + Math.sin(i * 1.7) * 3;
      const mesh = this._makeWireframe(def.kind, def.size, def.color);
      mesh.position.set(baseX, baseY, Math.sin(angle) * radius - 3);
      mesh.parent = this.root;

      this._shapes.push({
        mesh,
        baseX,
        baseY,
        spin: { x: def.spin[0], y: def.spin[1], z: def.spin[2] },
        bobSpeed: 0.35 + (i % 3) * 0.2,
        bobPhase: i * 1.3,
        driftSpeed: 0.12 + (i % 2) * 0.08,
        driftPhase: i * 0.7,
        driftRadius: 0.5 + (i % 3) * 0.3,
        pulse: 0.5 + (i % 3) * 0.25,
        pulsePhase: i * 0.9,
        baseColor: def.color,
      });
    }
  }

  _makeWireframe(kind, size, color) {
    let mesh;
    if (kind === 'icosahedron') {
      mesh = MeshBuilder.CreatePolyhedron('atmoIco', { type: 3, size }, this.scene);
    } else if (kind === 'dodecahedron') {
      mesh = MeshBuilder.CreatePolyhedron('atmoDodeca', { type: 2, size }, this.scene);
    } else if (kind === 'octahedron') {
      mesh = MeshBuilder.CreatePolyhedron('atmoOcta', { type: 1, size }, this.scene);
    } else {
      mesh = MeshBuilder.CreateTorusKnot('atmoTK', { radius: size, tube: 0.05, radialSegments: 48, tubularSegments: 8, p: 2, q: 3 }, this.scene);
    }
    const mat = new StandardMaterial('atmoShapeMat_' + mesh.name, this.scene);
    mat.wireframe = true;
    mat.emissiveColor = color;
    mat.diffuseColor = new Color3(0, 0, 0);
    mat.specularColor = new Color3(0, 0, 0);
    mat.disableLighting = true;
    mat.alpha = 0.65;
    mat.alphaMode = Engine.ALPHA_ADD;
    mat.disableDepthWrite = true;
    this._materials.push(mat);
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }

  _buildLightCones() {
    // Skip light cones on mobile — the cylinder + backFaceCulling + low
    // alpha can be costly on weak GPUs and they're barely visible at
    // the typical small mobile viewport.
    if (this._isMobile) return;

    const positions = [
      { x: -3.5, y: 5, z: -1.5 },
      { x: 3.5, y: 5, z: -1.5 },
    ];
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const cone = MeshBuilder.CreateCylinder(`atmoLightCone_${i}`, {
        diameterTop: 0.05,
        diameterBottom: 5.0,
        height: 8.5,
        tessellation: 24,
        cap: 0,
      }, this.scene);
      cone.position.set(p.x, p.y, p.z);
      cone.parent = this.root;
      const mat = new StandardMaterial(`atmoLightConeMat_${i}`, this.scene);
      mat.emissiveColor = new Color3(0.12, 0.55, 0.75);
      mat.diffuseColor = new Color3(0, 0, 0);
      mat.specularColor = new Color3(0, 0, 0);
      mat.disableLighting = true;
      mat.alpha = 0.06;
      mat.alphaMode = Engine.ALPHA_ADD;
      mat.backFaceCulling = false;
      mat.disableDepthWrite = true;
      this._materials.push(mat);
      cone.material = mat;
      cone.isPickable = false;
    }
  }
}
