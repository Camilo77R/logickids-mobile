/**
 * @fileoverview Holographic floor grid for the workshop environment (Babylon port).
 *
 * Creates a glowing grid floor effect using a custom grid texture on a plane,
 * plus an outer ring decoration and an animated "scanner" ring that pulses
 * outward from the center periodically.
 *
 * @module iron-man-workshop/components/WorkshopGrid
 */

import { Color3, MeshBuilder, StandardMaterial, Engine, Texture, DynamicTexture } from '@babylonjs/core';

const DEFAULT_CONFIG = {
  size: 10,
  divisions: 20,
  color: new Color3(0, 1, 1),
  opacity: 0.3,
};

/**
 * Builds a procedural grid texture using a DynamicTexture. The texture
 * has a radial alpha fade so the floor melts into the void at the edges,
 * giving the scene a "holographic pad" look.
 */
function buildGridTexture(scene, divisions, color) {
  const size = 512;
  const dt = new DynamicTexture('gridTex', { width: size, height: size }, scene, false);
  const ctx = dt.getContext();
  ctx.clearRect(0, 0, size, size);

  const r255 = Math.floor(color.r * 255);
  const g255 = Math.floor(color.g * 255);
  const b255 = Math.floor(color.b * 255);

  // Fine grid lines
  ctx.strokeStyle = `rgba(${r255}, ${g255}, ${b255}, 0.55)`;
  ctx.lineWidth = 1.2;
  const cell = size / divisions;
  for (let i = 0; i <= divisions; i++) {
    const p = Math.floor(i * cell) + 0.5;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  // Heavier accent lines every 4 cells
  ctx.strokeStyle = `rgba(${r255}, ${g255}, ${b255}, 0.95)`;
  ctx.lineWidth = 2.0;
  for (let i = 0; i <= divisions; i += 4) {
    const p = Math.floor(i * cell) + 0.5;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Radial alpha fade — center bright, edges fade to the background
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.15, size / 2, size / 2, size * 0.55);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  dt.update();
  dt.hasAlpha = true;
  return dt;
}

export function createWorkshopGrid(scene, config = {}) {
  const { size, divisions, color, opacity } = { ...DEFAULT_CONFIG, ...config };
  const root = {};

  // Grid plane using procedural texture
  const gridTex = buildGridTexture(scene, divisions, color);
  const gridMat = new StandardMaterial('gridMat', scene);
  gridMat.diffuseTexture = gridTex;
  gridMat.diffuseTexture.hasAlpha = true;
  gridMat.useAlphaFromDiffuseTexture = true;
  gridMat.emissiveTexture = gridTex;
  gridMat.emissiveColor = new Color3(1, 1, 1);
  gridMat.disableLighting = true;
  gridMat.opacityTexture = gridTex;
  gridMat.backFaceCulling = false;
  gridMat.alpha = opacity;

  const plane = MeshBuilder.CreateGround('grid', { width: size, height: size, subdivisions: 1 }, scene);
  plane.material = gridMat;
  plane.position.y = -2;
  plane.isPickable = false;

  // Outer ring (torus in Babylon approximates a flat ring)
  const ring = MeshBuilder.CreateTorus('gridRing', {
    diameter: size - 0.2,
    thickness: 0.06,
    tessellation: 48,
  }, scene);
  const ringMat = new StandardMaterial('gridRingMat', scene);
  ringMat.diffuseColor = color;
  ringMat.emissiveColor = color;
  ringMat.disableLighting = true;
  ringMat.alpha = Math.min(1, opacity * 1.5);
  ringMat.alphaMode = Engine.ALPHA_ADD;
  ring.material = ringMat;
  ring.position.y = -1.99;
  ring.isPickable = false;

  // Animated "scanner" rings — sweep outward from the center on a loop
  // to give the floor a living, holographic feel. Skipped on mobile to
  // keep the draw-call budget low (mobile already runs the simplified
  // schematic and lower segment counts everywhere else).
  const SCANNER_RINGS = 2;
  const scannerRings = [];
  if (!config.isMobile) {
    for (let i = 0; i < SCANNER_RINGS; i++) {
      const scanner = MeshBuilder.CreateTorus(`gridScanner_${i}`, {
        diameter: size * 0.15,
        thickness: 0.05,
        tessellation: 64,
      }, scene);
      const sMat = new StandardMaterial(`gridScannerMat_${i}`, scene);
      sMat.diffuseColor = color;
      sMat.emissiveColor = color;
      sMat.disableLighting = true;
      sMat.alpha = 0.0;  // starts invisible
      sMat.alphaMode = Engine.ALPHA_ADD;
      scanner.material = sMat;
      scanner.position.y = -1.97;
      scanner.isPickable = false;
      scanner.parent = plane.parent;
      scannerRings.push({
        mesh: scanner,
        phase: i / SCANNER_RINGS,  // staggered phases
      });
    }
  }

  return { plane, ring, scannerRings, root: { grid: plane, ring } };
}

/**
 * Updates the animated scanner rings. Call from the render loop.
 * Each ring scales 0.4x → 1.5x of the floor and fades to 0 alpha
 * over a ~2s cycle, then loops.
 *
 * @param grid - The result of {@link createWorkshopGrid}
 * @param {number} time - Total elapsed time in seconds
 */
export function updateWorkshopGrid(grid, time) {
  if (!grid || !grid.scannerRings) return;
  const CYCLE = 2.4;
  for (let i = 0; i < grid.scannerRings.length; i++) {
    const r = grid.scannerRings[i];
    if (!r.mesh || !r.mesh.material) continue;
    const t = ((time / CYCLE) + r.phase) % 1;  // 0..1
    // Scale grows linearly from 0.4 to 1.5 of base diameter
    const scale = 0.4 + t * 1.1;
    r.mesh.scaling.set(scale, 1, scale);
    // Alpha: fade in fast, fade out slow
    const alpha = t < 0.15 ? (t / 0.15) * 0.8 : (1 - t) * 0.8;
    r.mesh.material.alpha = alpha;
  }
}
