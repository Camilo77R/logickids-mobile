/**
 * @fileoverview Workshop controller for the Iron Man Mark VI assembly game (Babylon.js port).
 *
 * Orchestrates the 3D scene, hand tracking, assembly system, math challenges,
 * and customization. Uses Babylon.js Engine/Scene with simplified materials
 * (no custom fresnel/scanline shaders in this port).
 *
 * @module iron-man-workshop/WorkshopController
 */

import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  UniversalCamera,
  TransformNode,
  Ray,
  PointerEventTypes,
  Matrix,
  Viewport,
  ParticleSystem,
  Texture,
} from '@babylonjs/core';

import { LoadingOverlay } from './components/LoadingOverlay';
// MathChallengeOverlay removed in RobotLab Phase A — the assembly is now
// driven by the MissionSelector + logical peg/order system in
// AssemblyManager. The old math challenges are no longer used.
import { HandLandmarkOverlay } from '../shared/HandLandmarkOverlay';
import { PartInfoPanel } from './components/PartInfoPanel';
import { AssemblyManager } from './components/AssemblyManager';
import { ExplodedViewManager } from './components/ExplodedViewManager';
import { loadMarkVIModel, updateMarkVIModelCached } from './components/MarkVIModel';
import { createWorkshopGrid, updateWorkshopGrid } from './components/WorkshopGrid';
import { createWorkshopRings, updateWorkshopRings } from './components/WorkshopRings';
import { createWorkshopPanels, updateWorkshopPanels } from './components/WorkshopPanels';
import { WorkshopAtmosphere } from './components/WorkshopAtmosphere';
import { RobotCustomization } from '../shared/RobotCustomization';
import { getRobotBlueprint } from './data/RobotBlueprints';
import { MISSIONS, getMission, applyPartOverrides } from './data/Missions';
import { MissionSelector } from './components/MissionSelector';
import { WorkshopAudioManager } from './audio/WorkshopAudioManager';
import gsap from 'gsap';

export class WorkshopController {
  // Construction state
  constructor(handTracker, container, config = {}) {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    console.log('[WorkshopController] constructor start, isMobile=', isMobile, 'ua=', navigator.userAgent);
    this.handTracker = handTracker;
    this.container = container;
    this.config = { ...config };

    this._isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    // _renderScale is the inverse of hardware scaling level. Higher
    // value = sharper visuals (more pixels rendered).
    //   _renderScale = 0.85 →  setHardwareScalingLevel(1.176) → renders at 85% of canvas
    //   _renderScale = 0.75 →  setHardwareScalingLevel(1.333) → renders at 75% of canvas
    // Mobile was 0.6 (60%) which made thin lines + wireframe edges
    // visibly pixelated on high-DPR phones. Bumped to 0.85 (85%) —
    // the adaptive scaler will drop it back if FPS suffers.
    this._renderScale = this._isMobile ? 0.85 : 0.75;

    this._lastRenderTimestamp = 0;
    this._targetFrameMs = this._isMobile ? 33.33 : 16.67;

    // Babylon engine needs an HTMLCanvasElement (not a div).
    // Create the canvas, give it full-screen styling, then attach to the container.
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;touch-action:none;outline:none;';
    this.container.appendChild(this.canvas);

    // Desktop mouse fallback for grab/release in assembly mode. The Babylon
    // canvas has pointer-events:none (it shouldn't block UI overlays), so we
    // attach the listeners to the container instead. This is a real-world
    // convenience: testers without a working webcam can still drive the
    // assembly flow with a mouse.
    this._setupMouseFallback();

    // Touch fallback for mobile. Pinch detection is unreliable for kids'
    // small hands on a phone camera, so we ALSO accept finger drag as a
    // primary input. The kid can tap a part to grab it, drag to move it,
    // and release to drop it. Works alongside hand tracking: whichever
    // is active takes priority (touch wins if the finger is down).
    this._setupTouchFallback();

    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: !this._isMobile,
      powerPreference: this._isMobile ? 'default' : 'high-performance',
      // adaptToDeviceRatio TRUE keeps the canvas backing buffer at
      // devicePixelRatio (3× on iPhone). Combined with
      // setHardwareScalingLevel(1.18), the engine renders at
      // 3/1.18 ≈ 2.55× CSS canvas in device pixels — much sharper
      // than disabling it (which would render at <1× CSS and rely
      // on browser upscaling, looking blurry).
      adaptToDeviceRatio: true,
    });
    this.engine.setHardwareScalingLevel(1 / this._renderScale);

    this.scene = new Scene(this.engine);
    // Slightly less-dark navy so the user can clearly see the scene even
    // when the schematic is rendering at low alpha. Pure black made it
    // impossible to tell if the canvas was rendering at all.
    this.scene.clearColor = new Color4(0.05, 0.08, 0.15, 1);

    // Mobile scene optimizations:
    // - `blockMaterialDirtyMechanism`: Babylon normally polls every
    //   material each frame to check if uniforms need re-uploading.
    //   We manage material changes explicitly via gsap tweens, so
    //   this polling is wasted work. Blocking it skips the per-frame
    //   dirty-flag check on every material.
    // - `skipPointerMovePicking`: Babylon normally runs a picking
    //   raycast on every pointermove event. We never use the
    //   resulting hover info from pointermove (we drive hover from
    //   pinch/click/touch in updateHover). Skipping the per-move
    //   pick saves a raycast per finger movement.
    // - We do NOT disable `autoClear` (we need depth cleared each
    //   frame for correct alpha-blended rendering of the schematic
    //   on top of the parts).
    this.scene.skipPointerMovePicking = true;
    if (this._isMobile) {
      this.scene.blockMaterialDirtyMechanism = true;
    }

    // Force a resize in case the canvas was created with 0×0 dimensions
    // (which can happen if initialize() is called before the container
    // has its final layout). Without this, the buffer is empty and the
    // user sees a black screen.
    this.engine.resize();

    // Note: the known Babylon dispose-race error filter is installed in
    // app.js (at the top of the module, so it runs first and can
    // prevent the FATAL overlay). We don't install a duplicate here —
    // the first listener registered for an event type runs first, and
    // since app.js loads before this lazy-loaded module, app.js's
    // handler would run second anyway (too late to suppress the
    // overlay).

    // Camera
    this.camera = new UniversalCamera('cam', new Vector3(0, 0.5, 12), this.scene);
    // CRITICAL: Babylon's UniversalCamera default rotation has it looking
    // down +Z (away from the origin in left-handed space). Without an
    // explicit setTarget, the schematic at the origin is BEHIND the camera
    // and the user sees only the clearColor. Always aim at the origin.
    this.camera.setTarget(new Vector3(0, 0, 0));

    // Babylon FOV: 60° vertical for natural perspective on mobile
    this.camera.fov = 60 * (Math.PI / 180);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 100;
    this.baseCameraZ = 12;
    this.targetCameraZ = 12;
    this.camera.position.z = 12;

    // Animation state
    this.isRunning = false;
    this.lastTimestamp = 0;
    this.fpsFrames = 0;
    this.fpsLastTime = 0;
    this.currentFps = 0;

    // Subsystem state
    this.grid = null;
    this.rings = null;
    this.panels = null;
    this.schematic = null;
    this.schematicShaderMeshes = [];
    this.explodedViewManager = null;
    this.assemblyManager = null;
    this.missionSelector = null;
    this._currentMissionId = null;
    this.partInfoPanel = null;
    this.handLandmarkOverlay = null;
    this.loadingOverlay = null;
    this.audioManager = null;
    this.handStates = new Map();
    this._loadingStarted = false;
    this.isStartupSequence = false;
    this.isAssemblyMode = false;
    this._assemblyProgressElement = null;
    this._currentRobotName = null;

    // Gesture state
    this._leftHandState = {
      poseHistory: [],
      lastStablePose: null,
      lastValidTime: 0,
      wristRot: { x: 0, y: 0, z: 0 },
      targetRot: { x: 0, y: 0, z: 0 },
    };

    // Schematic rotation/inertia
    this.schematicTargetRotation = { x: 0, y: 0 };
    this.schematicBaseRotation = { x: 0, y: 0 };
    this.rotationVelocity = { x: 0, y: 0 };

    // Hover state
    this.isHoveringSchematic = false;
    this.hoverIntensity = 0;
    this.hoveredLimbTypes = new Set();
    this.limbHoverIntensities = new Map();

    // Debug
    this.debugCallback = null;

    // Bind
    this.handleResize = this.handleResize.bind(this);
    this._animate = this._animate.bind(this);
  }

  /**
   * Mouse fallback for assembly mode: click on a part to grab it, click
   * again to release. Lets testers verify the snap logic without a
   * webcam. Only active in assembly mode and on non-touch devices.
   */
  _setupMouseFallback() {
    if (this._isMobile) return;
    this._mouseNdc = { x: 0, y: 0 };
    this._mouseIsDown = false;
    this._mouseHandIndex = -1;

    const onMove = (e) => {
      const rect = this.container.getBoundingClientRect();
      this._mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this._mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onDown = (e) => {
      if (e.button !== 0) return;
      onMove(e);
      this._mouseIsDown = true;
      this._mouseHandIndex = 1; // pretend the mouse is a 2nd hand
    };
    const onUp = (e) => {
      if (e.button !== 0) return;
      this._mouseIsDown = false;
    };

    this.container.addEventListener('mousemove', onMove);
    this.container.addEventListener('mousedown', onDown);
    this.container.addEventListener('mouseup', onUp);
    this.container.addEventListener('mouseleave', onUp);

    this._mouseFallbackHandlers = { onMove, onDown, onUp };
  }

  /**
   * Touch fallback for mobile. Pinch detection is unreliable for kids'
   * small hands on a phone camera (MediaPipe jitter, small hand in frame,
   * kid can't fully open fingers). So we ALSO accept finger drag as a
   * primary input. The kid can tap a part to grab it, drag to move it,
   * and release to drop it.
   *
   * Works alongside hand tracking: the touch "hand" gets index 1, same
   * as the mouse fallback. If both are active in the same frame, touch
   * wins (we set _touchActive to skip hand tracking).
   */
  _setupTouchFallback() {
    if (!this._isMobile) return;
    this._touchNdc = { x: 0, y: 0 };
    this._touchActive = false;
    this._touchHandIndex = -1;
    this._touchTouchId = null;

    const updateNdc = (clientX, clientY) => {
      const rect = this.container.getBoundingClientRect();
      this._touchNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this._touchNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onStart = (e) => {
      if (!this.isAssemblyMode || !this.assemblyManager) return;
      if (this._touchActive) return;
      const touch = e.changedTouches[0] || e.touches[0];
      if (!touch) return;
      e.preventDefault();
      updateNdc(touch.clientX, touch.clientY);
      this._touchActive = true;
      this._touchHandIndex = 1; // pretend the finger is a 2nd hand
      this._touchTouchId = touch.identifier;
    };
    const onMove = (e) => {
      if (!this._touchActive) return;
      const touch = Array.from(e.changedTouches).find(t => t.identifier === this._touchTouchId)
        || e.touches[0];
      if (!touch) return;
      e.preventDefault();
      updateNdc(touch.clientX, touch.clientY);
    };
    const onEnd = (e) => {
      if (!this._touchActive) return;
      const touch = Array.from(e.changedTouches).find(t => t.identifier === this._touchTouchId);
      if (e.touches.length > 0 && !touch) return; // some other finger lifted
      e.preventDefault();
      this._touchActive = false;
      this._touchTouchId = null;
      // Keep _touchHandIndex at 1 so the next frame's mState still exists
      // and can be cleaned up; the loop in _updateHandTracking will reset
      // it to !this._touchActive in the mState.isGrabbing branch.
    };

    // Use { passive: false } so we can preventDefault (stops scroll/zoom)
    this.container.addEventListener('touchstart', onStart, { passive: false });
    this.container.addEventListener('touchmove', onMove, { passive: false });
    this.container.addEventListener('touchend', onEnd, { passive: false });
    this.container.addEventListener('touchcancel', onEnd, { passive: false });

    this._touchFallbackHandlers = { onStart, onMove, onEnd };
  }

  initialize() {
    console.log('[WorkshopController] initialize start');
    // Lighting: NONE. Every material in the scene has
    // `disableLighting = true` (the schematic, all assembly parts,
    // the glow meshes, the aim guide, the rings, all FX). Lights
    // would still cost per-vertex uniform updates and shader
    // state changes on the GPU. The "holographic" look comes
    // from emissive + alpha, not from lighting.

    // Components
    const primaryColor = new Color3(0, 1, 1);
    const secondaryColor = new Color3(0, 1, 0.5);

    this.grid = createWorkshopGrid(this.scene, {
      size: 8,
      divisions: this._isMobile ? 12 : 20,
      color: primaryColor,
      opacity: 0.30,
      isMobile: this._isMobile,
    });

    // The grid never moves — freeze its world matrix so the GPU pipeline
    // skips per-frame transform recomputation.
    if (this.grid && this.grid.plane) this.grid.plane.freezeWorldMatrix();
    if (this.grid && this.grid.ring) this.grid.ring.freezeWorldMatrix();

    this.rings = createWorkshopRings(this.scene, {
      color: primaryColor,
      count: 3,
      innerRadius: 0.8,
      outerRadius: 1.2,
      segments: this._isMobile ? 24 : 64,
    });
    if (this.rings && this.rings.parent) this.scene.addTransformNode(this.rings.parent);

    this.panels = createWorkshopPanels(this.scene, {
      color: primaryColor,
      count: 2,
      width: 0.8,
      height: 0.55,
    });
    if (this.panels && this.panels.parent) this.scene.addTransformNode(this.panels.parent);

    // Atmospheric background: drifting particles, wireframe geometric
    // shapes, and volumetric light cones. All additive, low-poly,
    // animated from the render loop. Disabled on mobile to keep the
    // GPU/draw-call budget lean on low-end devices. Wrapped in
    // try/catch so a single component failure never blocks the
    // workshop from starting.
    if (!this._isMobile) {
      try {
        this.atmosphere = new WorkshopAtmosphere(this.scene, this._isMobile);
      } catch (err) {
        console.warn('[WorkshopController] atmosphere init failed:', err);
        this.atmosphere = null;
      }
    }

    // Load model
    const scale = 3.0;
    const savedCustom = RobotCustomization.getData();
    const baseColor = new Color3(
      ((savedCustom.colorHex >> 16) & 0xff) / 255,
      ((savedCustom.colorHex >> 8) & 0xff) / 255,
      (savedCustom.colorHex & 0xff) / 255,
    );

    const modelResult = loadMarkVIModel(this.scene, {
      color: baseColor,
      scale,
      simplified: this._isMobile,
    });
    this.schematic = modelResult.group;
    this.scene.addTransformNode(this.schematic);
    this.schematic.userData = this.schematic.userData || {};
    this.schematic.userData.initialScale = scale;

    this.modelLoadPromise = modelResult.loadPromise;

    // Assembly manager
    this.assemblyManager = new AssemblyManager(this.scene, this.camera, {
      baseColor,
      simplified: this._isMobile,
      isMobile: this._isMobile,
      audioManager: this.audioManager,
      onPartAssembled: (partId, count, total) => {
        this._updateAssemblyProgressUI(count, total);
      },
      onAssemblyComplete: (robotLevel) => {
        this._onAssemblyComplete(robotLevel);
      },
      onInvalidDrop: (partId, reason) => {
        // HU-52: show a kid-friendly error message when the wrong piece
        // is dropped. The part is already returning to its exploded
        // position with a red flash + error sound in AssemblyManager.
        this._showAssemblyMessage(
          reason === 'wrong-order'
            ? '¡Esa no es! Busca la pieza que brilla.'
            : '¡Suéltala más cerca del molde!',
        );
      },
    });

    // MissionSelector drives mission choice; the assembly manager's
    // challenge callback is kept for API compatibility but is a no-op
    // (parts are driven by the logical peg/order system, not challenges).
    this.missionSelector = new MissionSelector();
    this.assemblyManager.onChallengeNeeded = (partDef, challenge) => {
      if (this.assemblyManager) this.assemblyManager.unlockPart(partDef.id);
    };

    // Part info panel
    this.partInfoPanel = new PartInfoPanel(this.scene, this.camera);
    this.scene.addTransformNode(this.partInfoPanel.getObject());

    // Audio
    this.audioManager = new WorkshopAudioManager(this.camera);

    // Hand overlay
    this.handLandmarkOverlay = new HandLandmarkOverlay(this.container);

    // Loading overlay
    this.loadingOverlay = new LoadingOverlay(this.container);

    // Pre-warm FX shader cache: create the snap/grab ring + particle
    // meshes (hidden) so Babylon compiles their shaders during the
    // loading animation. Without this, the first snap/grab triggers
    // a shader compile and the user sees a 50-150ms hitch. With it,
    // the first interaction is smooth.
    if (this.assemblyManager) {
      this.assemblyManager._prewarmFxPool();
    }

    // Throttle hand detection. Mobile: 120ms (8.3 Hz) — was 200ms
    // (5 Hz), but the longer gap made the part feel "laggy" between
    // detections even with dead reckoning. 120ms keeps the per-call
    // cost manageable (~10-15ms on mid-range phones with the GPU
    // delegate) while giving 1.67× more velocity samples.
    this.handTracker.setDetectionIntervalMs(this._isMobile ? 120 : 33);

    // Pinch indicator (DOM overlay for visual feedback on mobile)
    this._createPinchIndicator();

    // Camera preview PiP — lets the user see what the camera is seeing
    // so they can position their hand correctly. Critical on mobile,
    // where the back camera faces away from the user. Skipped on mobile
    // by default because some mobile browsers (iOS Safari with strict
    // autoplay policy, low-end Android with limited WebGL) throw or
    // hang when the workshop tries to attach a second <video> to the
    // camera stream that MediaPipe is also using. The user can enable
    // it from a button in the workshop header.
    this._cameraPreviewEnabled = !this._isMobile;
    if (this._cameraPreviewEnabled) {
      try {
        this._setupCameraPreview();
      } catch (err) {
        console.warn('[WorkshopController] camera preview init failed:', err);
        this._cameraPreviewEnabled = false;
      }
    } else {
      this._cameraPreviewPending = true;  // can be enabled on demand
    }

    // Customization panel
    this.injectCustomizationPanel();

    // Resize
    window.addEventListener('resize', this.handleResize);
    console.log('[WorkshopController] initialize complete');
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this._lastRenderTimestamp = 0;
    this._targetFrameMs = this._isMobile ? 33.33 : 16.67;
    this.fpsLastTime = this.lastTimestamp;
    this._startLoadingAnimation();

    // Wait for model then start render loop
    this.engine.runRenderLoop(this._animate);
    // Safety: force a resize right after starting the render loop. On
    // mobile, the canvas may have been created before the container
    // had its final layout (e.g. right after the story intro was
    // disposed), resulting in a 0×0 render buffer and a black screen.
    // Resizing here guarantees the buffer matches the visible viewport.
    requestAnimationFrame(() => {
      if (this.engine) {
        this.engine.resize();
      }
    });
    console.log('[WorkshopController] Started (Babylon)');
  }

  stop() {
    this.isRunning = false;
    this.engine.stopRenderLoop();
    if (this.loadingOverlay) this.loadingOverlay.hide();
    console.log('[WorkshopController] Stopped');
  }

  _startLoadingAnimation() {
    if (this._loadingStarted) return;
    this._loadingStarted = true;
    if (this.loadingOverlay) {
      this.loadingOverlay.startLoading(1500).catch(() => {});
    }
  }

  _animate() {
    if (!this.isRunning) return;
    try {
      this._animateUnsafe();
    } catch (err) {
      // First error in a while: log and start a cooldown so we don't
      // spam the console. The render loop continues running so the
      // scene keeps drawing even if some subsystem is broken.
      if (!this._lastAnimateError || (performance.now() - this._lastAnimateError) > 5000) {
        console.warn('[WorkshopController] _animate error (continuing):', err);
        this._lastAnimateError = performance.now();
      }
    }
  }

  _animateUnsafe() {
    const timestamp = performance.now();

    // FPS cap on mobile
    if (this._targetFrameMs > 0 &&
        this._lastRenderTimestamp > 0 &&
        (timestamp - this._lastRenderTimestamp) < this._targetFrameMs) {
      return;
    }

    const rawDelta = (timestamp - this.lastTimestamp) / 1000;
    const deltaTime = Math.min(rawDelta, 0.05);
    this.lastTimestamp = timestamp;
    this._lastRenderTimestamp = timestamp;

    this.updateFps(timestamp);
    this._update(timestamp / 1000, deltaTime);
    this.scene.render();

    if (this.debugCallback) this.debugCallback(this._getDebugInfo());
  }

  _update(time, deltaTime) {
    const isMobile = this._isMobile;

    if (this.rings) {
      try { updateWorkshopRings(this.rings, deltaTime, time); } catch (e) { /* skip frame */ }
    }
    if (this.panels) {
      try { updateWorkshopPanels(this.panels, time); } catch (e) { /* skip frame */ }
    }
    if (this.grid) {
      try { updateWorkshopGrid(this.grid, time); } catch (e) { /* skip frame */ }
    }
    if (this.atmosphere) {
      try { this.atmosphere.update(deltaTime); } catch (e) { /* skip frame */ }
    }
    if (this.schematicShaderMeshes.length > 0) {
      try { updateMarkVIModelCached(this.schematicShaderMeshes, time); } catch (e) { /* skip frame */ }
    }

    this._updateHandTracking(deltaTime);

    // Update the "← SIGUIENTE" label that follows the next-order part.
    // This tells the kid WHICH part to grab next (critical for missions
    // like the gardener where 6 parts are visible at once).
    if (this.isAssemblyMode && this.assemblyManager) {
      this._updateNextPartLabel();
    } else {
      this._hideNextPartLabel();
    }

    // Schematic rotation
    if (this.schematic) {
      let isGrabbing = false;
      for (const [, state] of this.handStates) {
        if (state.isGrabbing) { isGrabbing = true; break; }
      }

      if (!isGrabbing) {
        const DAMPING = isMobile ? 0.94 : 0.97;
        const STOP = 0.001;
        if (Math.abs(this.rotationVelocity.x) > STOP || Math.abs(this.rotationVelocity.y) > STOP) {
          this.schematicTargetRotation.x += this.rotationVelocity.x * deltaTime;
          this.schematicTargetRotation.y += this.rotationVelocity.y * deltaTime;
          this.rotationVelocity.x *= DAMPING;
          this.rotationVelocity.y *= DAMPING;
          this.schematicTargetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.schematicTargetRotation.x));
        }
      }

      const rotLerp = isMobile ? 0.2 : 0.1;
      const cur = this.schematic.rotation || new Vector3(0, 0, 0);
      cur.x += (this.schematicTargetRotation.x - cur.x) * rotLerp;
      cur.y += (this.schematicTargetRotation.y - cur.y) * rotLerp;
      if (this.schematic.rotation !== cur) this.schematic.rotation = cur;
    }

    if (this.partInfoPanel) this.partInfoPanel.update(time, this.camera);

    if (this.isAssemblyMode && this.assemblyManager) {
      this.assemblyManager.update(deltaTime);
    }

    // Dead reckoning: if a part is currently grabbed, extrapolate the
    // hand position from the last MediaPipe detection + velocity, so
    // the part continues gliding smoothly between detections (every
    // 120ms on mobile). Without this, the part would freeze for
    // ~100ms per detection gap and the kid would perceive it as lag.
    if (this.isAssemblyMode && this.assemblyManager && this.assemblyManager.grabbedPart) {
      const predicted = this._predictHandPos();
      if (predicted) {
        this.assemblyManager.moveGrabbed(predicted);
      }
    }

    // Camera zoom
    const cameraZDiff = this.targetCameraZ - this.camera.position.z;
    if (Math.abs(cameraZDiff) > 0.01) {
      this.camera.position.z += cameraZDiff * (isMobile ? 0.12 : 0.08);
    }

    this._detectLeftHandGesture();
    this._updateLeftHandWristRotation();
  }

  // -------------------- Hand tracking --------------------

  /**
   * Dead-reckoning helper: returns the predicted hand world position
   * for the hand that's currently grabbing, computed from the last
   * MediaPipe detection + velocity, extrapolated to "now". Returns
   * null if no hand is grabbing or we don't have enough data yet.
   *
   * The extrapolation is capped at 250ms — beyond that the hand
   * could have changed direction and the prediction would be wrong.
   * The render loop uses this to keep moveGrabbed's input smooth
   * even though MediaPipe only fires every 120ms on mobile.
   */
  _predictHandPos() {
    if (!this.handStates) return null;
    for (const state of this.handStates.values()) {
      if (!state.isGrabbing || !state.lastDetectTime) continue;
      const elapsed = (performance.now() - state.lastDetectTime) / 1000;
      const capped = Math.min(elapsed, 0.25);
      // Use a temp vector so we don't allocate per frame.
      if (!this._predictedTmp) this._predictedTmp = new Vector3();
      this._predictedTmp.x = state.smoothedWorldPos.x + state.handVelocity.x * capped;
      this._predictedTmp.y = state.smoothedWorldPos.y + state.handVelocity.y * capped;
      this._predictedTmp.z = state.smoothedWorldPos.z + state.handVelocity.z * capped;
      return this._predictedTmp;
    }
    return null;
  }

  _updateHandTracking(deltaTime) {
    // If no hands have been visible for a while, throttle MediaPipe calls
    // so the CPU isn't running detection at 5 Hz for nothing.
    if (this._noHandFrames === undefined) this._noHandFrames = 0;
    if (this._noHandFrames > 60 && this._isMobile) {
      // About 2 seconds of no hands on mobile — drop to 1 Hz
      if ((performance.now() - (this._lastThrottledDetect || 0)) < 1000) {
        return;
      }
      this._lastThrottledDetect = performance.now();
    }

    const result = this.handTracker.detectHands(performance.now());
    if (this.handLandmarkOverlay) this.handLandmarkOverlay.update(result);

    // Update the camera preview's hand overlay so the user can see what
    // MediaPipe is detecting (or confirm that the camera sees their hand
    // at all). This is the only feedback mobile users get that the back
    // camera is even working. Skipped on mobile unless the user has
    // explicitly enabled it (the preview is opt-in on mobile because
    // some mobile browsers throw on a second <video> attach to the same
    // camera stream that MediaPipe is using).
    if (this._cameraPreviewEnabled) {
      try {
        if (this._cameraPreviewPending && this.handTracker && this.handTracker.stream) {
          this._cameraPreviewPending = false;
          this._setupCameraPreview();
        }
        this._updateCameraPreviewOverlay(result ? result.landmarks : null);
      } catch (err) {
        // First time we hit a stream/canvas error, disable the preview
        // for the rest of the session so we don't spam the console.
        this._cameraPreviewPending = false;
        this._cameraPreviewEl = null;
        this._cameraPreviewCanvas = null;
        this._cameraPreviewEnabled = false;
      }
    }

    if (!result || result.landmarks.length === 0) {
      this._noHandFrames = (this._noHandFrames || 0) + 1;
      // Wait several frames of no-hand before force-releasing. MediaPipe
      // frequently drops detection for 1-3 frames even when the hand is
      // still in view (especially on mobile, where processing budget
      // is tighter). A short grace period keeps the part in the user's
      // hand during these flickers — they can keep "holding" without
      // losing their grab. 8 frames ≈ 130ms on mobile (33ms target) or
      // 260ms on mobile throttled to 1 Hz.
      const forceReleaseAfter = this._isMobile ? 8 : 3;
      if (this._noHandFrames === forceReleaseAfter) {
        if (this.isAssemblyMode && this.assemblyManager) this.assemblyManager.forceRelease();
        this.handStates.clear();
        this._updateHoverState(false, deltaTime);
        this._hidePinchIndicator();
      }
      return;
    }
    this._noHandFrames = 0;

    let anyHandHovering = false;
    const detectedHandIndices = new Set();

    for (let i = 0; i < result.landmarks.length; i++) {
      detectedHandIndices.add(i);
      const landmarks = result.landmarks[i];
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];

      // NDC from normalized landmarks (MediaPipe gives 0-1 with origin top-left)
      const wristScreenX = (1 - wrist.x) * 2 - 1; // mirror
      const wristScreenY = -(wrist.y * 2 - 1);

      // ──────────────────────────────────────────────────────────────────
      // MULTI-SIGNAL PINCH DETECTION
      // ──────────────────────────────────────────────────────────────────
      // A single threshold on thumb-index tip distance is unreliable for
      // kids on mobile: the absolute distance is tiny (10-30 px) and
      // MediaPipe jitters 1-3 px, so the ratio oscillates near the
      // threshold. We instead use FOUR independent signals and require
      // 2+ to agree before declaring a pinch. This catches a wide range
      // of "grab" gestures (pinch, C-shape, fist) while filtering out
      // jitter and false positives.
      //
      // Signal 1: tipSignal  — thumb tip close to index tip (classic pinch)
      // Signal 2: curlSignal — index finger is curled (tip near MCP)
      // Signal 3: baseSignal — thumb is at the base of the index (C-shape)
      // Signal 4: fistSignal — all fingertips close to wrist (fist)
      //
      // For release we look for an EXPLICITLY OPEN hand: every finger
      // must be extended (tip far from its MCP). This prevents accidental
      // release when the hand is in a neutral position.
      // ──────────────────────────────────────────────────────────────────
      const thumbMcp = landmarks[2];
      const thumbIp = landmarks[3];
      const indexMcp = landmarks[5];
      const indexPip = landmarks[6];
      const middleTip = landmarks[12];
      const middleMcp = landmarks[9];
      const middlePip = landmarks[10];
      const ringTip = landmarks[16];
      const ringMcp = landmarks[13];
      const ringPip = landmarks[14];
      const pinkyTip = landmarks[20];
      const pinkyMcp = landmarks[17];
      const pinkyPip = landmarks[18];

      // Hand size: wrist (0) to middle MCP (9). A robust reference that
      // doesn't depend on finger position.
      const handSize = Math.hypot(
        middleMcp.x - wrist.x,
        middleMcp.y - wrist.y,
      ) || 0.2;

      // --- Signal 1: tip proximity (the classic pinch) ---
      const tipDist = Math.hypot(
        thumbTip.x - indexTip.x,
        thumbTip.y - indexTip.y,
      );
      const tipRatio = tipDist / handSize;
      const tipSignal = tipRatio < 0.55; // generous — tips close

      // --- Signal 2: index finger curl ---
      // When straight, tip is at MCP + 2*(PIP-MCP), so dist(MCP,tip) ≈
      // 2 * dist(MCP,PIP). When curled, dist(MCP,tip) drops below 1.5 *
      // dist(MCP,PIP). We use a 2D distance (X/Y) because Z is noisy.
      const indexSegLen = Math.hypot(
        indexPip.x - indexMcp.x,
        indexPip.y - indexMcp.y,
      ) || 0.05;
      const indexCurlDist = Math.hypot(
        indexTip.x - indexMcp.x,
        indexTip.y - indexMcp.y,
      );
      const indexCurlRatio = indexCurlDist / (indexSegLen * 2);
      const curlSignal = indexCurlRatio < 0.80; // index is curled

      // --- Signal 3: thumb at base of index (C-shape grab) ---
      // When the kid makes a "C" with thumb and index, the tips are far
      // apart but the thumb tip is near the index MCP. This catches that.
      const thumbToIndexMcp = Math.hypot(
        thumbTip.x - indexMcp.x,
        thumbTip.y - indexMcp.y,
      );
      const baseRatio = thumbToIndexMcp / handSize;
      const baseSignal = baseRatio < 0.65; // thumb near index base

      // --- Signal 4: fist (all fingertips close to wrist) ---
      // A fist = all 4 fingers curled. Tips are close to the palm.
      const fistDist = (
        Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) +
        Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y) +
        Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y) +
        Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y)
      ) / 4;
      const fistSignal = fistDist < handSize * 1.35; // tight fist

      // --- Combine: pinch if 2+ signals agree ---
      const signalCount = (tipSignal ? 1 : 0) + (curlSignal ? 1 : 0) +
                          (baseSignal ? 1 : 0) + (fistSignal ? 1 : 0);
      const rawPinch = signalCount >= 2;

      // --- Open hand: every finger must be extended ---
      // We check 4 fingers explicitly. This is a stronger release signal
      // than just "not pinching" — it requires an unambiguous open hand.
      const middleSegLen = Math.hypot(middlePip.x - middleMcp.x, middlePip.y - middleMcp.y) || 0.05;
      const middleCurlDist = Math.hypot(middleTip.x - middleMcp.x, middleTip.y - middleMcp.y);
      const middleCurlRatio = middleCurlDist / (middleSegLen * 2);
      const ringSegLen = Math.hypot(ringPip.x - ringMcp.x, ringPip.y - ringMcp.y) || 0.05;
      const ringCurlDist = Math.hypot(ringTip.x - ringMcp.x, ringTip.y - ringMcp.y);
      const ringCurlRatio = ringCurlDist / (ringSegLen * 2);
      const pinkySegLen = Math.hypot(pinkyPip.x - pinkyMcp.x, pinkyPip.y - pinkyMcp.y) || 0.05;
      const pinkyCurlDist = Math.hypot(pinkyTip.x - pinkyMcp.x, pinkyTip.y - pinkyMcp.y);
      const pinkyCurlRatio = pinkyCurlDist / (pinkySegLen * 2);
      const isOpenHand = (
        indexCurlRatio > 0.90 &&
        middleCurlRatio > 0.90 &&
        ringCurlRatio > 0.90 &&
        pinkyCurlRatio > 0.90
      );

      // Cursor / aim position: use the INDEX FINGER TIP, not the pinch
      // midpoint. The kid naturally aims with their index finger
      // (like pointing at something) and then brings the thumb in
      // to "click". Using the midpoint would make the grab target
      // the spot between the two fingertips, which doesn't match
      // where the kid thinks they're pointing. MediaPipe's
      // landmark[8] is the index tip; landmark[4] is the thumb tip.
      // The pinch is just the trigger (thumb close to index); the
      // aim is the index tip.
      const aimNdcX = ((1 - indexTip.x) * 2) - 1; // mirror
      const aimNdcY = -(indexTip.y * 2 - 1);
      const worldPos = this._unprojectNdcToWorld(aimNdcX, aimNdcY, this.camera.position.z);

      // Keep pinchMidX/Y for the pinch detection only (the gesture
      // trigger). These are not used for cursor positioning anymore.
      const pinchMidX = aimNdcX; // legacy variable, kept for any code that still reads it
      const pinchMidY = aimNdcY;

      // Smoothing: MediaPipe's per-frame landmark positions jitter
      // 1-3 px which makes the grabbed part "shudder" on mobile. Apply
      // an exponential low-pass filter to the world position so the
      // part glides smoothly with the hand. The first frame after a
      // grab is a snap (so the part jumps straight to the hand) — the
      // smoothing kicks in on subsequent frames.
      //
      // Dead reckoning: between MediaPipe updates (every 120ms on
      // mobile) the raw worldPos doesn't change, which makes the part
      // appear to "freeze" and then "jump" — the kid perceives this
      // as lag. We compute a velocity from each detection and
      // extrapolate the position per render frame (see
      // _predictHandPos). The render loop then keeps calling
      // moveGrabbed with the predicted position so the part glides
      // smoothly even between detections.
      const state = this.handStates.get(i) || {
        isGrabbing: false,
        worldPos: new Vector3(0, 0, 0),
        smoothedWorldPos: new Vector3(0, 0, 0),
        prevWorldPos: new Vector3(0, 0, 0),
        handVelocity: new Vector3(0, 0, 0),
        lastDetectTime: 0,
        targetLimb: null,
        sustainedPinchFrames: 0,
        sustainedOpenFrames: 0,
      };
      this.handStates.set(i, state);
      if (!state.smoothedWorldPos) {
        state.smoothedWorldPos = worldPos.clone();
        state.prevWorldPos.copyFrom(worldPos);
        state.lastDetectTime = performance.now();
      } else {
        // Smoothing factor: higher = more responsive (less smooth). On
        // mobile we still smooth to kill MediaPipe jitter, but we want
        // the part to follow the hand quickly so the kid doesn't feel
        // a "lag" between their hand and the part they're moving.
        // 0.75 = 75% new, 25% old — almost no lag, still smooths 1-2 px jitter.
        const smoothing = this._isMobile ? 0.75 : 0.65;
        state.smoothedWorldPos.x += (worldPos.x - state.smoothedWorldPos.x) * smoothing;
        state.smoothedWorldPos.y += (worldPos.y - state.smoothedWorldPos.y) * smoothing;
        state.smoothedWorldPos.z += (worldPos.z - state.smoothedWorldPos.z) * smoothing;

        // Compute velocity (units per second) from the change since
        // the last detection. Used by _predictHandPos to extrapolate
        // the position between MediaPipe updates. The smoothing
        // (1 - exp decay per render frame) is applied in
        // _predictHandPos to avoid jitter amplification.
        const now = performance.now();
        const dt = (now - state.lastDetectTime) / 1000;
        if (dt > 0.05 && dt < 0.5) { // sanity: ignore big gaps
          state.handVelocity.x = (worldPos.x - state.prevWorldPos.x) / dt;
          state.handVelocity.y = (worldPos.y - state.prevWorldPos.y) / dt;
          state.handVelocity.z = (worldPos.z - state.prevWorldPos.z) / dt;
        } else if (dt >= 0.5) {
          // Long gap (e.g. hand re-entered frame): reset velocity.
          state.handVelocity.set(0, 0, 0);
        }
        state.prevWorldPos.copyFrom(worldPos);
        state.lastDetectTime = now;
      }
      const movePos = state.smoothedWorldPos;

      // Hysteresis (instant release on open hand):
      //  - To start grabbing: 1 frame of pinching (instant)
      //  - To release: 1 frame of NOT pinching (instant)
      // The multi-signal pinch detection (4 signals, 2+ agree) is
      // already robust against jitter, so we don't need a slow decay
      // on the pinch counter. The kid opens their hand → release fires
      // IMMEDIATELY (next frame). This fixes the "wrong part won't
      // release" bug where the old slow-decay counter kept the grab
      // active for several frames after the kid opened their hand.
      if (rawPinch) {
        state.sustainedPinchFrames = (state.sustainedPinchFrames || 0) + 1;
        state.sustainedNotPinchFrames = 0;
      } else {
        // INSTANT reset — no slow decay. The multi-signal detection
        // already filters jitter (needs 2+ signals to agree), so we
        // can trust rawPinch === false as "definitely not pinching".
        state.sustainedPinchFrames = 0;
        state.sustainedNotPinchFrames = (state.sustainedNotPinchFrames || 0) + 1;
      }
      const REQUIRED_SUSTAINED = 1;  // 1 frame to grab (instant)
      const REQUIRED_NOT_PINCH = 1;  // 1 frame to release (instant)
      const isPinching = state.sustainedPinchFrames >= REQUIRED_SUSTAINED;
      const isReleasing = !isPinching && (state.sustainedNotPinchFrames || 0) >= REQUIRED_NOT_PINCH;

      // Pick the best signal for the visual pinch indicator
      // (the one with the strongest pinch signal)
      const pinchRatio = tipRatio; // back-compat for the indicator
      state.worldPos.copyFrom(worldPos);

      // Update visual pinch indicator (screen-space at the pinch midpoint)
      const pinchScreenX = (pinchMidX + 1) * 0.5 * window.innerWidth;
      const pinchScreenY = (1 - pinchMidY) * 0.5 * window.innerHeight;
      // Hide pinch indicator if touch fallback is active (two indicators
      // would confuse the kid — touch takes priority)
      if (this._touchActive) {
        this._hidePinchIndicator();
      } else {
        this._updatePinchIndicator(pinchScreenX, pinchScreenY, pinchRatio, isPinching, isOpenHand);
      }

      if (this.isAssemblyMode && this.assemblyManager) {
        // If touch fallback is active, skip hand tracking grab/move/release.
        // Touch takes priority — the kid chose to use their finger.
        let handDidSomething = false;
        if (this._touchActive) {
          // No-op: touch fallback handles grab/move/release
        } else if (isPinching && !state.isGrabbing) {
          // Try to grab — use the *raw* worldPos for the initial grab
          // so the part snaps to the actual hand position. The smoothing
          // we computed above is for the *follow* motion, not the grab.
          // Pass the NDC coords (pinchMidX/Y) so the picker can build a
          // proper screen-space picking ray — this is what makes the
          // grab target the part the kid is actually pointing at,
          // even when parts sit at different Z depths.
          const grabbed = this.assemblyManager.tryGrab(worldPos, pinchMidX, pinchMidY);
          state.isGrabbing = true;
          state.justGrabbed = !!grabbed;
          // Sync the smoothed position to the actual grab position so
          // there's no jump on the first follow frame.
          if (state.smoothedWorldPos) {
            state.smoothedWorldPos.copyFrom(worldPos);
          }
          if (window.__cwDebug) {
            console.log('[cw] pinch START hand', i,
              'tip=', tipRatio.toFixed(2), 'curl=', indexCurlRatio.toFixed(2),
              'base=', baseRatio.toFixed(2), 'fist=', fistDist.toFixed(2),
              'signals=', signalCount, 'grabbed=', grabbed,
              'partId=', grabbed ? this.assemblyManager.grabbedPart?.metadata?.partId : null);
          }
          handDidSomething = true;
        } else if (isPinching && state.isGrabbing) {
          // Use the RAW hand position for the grabbed part so it follows
          // the hand immediately (no 1-2 frame lag from the smoothing).
          // The smoothing is only used for the visual pinch indicator
          // — the kid prefers responsiveness over smoothness when
          // actually dragging a part. MediaPipe's 1-2 px jitter is
          // negligible at the part's scale.
          this.assemblyManager.moveGrabbed(worldPos);
          handDidSomething = true;
        } else if (isReleasing && state.isGrabbing) {
          const released = this.assemblyManager.releaseGrabbed();
          if (window.__cwDebug) {
            console.log('[cw] pinch RELEASE hand', i,
              'tip=', tipRatio.toFixed(2), 'signals=', signalCount,
              'open=', isOpenHand, 'snapped=', released);
          }
          state.isGrabbing = false;
          state.justGrabbed = false;
          handDidSomething = true;
        }
        if (handDidSomething) anyHandHovering = true;
      } else {
        // Customization mode: hit-test on schematic hit volumes
        this._processCustomizationGesture(i, state, isPinching, worldPos, wristScreenX, wristScreenY);
        if (state.isGrabbing) anyHandHovering = true;
      }

      // Hover highlight: show the kid which part the picker is
      // currently targeting. Uses the same NDC raycast as tryGrab, so
      // what the kid sees highlighted is exactly what would be grabbed
      // on the next pinch. Only when NOT currently grabbing AND NOT
      // currently pinching — the index tip moves slightly when the
      // kid pinches (the finger curls), which would cause the hover
      // highlight to "jump" to a different part right before the grab
      // fires, leading to grab misses.
      if (this.isAssemblyMode
          && this.assemblyManager
          && !this._touchActive
          && !state.isGrabbing
          && !isPinching) {
        this.assemblyManager.updateHover(worldPos, pinchMidX, pinchMidY);
      }
    }

    // Clean up stale hand states
    for (const [idx] of this.handStates) {
      if (!detectedHandIndices.has(idx)) this.handStates.delete(idx);
    }

    // Desktop mouse fallback: simulate a "hand" driven by mouse position +
    // left-button state. Lets testers verify the snap logic on desktop
    // without a working webcam. Disabled on touch devices.
    if (this._mouseHandIndex !== undefined && this._mouseHandIndex >= 0 && this.isAssemblyMode && this.assemblyManager && !this._isMobile) {
      const mouseWorld = this._unprojectNdcToWorld(this._mouseNdc.x, this._mouseNdc.y, this.camera.position.z);
      const mState = this.handStates.get(this._mouseHandIndex) || { isGrabbing: false, worldPos: new Vector3(0, 0, 0), targetLimb: null, sustainedPinchFrames: 0 };
      this.handStates.set(this._mouseHandIndex, mState);
      mState.worldPos.copyFrom(mouseWorld);
      if (this._mouseIsDown && !mState.isGrabbing) {
        // Pass NDC coords so the picker uses a proper screen-space ray.
        const grabbed = this.assemblyManager.tryGrab(mouseWorld, this._mouseNdc.x, this._mouseNdc.y);
        mState.isGrabbing = true;
        mState.justGrabbed = !!grabbed;
      } else if (this._mouseIsDown && mState.isGrabbing) {
        this.assemblyManager.moveGrabbed(mouseWorld);
      } else if (!this._mouseIsDown && mState.isGrabbing) {
        const released = this.assemblyManager.releaseGrabbed();
        mState.isGrabbing = false;
        mState.justGrabbed = false;
      } else if (!mState.isGrabbing) {
        // Hover highlight when not actively grabbing.
        this.assemblyManager.updateHover(mouseWorld, this._mouseNdc.x, this._mouseNdc.y);
      }
      anyHandHovering = true;
    }

    // Mobile touch fallback: kid can tap and drag a part with their finger
    // when hand tracking is unreliable. Uses the same "fake hand" pattern
    // as the mouse fallback, but with touch events. We also use the touch
    // position to show a pinch indicator (cyan dot) so the kid gets
    // visual feedback that touch is being detected.
    if (this._touchHandIndex !== undefined && this._touchHandIndex >= 0 && this.isAssemblyMode && this.assemblyManager && this._isMobile) {
      const touchWorld = this._unprojectNdcToWorld(this._touchNdc.x, this._touchNdc.y, this.camera.position.z);
      const tState = this.handStates.get(this._touchHandIndex) || { isGrabbing: false, worldPos: new Vector3(0, 0, 0), targetLimb: null, sustainedPinchFrames: 0 };
      this.handStates.set(this._touchHandIndex, tState);
      tState.worldPos.copyFrom(touchWorld);
      if (this._touchActive && !tState.isGrabbing) {
        // Pass NDC coords so the picker uses a proper screen-space ray.
        const grabbed = this.assemblyManager.tryGrab(touchWorld, this._touchNdc.x, this._touchNdc.y);
        tState.isGrabbing = true;
        tState.justGrabbed = !!grabbed;
        if (grabbed && window.__cwDebug) {
          console.log('[cw] touch GRAB ratio=N/A grabbed=', grabbed);
        }
      } else if (this._touchActive && tState.isGrabbing) {
        this.assemblyManager.moveGrabbed(touchWorld);
      } else if (!this._touchActive && tState.isGrabbing) {
        const released = this.assemblyManager.releaseGrabbed();
        tState.isGrabbing = false;
        tState.justGrabbed = false;
        if (window.__cwDebug) {
          console.log('[cw] touch RELEASE snapped=', released);
        }
      } else if (!tState.isGrabbing) {
        // Hover highlight when not actively grabbing.
        this.assemblyManager.updateHover(touchWorld, this._touchNdc.x, this._touchNdc.y);
      }
      // Show a touch indicator at the finger position
      const touchScreenX = (this._touchNdc.x + 1) * 0.5 * window.innerWidth;
      const touchScreenY = (1 - this._touchNdc.y) * 0.5 * window.innerHeight;
      this._updateTouchIndicator(touchScreenX, touchScreenY, this._touchActive);
      anyHandHovering = true;
    } else if (this._touchIndicator) {
      this._hideTouchIndicator();
    }

    this._updateHoverState(anyHandHovering, deltaTime);

    // Show a kid-friendly hint based on the current grab state. This
    // replaces the silent "nothing happens when I release" experience
    // with clear feedback: "DROP HERE!", "¡ESTA NO ES!", "ACÉRCATE MÁS".
    if (this.isAssemblyMode && this.assemblyManager) {
      const snap = this.assemblyManager.getSnapState();
      this._updateSnapHint(snap);
    } else {
      this._updateSnapHint(null);
    }
  }

  _unprojectNdcToWorld(ndcX, ndcY, distance) {
    const ray = this.scene.createPickingRay(
      (ndcX + 1) * 0.5 * this.engine.getRenderWidth(),
      (1 - ndcY) * 0.5 * this.engine.getRenderHeight(),
      Matrix.Identity(),
      this.camera,
    );
    if (typeof distance !== 'number' || !isFinite(distance) || distance <= 0) {
      // Default: project onto the schematic's plane (camera-to-origin distance).
      distance = Math.abs(this.camera.position.z);
    }
    return ray.origin.add(ray.direction.scale(distance));
  }

  _processCustomizationGesture(handIndex, state, isPinching, worldPos, ndcX, ndcY) {
    // Build a Babylon Ray
    const ray = this.scene.createPickingRay(
      (ndcX + 1) * 0.5 * this.engine.getRenderWidth(),
      (1 - ndcY) * 0.5 * this.engine.getRenderHeight(),
      Matrix.Identity(),
      this.camera,
    );

    const hit = this.scene.pickWithRay(ray, (mesh) => mesh.isPickable && mesh.metadata && mesh.metadata.isHitVolume);
    if (hit && hit.hit && hit.pickedMesh) {
      const limbType = hit.pickedMesh.metadata.limbType;
      if (this.partInfoPanel) this.partInfoPanel.show(limbType, hit.pickedPoint);
      this.hoveredLimbTypes.add(limbType);
      if (isPinching && !state.isGrabbing) {
        state.isGrabbing = true;
        state.targetLimb = limbType;
        // Drag the schematic
        state.dragStart = { x: ndcX, y: ndcY };
        state.schematicRotAtGrab = { x: this.schematicTargetRotation.x, y: this.schematicTargetRotation.y };
      } else if (isPinching && state.isGrabbing && state.dragStart) {
        const dx = ndcX - state.dragStart.x;
        const dy = ndcY - state.dragStart.y;
        this.schematicTargetRotation.y = state.schematicRotAtGrab.y + dx * 2;
        this.schematicTargetRotation.x = state.schematicRotAtGrab.x + dy * 2;
        this.schematicTargetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.schematicTargetRotation.x));
        this.rotationVelocity.x = 0;
        this.rotationVelocity.y = 0;
      } else if (!isPinching && state.isGrabbing) {
        state.isGrabbing = false;
        state.dragStart = null;
        this.rotationVelocity.x = 0.1;
        this.rotationVelocity.y = 0.1;
      }
    } else {
      if (this.partInfoPanel) this.partInfoPanel.hide();
      this.hoveredLimbTypes.clear();
    }
  }

  _updateHoverState(isHovering, deltaTime) {
    this.isHoveringSchematic = isHovering;
    const target = isHovering ? 1 : 0;
    this.hoverIntensity += (target - this.hoverIntensity) * Math.min(1, deltaTime * 5);
  }

  // -------------------- Left hand gesture (explode) --------------------

  _detectLeftHandGesture() {
    const result = this.handTracker.detectHands(performance.now());
    if (!result || result.landmarks.length < 1) {
      this._resetLeftHandState();
      return;
    }

    let leftHandIndex = -1;
    for (let i = 0; i < result.landmarks.length; i++) {
      const hd = result.handedness?.[i]?.[0]?.categoryName;
      if (hd === 'Left') { leftHandIndex = i; break; }
    }
    if (leftHandIndex < 0) { this._resetLeftHandState(); return; }

    const landmarks = result.landmarks[leftHandIndex];
    const pose = this._classifyHandPose(landmarks);
    const now = performance.now();
    this._leftHandState.poseHistory.push({ pose, t: now });
    if (this._leftHandState.poseHistory.length > 8) this._leftHandState.poseHistory.shift();

    // Stable pose: same for 4 frames
    const recent = this._leftHandState.poseHistory.slice(-4);
    if (recent.length === 4 && recent.every(p => p.pose === pose)) {
      const last = this._leftHandState.lastStablePose;
      if (last !== pose && (now - this._leftHandState.lastValidTime) > 600) {
        this._leftHandState.lastStablePose = pose;
        this._leftHandState.lastValidTime = now;
        if (pose === 'open' && this.explodedViewManager && this.explodedViewManager.getState() === 'assembled') {
          this.targetCameraZ = this.baseCameraZ + 6.3;
          if (this.explodedViewManager.explode) this.explodedViewManager.explode(1.0);
        } else if (pose === 'fist' && this.explodedViewManager && this.explodedViewManager.getState() === 'exploded') {
          this.targetCameraZ = this.baseCameraZ;
          if (this.explodedViewManager.assemble) this.explodedViewManager.assemble();
        }
      }
    }
  }

  _classifyHandPose(landmarks) {
    // Simple: open if all fingertips are above their PIP joints, fist otherwise
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    let extended = 0;
    for (let i = 0; i < tips.length; i++) {
      if (landmarks[tips[i]].y < landmarks[pips[i]].y) extended++;
    }
    return extended >= 3 ? 'open' : 'fist';
  }

  _resetLeftHandState() {
    this._leftHandState.poseHistory = [];
    this._leftHandState.lastStablePose = null;
  }

  _updateLeftHandWristRotation() {
    // Stub: previously rotated model based on left-hand wrist. No-op in this port.
  }

  // -------------------- Assembly mode --------------------

  enterAssemblyMode(missionId) {
    if (!this.assemblyManager) {
      console.warn('[WorkshopController] enterAssemblyMode: no assemblyManager');
      return;
    }

    // Accept either a mission id (preferred in Phase A) or a legacy level number.
    let blueprint;
    let level;
    let mission = getMission(missionId);
    if (mission) {
      this._currentMissionId = mission.id;
      level = mission.targetLevel;
      blueprint = getRobotBlueprint(level);
      // Apply mission-specific part overrides (e.g. "torso" → "Tanque
      // de Agua" for the gardening mission). Returns the same object
      // if the mission has no overrides.
      blueprint = applyPartOverrides(blueprint, mission.id);
    } else if (typeof missionId === 'number') {
      level = missionId;
      blueprint = getRobotBlueprint(level);
    }
    if (!blueprint) {
      console.warn('[WorkshopController] No blueprint for mission/level', missionId);
      return;
    }

    try {
      this.isAssemblyMode = true;
      this.targetCameraZ = this.baseCameraZ + 3;
      this._currentRobotName = blueprint.name;
      // Clear any leftover victory state from a previous run
      this._victoryActive = false;
      if (this._victoryOverlayEl && this._victoryOverlayEl.parentNode) {
        this._victoryOverlayEl.parentNode.removeChild(this._victoryOverlayEl);
        this._victoryOverlayEl = null;
      }
      if (this._confettiSystem) {
        try { this._confettiSystem.dispose(); } catch (e) { /* ignore */ }
        this._confettiSystem = null;
      }
      console.log('[WorkshopController] enterAssemblyMode: starting assembly for', blueprint.name, 'level', level, 'parts:', blueprint.parts.length);
      this.assemblyManager.startAssembly(blueprint, level, []);
      console.log('[WorkshopController] enterAssemblyMode: assembly started. Schematic:', !!this.schematic, 'parts in manager:', this.assemblyManager.parts.length, 'ghost:', !!this.assemblyManager.ghostGroup);
      // Diagnostic: dump visibility state of the schematic, a sample part,
      // and the camera. Helps find why the 3D scene appears empty.
      if (this.schematic) {
        const childCount = (this.schematic.getChildMeshes && this.schematic.getChildMeshes().length) || 0;
        console.log('[Diag] schematic: pos=', this.schematic.position, 'scale=', this.schematic.scaling, 'enabled=', this.schematic.isEnabled(), 'children=', childCount, 'visible=', this.schematic.isVisible);
      }
      if (this.assemblyManager.parts && this.assemblyManager.parts.length) {
        const p0 = this.assemblyManager.parts[0];
        const m0 = p0.metadata && p0.metadata.mainMesh;
        console.log('[Diag] sample part: pos=', p0.position, 'enabled=', p0.isEnabled(), 'meshEnabled=', m0 ? m0.isEnabled() : 'no mesh', 'meshVisible=', m0 ? m0.isVisible : 'no mesh', 'matType=', m0 && m0.material ? m0.material.getClassName() : 'no mat');
      }
      if (this.assemblyManager.ghostGroup) {
        const gc = (this.assemblyManager.ghostGroup.getChildMeshes && this.assemblyManager.ghostGroup.getChildMeshes().length) || 0;
        console.log('[Diag] ghost: pos=', this.assemblyManager.ghostGroup.position, 'enabled=', this.assemblyManager.ghostGroup.isEnabled(), 'children=', gc);
      }
      console.log('[Diag] camera: pos=', this.camera.position, 'target=', this.camera.getTarget ? this.camera.getTarget() : 'n/a', 'mode=', this.isAssemblyMode ? 'assembly' : 'custom');
      console.log('[Diag] scene meshes total:', this.scene.meshes.length, 'enabled:', this.scene.meshes.filter(m => m.isEnabled()).length);
      this._updateBackgroundVisibility();

      // Show the gesture tutorial the first time the child enters a
      // mission. Auto-dismisses when they pinch (tryGrab) or after 8s.
      this._showGestureTutorial();

      if (mission && this.audioManager) {
        try { this.audioManager.play('powerUp'); } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('[WorkshopController] enterAssemblyMode failed:', err);
      this.isAssemblyMode = false;
      // Re-show the customization panel so the user isn't stuck
      if (this.partInfoPanel) this.partInfoPanel.hide();
    }
  }

  exitAssemblyMode() {
    this.isAssemblyMode = false;
    if (this.assemblyManager) this.assemblyManager.stopAssembly();
    this.targetCameraZ = this.baseCameraZ;
    this._hideAssemblyProgressUI();
    this._updateBackgroundVisibility();
    this._hideGestureTutorial();
  }

  _hideGestureTutorial() {
    if (this._gestureTutorialTimer) { clearTimeout(this._gestureTutorialTimer); this._gestureTutorialTimer = null; }
    if (this._gestureTutorialPoll) { cancelAnimationFrame(this._gestureTutorialPoll); this._gestureTutorialPoll = null; }
    if (this._gestureTutorialEl && this._gestureTutorialEl.parentNode) {
      this._gestureTutorialEl.parentNode.removeChild(this._gestureTutorialEl);
    }
    this._gestureTutorialEl = null;
    this._gestureTutorialDismissed = true;
  }

  _onAssemblyComplete(robotLevel) {
    console.log('[WorkshopController] Assembly complete! Level:', robotLevel);
    this._hideAssemblyProgressUI();
    // Keep the robot on stage — celebrate first, then exit on user click.
    this._showVictory(robotLevel);
  }

  /**
   * Celebrate mission completion. Sequence:
   *  1. Schematic bounces (scale 1 → 1.08 → 1.05) and its emissive
   *     intensity ramps up + cycles through mission accent colors.
   *  2. 3D confetti burst from the robot's chest, falling for ~3s.
   *  3. Victory text overlay with the robot's name + a CONTINUAR button.
   *  4. Clicking CONTINUAR fires the external callback (returns to
   *     the mission selector) and cleans up particles + schematic state.
   */
  _showVictory(robotLevel) {
    const mission = this._currentMissionId ? getMission(this._currentMissionId) : null;
    const missionColor = mission ? this._hexToColor3(mission.color) : new Color3(0, 1, 1);
    const robotName = this._currentRobotName || 'tu robot';

    // 1. Schematic bounce + glow
    if (this.schematic) {
      const baseScale = this.schematic.scaling.x || 1;
      const startScale = baseScale * 0.92;
      this.schematic.scaling.set(startScale, startScale, startScale);
      gsap.to(this.schematic.scaling, {
        x: baseScale * 1.10, y: baseScale * 1.10, z: baseScale * 1.10,
        duration: 0.35, ease: 'power2.out',
        onComplete: () => {
          gsap.to(this.schematic.scaling, {
            x: baseScale * 1.04, y: baseScale * 1.04, z: baseScale * 1.04,
            duration: 0.4, ease: 'elastic.out(1, 0.5)',
          });
        },
      });
      // Boost emissive on the schematic's child meshes
      this._pulseSchematicEmissive(missionColor);
    }

    // 2. Confetti
    this._spawnConfetti(missionColor);

    // 3. Victory overlay
    this._showVictoryOverlay(robotName, mission);

    // 4. Optional audio cue (best-effort)
    if (this.audioManager) {
      try { this.audioManager.play('victory'); } catch (e) { /* ignore */ }
    }
  }

  _pulseSchematicEmissive(targetColor) {
    if (!this.schematic || !this.schematic.getChildMeshes) return;
    const meshes = this.schematic.getChildMeshes();
    const original = [];
    meshes.forEach((m) => {
      if (m.material) {
        original.push({
          mesh: m,
          emi: m.material.emissiveIntensity ?? 0,
          color: m.material.emissiveColor ? m.material.emissiveColor.clone() : new Color3(0, 0, 0),
        });
        m.material.emissiveColor = targetColor.clone();
        m.material.emissiveIntensity = 1.0;
      }
    });
    // Pulse up
    gsap.to({}, {
      duration: 0.45, ease: 'power2.out',
      onUpdate: function () {
        const t = this.time() / 0.45;
        const v = 1.0 + Math.sin(t * Math.PI * 3) * 0.8;
        original.forEach((o) => { o.mesh.material.emissiveIntensity = v; });
      },
      onComplete: () => {
        // Slow pulse forever until victory ends
        const start = performance.now();
        const tick = () => {
          if (!this._victoryActive) {
            // Restore
            original.forEach((o) => {
              o.mesh.material.emissiveColor = o.color;
              o.mesh.material.emissiveIntensity = o.emi;
            });
            return;
          }
          const t = (performance.now() - start) / 1000;
          const v = 0.4 + Math.sin(t * 2.0) * 0.3;
          original.forEach((o) => { o.mesh.material.emissiveIntensity = v; });
          requestAnimationFrame(tick);
        };
        this._victorySchematicTick = tick;
        requestAnimationFrame(tick);
      },
    });
  }

  _spawnConfetti(color) {
    if (!this.scene) return;
    const cap = this.config.isMobile ? 30 : 60;
    const ps = new ParticleSystem('confetti', cap, this.scene);
    // Procedural particle texture (simple disc) so we don't load a PNG.
    ps.particleTexture = this._getOrCreateParticleTexture();
    // Emit from robot chest
    ps.emitter = new Vector3(0, 1.0, 0);
    ps.minEmitBox = new Vector3(-0.4, 0, -0.4);
    ps.maxEmitBox = new Vector3(0.4, 0.2, 0.4);
    ps.color1 = new Color4(color.r, color.g, color.b, 1.0);
    ps.color2 = new Color4(1.0, 1.0, 1.0, 1.0);
    ps.colorDead = new Color4(color.r * 0.5, color.g * 0.5, color.b * 0.5, 0.0);
    ps.minSize = 0.08;
    ps.maxSize = 0.18;
    ps.minLifeTime = 2.0;
    ps.maxLifeTime = 3.5;
    ps.emitRate = cap / 1.0;
    ps.gravity = new Vector3(0, -2.0, 0);
    ps.direction1 = new Vector3(-1.5, 4, -1.5);
    ps.direction2 = new Vector3(1.5, 6, 1.5);
    ps.minAngularSpeed = -3;
    ps.maxAngularSpeed = 3;
    ps.minEmitPower = 1;
    ps.maxEmitPower = 3;
    ps.updateSpeed = 0.01;
    ps.targetStopDuration = 0.6;
    ps.disposeOnStop = true;
    ps.start();
    this._confettiSystem = ps;
  }

  _getOrCreateParticleTexture() {
    if (this._cachedParticleTexture) return this._cachedParticleTexture;
    // Create a 32x32 disc texture on the fly using a canvas.
    const size = 32;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.6, 'rgba(255,255,255,0.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    const url = c.toDataURL('image/png');
    const tex = new Texture(url, this.scene, true, false);
    tex.hasAlpha = true;
    this._cachedParticleTexture = tex;
    return tex;
  }

  _showVictoryOverlay(robotName, mission) {
    if (this._victoryOverlayEl) return;
    this._victoryActive = true;
    const accent = mission ? mission.color : '#00ffff';
    const title = mission ? mission.name : 'Misión';
    const html = `
      <div class="vct__title" style="color:${accent}; text-shadow:0 0 24px ${accent}66;">¡MISIÓN CUMPLIDA!</div>
      <div class="vct__sub">${this._escapeHtml(title)} · Has construido a <b>${this._escapeHtml(robotName)}</b></div>
      <button class="vct__btn" style="background:${accent};">CONTINUAR</button>
    `;
    const el = document.createElement('div');
    el.className = 'vct';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Misión cumplida');
    el.innerHTML = html;
    if (!document.getElementById('victory-styles')) {
      const s = document.createElement('style');
      s.id = 'victory-styles';
      s.textContent = `
        .vct {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 18px; pointer-events: none;
          font-family: 'Nunito', system-ui, -apple-system, sans-serif;
          color: #fff;
          animation: vct-in 0.6s ease both;
        }
        @keyframes vct-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .vct__title {
          font-size: clamp(36px, 8vw, 72px);
          font-weight: 900;
          letter-spacing: 0.04em;
          text-align: center;
          margin: 0;
        }
        .vct__sub {
          font-size: clamp(14px, 3vw, 22px);
          font-weight: 600;
          text-align: center;
          background: rgba(0, 0, 0, 0.45);
          padding: 10px 18px;
          border-radius: 12px;
          backdrop-filter: blur(4px);
        }
        .vct__btn {
          pointer-events: auto;
          margin-top: 12px;
          padding: 16px 36px;
          font-size: clamp(16px, 3vw, 22px);
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #001220;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          box-shadow: 0 0 24px currentColor, 0 6px 24px rgba(0,0,0,0.5);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          font-family: inherit;
        }
        .vct__btn:hover { transform: scale(1.05); }
        .vct__btn:active { transform: scale(0.96); }
      `;
      document.head.appendChild(s);
    }
    const btn = el.querySelector('.vct__btn');
    btn.addEventListener('click', () => this._endVictory());
    // Also support keyboard enter / space
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._endVictory();
      }
    };
    window.addEventListener('keydown', onKey);
    this._victoryKeyHandler = onKey;
    this.container.appendChild(el);
    this._victoryOverlayEl = el;
  }

  _endVictory() {
    if (!this._victoryActive) return;
    this._victoryActive = false;
    // Remove overlay
    if (this._victoryOverlayEl && this._victoryOverlayEl.parentNode) {
      this._victoryOverlayEl.parentNode.removeChild(this._victoryOverlayEl);
    }
    this._victoryOverlayEl = null;
    if (this._victoryKeyHandler) {
      window.removeEventListener('keydown', this._victoryKeyHandler);
      this._victoryKeyHandler = null;
    }
    // Stop the schematic emissive pulse loop (the onComplete callback
    // already restored originals when _victoryActive flipped to false)
    // Dispose confetti
    if (this._confettiSystem) {
      try { this._confettiSystem.stop(); } catch (e) { /* ignore */ }
      try { this._confettiSystem.dispose(); } catch (e) { /* ignore */ }
      this._confettiSystem = null;
    }
    // Restore camera + exit assembly
    this.exitAssemblyMode();
    // Fire external callback (returns to mission selector / menu)
    const externalCb = this.config.onAssemblyExternal;
    if (externalCb) externalCb(this._currentMissionId || this.config.targetLevel);
  }

  _hexToColor3(hex) {
    if (typeof hex === 'string') hex = parseInt(hex.replace('#', ''), 16);
    if (!Number.isFinite(hex)) return new Color3(0, 1, 1);
    return new Color3(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
  }

  _escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  // -------------------- UI --------------------

  _updateAssemblyProgressUI(count, total) {
    if (!this._assemblyProgressElement) {
      this._createAssemblyProgressUI();
    }
    if (this._assemblyProgressElement) {
      this._assemblyProgressElement.textContent = `Piezas: ${count}/${total}`;
    }
  }

  _createAssemblyProgressUI() {
    if (this._assemblyProgressElement) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:80px;left:50%;transform:translateX(-50%);color:#00ffff;font-family:Nunito,sans-serif;font-weight:600;font-size:18px;z-index:20;text-shadow:0 0 8px #00ffff;background:rgba(0,0,0,0.4);padding:8px 16px;border-radius:8px;border:1px solid rgba(0,255,255,0.3);';
    el.textContent = 'Piezas: 0/0';
    this.container.appendChild(el);
    this._assemblyProgressElement = el;
  }

  /**
   * Show a small bottom-of-screen card with the two gestures the child
   * needs to know to play:
   *   1. Pellizca (pulgar + índice) → AGARRAR
   *   2. Abre los dedos            → SOLTAR
   *
   * Each step has a tiny SVG hand icon that animates the gesture
   * (closing fingers / opening fingers). The card auto-dismisses when
   * the child successfully grabs a part, or after 8 seconds, or when
   * they click "¡Listo!".
   */
  _showGestureTutorial() {
    if (this._gestureTutorialEl) return;
    const el = document.createElement('div');
    el.style.cssText = [
      'position:absolute',
      'left:50%',
      'bottom:max(24px, env(safe-area-inset-bottom, 24px))',
      'transform:translateX(-50%)',
      'z-index:25',
      'display:flex',
      'gap:18px',
      'align-items:center',
      'padding:16px 20px',
      'max-width:calc(100vw - 32px)',
      'background:linear-gradient(160deg, rgba(0,30,60,0.95), rgba(0,10,30,0.95))',
      'border:2px solid rgba(0,255,255,0.6)',
      'border-radius:18px',
      'box-shadow:0 0 30px rgba(0,255,255,0.25), 0 8px 24px rgba(0,0,0,0.5)',
      'font-family:Nunito,system-ui,sans-serif',
      'color:#fff',
      'pointer-events:auto',
      'animation:gesture-tutorial-in 0.4s ease',
    ].join(';');

    // Inject keyframes once.
    if (!document.getElementById('gesture-tutorial-styles')) {
      const s = document.createElement('style');
      s.id = 'gesture-tutorial-styles';
      s.textContent = `
        @keyframes gesture-tutorial-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes gt-grab {
          0%, 100% { transform: rotate(0deg); }
          50%      { transform: rotate(12deg) scale(0.92); }
        }
        @keyframes gt-release {
          0%, 100% { transform: rotate(0deg); }
          50%      { transform: rotate(-8deg) scale(1.05); }
        }
        .gt-hand-grab   { animation: gt-grab 1.6s ease-in-out infinite; transform-origin: 50% 80%; }
        .gt-hand-release{ animation: gt-release 1.6s ease-in-out infinite; transform-origin: 50% 80%; }
      `;
      document.head.appendChild(s);
    }

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px;">
        <svg class="gt-hand-grab" width="56" height="56" viewBox="0 0 64 64" fill="none">
          <ellipse cx="32" cy="48" rx="14" ry="10" fill="#ffe5a8" stroke="#ffaa33" stroke-width="2"/>
          <path d="M22 38 Q22 22 26 18" stroke="#ffaa33" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path d="M30 36 Q30 18 32 14" stroke="#ffaa33" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path d="M38 36 Q40 22 40 20" stroke="#ffaa33" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="32" cy="50" r="4" fill="#ff8866" opacity="0.6"/>
        </svg>
        <div style="font-size:11px;color:#00ffff;letter-spacing:2px;font-weight:700;">AGARRAR</div>
        <div style="font-size:13px;text-align:center;line-height:1.2;">Pellizca <span style="color:#00ffff;font-weight:700;">o cierra el puño</span></div>
      </div>
      <div style="width:1px;height:60px;background:rgba(0,255,255,0.3);"></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:120px;">
        <svg class="gt-hand-release" width="56" height="56" viewBox="0 0 64 64" fill="none">
          <ellipse cx="32" cy="48" rx="14" ry="10" fill="#ffe5a8" stroke="#ffaa33" stroke-width="2"/>
          <path d="M20 30 Q18 16 22 10" stroke="#ffaa33" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path d="M30 32 Q30 12 32 6" stroke="#ffaa33" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path d="M40 32 Q42 14 44 8" stroke="#ffaa33" stroke-width="3" stroke-linecap="round" fill="none"/>
          <path d="M48 34 Q52 22 50 16" stroke="#ffaa33" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="32" cy="50" r="4" fill="#ff8866" opacity="0.6"/>
        </svg>
        <div style="font-size:11px;color:#00ffff;letter-spacing:2px;font-weight:700;">SOLTAR</div>
        <div style="font-size:13px;text-align:center;line-height:1.2;"><span style="color:#00ffff;font-weight:700;">Abre los dedos</span> sobre el socket</div>
        <div style="font-size:10px;text-align:center;color:#00ff88;margin-top:2px;line-height:1.1;">(brilla verde = listo)</div>
      </div>
      ${this._isMobile ? '<div style="position:absolute;top:-34px;left:50%;transform:translateX(-50%);background:rgba(255,0,170,0.15);border:1.5px solid #f0a;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700;color:#f6a;letter-spacing:0.5px;white-space:nowrap;">👆 O TOCA Y ARRASTRA CON EL DEDO</div>' : ''}
      <button id="gt-dismiss" style="
        background:rgba(0,255,255,0.18);
        border:1.5px solid #00ffff;
        color:#fff;
        font-family:inherit;
        font-weight:700;
        font-size:13px;
        letter-spacing:1.5px;
        padding:10px 18px;
        border-radius:999px;
        cursor:pointer;
        margin-left:8px;
      ">¡Listo!</button>
    `;

    this.container.appendChild(el);
    this._gestureTutorialEl = el;
    this._gestureTutorialDismissed = false;

    const dismiss = () => {
      if (this._gestureTutorialDismissed) return;
      this._gestureTutorialDismissed = true;
      if (this._gestureTutorialEl) {
        this._gestureTutorialEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        this._gestureTutorialEl.style.opacity = '0';
        this._gestureTutorialEl.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
          if (this._gestureTutorialEl && this._gestureTutorialEl.parentNode) {
            this._gestureTutorialEl.parentNode.removeChild(this._gestureTutorialEl);
          }
          this._gestureTutorialEl = null;
        }, 280);
      }
    };

    el.querySelector('#gt-dismiss').addEventListener('click', dismiss);
    // Auto-dismiss after 8s.
    this._gestureTutorialTimer = setTimeout(dismiss, 8000);

    // Auto-dismiss the first time the child successfully grabs a part.
    // We poll the assemblyManager for grabbedPart; this is cheaper than
    // adding a callback and works regardless of grab source (hand or
    // mouse fallback).
    const watchGrab = () => {
      if (this._gestureTutorialDismissed) return;
      if (this.assemblyManager && this.assemblyManager.grabbedPart) {
        dismiss();
        return;
      }
      this._gestureTutorialPoll = requestAnimationFrame(watchGrab);
    };
    this._gestureTutorialPoll = requestAnimationFrame(watchGrab);
  }

  _hideAssemblyProgressUI() {
    if (this._assemblyProgressElement && this._assemblyProgressElement.parentNode) {
      this._assemblyProgressElement.parentNode.removeChild(this._assemblyProgressElement);
    }
    this._assemblyProgressElement = null;
  }

  /**
   * Show a kid-friendly assembly message (wrong piece, drop closer, etc.)
   * as a centered DOM overlay that auto-dismisses after 2 seconds. Used
   * by the AssemblyManager's onInvalidDrop callback (HU-52).
   */
  _showAssemblyMessage(text) {
    if (this._assemblyMessageTimer) {
      clearTimeout(this._assemblyMessageTimer);
      this._assemblyMessageTimer = null;
    }
    if (this._assemblyMessageEl && this._assemblyMessageEl.parentNode) {
      this._assemblyMessageEl.parentNode.removeChild(this._assemblyMessageEl);
    }
    const el = document.createElement('div');
    el.id = 'cw-assembly-message';
    el.textContent = text;
    el.style.cssText = [
      'position:absolute',
      'top:35%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'padding:14px 28px',
      'background:rgba(255,34,68,0.18)',
      'border:2px solid rgba(255,80,120,0.9)',
      'border-radius:14px',
      'color:#ffd0d8',
      'font-family:Nunito,sans-serif',
      'font-weight:800',
      'font-size:22px',
      'text-shadow:0 0 12px rgba(255,80,120,0.8)',
      'box-shadow:0 0 32px rgba(255,34,68,0.4)',
      'z-index:30',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.2s',
    ].join(';');
    document.body.appendChild(el);
    this._assemblyMessageEl = el;
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    this._assemblyMessageTimer = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (this._assemblyMessageEl === el) this._assemblyMessageEl = null;
      }, 250);
    }, 2000);
  }

  // -------------------- Customization panel (DOM) --------------------

  injectCustomizationPanel() {
    if (document.getElementById('workshop-customization-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'workshop-customization-panel';
    panel.style.cssText = [
      'position:fixed',
      'left:0',
      'right:0',
      'bottom:0',
      'top:auto',
      'background:rgba(0,10,20,0.92)',
      'backdrop-filter:blur(12px)',
      '-webkit-backdrop-filter:blur(12px)',
      'border-top:2px solid rgba(0,255,255,0.5)',
      'box-shadow:0 -8px 24px rgba(0,0,0,0.6)',
      'z-index:9999',
      'padding:12px 14px',
      'padding-bottom:calc(12px + env(safe-area-inset-bottom, 0px))',
      'font-family:Nunito,system-ui,-apple-system,sans-serif',
      'color:#fff',
      'display:flex',
      'flex-direction:row',
      'align-items:center',
      'gap:12px',
      'box-sizing:border-box',
    ].join(';');

    const data = RobotCustomization.getData();
    const colors = [
      { hex: 0x00ff88, name: 'Verde' },
      { hex: 0x00ffff, name: 'Cian' },
      { hex: 0xff8800, name: 'Naranja' },
      { hex: 0xff0088, name: 'Rosa' },
      { hex: 0xffff00, name: 'Amarillo' },
      { hex: 0xffffff, name: 'Blanco' },
    ];

    let colorButtons = '';
    for (const c of colors) {
      const sel = (c.hex === data.colorHex) ? 'outline:3px solid #fff;outline-offset:3px;' : '';
      colorButtons += `<button class="cw-color" data-hex="${c.hex.toString(16)}" aria-label="${c.name}" style="width:34px;height:34px;border-radius:50%;border:2px solid #000;background:#${c.hex.toString(16).padStart(6, '0')};cursor:pointer;${sel}flex-shrink:0;"></button>`;
    }

    panel.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1 1 auto;overflow:hidden;">
        <div style="font-size:11px;color:#0ff;letter-spacing:0.05em;text-transform:uppercase;font-weight:700;">Color</div>
        <div style="display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;">${colorButtons}</div>
      </div>
      <button id="cw-start" type="button" style="flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:16px 22px;min-height:56px;min-width:160px;background:linear-gradient(135deg,#00ffff,#0088ff);color:#000;border:none;border-radius:14px;font-weight:900;cursor:pointer;font-size:18px;letter-spacing:0.04em;box-shadow:0 4px 20px rgba(0,255,255,0.5),0 0 0 2px rgba(0,255,255,0.3) inset;white-space:nowrap;font-family:inherit;">▶ COMENZAR MISIÓN</button>
    `;

    document.body.appendChild(panel);

    panel.querySelectorAll('.cw-color').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = parseInt(btn.dataset.hex, 16);
        RobotCustomization.save({ colorHex: hex });
        panel.querySelectorAll('.cw-color').forEach(b => {
          b.style.outline = '';
          b.style.outlineOffset = '';
        });
        btn.style.outline = '3px solid #fff';
        btn.style.outlineOffset = '3px';
        this._updateHologramColor(hex);
      });
    });
    const startBtn = panel.querySelector('#cw-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        console.log('[WorkshopController] COMENZAR MISIÓN clicked, missionSelector:', !!this.missionSelector);
        try { this.audioManager && this.audioManager.play && this.audioManager.play('click'); } catch (e) { /* ignore */ }
        if (!this.missionSelector) {
          console.warn('[WorkshopController] no missionSelector to show!');
          return;
        }
        try {
          this.missionSelector.show((missionId) => {
            this.enterAssemblyMode(missionId);
          });
          console.log('[WorkshopController] missionSelector.show() returned, element:', !!this.missionSelector.element);
        } catch (err) {
          console.error('[WorkshopController] missionSelector.show() threw:', err);
        }
      });
    }
  }

  _updateHologramColor(hex) {
    const color = new Color3(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
    if (!this.schematic) return;
    const setColor = (mesh) => {
      if (!mesh.material) return;
      const m = mesh.material;
      if (m.diffuseColor) m.diffuseColor = color.clone();
      if (m.emissiveColor) m.emissiveColor = color.clone();
      if (m.edgesColor) m.edgesColor = new Color4(color.r, color.g, color.b, 1);
    };
    if (this.schematic.getChildMeshes) {
      this.schematic.getChildMeshes().forEach(setColor);
    }
  }

  // -------------------- Debug / Resize --------------------

  _getDebugInfo() {
    let anyHandGrabbing = false;
    let grabTargetStr = '';
    for (const [, s] of this.handStates) {
      if (s.isGrabbing) { anyHandGrabbing = true; break; }
    }
    return {
      fps: Math.round(this.currentFps),
      hands: this.handStates.size,
      isMobile: this._isMobile,
      cameraZ: this.camera.position.z.toFixed(2),
      schematic: this.schematic ? 'loaded' : 'loading',
      assembly: this.isAssemblyMode ? 'active' : 'idle',
      grabbing: anyHandGrabbing,
    };
  }

  getHandCount() {
    return this.handStates.size;
  }

  updateFps(timestamp) {
    this.fpsFrames++;
    const elapsed = timestamp - this.fpsLastTime;
    if (elapsed >= 1000) {
      this.currentFps = (this.fpsFrames * 1000) / elapsed;
      this.fpsFrames = 0;
      this.fpsLastTime = timestamp;
      this._adaptResolution();
    }
  }

  /**
   * Adaptive resolution scaling for mobile: if the frame rate drops
   * below 22 fps, lower the hardware scaling level (render at lower
   * resolution). If it climbs back above 32 fps, restore the target.
   * This keeps the demo playable on weaker phones without having
   * to set a permanent low resolution that would look bad on flagships.
   *
   * Hysteresis: scale up only after sustained recovery (5s above 32)
   * to avoid oscillation. Scale down immediately on a single bad
   * sample (the user is already suffering, no reason to wait).
   */
  _adaptResolution() {
    if (!this._isMobile) return;
    if (!this.engine || !this.scene) return;
    const targetScale = 1 / this._renderScale; // 1.667 = 60% render
    const currentScale = this.engine.getHardwareScalingLevel();
    const fps = this.currentFps;
    if (fps < 22 && currentScale < 2.5) {
      // Drop resolution: increase scaling (render at smaller pixel count).
      this.engine.setHardwareScalingLevel(Math.min(2.5, currentScale + 0.3));
      this._recoveryFrames = 0;
    } else if (fps > 32) {
      // Count consecutive good frames before scaling back up.
      this._recoveryFrames = (this._recoveryFrames || 0) + 1;
      if (this._recoveryFrames >= 5 && currentScale > targetScale + 0.05) {
        this.engine.setHardwareScalingLevel(Math.max(targetScale, currentScale - 0.2));
        this._recoveryFrames = 0;
      }
    } else {
      this._recoveryFrames = 0;
    }
  }

  enableDebug(callback) { this.debugCallback = callback; }
  disableDebug() { this.debugCallback = null; }

  handleResize() {
    // Engine may be null if the workshop was disposed (e.g. the user
    // navigated away while a fatal Babylon error was still bubbling).
    // Bail silently instead of crashing the resize observer.
    if (!this.engine) return;
    try { this.engine.resize(); } catch (e) { /* engine may have been disposed between the null check and the call */ }
  }

  /**
   * Create a DOM-based pinch indicator that shows where the user's fingers
   * are detected and how close to triggering a grab. Renders a small
   * circle at the pinch midpoint with a progress ring that fills as the
   * pinchRatio drops below PINCH_START.
   */
  _createPinchIndicator() {
    if (document.getElementById('cw-pinch-indicator')) return;
    const el = document.createElement('div');
    el.id = 'cw-pinch-indicator';
    // Larger circle (96px) so it visually communicates the generous
    // grab radius (3.5-6.0 world units at z=12 camera). Kids can see
    // exactly where the grab zone is and aim accordingly.
    el.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:96px',
      'height:96px',
      'margin-left:-48px',
      'margin-top:-48px',
      'border-radius:50%',
      'border:2px solid rgba(0,255,255,0.6)',
      'background:rgba(0,255,255,0.08)',
      'pointer-events:none',
      'z-index:9998',
      'display:none',
      'box-sizing:border-box',
      'transition:border-color 0.1s, background 0.1s',
    ].join(';');
    el.innerHTML = `<div style="position:absolute;inset:6px;border-radius:50%;background:conic-gradient(rgba(0,255,255,0.85) 0deg, rgba(0,255,255,0.85) var(--pinch-arc,0deg), transparent var(--pinch-arc,0deg) 360deg);transition:--pinch-arc 0.05s linear;"></div>`;
    document.body.appendChild(el);
    this.pinchIndicator = el;

    // Inject a small label that says PELLIZCO/ABIERTO
    const label = document.createElement('div');
    label.id = 'cw-pinch-label';
    label.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'padding:2px 8px',
      'border-radius:10px',
      'background:rgba(0,10,20,0.85)',
      'color:#0ff',
      'font:700 11px/1.4 Nunito,system-ui,sans-serif',
      'letter-spacing:0.06em',
      'pointer-events:none',
      'z-index:9998',
      'display:none',
      'transform:translate(-50%,32px)',
      'white-space:nowrap',
    ].join(';');
    document.body.appendChild(label);
    this.pinchLabel = label;
  }

  /**
   * Update the pinch indicator at the pinch midpoint (screen coords).
   * @param {number} screenX  in pixels
   * @param {number} screenY  in pixels
   * @param {number} ratio    pinchDist / handSize
   * @param {boolean} isPinching
   */
  _updatePinchIndicator(screenX, screenY, ratio, isPinching, isOpenHand) {
    if (!this.pinchIndicator || !this.pinchLabel) return;
    // Show how "pinched" the fingers are. The arc fills clockwise as
    // the tip distance shrinks.
    const start = this._isMobile ? 0.55 : 0.40;
    const release = this._isMobile ? 0.80 : 0.55;
    const t = Math.max(0, Math.min(1, (release - ratio) / (release - start)));
    const arcDeg = Math.round(t * 360);
    this.pinchIndicator.style.display = 'block';
    this.pinchIndicator.style.left = `${screenX}px`;
    this.pinchIndicator.style.top = `${screenY}px`;
    const inner = this.pinchIndicator.firstElementChild;
    if (inner) inner.style.setProperty('--pinch-arc', `${arcDeg}deg`);

    if (isPinching) {
      this.pinchIndicator.style.borderColor = 'rgba(0,255,68,1)';
      this.pinchIndicator.style.background = 'rgba(0,255,68,0.25)';
      this.pinchLabel.textContent = '✓ AGARRANDO';
      this.pinchLabel.style.color = '#0f4';
    } else if (isOpenHand) {
      // Explicitly open hand — clearest "release" signal
      this.pinchIndicator.style.borderColor = 'rgba(255,200,0,0.9)';
      this.pinchIndicator.style.background = 'rgba(255,200,0,0.12)';
      this.pinchLabel.textContent = '👋 MANO ABIERTA';
      this.pinchLabel.style.color = '#fc0';
    } else {
      this.pinchIndicator.style.borderColor = 'rgba(0,255,255,0.7)';
      this.pinchIndicator.style.background = 'rgba(0,255,255,0.08)';
      this.pinchLabel.textContent = `pellizca ${Math.round(ratio * 100)}%`;
      this.pinchLabel.style.color = '#0ff';
    }
    this.pinchLabel.style.display = 'block';
    this.pinchLabel.style.left = `${screenX}px`;
    this.pinchLabel.style.top = `${screenY}px`;
  }

  _hidePinchIndicator() {
    if (this.pinchIndicator) this.pinchIndicator.style.display = 'none';
    if (this.pinchLabel) this.pinchLabel.style.display = 'none';
  }

  /**
   * Touch fallback indicator: a magenta dot that follows the kid's finger
   * when they're using touch instead of hand tracking. This gives clear
   * visual feedback that touch is being detected and where the grab point
   * is in screen space.
   */
  _ensureTouchIndicator() {
    if (this._touchIndicator) return;
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.id = 'cw-touch-indicator';
    el.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:48px',
      'height:48px',
      'margin-left:-24px',
      'margin-top:-24px',
      'border-radius:50%',
      'border:3px solid rgba(255,0,170,0.85)',
      'background:rgba(255,0,170,0.18)',
      'pointer-events:none',
      'z-index:9998',
      'display:none',
      'box-sizing:border-box',
      'transition:transform 0.1s, background 0.1s, border-color 0.1s',
    ].join(';');
    const label = document.createElement('div');
    label.id = 'cw-touch-label';
    label.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'padding:3px 10px',
      'border-radius:10px',
      'background:rgba(20,0,15,0.85)',
      'color:#f0a',
      'font:800 12px/1.4 Nunito,system-ui,sans-serif',
      'letter-spacing:0.06em',
      'text-transform:uppercase',
      'pointer-events:none',
      'z-index:9998',
      'display:none',
      'white-space:nowrap',
      'transform:translate(-50%,36px)',
    ].join(';');
    label.textContent = '👆 TOCANDO';
    document.body.appendChild(el);
    document.body.appendChild(label);
    this._touchIndicator = el;
    this._touchIndicatorLabel = label;
  }

  _updateTouchIndicator(screenX, screenY, isActive) {
    this._ensureTouchIndicator();
    if (!this._touchIndicator || !this._touchIndicatorLabel) return;
    this._touchIndicator.style.display = 'block';
    this._touchIndicator.style.left = `${screenX}px`;
    this._touchIndicator.style.top = `${screenY}px`;
    this._touchIndicatorLabel.style.display = 'block';
    this._touchIndicatorLabel.style.left = `${screenX}px`;
    this._touchIndicatorLabel.style.top = `${screenY}px`;
    if (isActive) {
      this._touchIndicator.style.borderColor = 'rgba(255,68,170,1)';
      this._touchIndicator.style.background = 'rgba(255,68,170,0.30)';
      this._touchIndicator.style.transform = 'scale(1.15)';
      this._touchIndicatorLabel.textContent = '✓ TOCANDO';
      this._touchIndicatorLabel.style.color = '#f6a';
    } else {
      this._touchIndicator.style.borderColor = 'rgba(255,0,170,0.5)';
      this._touchIndicator.style.background = 'rgba(255,0,170,0.10)';
      this._touchIndicator.style.transform = 'scale(0.85)';
      this._touchIndicatorLabel.textContent = '👆 TOCA UNA PIEZA';
      this._touchIndicatorLabel.style.color = '#f0a';
    }
  }

  _hideTouchIndicator() {
    if (this._touchIndicator) this._touchIndicator.style.display = 'none';
    if (this._touchIndicatorLabel) this._touchIndicatorLabel.style.display = 'none';
  }

  /**
   * Kid-friendly snap hint. Shown when a part is grabbed:
   *  - 'ready' → "✨ ¡SUELTA AQUÍ!" (green, pulsing)
   *  - 'near'  → "🎯 ACÉRCATE MÁS" (yellow)
   *  - 'far'   → (no hint, the kid is dragging)
   *  - 'wrong' → "❌ ¡ESTA NO ES!" (red, briefly)
   * The hint floats at the top of the screen so the kid doesn't have
   * to look at the small pinch indicator. Replaces the silent "nothing
   * happens" experience with clear feedback.
   */
  _ensureSnapHint() {
    if (this._snapHintEl) return;
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.id = 'cw-snap-hint';
    el.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:max(72px, env(safe-area-inset-top, 16px) + 56px)',
      'transform:translate(-50%, -10px)',
      'z-index:24',
      'padding:10px 22px',
      'border-radius:999px',
      'background:rgba(0,15,30,0.92)',
      'border:2px solid rgba(0,255,136,0.7)',
      'color:#0f8',
      'font:800 14px/1 Nunito,system-ui,sans-serif',
      'letter-spacing:0.04em',
      'text-transform:uppercase',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.2s, transform 0.2s, border-color 0.2s, color 0.2s',
      'box-shadow:0 0 20px rgba(0,255,136,0.25)',
      'white-space:nowrap',
    ].join(';');
    document.body.appendChild(el);
    this._snapHintEl = el;
    this._snapHintState = null;
    this._snapHintHideAt = 0;
  }

  /**
   * Shows a 2D label "← ¡AGARRA ESTA!" that follows the next-order part
   * in screen space. The kid sees a clear arrow pointing to the part
   * they need to grab next. Solves the "I don't know which part to grab"
   * confusion that was making some missions impossible to complete.
   */
  _ensureNextPartLabel() {
    if (this._nextPartLabel) return;
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.id = 'cw-next-part-label';
    el.style.cssText = [
      'position:absolute',
      'transform:translate(-50%, -100%)',
      'z-index:23',
      'padding:7px 16px',
      'border-radius:999px',
      'background:rgba(40,30,0,0.92)',
      'border:2.5px solid rgba(255,238,68,0.95)',
      'color:#ffe',
      'font:900 13px/1 Nunito,system-ui,sans-serif',
      'letter-spacing:0.04em',
      'text-transform:uppercase',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.25s, left 0.08s, top 0.08s',
      'box-shadow:0 0 18px rgba(255,238,68,0.4)',
      'white-space:nowrap',
    ].join(';');
    el.innerHTML = '← ¡AGARRA ESTA!';
    document.body.appendChild(el);
    this._nextPartLabel = el;
  }

  _updateNextPartLabel() {
    this._ensureNextPartLabel();
    if (!this._nextPartLabel || !this.assemblyManager) return;
    // Find the next-order part
    const nextOrder = this.assemblyManager._nextOrder;
    const nextPart = this.assemblyManager.parts.find(
      (p) => p.metadata.partData.order === nextOrder
        && this.assemblyManager._partStates.get(p.metadata.partId) !== 'placed'
    );
    if (!nextPart || !this.camera || !this.engine || !this.scene) {
      this._hideNextPartLabel();
      return;
    }
    try {
      // Project the part's world position to screen coordinates.
      // The label sits ABOVE the part (offset in world Y).
      const worldPos = nextPart.getAbsolutePosition();
      const labelPos = new Vector3(worldPos.x, worldPos.y + 1.2, worldPos.z);
      const transformMatrix = this.scene.getTransformMatrix();
      const proj = Vector3.Project(
        labelPos,
        Matrix.Identity(),
        transformMatrix,
        this.camera.viewport.toGlobal(
          this.engine.getRenderWidth(),
          this.engine.getRenderHeight(),
        ),
      );
      // proj.x and proj.y are in render-target pixel coordinates.
      // Scale to CSS pixels.
      const renderWidth = this.engine.getRenderWidth();
      const renderHeight = this.engine.getRenderHeight();
      const cssWidth = this.container.clientWidth;
      const cssHeight = this.container.clientHeight;
      if (!cssWidth || !cssHeight || !renderWidth || !renderHeight) {
        this._hideNextPartLabel();
        return;
      }
      const cssX = (proj.x / renderWidth) * cssWidth;
      const cssY = (proj.y / renderHeight) * cssHeight;
      // Hide if behind the camera (z > 1 in NDC) or off-screen
      if (proj.z > 1 || cssX < 0 || cssX > cssWidth || cssY < 0 || cssY > cssHeight) {
        this._hideNextPartLabel();
        return;
      }
      this._nextPartLabel.style.left = `${cssX}px`;
      this._nextPartLabel.style.top = `${cssY - 12}px`;
      if (this._nextPartLabel.style.opacity !== '1') {
        this._nextPartLabel.style.opacity = '1';
      }
    } catch (e) {
      this._hideNextPartLabel();
    }
  }

  _hideNextPartLabel() {
    if (this._nextPartLabel && this._nextPartLabel.style.opacity !== '0') {
      this._nextPartLabel.style.opacity = '0';
    }
  }

  _updateSnapHint(snap) {
    this._ensureSnapHint();
    if (!this._snapHintEl) return;
    const el = this._snapHintEl;
    const now = performance.now();

    if (!snap) {
      // No part grabbed — fade out
      if (this._snapHintState !== null) {
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%, -10px)';
        this._snapHintState = null;
      }
      return;
    }

    let text, color, border, bg;
    if (snap.state === 'ready') {
      text = '✨ ¡SUELTA AQUÍ!';
      color = '#0f8';
      border = 'rgba(0,255,136,0.9)';
      bg = 'rgba(0,40,20,0.92)';
    } else if (snap.state === 'close') {
      text = '🎯 ¡CASI! ACÉRCATE UN POCO';
      color = '#8f8';
      border = 'rgba(0,255,136,0.5)';
      bg = 'rgba(0,30,15,0.92)';
    } else if (snap.state === 'near') {
      text = '🎯 ACÉRCATE MÁS AL ROBOT';
      color = '#fc0';
      border = 'rgba(255,200,0,0.8)';
      bg = 'rgba(40,30,0,0.92)';
    } else if (snap.state === 'wrong') {
      // Only show for 1.2s to avoid being annoying
      if (this._snapHintState !== 'wrong') {
        this._snapHintHideAt = now + 1200;
      }
      if (now > this._snapHintHideAt) {
        if (this._snapHintState !== null) {
          el.style.opacity = '0';
          this._snapHintState = null;
        }
        return;
      }
      text = '❌ ¡ESTA NO ES!';
      color = '#f44';
      border = 'rgba(255,68,68,0.9)';
      bg = 'rgba(40,0,0,0.92)';
    } else {
      // 'far' — don't show anything, kid is just dragging
      if (this._snapHintState !== null) {
        el.style.opacity = '0';
        this._snapHintState = null;
      }
      return;
    }

    // Update content if state changed
    if (this._snapHintState !== snap.state) {
      el.textContent = text;
      el.style.color = color;
      el.style.borderColor = border;
      el.style.background = bg;
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, 0)';
      this._snapHintState = snap.state;
    } else if (snap.state === 'ready') {
      // Gentle pulse on ready state
      const pulse = 1 + 0.06 * Math.sin(now * 0.008);
      el.style.transform = `translate(-50%, 0) scale(${pulse})`;
    }
  }

  /**
   * Create a small picture-in-picture preview of the camera feed so the
   * user can see what the camera is seeing. Critical on mobile, where
   * the back camera faces away from the user and they would otherwise be
   * guessing whether their hand is in frame.
   *
   * The preview is:
   *   - Mirrored horizontally (so left hand = left side of preview,
   *     matching the user's mental model)
   *   - Draggable (touch + mouse) so the user can move it out of the way
   *     of the robot/parts
   *   - Semi-transparent so it doesn't distract from the 3D scene
   *   - Updates the landmark overlay each frame from the cached
   *     `result.landmarks` returned by the HandTracker
   *   - Auto-hides if no camera is available
   */
  _setupCameraPreview() {
    if (this._cameraPreviewEl) return;
    if (!this._cameraPreviewEnabled) return;
    const stream = this.handTracker && this.handTracker.stream;
    if (!stream) {
      // Camera not granted yet — nothing to preview. We try again when
      // the user actually starts the workshop with a working stream.
      this._cameraPreviewPending = true;
      return;
    }

    // Container with rounded corners + drag handle
    const wrap = document.createElement('div');
    wrap.id = 'cw-camera-preview';
    wrap.style.cssText = [
      'position:absolute',
      'top:16px',
      'right:16px',
      'width:160px',
      'height:140px',
      'border-radius:14px',
      'overflow:hidden',
      'box-shadow:0 4px 18px rgba(0,0,0,0.55), 0 0 0 2px rgba(0,255,255,0.35)',
      'background:#000',
      'z-index:30',
      'touch-action:none',
      'user-select:none',
      'cursor:grab',
      'transition:opacity 0.2s ease',
    ].join(';');

    // Mirrored video element showing the same stream as the main feed
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'object-fit:cover',
      'transform:scaleX(-1)',  // mirror so the preview matches a mirror
    ].join(';');

    // Canvas overlay for hand landmarks (mirrored to match the video)
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    canvas.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      'transform:scaleX(-1)',
    ].join(';');

    // Label strip
    const label = document.createElement('div');
    label.textContent = '📷 Cámara';
    label.style.cssText = [
      'position:absolute',
      'left:0',
      'right:0',
      'bottom:0',
      'padding:4px 8px',
      'font:600 10px/1 Nunito,system-ui,sans-serif',
      'letter-spacing:1.5px',
      'color:#00ffff',
      'background:linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))',
      'text-transform:uppercase',
      'pointer-events:none',
    ].join(';');

    // "No hand" hint that appears when the camera sees nothing detected
    const noHandHint = document.createElement('div');
    noHandHint.textContent = '✋ Muestra tu mano';
    noHandHint.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'padding:4px 8px',
      'font:700 10px/1.2 Nunito,system-ui,sans-serif',
      'color:#ff8866',
      'background:rgba(0,0,0,0.6)',
      'border:1px solid rgba(255,136,102,0.5)',
      'border-radius:6px',
      'text-align:center',
      'pointer-events:none',
      'display:none',
    ].join(';');

    // Collapse button (turns the preview into a small "📷" button)
    const collapseBtn = document.createElement('button');
    collapseBtn.textContent = '−';
    collapseBtn.setAttribute('aria-label', 'Minimizar cámara');
    collapseBtn.style.cssText = [
      'position:absolute',
      'top:4px',
      'right:4px',
      'width:22px',
      'height:22px',
      'border:none',
      'border-radius:50%',
      'background:rgba(0,0,0,0.55)',
      'color:#00ffff',
      'font:700 14px/1 system-ui',
      'cursor:pointer',
      'padding:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';');

    wrap.appendChild(video);
    wrap.appendChild(canvas);
    wrap.appendChild(label);
    wrap.appendChild(noHandHint);
    wrap.appendChild(collapseBtn);
    this.container.appendChild(wrap);

    // Some browsers refuse to .play() a video until it has user-gesture
    // activation. The camera permission grant counts as a gesture, so
    // this should succeed — but catch and log just in case.
    video.play().catch((err) => {
      console.warn('[CameraPreview] video.play() rejected:', err);
    });

    this._cameraPreviewEl = wrap;
    this._cameraPreviewCanvas = canvas;
    this._cameraPreviewCtx = canvas.getContext('2d');
    this._cameraPreviewNoHand = noHandHint;
    this._cameraPreviewVideo = video;

    // Drag to move (works on touch + mouse). Stores position in CSS.
    let dragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    const onDown = (e) => {
      // Ignore if clicking the collapse button
      if (e.target === collapseBtn) return;
      dragging = true;
      wrap.style.cursor = 'grabbing';
      const pt = e.touches ? e.touches[0] : e;
      const rect = wrap.getBoundingClientRect();
      dragOffsetX = pt.clientX - rect.left;
      dragOffsetY = pt.clientY - rect.top;
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      const x = Math.max(0, Math.min(window.innerWidth - 40, pt.clientX - dragOffsetX));
      const y = Math.max(0, Math.min(window.innerHeight - 40, pt.clientY - dragOffsetY));
      wrap.style.left = x + 'px';
      wrap.style.top = y + 'px';
      wrap.style.right = 'auto';
      e.preventDefault();
    };
    const onUp = () => { dragging = false; wrap.style.cursor = 'grab'; };
    wrap.addEventListener('mousedown', onDown);
    wrap.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);

    // Collapse / expand
    let collapsed = false;
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      collapsed = !collapsed;
      video.style.display = collapsed ? 'none' : '';
      canvas.style.display = collapsed ? 'none' : '';
      label.style.display = collapsed ? 'none' : '';
      noHandHint.style.display = 'none';  // hide hint when collapsed
      wrap.style.width = collapsed ? '40px' : '160px';
      wrap.style.height = collapsed ? '40px' : '140px';
      collapseBtn.textContent = collapsed ? '📷' : '−';
    });
  }

  /**
   * Update the camera preview's landmark overlay. Called from
   * _updateHandTracking so the user can see what MediaPipe is seeing.
   */
  _updateCameraPreviewOverlay(landmarks) {
    if (!this._cameraPreviewCanvas || !this._cameraPreviewCtx) return;
    const ctx = this._cameraPreviewCtx;
    const w = this._cameraPreviewCanvas.width;
    const h = this._cameraPreviewCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!landmarks || landmarks.length === 0) {
      if (this._cameraPreviewNoHand) {
        // Only show the "show your hand" hint if the preview isn't collapsed
        const isCollapsed = this._cameraPreviewEl && this._cameraPreviewEl.style.width === '40px';
        this._cameraPreviewNoHand.style.display = isCollapsed ? 'none' : 'block';
      }
      return;
    }
    if (this._cameraPreviewNoHand) this._cameraPreviewNoHand.style.display = 'none';

    // Draw each detected hand: 21 landmarks + connecting lines
    for (const hand of landmarks) {
      // Connections between landmarks (subset of MediaPipe HAND_CONNECTIONS)
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],          // thumb
        [0, 5], [5, 6], [6, 7], [7, 8],          // index
        [0, 9], [9, 10], [10, 11], [11, 12],     // middle
        [0, 13], [13, 14], [14, 15], [15, 16],   // ring
        [0, 17], [17, 18], [18, 19], [19, 20],   // pinky
        [5, 9], [9, 13], [13, 17],               // palm
      ];
      ctx.strokeStyle = 'rgba(0,255,255,0.8)';
      ctx.lineWidth = 1.5;
      for (const [a, b] of connections) {
        const p1 = hand[a], p2 = hand[b];
        if (!p1 || !p2) continue;
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
      ctx.fillStyle = '#00ffff';
      for (const lm of hand) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Toggle the workshop environment + video feed visibility depending on
   * whether we're in customization or assembly mode. During assembly the
   * child should see only the robot + parts on a clean dark background.
   */
  _updateBackgroundVisibility() {
    const hideAll = this.isAssemblyMode;
    const envAlpha = hideAll ? 0 : 1;

    // Workshop environment (rings, panels, grid, atmosphere)
    if (this.rings && this.rings.getChildMeshes) {
      this.rings.getChildMeshes().forEach((m) => { m.visibility = envAlpha; m.setEnabled(!hideAll); });
    }
    if (this.panels && this.panels.getChildren) {
      this.panels.getChildren().forEach((c) => { if (c.setEnabled) c.setEnabled(!hideAll); });
    }
    if (this.grid && this.grid.plane) {
      this.grid.plane.setEnabled(!hideAll);
      if (this.grid.ring) this.grid.ring.setEnabled(!hideAll);
      // Hide scanner rings too (they're parented to the floor)
      if (this.grid.scannerRings) {
        this.grid.scannerRings.forEach((r) => r.mesh.setEnabled(!hideAll));
      }
    }
    if (this.atmosphere) {
      this.atmosphere.setVisible(!hideAll);
    }

    // Camera/video feed — dim during assembly but keep enough light that
    // the hand landmarks remain visible against the scene.
    const video = document.getElementById('webcam-video');
    if (video) {
      if (hideAll) {
        video.style.transition = 'opacity 0.4s';
        video.style.opacity = '0.25';
      } else {
        video.style.transition = 'opacity 0.4s';
        video.style.opacity = '0.5';
      }
    }
  }

  reset() {
    if (this.assemblyManager) this.assemblyManager.stopAssembly();
    this.isAssemblyMode = false;
    this.schematicTargetRotation = { x: 0, y: 0 };
    this.rotationVelocity = { x: 0, y: 0 };
  }

  /**
   * Opt-in: enable the camera preview PiP at runtime. On mobile, the
   * preview is disabled by default to avoid crashes on browsers that
   * don't support attaching a second <video> to the camera stream.
   * Call this from a user-gesture handler (button tap) to enable it.
   * Returns true on success, false if the camera is not ready.
   */
  enableCameraPreview() {
    if (this._cameraPreviewEl) return true;  // already on
    if (!this.handTracker || !this.handTracker.stream) return false;
    this._cameraPreviewEnabled = true;
    try {
      this._setupCameraPreview();
      return !!this._cameraPreviewEl;
    } catch (err) {
      console.warn('[WorkshopController] enableCameraPreview failed:', err);
      this._cameraPreviewEnabled = false;
      return false;
    }
  }

  /**
   * No-op kept for backwards compat. The actual error filter is now in
   * app.js so it can prevent the FATAL overlay from showing. See
   * `_isKnownBabylonDisposeRace` in app.js.
   */
  _installBabylonErrorFilter() { /* moved to app.js */ }

  dispose() {
    if (this._gestureTutorialTimer) { clearTimeout(this._gestureTutorialTimer); this._gestureTutorialTimer = null; }
    if (this._gestureTutorialPoll) { cancelAnimationFrame(this._gestureTutorialPoll); this._gestureTutorialPoll = null; }
    if (this.missionSelector) this.missionSelector.dispose();
    if (this.engine) {
      try { this.engine.stopRenderLoop(); } catch (e) { /* ignore */ }
      try { this.engine.dispose(); } catch (e) { /* ignore */ }
      this.engine = null;
    }
  }
}
