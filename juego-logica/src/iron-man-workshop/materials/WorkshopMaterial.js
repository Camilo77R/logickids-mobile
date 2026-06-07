/**
 * @fileoverview Holographic materials for the workshop environment (Babylon.js port).
 *
 * Uses Babylon.js StandardMaterial with disableLighting=true and alphaMode=ALPHA_ADD
 * to approximate the additive holographic look. Custom GLSL fresnel/scanlines are
 * not ported in this initial migration; visual quality will improve once tuning
 * is done on the new engine.
 *
 * @module iron-man-workshop/materials/WorkshopMaterial
 */

import { Color3, Color4, StandardMaterial, Engine } from '@babylonjs/core';

const DEFAULT_CONFIG = {
  color: new Color3(0, 1, 1),
  opacity: 0.6,
};

export function createWorkshopMaterial(name, scene, config = {}) {
  const { color = DEFAULT_CONFIG.color, opacity = DEFAULT_CONFIG.opacity } = config;

  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color;
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.alpha = opacity;
  mat.alphaMode = Engine.ALPHA_ADD;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;

  return mat;
}

export function createWireframeMaterial(name, scene, color = new Color3(0, 1, 1), opacity = 0.8) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color;
  mat.specularColor = new Color3(0, 0, 0);
  mat.disableLighting = true;
  mat.alpha = opacity;
  mat.alphaMode = Engine.ALPHA_ADD;
  mat.wireframe = true;
  return mat;
}
