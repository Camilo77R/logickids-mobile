/**
 * Gesture detection type definitions
 * Type-safe interfaces for Phase 3: Enhanced Interaction Patterns
 *
 * Phase 3.2 Only: Pinch Gesture → Mini Star Burst
 * - Pinch: Thumb + Index finger close together → Star burst effect
 *
 * @see DESIGN-v2.md Phase 3.2
 */

import * as THREE from 'three';


// Re-export Handedness for convenience
;

/**
 * Types of gestures that can be detected
 */
export var GestureType; (function (GestureType) {
  /** Thumb and index finger pinched together */
  const PINCH = 'PINCH'; GestureType["PINCH"] = PINCH;
  /** Thumb and middle finger pinched together (Quasar Surge trigger) */
  const MIDDLE_PINCH = 'MIDDLE_PINCH'; GestureType["MIDDLE_PINCH"] = MIDDLE_PINCH;
  /** Thumb and ring finger pinched together (Nebula Vortex trigger) */
  const RING_PINCH = 'RING_PINCH'; GestureType["RING_PINCH"] = RING_PINCH;
  /** Thumb and pinky finger pinched together (Cosmic Strings trigger) */
  const PINKY_PINCH = 'PINKY_PINCH'; GestureType["PINKY_PINCH"] = PINKY_PINCH;
  /** Fingers curled into a closed fist */
  const FIST = 'FIST'; GestureType["FIST"] = FIST;
})(GestureType || (GestureType = {}));

/**
 * State of a gesture in its lifecycle
 */
export var GestureState; (function (GestureState) {
  /** Gesture not detected */
  const IDLE = 'IDLE'; GestureState["IDLE"] = IDLE;
  /** Gesture just started this frame */
  const STARTED = 'STARTED'; GestureState["STARTED"] = STARTED;
  /** Gesture is continuing from previous frame */
  const ACTIVE = 'ACTIVE'; GestureState["ACTIVE"] = ACTIVE;
  /** Gesture just ended this frame */
  const ENDED = 'ENDED'; GestureState["ENDED"] = ENDED;
})(GestureState || (GestureState = {}));

/**
 * Data payload for pinch gesture detection
 */
























































































































































































/**
 * Default configuration
 */
export const DEFAULT_GESTURE_CONFIG = {
  pinch: {
    threshold: 0.035, // Stricter: Requires fingers to be much closer
    releaseThreshold: 0.06, // Tightened hysteresis
    cooldownMs: 400,
  },
  middlePinch: {
    threshold: 0.045, // Stricter
    releaseThreshold: 0.07,
    cooldownMs: 150,
  },
  ringPinch: {
    threshold: 0.045,
    releaseThreshold: 0.07,
    cooldownMs: 150,
  },
  pinkyPinch: {
    threshold: 0.055, // Still slightly looser but tighter than before
    releaseThreshold: 0.08,
    cooldownMs: 200,
  },
  fist: {
    closeThreshold: 1.2,
    openThreshold: 1.6,
    minDurationFrames: 1,
  },
};

/**
 * Result of gesture detection for a single frame
 */






































/**
 * Default star burst configuration
 */
export const DEFAULT_STAR_BURST_CONFIG = {
  particleCount: 750, // Middle ground: 500-1000
  duration: 1.5, // Per DESIGN-v2.md: fade over 1.5 seconds
  initialVelocity: 3.0,
  velocityDecay: 0.92,
  initialSize: 0.8,
  color: new THREE.Color(0xffffff), // White particles
};
