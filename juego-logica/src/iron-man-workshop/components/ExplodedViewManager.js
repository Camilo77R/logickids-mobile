/**
 * @fileoverview Exploded view animation system for the Mark VI holographic model (Babylon port).
 *
 * Provides a state machine-driven animation system that separates the Iron Man suit
 * into individual limb components with cinematic Bezier curve trajectories. Inspired
 * by the Mark 42/43 prehensile armor from Iron Man 3.
 *
 * @module iron-man-workshop/components/ExplodedViewManager
 */

import { Vector3, AbstractMesh } from '@babylonjs/core';
import gsap from 'gsap';
import { Howl } from 'howler';

const DEFAULT_CONFIG = {
  animationDuration: 1.2,
  enableSound: true,
  enableParticles: true,
};

/**
 * Cinematic timing constants (in seconds)
 * Based on Disney's 12 Principles of Animation and MCU Iron Man VFX
 */
const CINEMATIC_TIMING = {
  /** Brief "charge" before explosion - creates anticipation via glow effect */
  anticipation: 0.15,
  /** Main outward burst phase */
  burst: 1.6,
  /** Settle/overshoot phase (handled by easing) */
  settle: 0.4,
};

/**
 * Velocity multipliers per limb - lighter parts move faster.
 */
const LIMB_VELOCITY_MULTIPLIER = {
  head: 0.85,
  arm_hand_left: 0.88,
  arm_hand_right: 0.88,
  arm_forearm_left: 0.92,
  arm_forearm_right: 0.92,
  arm_upperarm_left: 0.98,
  arm_upperarm_right: 0.98,
  arm_shoulder_left: 1.02,
  arm_shoulder_right: 1.02,
  leg_left_feet: 0.9,
  leg_right_feet: 0.9,
  leg_left_calf: 0.95,
  leg_right_calf: 0.95,
  leg_left_thigh: 1.08,
  leg_right_thigh: 1.08,
  torso_front: 1.1,
  torso_back: 1.12,
};

/**
 * Micro-rotation during flight (radians) - adds liveliness.
 */
const LIMB_FLIGHT_SPIN = {
  head: 0.15,
  arm_shoulder_left: -0.12,
  arm_shoulder_right: 0.12,
  arm_upperarm_left: -0.18,
  arm_upperarm_right: 0.18,
  arm_forearm_left: -0.22,
  arm_forearm_right: 0.22,
  arm_hand_left: -0.28,
  arm_hand_right: 0.28,
  leg_left_thigh: -0.1,
  leg_right_thigh: 0.1,
  leg_left_calf: -0.15,
  leg_right_calf: 0.15,
  leg_left_feet: -0.2,
  leg_right_feet: 0.2,
  torso_front: 0.05,
  torso_back: -0.05,
};

/**
 * Explosion configuration per limb (17-part schematic).
 * Rotations stored as plain Euler-like objects (radians).
 */
const LIMB_EXPLOSION_CONFIG = {
  head: {
    targetOffset: new Vector3(2.1, 0.2, 0.8),
    controlOffset: new Vector3(0, 0.6, 0.4),
    rotation: { x: -0.6, y: 0.8, z: -0.2 },
    staggerDelay: 0.0,
  },

  torso_front: {
    targetOffset: new Vector3(1.0, -0.15, 1.2),
    controlOffset: new Vector3(0, 0.2, 0.4),
    rotation: { x: 0.5, y: -0.6, z: 0.2 },
    staggerDelay: 0.03,
  },
  torso_back: {
    targetOffset: new Vector3(1.0, -0.3, -1.4),
    controlOffset: new Vector3(0, 0.1, -0.5),
    rotation: { x: 0.7, y: -1.2, z: 0.15 },
    staggerDelay: 0.05,
  },

  arm_shoulder_left: {
    targetOffset: new Vector3(-0.6, 0.6, 0.5),
    controlOffset: new Vector3(0.3, 0.5, -0.2),
    rotation: { x: 0.5, y: -0.8, z: 1.2 },
    staggerDelay: 0.08,
  },
  arm_upperarm_left: {
    targetOffset: new Vector3(-0.9, 0.4, 0.25),
    controlOffset: new Vector3(0.4, 0.6, -0.3),
    rotation: { x: 0.6, y: -1.0, z: 1.4 },
    staggerDelay: 0.14,
  },
  arm_forearm_left: {
    targetOffset: new Vector3(-1.2, 0.0, -0.15),
    controlOffset: new Vector3(0.5, 0.7, -0.4),
    rotation: { x: 0.7, y: -1.1, z: 1.6 },
    staggerDelay: 0.2,
  },
  arm_hand_left: {
    targetOffset: new Vector3(-1.8, -0.3, -0.5),
    controlOffset: new Vector3(0.6, 0.8, -0.5),
    rotation: { x: 0.9, y: -1.2, z: 1.8 },
    staggerDelay: 0.28,
  },

  arm_shoulder_right: {
    targetOffset: new Vector3(1.5, 0.6, -0.4),
    controlOffset: new Vector3(-0.3, 0.5, -0.2),
    rotation: { x: 0.4, y: 0.7, z: 0.5 },
    staggerDelay: 0.06,
  },
  arm_upperarm_right: {
    targetOffset: new Vector3(1.2, 0.25, -0.7),
    controlOffset: new Vector3(-0.4, 0.6, -0.3),
    rotation: { x: 0.5, y: 0.9, z: 0.7 },
    staggerDelay: 0.12,
  },
  arm_forearm_right: {
    targetOffset: new Vector3(1.2, -0.15, -1.0),
    controlOffset: new Vector3(-0.5, 0.7, -0.4),
    rotation: { x: 0.55, y: 1.0, z: 0.8 },
    staggerDelay: 0.18,
  },
  arm_hand_right: {
    targetOffset: new Vector3(1.5, -0.5, -1.3),
    controlOffset: new Vector3(-0.6, 0.8, -0.4),
    rotation: { x: 0.6, y: 1.1, z: 0.9 },
    staggerDelay: 0.26,
  },

  leg_left_thigh: {
    targetOffset: new Vector3(-0.5, -0.1, 0.4),
    controlOffset: new Vector3(-0.3, -0.3, 0.5),
    rotation: { x: 0.15, y: -0.9, z: 1.3 },
    staggerDelay: 0.1,
  },
  leg_left_calf: {
    targetOffset: new Vector3(-0.9, -0.2, 0.6),
    controlOffset: new Vector3(-0.5, -0.5, 0.7),
    rotation: { x: 0.2, y: -1.1, z: 1.5 },
    staggerDelay: 0.16,
  },
  leg_left_feet: {
    targetOffset: new Vector3(-1.2, -0.6, 0.9),
    controlOffset: new Vector3(-0.7, -0.6, 0.8),
    rotation: { x: 0.25, y: -1.3, z: 1.8 },
    staggerDelay: 0.24,
  },

  leg_right_thigh: {
    targetOffset: new Vector3(0.8, 0, -0.3),
    controlOffset: new Vector3(0.3, -0.3, -0.4),
    rotation: { x: 0.35, y: 0.9, z: 0.4 },
    staggerDelay: 0.12,
  },
  leg_right_calf: {
    targetOffset: new Vector3(1.1, -0.2, -0.6),
    controlOffset: new Vector3(0.5, -0.5, -0.6),
    rotation: { x: 0.4, y: 1.1, z: 0.5 },
    staggerDelay: 0.18,
  },
  leg_right_feet: {
    targetOffset: new Vector3(1.3, -0.6, -1.0),
    controlOffset: new Vector3(0.7, -0.6, -0.8),
    rotation: { x: 0.5, y: 1.3, z: 0.6 },
    staggerDelay: 0.24,
  },
};

/** Random spread factor applied at runtime for unpredictable explosion. */
const EXPLOSION_RANDOM_SPREAD = 0.3;

/** Ordered list of articulated limb names matching the GLB model (17 parts). */
const LIMB_NAMES = [
  'head',
  'torso_front',
  'torso_back',
  'arm_shoulder_left',
  'arm_upperarm_left',
  'arm_forearm_left',
  'arm_hand_left',
  'arm_shoulder_right',
  'arm_upperarm_right',
  'arm_forearm_right',
  'arm_hand_right',
  'leg_left_thigh',
  'leg_left_calf',
  'leg_left_feet',
  'leg_right_thigh',
  'leg_right_calf',
  'leg_right_feet',
];

/**
 * Orchestrates cinematic exploded view animations for the Iron Man suit schematic.
 *
 * State machine: `assembled` → `exploding` → `exploded` → `assembling` → `assembled`.
 *
 * @example
 * ```js
 * const manager = new ExplodedViewManager(scene, schematicRoot, {
 *   animationDuration: 1.2,
 *   enableSound: false,
 *   onLimbMoveStart: (limbName, mesh) => particles.startEmitting(mesh),
 *   onLimbMoveEnd: (limbName, mesh) => particles.stopEmitting(mesh),
 * });
 * await manager.explode();
 * ```
 */
export class ExplodedViewManager {
  /**
   * @param {import('@babylonjs/core').Scene} scene - Babylon scene reference
   * @param {import('@babylonjs/core').TransformNode|import('@babylonjs/core').AbstractMesh} model
   *        Root node containing the 17 articulated limb meshes.
   * @param {object} [options] - Configuration overrides and callbacks.
   */
  constructor(scene, model, options = {}) {
    this.scene = scene;
    this.model = model;
    this.config = { ...DEFAULT_CONFIG, ...options };

    this.state = 'assembled';
    this.limbMeshes = new Map();
    this.originalStates = new Map();

    this.timeline = null;
    this.levitationTimeline = null;

    // Pre-allocated temp vector to avoid per-frame GC pressure
    this._tempTangent = new Vector3();

    this.sounds = {
      servoWhir: null,
      metalClick: null,
      powerUp: null,
    };

    if (this.config.enableSound) {
      this.initializeSounds();
    }

    if (model) {
      this.initialize(model);
    }
  }

  /**
   * Discovers limb meshes by name within the provided root node and stores
   * their original transforms for later restoration.
   *
   * Must be called after the GLB model is fully loaded. Expected 17 limb names
   * matching the articulated model parts.
   *
   * @param {import('@babylonjs/core').TransformNode|import('@babylonjs/core').AbstractMesh} root
   */
  initialize(root) {
    this.limbMeshes.clear();
    this.originalStates.clear();
    this.model = root;

    // Babylon: getChildMeshes(false) walks the full descendant tree
    const candidates = typeof root.getChildMeshes === 'function'
      ? root.getChildMeshes(false)
      : [];

    // Some GLB hierarchies expose the named node as a TransformNode parent,
    // also pull in descendants via getDescendants() as a fallback.
    const extra = typeof root.getDescendants === 'function'
      ? root.getDescendants(false).filter((n) => n instanceof AbstractMesh)
      : [];

    const allNodes = new Set([...candidates, ...extra]);

    for (const node of allNodes) {
      if (!node || !LIMB_NAMES.includes(node.name)) continue;
      if (this.limbMeshes.has(node.name)) continue;

      // Use Euler rotation throughout - convert away from quaternion if needed
      if (node.rotationQuaternion) {
        const euler = node.rotationQuaternion.toEulerAngles();
        node.rotation.copyFrom(euler);
        node.rotationQuaternion = null;
      }

      this.limbMeshes.set(node.name, node);
      this.originalStates.set(node.name, {
        position: node.position.clone(),
        rotation: node.rotation.clone(),
      });

      console.log(
        `[ExplodedViewManager] Registered limb: ${node.name}`,
        `pos: (${node.position.x.toFixed(2)}, ${node.position.y.toFixed(2)}, ${node.position.z.toFixed(2)})`,
      );
    }

    console.log(`[ExplodedViewManager] Initialized with ${this.limbMeshes.size} limbs`);
  }

  /**
   * Loads sound effects (Howler) for animation feedback. Gracefully handles
   * missing audio files.
   */
  initializeSounds() {
    try {
      this.sounds.servoWhir = new Howl({
        src: ['/src/iron-man-workshop/audio/servo-whir.mp3'],
        loop: true,
        volume: 0.3,
        preload: true,
        onloaderror: () => console.warn('[ExplodedViewManager] servo-whir.mp3 not found'),
      });

      this.sounds.metalClick = new Howl({
        src: ['/src/iron-man-workshop/audio/metal-click.mp3'],
        volume: 0.5,
        preload: true,
        onloaderror: () => console.warn('[ExplodedViewManager] metal-click.mp3 not found'),
      });

      this.sounds.powerUp = new Howl({
        src: ['/src/iron-man-workshop/audio/power-up.mp3'],
        volume: 0.6,
        preload: true,
        onloaderror: () => console.warn('[ExplodedViewManager] power-up.mp3 not found'),
      });
    } catch (e) {
      console.warn('[ExplodedViewManager] Failed to initialize sounds');
    }
  }

  /** @returns {'assembled'|'exploding'|'exploded'|'assembling'} */
  getState() {
    return this.state;
  }

  /** @returns {boolean} `true` if currently exploding or assembling */
  isAnimating() {
    return this.state === 'exploding' || this.state === 'assembling';
  }

  /**
   * @param {string} limbType
   * @returns {import('@babylonjs/core').AbstractMesh|undefined}
   */
  getLimbMesh(limbType) {
    return this.limbMeshes.get(limbType);
  }

  /** Pauses the levitation animation (called when a user grabs a limb). */
  pauseLevitationForLimb(limbType) {
    if (this.levitationTimeline && !this.levitationTimeline.paused()) {
      this.levitationTimeline.pause();
      console.log(`[ExplodedViewManager] Paused levitation for limb grab: ${limbType}`);
    }
  }

  /** Restarts levitation from current limb positions after a release. */
  resumeLevitation() {
    if (this.state === 'exploded') {
      console.log('[ExplodedViewManager] Restarting levitation from current positions');
      this.startLevitation();
    }
  }

  /**
   * Triggers the explosion animation - limbs fly outward from the torso.
   *
   * @param {number} [multiplier=1.0] - Scales the explosion distance.
   * @returns {Promise<void>} Resolves when the burst phase completes.
   */
  async explode(multiplier = 1.0) {
    if (this.state !== 'assembled') {
      console.log('[ExplodedViewManager] Cannot explode - not in assembled state');
      return;
    }

    this.setState('exploding');
    this.playSound('powerUp');

    this.timeline?.kill();

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.stopSound('servoWhir');
        this.playSound('metalClick');
        this.setState('exploded');
      },
    });

    // PHASE 1: Anticipation callback (visual effects handled by host)
    this.config.onAnticipation?.();

    this.timeline.call(
      () => this.playSound('servoWhir'),
      [],
      CINEMATIC_TIMING.anticipation,
    );

    // PHASE 2: Burst via Bezier curves
    const burstStartTime = CINEMATIC_TIMING.anticipation;

    for (const [limbName, mesh] of this.limbMeshes) {
      const explosionConfig = LIMB_EXPLOSION_CONFIG[limbName];
      const originalState = this.originalStates.get(limbName);
      if (!explosionConfig || !originalState) continue;

      // P0: Start (original position)
      const p0 = originalState.position.clone();

      // P2: End with random spread, scaled by multiplier
      const randomOffset = new Vector3(
        (Math.random() - 0.5) * 2 * EXPLOSION_RANDOM_SPREAD,
        (Math.random() - 0.5) * 2 * EXPLOSION_RANDOM_SPREAD,
        (Math.random() - 0.5) * 2 * EXPLOSION_RANDOM_SPREAD,
      );
      const scaledTarget = explosionConfig.targetOffset.scale(multiplier);
      const p2 = p0.add(scaledTarget).add(randomOffset);

      // P1: Control point (arc) with slight randomization
      const controlRandomOffset = new Vector3(
        (Math.random() - 0.5) * EXPLOSION_RANDOM_SPREAD * 0.5,
        (Math.random() - 0.5) * EXPLOSION_RANDOM_SPREAD * 0.5,
        (Math.random() - 0.5) * EXPLOSION_RANDOM_SPREAD * 0.5,
      );
      const p1 = p0.add(explosionConfig.controlOffset).add(controlRandomOffset);

      // Reset p0 since add() returned new vectors
      const start = originalState.position.clone();

      const velocityMultiplier = LIMB_VELOCITY_MULTIPLIER[limbName] ?? 1.0;
      const limbDuration = CINEMATIC_TIMING.burst * velocityMultiplier;
      const staggerJitter = (Math.random() - 0.5) * 0.04;
      const staggerTime = burstStartTime + explosionConfig.staggerDelay + staggerJitter;

      const flightSpin = LIMB_FLIGHT_SPIN[limbName] ?? 0;
      const targetRotation = {
        x: originalState.rotation.x + explosionConfig.rotation.x,
        y: originalState.rotation.y + explosionConfig.rotation.y + flightSpin,
        z: originalState.rotation.z + explosionConfig.rotation.z,
      };

      const progressObj = { t: 0 };

      this.config.onLimbMoveStart?.(limbName, mesh);

      // Bezier path tween
      this.timeline.to(
        progressObj,
        {
          t: 1,
          duration: limbDuration,
          ease: 'expo.out',
          onUpdate: () => {
            this.getBezierPoint(progressObj.t, start, p1, p2, mesh.position);

            this.getBezierTangent(progressObj.t, start, p1, p2, this._tempTangent);
            this._tempTangent.scaleInPlace(5 * (1 - progressObj.t));

            this.config.onLimbMoveUpdate?.(limbName, mesh, this._tempTangent);
          },
          onComplete: () => {
            this.config.onLimbMoveEnd?.(limbName, mesh);
          },
        },
        staggerTime,
      );

      // Rotation tween
      this.timeline.to(
        mesh.rotation,
        {
          x: targetRotation.x,
          y: targetRotation.y,
          z: targetRotation.z,
          duration: limbDuration,
          ease: 'power2.out',
        },
        staggerTime,
      );
    }

    return new Promise((resolve) => {
      this.timeline?.eventCallback('onComplete', () => {
        this.stopSound('servoWhir');
        this.playSound('metalClick');
        this.setState('exploded');
        this.startLevitation();
        resolve();
      });
    });
  }

  /**
   * Triggers the assembly animation - limbs fly back to the torso.
   *
   * Cascading timing: torso → shoulders → upper arms → forearms → hands; legs
   * follow a similar inner-to-outer cascade; head returns last with a 360° spin.
   *
   * @returns {Promise<void>} Resolves when assembly completes.
   */
  async assemble() {
    if (this.state !== 'exploded') {
      console.log('[ExplodedViewManager] Cannot assemble - not in exploded state');
      return;
    }

    this.setState('assembling');
    this.stopLevitation();
    this.playSound('powerUp');
    this.playSound('servoWhir');

    this.timeline?.kill();

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.stopSound('servoWhir');
        this.playSound('metalClick');
        this.setState('assembled');
      },
    });

    const sequenceGroups = {
      torso_back: ['torso_back'],
      torso_front: ['torso_front'],
      shoulders: ['arm_shoulder_left', 'arm_shoulder_right'],
      upperArms: ['arm_upperarm_left', 'arm_upperarm_right'],
      forearms: ['arm_forearm_left', 'arm_forearm_right'],
      hands: ['arm_hand_left', 'arm_hand_right'],
      thighs: ['leg_left_thigh', 'leg_right_thigh'],
      calves: ['leg_left_calf', 'leg_right_calf'],
      feet: ['leg_left_feet', 'leg_right_feet'],
      head: ['head'],
    };

    const sequenceDelays = {
      torso_back: 0.0,
      torso_front: 0.63,
      shoulders: 0.08,
      thighs: 0.12,
      upperArms: 0.18,
      calves: 0.22,
      forearms: 0.28,
      feet: 0.32,
      hands: 0.38,
      head: 0.5,
    };

    for (const [groupName, limbs] of Object.entries(sequenceGroups)) {
      const groupDelay = sequenceDelays[groupName];

      for (const limbName of limbs) {
        const mesh = this.limbMeshes.get(limbName);
        const explosionConfig = LIMB_EXPLOSION_CONFIG[limbName];
        const originalState = this.originalStates.get(limbName);

        if (!mesh || !originalState || !explosionConfig) continue;

        // Bezier points:
        //   p0: Target (original assembled position)
        //   p2: Current position (may have been moved during exploded state)
        //   p1: Arc control point
        const p0 = originalState.position.clone();
        const p2 = mesh.position.clone();

        // Midpoint raised along the original control offset for visual consistency
        const midpoint = p0.add(p2).scale(0.5);
        const p1 = midpoint.add(explosionConfig.controlOffset.scale(0.5));

        const velocityMultiplier = LIMB_VELOCITY_MULTIPLIER[limbName] ?? 1.0;
        let durationMultiplier = 0.8;
        if (limbName === 'torso_front' || limbName === 'torso_back') {
          durationMultiplier = 0.5;
        }
        const baseDuration = CINEMATIC_TIMING.burst * velocityMultiplier * durationMultiplier;

        const intraGroupStagger = groupName !== 'head' ? Math.random() * 0.08 : 0;
        const totalStartTime = groupDelay + intraGroupStagger;

        const progressObj = { p: 0 };
        const targetPos = originalState.position.clone();

        this.config.onLimbMoveStart?.(limbName, mesh);

        this.timeline.to(
          progressObj,
          {
            p: 1,
            duration: baseDuration,
            ease: 'power4.inOut',
            onUpdate: () => {
              const t = 1 - progressObj.p; // assembly traverses curve backwards
              this.getBezierPoint(t, p0, p1, p2, mesh.position);

              this.getBezierTangent(t, p0, p1, p2, this._tempTangent);
              this._tempTangent.negateInPlace().scaleInPlace(5 * progressObj.p);

              this.config.onLimbMoveUpdate?.(limbName, mesh, this._tempTangent);
            },
            onComplete: () => {
              this.config.onLimbMoveEnd?.(limbName, mesh);
              mesh.position.copyFrom(targetPos);
              mesh.rotation.copyFrom(originalState.rotation);
              this.config.onLimbAssemblyComplete?.(limbName);
            },
          },
          totalStartTime,
        );

        // Rotation animation - head gets a flourish spin
        if (limbName === 'head') {
          this.timeline.fromTo(
            mesh.rotation,
            { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
            {
              x: originalState.rotation.x,
              y: originalState.rotation.y + Math.PI * 2,
              z: originalState.rotation.z,
              duration: baseDuration,
              ease: 'expo.inOut',
            },
            totalStartTime,
          );
        } else {
          this.timeline.to(
            mesh.rotation,
            {
              x: originalState.rotation.x,
              y: originalState.rotation.y,
              z: originalState.rotation.z,
              duration: baseDuration,
              ease: 'power2.inOut',
            },
            totalStartTime,
          );
        }
      }
    }

    return new Promise((resolve) => {
      this.timeline?.eventCallback('onComplete', () => {
        this.stopSound('servoWhir');
        this.playSound('metalClick');
        this.setState('assembled');
        resolve();
      });
    });
  }

  /**
   * Toggles between exploded and assembled states. Ignores input mid-animation.
   *
   * @param {number} [explodeMultiplier=1.0] - Forwarded to {@link explode}.
   * @returns {Promise<void>}
   */
  async toggle(explodeMultiplier = 1.0) {
    if (this.isAnimating()) {
      console.log('[ExplodedViewManager] Animation in progress, ignoring toggle');
      return;
    }

    if (this.state === 'assembled') {
      await this.explode(explodeMultiplier);
    } else if (this.state === 'exploded') {
      await this.assemble();
    }
  }

  /** Immediately resets all limbs to their original positions without animation. */
  reset() {
    this.timeline?.kill();

    for (const [limbName, mesh] of this.limbMeshes) {
      const originalState = this.originalStates.get(limbName);
      if (originalState) {
        mesh.position.copyFrom(originalState.position);
        mesh.rotation.copyFrom(originalState.rotation);
      }
    }

    this.stopLevitation();
    this.setState('assembled');
    console.log('[ExplodedViewManager] Reset to assembled state');
  }

  /**
   * Immediately places parts in their exploded positions without animation.
   *
   * Useful for startup sequences where the suit must begin off-screen so it
   * can dramatically assemble in.
   *
   * @param {number} [distanceMultiplier=1.0] - Scales the exploded distance.
   *   Use large values (e.g. 10.0) to position parts off-screen.
   */
  forceExplodedState(distanceMultiplier = 1.0) {
    this.timeline?.kill();

    for (const [limbName, mesh] of this.limbMeshes) {
      const originalState = this.originalStates.get(limbName);
      const explosionConfig = LIMB_EXPLOSION_CONFIG[limbName];
      if (!originalState || !explosionConfig) continue;

      const offset = explosionConfig.targetOffset.scale(distanceMultiplier);
      const targetPos = originalState.position.add(offset);

      const flightSpin = LIMB_FLIGHT_SPIN[limbName] ?? 0;
      const targetRot = {
        x: originalState.rotation.x + explosionConfig.rotation.x,
        y: originalState.rotation.y + explosionConfig.rotation.y + flightSpin,
        z: originalState.rotation.z + explosionConfig.rotation.z,
      };

      mesh.position.copyFrom(targetPos);
      mesh.rotation.set(targetRot.x, targetRot.y, targetRot.z);
    }

    this.setState('exploded');

    if (distanceMultiplier <= 1.5) {
      this.startLevitation();
    } else {
      this.stopLevitation();
    }
    console.log(`[ExplodedViewManager] Forced exploded state (multiplier: ${distanceMultiplier})`);
  }

  /**
   * Quadratic Bezier point: B(t) = (1-t)² P0 + 2(1-t)t P1 + t² P2
   *
   * @param {number} t - 0..1
   * @param {Vector3} p0
   * @param {Vector3} p1
   * @param {Vector3} p2
   * @param {Vector3} target - Output (mutated in place)
   */
  getBezierPoint(t, p0, p1, p2, target) {
    const oneMinusT = 1 - t;
    const a = oneMinusT * oneMinusT;
    const b = 2 * oneMinusT * t;
    const c = t * t;

    target.set(
      a * p0.x + b * p1.x + c * p2.x,
      a * p0.y + b * p1.y + c * p2.y,
      a * p0.z + b * p1.z + c * p2.z,
    );
  }

  /**
   * Quadratic Bezier tangent: B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
   *
   * @param {number} t - 0..1
   * @param {Vector3} p0
   * @param {Vector3} p1
   * @param {Vector3} p2
   * @param {Vector3} target - Output (mutated and normalized)
   */
  getBezierTangent(t, p0, p1, p2, target) {
    const a = 2 * (1 - t);
    const b = 2 * t;

    const v1x = p1.x - p0.x;
    const v1y = p1.y - p0.y;
    const v1z = p1.z - p0.z;

    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;
    const v2z = p2.z - p1.z;

    target.set(a * v1x + b * v2x, a * v1y + b * v2y, a * v1z + b * v2z);
    target.normalize();
  }

  /**
   * Starts the levitation loop for exploded limbs - gentle bobbing + rotation drift.
   * Only activates while in `exploded` state.
   */
  startLevitation() {
    if (this.state !== 'exploded') return;

    this.stopLevitation();

    this.levitationTimeline = gsap.timeline({
      repeat: -1,
      yoyo: true,
      defaults: { ease: 'sine.inOut' },
    });

    console.log('[ExplodedViewManager] Starting levitation state');

    for (const [limbName, mesh] of this.limbMeshes) {
      const randomPhase = Math.random() * 2;
      const bobAmount = 0.05;
      const rotAmount = 0.03;

      this.levitationTimeline.to(
        mesh.position,
        {
          y: mesh.position.y + bobAmount,
          duration: 2.0 + Math.random(),
        },
        randomPhase,
      );

      this.levitationTimeline.add(() => {
        this.config.onLimbMoveStart?.(limbName, mesh);
        setTimeout(() => this.config.onLimbMoveEnd?.(limbName, mesh), 200);
      }, randomPhase);

      this.levitationTimeline.to(
        mesh.rotation,
        {
          z: mesh.rotation.z + rotAmount,
          duration: 3.0 + Math.random(),
        },
        randomPhase,
      );
    }
  }

  /** Stops the levitation animation loop and notifies torso move-end. */
  stopLevitation() {
    if (this.levitationTimeline) {
      this.levitationTimeline.kill();
      this.levitationTimeline = null;

      const torsoFrontMesh = this.limbMeshes.get('torso_front');
      if (torsoFrontMesh) {
        this.config.onLimbMoveEnd?.('torso_front', torsoFrontMesh);
      }
      const torsoBackMesh = this.limbMeshes.get('torso_back');
      if (torsoBackMesh) {
        this.config.onLimbMoveEnd?.('torso_back', torsoBackMesh);
      }
    }
  }

  /**
   * Per-frame update hook. Currently a no-op since all animations are driven
   * by GSAP timelines, but kept for API symmetry with other managers.
   *
   * @param {number} _time - Elapsed time in seconds.
   * @param {number} _deltaTime - Time since last frame in seconds.
   */
  update(_time, _deltaTime) {
    // GSAP handles all interpolation internally; no per-frame work needed here.
  }

  /** @param {string} newState */
  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.config.onStateChange?.(newState);
      console.log(`[ExplodedViewManager] State: ${newState}`);
    }
  }

  /** @param {keyof ExplodedViewManager['sounds']} soundName */
  playSound(soundName) {
    if (!this.config.enableSound) return;
    this.sounds[soundName]?.play();
  }

  /** @param {keyof ExplodedViewManager['sounds']} soundName */
  stopSound(soundName) {
    if (!this.config.enableSound) return;
    this.sounds[soundName]?.stop();
  }

  /** Disposes timelines, sounds, and clears all internal references. */
  dispose() {
    this.timeline?.kill();
    this.timeline = null;

    this.stopLevitation();

    Object.values(this.sounds).forEach((sound) => {
      if (sound) {
        sound.stop();
        sound.unload();
      }
    });

    this.limbMeshes.clear();
    this.originalStates.clear();
    console.log('[ExplodedViewManager] Disposed');
  }
}
