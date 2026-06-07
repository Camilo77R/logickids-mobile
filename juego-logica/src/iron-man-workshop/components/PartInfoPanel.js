/**
 * @fileoverview Holographic information panel for displaying armor part specifications.
 *
 * Renders technical specs using dynamic canvas texture on a Babylon.js plane mesh.
 * Features smart screen-edge positioning, smoothed anchor tracking, and animated
 * connector line with elbow routing.
 *
 * @module iron-man-workshop/components/PartInfoPanel
 */

import * as BABYLON from '@babylonjs/core';
import gsap from 'gsap';
import { MARK_VI_PART_DATA } from '../data/PartData';

/**
 * Holographic information panel displaying armor part technical specifications.
 *
 * Architecture:
 * - **Dynamic Texture**: Dynamically renders UI to 2D canvas, uploaded as GPU texture
 * - **Billboard Orientation**: Panel always faces camera for readability
 * - **Smart Positioning**: Detects screen edges and flips offset to stay visible
 * - **Anchor Smoothing**: Lerps position to reduce jitter from hand tracking noise
 * - **Connector Line**: Elbow-routed line connecting panel to the hovered part
 *
 * Visual design:
 * - Dark semi-transparent background for text contrast
 * - Cyan/blue holographic color scheme
 * - Tech accent corner decorations
 * - Subtle scanline overlay effect
 *
 * @example
 * ```typescript
 * const panel = new PartInfoPanel(scene, camera);
 * scene.add(panel.getObject());
 *
 * // Show when hovering a part
 * panel.show('arm_left', intersectionPoint);
 *
 * // In animation loop:
 * panel.update(time, camera);
 * ```
 */
export class PartInfoPanel {
  constructor(scene, camera, config = {}) {
    this.scene = scene;
    this.camera = camera;
    this.config = config;

    this.currentTarget = null;
    this.isVisible = false;

    // GSAP timeline for animation cleanup
    this.animationTimeline = null;

    // Stability - Smoothing for anchor point
    this.targetAnchor = new BABYLON.Vector3();
    this.smoothedAnchor = new BABYLON.Vector3();

    // Design constants
    this.WIDTH = 512;
    this.HEIGHT = 256;
    this.WORLD_WIDTH = 1.6;
    this.WORLD_HEIGHT = 0.8;
    // Colors - Enhanced for readability
    this.PRIMARY_COLOR = '#00ffff';
    this.SECONDARY_COLOR = '#0088ff';
    this.ALERT_COLOR = '#ff9900';
    this.PANEL_BG_COLOR = 'rgba(0, 15, 30, 0.95)';

    // Container - TransformNode (no rendering, just hierarchy)
    this.container = new BABYLON.TransformNode('partInfoPanel', scene);
    this.container.setEnabled(false);

    // Create Canvas for dynamic text
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.WIDTH;
    this.canvas.height = this.HEIGHT;
    this.context = this.canvas.getContext('2d', { alpha: true });

    // Dynamic texture uploads the canvas to GPU
    this.texture = new BABYLON.DynamicTexture(
      'partInfoPanelTexture',
      { width: this.WIDTH, height: this.HEIGHT },
      scene,
      true
    );
    this.texture.hasAlpha = true;

    // Use the dynamic texture's built-in 2D context
    this.context = this.texture.getContext();

    // Create Panel Mesh
    this.panelMesh = BABYLON.MeshBuilder.CreatePlane(
      'partInfoPanelMesh',
      { width: this.WORLD_WIDTH, height: this.WORLD_HEIGHT },
      scene
    );
    this.panelMesh.parent = this.container;

    const panelMaterial = new BABYLON.StandardMaterial('partInfoPanelMaterial', scene);
    panelMaterial.diffuseTexture = this.texture;
    panelMaterial.diffuseTexture.hasAlpha = true;
    panelMaterial.useAlphaFromDiffuseTexture = true;
    panelMaterial.disableLighting = true;
    panelMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    panelMaterial.backFaceCulling = false;
    panelMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    panelMaterial.disableDepthWrite = true;
    panelMaterial.depthFunction = BABYLON.Engine.ALWAYS;
    panelMaterial.alpha = 0;

    this.panelMesh.material = panelMaterial;
    this.panelMesh.scaling.set(0.1, 0.1, 1);
    this.panelMesh.renderingGroupId = 1;

    // Create Connector Line (4 fixed points, updated in place each frame)
    this.connectorLinePoints = [
      new BABYLON.Vector3(0, 0, 0),
      new BABYLON.Vector3(0, 0, 0),
      new BABYLON.Vector3(0, 0, 0),
      new BABYLON.Vector3(0, 0, 0),
    ];
    this.connectorLine = BABYLON.MeshBuilder.CreateLines(
      'partInfoPanelConnector',
      { points: this.connectorLinePoints, updatable: true },
      scene
    );
    this.connectorLine.parent = this.container;
    this.connectorLine.color = new BABYLON.Color4(0, 1, 1, 1);
    this.connectorLine.alpha = 0;
    this.connectorLine.renderingGroupId = 1;
  }

  /**
   * Returns the container TransformNode for scene integration.
   *
   * @returns The BABYLON.TransformNode containing the panel mesh and connector line
   */
  getObject() {
    return this.container;
  }

  /**
   * Shows the panel for a specific armor part.
   *
   * If already showing for the same part, updates only the anchor position.
   * If showing for a new part, redraws content and triggers enter animation.
   *
   * @param partName - Part identifier key (e.g., 'arm_left', 'head')
   * @param anchorPoint - World-space position to anchor the connector line
   */
  show(partName, anchorPoint) {
    // Defensive: callers may omit anchorPoint (e.g., from a pickWithRay that
    // didn't have a pickedPoint). Use a sensible default so copyFrom never
    // throws on undefined.
    const anchor = anchorPoint || this.targetAnchor;
    this.targetAnchor.copyFrom(anchor);

    // If switching targets or showing for the first time, snap to position immediately
    if (this.currentTarget !== partName || !this.isVisible) {
      this.smoothedAnchor.copyFrom(anchor);
    }

    if (this.currentTarget === partName && this.isVisible) {
      return;
    }

    this.currentTarget = partName;
    const data = MARK_VI_PART_DATA[partName] || MARK_VI_PART_DATA['unknown'];

    // Draw content to canvas
    this.drawContent(data);
    this.texture.update();

    if (!this.isVisible) {
      this.isVisible = true;
      this.container.setEnabled(true);

      // Reset for animation
      this.panelMesh.scaling.set(0.1, 0.1, 1);
      this.panelMesh.material.alpha = 0;
      this.connectorLine.alpha = 0;

      // Kill any existing animation to prevent stacking
      if (this.animationTimeline) {
        this.animationTimeline.kill();
      }

      // Animate In with GSAP
      this.animationTimeline = gsap.timeline();

      // 1. Line draws out
      this.animationTimeline.to(this.connectorLine, { alpha: 0.8, duration: 0.2 });

      // 2. Panel expands and fades in
      this.animationTimeline.to(
        [this.panelMesh.scaling, this.panelMesh.material],
        {
          x: 1,
          y: 1,
          alpha: 1,
          duration: 0.4,
          ease: 'back.out(1.7)',
        },
        '-=0.1'
      );
    }
  }

  /**
   * Updates panel position and connector line geometry.
   *
   * Uses camera projection to determine screen-space position of the anchor,
   * then flips the panel offset if too close to screen edges. Scales the panel
   * based on distance to maintain readability at varying depths.
   *
   * @param camera - Camera for projection and billboard orientation
   */
  updatePosition(camera) {
    const engine = this.scene.getEngine();
    const renderWidth = engine.getRenderWidth();
    const renderHeight = engine.getRenderHeight();
    const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);

    // Project world position to screen space, then convert to NDC
    const projected = BABYLON.Vector3.Project(
      this.smoothedAnchor,
      BABYLON.Matrix.Identity(),
      this.scene.getTransformMatrix(),
      viewport
    );

    const ndcX = (projected.x / viewport.width) * 2 - 1;
    const ndcY = 1 - (projected.y / viewport.height) * 2;

    // Distance-based scaling to maintain readability
    const distance = BABYLON.Vector3.Distance(camera.position, this.smoothedAnchor);
    const scaleFactor = distance / 5.0;
    const finalScale = Math.max(0.6, Math.min(scaleFactor, 3.0));

    this.container.scaling.setAll(finalScale);

    // Base Offsets
    let offX = 1.0;
    let offY = 0.8;

    // Flip logic based on Normalized Device Coordinates (-1 to 1)
    if (ndcY > 0.3) {
      offY = -0.8;
    }
    if (ndcX > 0.4) {
      offX = -1.0;
    }

    // We keep the container at the anchor point
    this.container.position.copyFrom(this.smoothedAnchor);

    // Set panel mesh position relative to container
    const OFFSET_Z = 0;
    this.panelMesh.position.set(offX, offY, OFFSET_Z);

    // Update connector line - "Elbow" style logic
    const panelBottomY = offY - this.WORLD_HEIGHT / 2;
    const panelTopY = offY + this.WORLD_HEIGHT / 2;
    const connectY = offY > 0 ? panelBottomY : panelTopY;
    const dirX = Math.sign(offX);
    const dirY = Math.sign(offY);

    // Mutate the cached points in place, then push the update to the GPU buffer
    this.connectorLinePoints[0].set(0, 0, 0);
    this.connectorLinePoints[1].set(0.15 * dirX, 0.15 * dirY, 0);
    this.connectorLinePoints[2].set(offX - 0.1 * dirX, 0.15 * dirY, 0);
    this.connectorLinePoints[3].set(offX, connectY, 0);

    this.connectorLine = BABYLON.MeshBuilder.CreateLines(
      'partInfoPanelConnector',
      { points: this.connectorLinePoints, instance: this.connectorLine },
      this.scene
    );
  }

  /**
   * Hides the panel with a fade-out animation.
   *
   * Clears the current target and fades opacity to zero before hiding
   * the container. Safe to call when already hidden.
   */
  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.currentTarget = null;

    // Kill any existing animation to prevent conflicts
    if (this.animationTimeline) {
      this.animationTimeline.kill();
    }

    // Animate Out
    gsap.to([this.panelMesh.material, this.connectorLine], {
      alpha: 0,
      duration: 0.3,
      overwrite: true,
      onComplete: () => {
        this.container.setEnabled(false);
      },
    });
  }

  /**
   * Renders the holographic UI content to the canvas.
   *
   * Drawing layers:
   * 1. Rounded rectangle background with border
   * 2. Tech accent corner decorations
   * 3. Title and subtitle text
   * 4. Horizontal separator line
   * 5. Stat labels and values with status-based coloring
   * 6. Scanline overlay effect
   *
   * @param data - Part information containing title, subtitle, and stats array
   */
  drawContent(data) {
    const ctx = this.context;
    const w = this.WIDTH;
    const h = this.HEIGHT;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // -- Background Frame --
    ctx.fillStyle = this.PANEL_BG_COLOR;

    // Rounded corners
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, h - radius);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    ctx.lineTo(radius, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = this.PRIMARY_COLOR;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Tech Accents (corners)
    ctx.fillStyle = this.PRIMARY_COLOR;
    ctx.fillRect(0, 0, 30, 6);
    ctx.fillRect(0, 0, 6, 30);

    ctx.fillRect(w - 30, h - 6, 30, 6);
    ctx.fillRect(w - 6, h - 30, 6, 30);

    // -- Content --

    // Title
    ctx.font = 'bold 36px "Segoe UI", "Courier New", monospace';
    ctx.fillStyle = this.PRIMARY_COLOR;
    ctx.fillText(data.title.toUpperCase(), 40, 60);

    // Subtitle
    ctx.font = '24px "Segoe UI", "Courier New", monospace';
    ctx.fillStyle = this.SECONDARY_COLOR;
    ctx.fillText(data.subtitle, 40, 95);

    // Separator
    ctx.beginPath();
    ctx.moveTo(40, 110);
    ctx.lineTo(w - 40, 110);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Stats
    let y = 160;
    const xLabel = 40;
    const xValue = 300;

    data.stats.forEach((stat) => {
      // Label
      ctx.font = '22px "Consolas", "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(stat.label, xLabel, y);

      // Value
      ctx.font = 'bold 22px "Consolas", "Courier New", monospace';
      if (stat.status === 'optimal') ctx.fillStyle = '#00ff88';
      else if (stat.status === 'warning') ctx.fillStyle = this.ALERT_COLOR;
      else if (stat.status === 'critical') ctx.fillStyle = '#ff3333';
      else ctx.fillStyle = '#ffffff';

      ctx.fillText(stat.value, xValue, y);

      y += 40;
    });

    // Scanline effect (very subtle)
    ctx.fillStyle = 'rgba(0, 255, 255, 0.02)';
    for (let i = 0; i < h; i += 4) {
      ctx.fillRect(0, i, w, 2);
    }
  }

  /**
   * Per-frame update for position smoothing and visual effects.
   *
   * Updates:
   * - Anchor position lerping for smooth tracking
   * - Panel position and connector line geometry
   * - Billboard orientation facing camera
   * - Connector line opacity pulse animation
   * - Random subtle flicker effect
   *
   * @param time - Current animation time in seconds
   * @param camera - Camera reference for billboard orientation and positioning
   */
  update(time, camera) {
    if (!this.isVisible) return;

    // Smooth position interpolation
    const LERP_FACTOR = 0.1;
    this.smoothedAnchor.lerp(this.targetAnchor, LERP_FACTOR);

    // Update visuals based on smoothed anchor
    this.updatePosition(camera);

    // Ensure panel matches camera rotation for perfect readability
    this.panelMesh.lookAt(camera.position);

    // Pulse connector line opacity
    this.connectorLine.alpha = 0.6 + Math.sin(time * 2) * 0.2;

    // Very subtle flicker, much rarer
    if (Math.random() < 0.005) {
      this.panelMesh.material.alpha = 0.8;
      setTimeout(() => {
        if (this.panelMesh && this.panelMesh.material) {
          this.panelMesh.material.alpha = 1.0;
        }
      }, 50);
    }
  }

  /**
   * Releases all GPU resources and disposes the panel.
   * Safe to call multiple times.
   */
  dispose() {
    if (this.animationTimeline) {
      this.animationTimeline.kill();
      this.animationTimeline = null;
    }

    if (this.panelMesh) {
      if (this.panelMesh.material) {
        this.panelMesh.material.dispose();
      }
      this.panelMesh.dispose();
      this.panelMesh = null;
    }

    if (this.connectorLine) {
      this.connectorLine.dispose();
      this.connectorLine = null;
    }

    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    if (this.container) {
      this.container.dispose();
      this.container = null;
    }

    this.isVisible = false;
    this.currentTarget = null;
  }
}
