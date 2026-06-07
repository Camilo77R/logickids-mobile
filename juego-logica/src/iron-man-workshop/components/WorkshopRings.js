/**
 * @fileoverview Animated holographic ring arcs for the workshop environment (Babylon.js port).
 *
 * Creates decorative rotating ring segments and torus elements that orbit
 * around the schematic model, enhancing the Tony Stark workshop aesthetic.
 *
 * @module iron-man-workshop/components/WorkshopRings
 */

import { Color3, TransformNode, MeshBuilder } from '@babylonjs/core';
import { createWorkshopMaterial } from '../materials/WorkshopMaterial';

const DEFAULT_CONFIG = {
  innerRadius: 1.5,
  outerRadius: 1.7,
  thetaSegments: 64,
  color: new Color3(0, 1, 1),
};

/**
 * Creates a group of animated holographic ring arcs parented under a TransformNode.
 *
 * Ring structure:
 * - 3 outer arc segments at 120° intervals, rotating on alternating axes
 * - 1 inner torus ring rotating on the X axis
 *
 * Each ring has different rotation speeds and opacity levels for visual depth.
 * Babylon's `CreateTorus` is used to approximate the flat 2D ring segments from
 * the original Three.js `RingGeometry`; the meshes are oriented (rotated 90° on
 * X) so the rotation axis metadata produces the same tumbling/spinning motion.
 *
 * @param scene - The Babylon.js scene
 * @param config - Configuration options for ring appearance
 * @returns BABYLON.TransformNode containing all ring meshes with rotation metadata
 */
export function createWorkshopRings(scene, config = {}) {
  const { innerRadius, outerRadius, thetaSegments, color } = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  const parent = new TransformNode('workshopRings', scene);

  // Create multiple arc segments at different angles
  const arcCount = 3;
  for (let i = 0; i < arcCount; i++) {
    const arcAngle = Math.PI * 0.6; // 108 degrees arc
    const startAngle = (i * Math.PI * 2) / arcCount;
    const arcFraction = arcAngle / (Math.PI * 2); // Babylon `arc` is 0-1

    const midRadius = (innerRadius + outerRadius) / 2 + i * 0.3;
    const ringThickness = outerRadius - innerRadius;

    const arc = MeshBuilder.CreateTorus(
      `ringArc_${i}`,
      {
        diameter: midRadius * 2,
        thickness: ringThickness,
        tessellation: thetaSegments,
        arc: arcFraction,
      },
      scene
    );

    arc.material = createWorkshopMaterial(`ringArcMat_${i}`, scene, {
      color,
      opacity: 0.5 - i * 0.1,
    });
    arc.isPickable = false;
    // Align the arc plane with the original (XY plane, normal Z) so the
    // axis-based rotation animation matches the Three.js RingGeometry look.
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = startAngle;
    arc.metadata = {
      rotationSpeed: 0.3 + i * 0.1,
      rotationAxis: i % 2 === 0 ? 'y' : 'z',
    };
    arc.parent = parent;
  }

  // Add inner decorative ring
  const innerRing = MeshBuilder.CreateTorus(
    'innerRing',
    {
      diameter: innerRadius * 0.8 * 2,
      thickness: 0.04,
      tessellation: 64,
    },
    scene
  );
  innerRing.material = createWorkshopMaterial('innerRingMat', scene, {
    color,
    opacity: 0.7,
  });
  innerRing.isPickable = false;
  // Match the original XY-plane orientation (hole axis along Z).
  innerRing.rotation.x = Math.PI / 2;
  innerRing.metadata = {
    rotationSpeed: -0.5,
    rotationAxis: 'x',
  };
  innerRing.parent = parent;

  return parent;
}

/**
 * Updates ring rotation animations and shader time uniforms.
 *
 * Applies per-ring rotation based on stored `metadata.rotationSpeed` and
 * `metadata.rotationAxis` properties. Also propagates the time uniform to any
 * ShaderMaterial found on a child mesh (no-op for the current StandardMaterial
 * implementation, but kept for forward-compatibility).
 *
 * @param rings - The TransformNode (or any Node) created by {@link createWorkshopRings}
 * @param deltaTime - Time since last frame in seconds
 * @param time - Current animation time in seconds (for shader uniforms)
 */
export function updateWorkshopRings(rings, deltaTime, time) {
  rings.getChildMeshes().forEach((child) => {
    const meta = child.metadata;
    if (meta && meta.rotationSpeed) {
      const speed = meta.rotationSpeed * deltaTime;
      const axis = meta.rotationAxis || 'y';

      if (axis === 'y') {
        child.rotation.y += speed;
      } else if (axis === 'z') {
        child.rotation.z += speed;
      } else if (axis === 'x') {
        child.rotation.x += speed;
      }
    }

    // Update shader time uniform (only relevant if a ShaderMaterial is used)
    if (
      child.material &&
      child.material.uniforms &&
      child.material.uniforms.uTime
    ) {
      child.material.uniforms.uTime.value = time;
    }
  });
}
