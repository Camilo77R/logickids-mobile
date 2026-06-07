/**
 * @fileoverview Floating holographic UI panels with technical readout styling.
 *
 * Creates decorative plane meshes positioned around the schematic that simulate
 * the floating holographic displays from Tony Stark's workshop. Includes animated
 * hover effects and corner bracket decorations.
 *
 * Babylon.js port: panels are parented under a TransformNode; each panel is a
 * MeshBuilder.CreatePlane with an additive StandardMaterial. Border outlines and
 * corner brackets are created with MeshBuilder.CreateLines and re-skinned with
 * the same additive material to keep the holographic look.
 *
 * @module iron-man-workshop/components/WorkshopPanels
 */

import {
  Color3,
  Engine,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { createWorkshopMaterial } from '../materials/WorkshopMaterial';

const DEFAULT_CONFIG = {
  width: 1.5,
  height: 1.0,
  color: new Color3(0, 1, 1),
};

/**
 * Coerces a Three.js Color, a hex number, or a Babylon Color3 into a Color3.
 * Keeps the migration smooth while callers still hand in THREE.Color values.
 *
 * @param color - Incoming color value
 * @returns Babylon.js Color3
 */
function toColor3(color) {
  if (color instanceof Color3) {
    return color;
  }
  if (
    color &&
    typeof color.r === 'number' &&
    typeof color.g === 'number' &&
    typeof color.b === 'number'
  ) {
    return new Color3(color.r, color.g, color.b);
  }
  if (typeof color === 'number') {
    return new Color3(
      ((color >> 16) & 0xff) / 255,
      ((color >> 8) & 0xff) / 255,
      (color & 0xff) / 255
    );
  }
  return DEFAULT_CONFIG.color;
}

/**
 * Builds an unlit, additive-blended StandardMaterial for line meshes.
 *
 * Babylon's default ColorShader on LinesMesh does not expose alphaMode, so
 * we swap in a StandardMaterial configured for additive blending to match
 * the holographic UI aesthetic.
 *
 * @param name - Material identifier
 * @param scene - Babylon Scene
 * @param color - Emissive color of the line
 * @param opacity - Material alpha
 * @returns StandardMaterial with additive blending
 */
function createAdditiveLineMaterial(name, scene, color, opacity) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.Black();
  mat.emissiveColor = color;
  mat.specularColor = Color3.Black();
  mat.disableLighting = true;
  mat.alpha = opacity;
  mat.alphaMode = Engine.ALPHA_ADD;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  return mat;
}

/**
 * Creates a group of floating holographic UI panels.
 *
 * Panel layout:
 * - Left panel: Angled inward at -2.5 X
 * - Right panel: Angled inward at +2.5 X
 * - Top panel: Centered above, tilted down
 *
 * Each panel includes:
 * - Holographic additive material (scanlines handled in the material module)
 * - Edge border line strip
 * - Corner bracket decorations
 * - Float animation offset for organic movement
 *
 * @param scene - The Babylon Scene the panels will be added to
 * @param config - Configuration options for panel appearance
 * @returns TransformNode containing all panel meshes
 */
export function createWorkshopPanels(scene, config = {}) {
  const { width, height } = { ...DEFAULT_CONFIG, ...config };
  const color = toColor3(config.color ?? DEFAULT_CONFIG.color);

  const root = new TransformNode('workshopPanels', scene);

  const panelPositions = [
    { x: -2.5, y: 0.5, z: 0, rotY: Math.PI * 0.15 },
    { x: 2.5, y: 0.5, z: 0, rotY: -Math.PI * 0.15 },
  ];

  panelPositions.forEach((pos, index) => {
    const panel = MeshBuilder.CreatePlane(
      `panel_${index}`,
      { width, height },
      scene
    );
    panel.position.set(pos.x, pos.y, pos.z);
    panel.rotation.y = pos.rotY;

    panel.material = createWorkshopMaterial(`panelMat_${index}`, scene, {
      color,
      opacity: 0.15,
    });

    const hw = width / 2;
    const hh = height / 2;
    const borderPoints = [
      new Vector3(-hw, -hh, 0.01),
      new Vector3(hw, -hh, 0.01),
      new Vector3(hw, hh, 0.01),
      new Vector3(-hw, hh, 0.01),
      new Vector3(-hw, -hh, 0.01),
    ];
    const border = MeshBuilder.CreateLines(
      `panelBorder_${index}`,
      { points: borderPoints },
      scene
    );
    border.material = createAdditiveLineMaterial(
      `panelBorderMat_${index}`,
      scene,
      color,
      0.8
    );
    border.parent = panel;

    addCornerBrackets(panel, width, height, color, scene, index);

    panel.metadata = {
      floatOffset: index * Math.PI * 0.5,
      baseY: pos.y,
    };

    panel.parent = root;
  });

  return root;
}

/**
 * Adds decorative L-shaped corner brackets to a panel.
 *
 * Creates four corner bracket lines using additive blending for
 * the characteristic holographic UI aesthetic.
 *
 * @param panel - The panel mesh to attach brackets to
 * @param width - Panel width for bracket positioning
 * @param height - Panel height for bracket positioning
 * @param color - Bracket line color
 * @param scene - Babylon Scene
 * @param panelIndex - Index of the parent panel, for unique names
 */
function addCornerBrackets(panel, width, height, color, scene, panelIndex) {
  const bracketSize = 0.15;
  const bracketMat = createAdditiveLineMaterial(
    `bracketMat_${panelIndex}`,
    scene,
    color,
    1.0
  );

  const corners = [
    { x: -width / 2, y: height / 2, dx: 1, dy: -1 },
    { x: width / 2, y: height / 2, dx: -1, dy: -1 },
    { x: -width / 2, y: -height / 2, dx: 1, dy: 1 },
    { x: width / 2, y: -height / 2, dx: -1, dy: 1 },
  ];

  corners.forEach((corner, ci) => {
    const points = [
      new Vector3(corner.x, corner.y + corner.dy * bracketSize, 0.01),
      new Vector3(corner.x, corner.y, 0.01),
      new Vector3(corner.x + corner.dx * bracketSize, corner.y, 0.01),
    ];
    const bracket = MeshBuilder.CreateLines(
      `bracket_${panelIndex}_${ci}`,
      { points },
      scene
    );
    bracket.material = bracketMat;
    bracket.parent = panel;
  });
}

/**
 * Updates panel float animations and shader time uniforms.
 *
 * Applies gentle sinusoidal Y-axis oscillation based on stored
 * `metadata.floatOffset` values for asynchronous movement.
 *
 * @param panels - The panel TransformNode created by {@link createWorkshopPanels}
 * @param time - Current animation time in seconds
 */
export function updateWorkshopPanels(panels, time) {
  const children = panels.getChildren();
  children.forEach((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    const meta = child.metadata || {};
    const offset = meta.floatOffset || 0;
    const baseY = meta.baseY != null ? meta.baseY : child.position.y;
    child.position.y = baseY + Math.sin(time * 0.5 + offset) * 0.05;

    const mat = child.material;
    if (mat && typeof mat.setFloat === 'function') {
      mat.setFloat('uTime', time);
    }
  });
}
