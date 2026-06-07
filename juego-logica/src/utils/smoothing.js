/**
 * Smoothing and interpolation utilities for stable hand tracking
 * Uses exponential moving average (EMA) for smooth transitions
 */

import * as THREE from 'three';

/**
 * Exponential moving average smoother for scalar values
 */
export class ScalarSmoother {
  
  

  /**
   * @param initialValue - Starting value
   * @param smoothingFactor - Smoothing factor (0 = instant, 1 = no movement). Typical: 0.1-0.3
   */
  constructor(initialValue = 0, smoothingFactor = 0.15) {
    this.currentValue = initialValue;
    this.smoothingFactor = smoothingFactor;
  }

  /**
   * Update with new target value and return smoothed result
   */
  update(targetValue) {
    this.currentValue += (targetValue - this.currentValue) * this.smoothingFactor;
    return this.currentValue;
  }

  /**
   * Get current smoothed value without updating
   */
  get value() {
    return this.currentValue;
  }

  /**
   * Reset to a specific value immediately
   */
  reset(value) {
    this.currentValue = value;
  }

  /**
   * Update smoothing factor
   */
  setSmoothingFactor(factor) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
}

/**
 * Exponential moving average smoother for 3D vectors
 */
export class Vector3Smoother {
  
  

  constructor(initialValue = new THREE.Vector3(), smoothingFactor = 0.15) {
    this.currentValue = initialValue.clone();
    this.smoothingFactor = smoothingFactor;
  }

  /**
   * Update with new target value and return smoothed result
   */
  update(targetValue) {
    this.currentValue.lerp(targetValue, this.smoothingFactor);
    return this.currentValue.clone();
  }

  /**
   * Get current smoothed value without updating
   */
  get value() {
    return this.currentValue.clone();
  }

  /**
   * Reset to a specific value immediately
   */
  reset(value) {
    this.currentValue.copy(value);
  }

  /**
   * Update smoothing factor
   */
  setSmoothingFactor(factor) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
}

/**
 * Exponential moving average smoother for quaternions
 * Uses SLERP for proper rotation interpolation
 */
export class QuaternionSmoother {
  
  

  constructor(
    initialValue = new THREE.Quaternion(),
    smoothingFactor = 0.15
  ) {
    this.currentValue = initialValue.clone();
    this.smoothingFactor = smoothingFactor;
  }

  /**
   * Update with new target value and return smoothed result
   */
  update(targetValue) {
    // Handle quaternion double-cover for shortest path
    if (this.currentValue.dot(targetValue) < 0) {
      targetValue = targetValue.clone();
      targetValue.set(-targetValue.x, -targetValue.y, -targetValue.z, -targetValue.w);
    }
    this.currentValue.slerp(targetValue, this.smoothingFactor);
    return this.currentValue.clone();
  }

  /**
   * Get current smoothed value without updating
   */
  get value() {
    return this.currentValue.clone();
  }

  /**
   * Reset to a specific value immediately
   */
  reset(value) {
    this.currentValue.copy(value);
  }

  /**
   * Update smoothing factor
   */
  setSmoothingFactor(factor) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
}

/**
 * Exponential moving average smoother for Euler angles
 * Converts to quaternion internally for proper interpolation
 */
export class EulerSmoother {
  

  constructor(initialValue = new THREE.Euler(), smoothingFactor = 0.15) {
    const quat = new THREE.Quaternion().setFromEuler(initialValue);
    this.quaternionSmoother = new QuaternionSmoother(quat, smoothingFactor);
  }

  /**
   * Update with new target value and return smoothed result
   */
  update(targetValue) {
    const targetQuat = new THREE.Quaternion().setFromEuler(targetValue);
    const smoothedQuat = this.quaternionSmoother.update(targetQuat);
    return new THREE.Euler().setFromQuaternion(smoothedQuat);
  }

  /**
   * Get current smoothed value without updating
   */
  get value() {
    return new THREE.Euler().setFromQuaternion(this.quaternionSmoother.value);
  }

  /**
   * Reset to a specific value immediately
   */
  reset(value) {
    const quat = new THREE.Quaternion().setFromEuler(value);
    this.quaternionSmoother.reset(quat);
  }

  /**
   * Update smoothing factor
   */
  setSmoothingFactor(factor) {
    this.quaternionSmoother.setSmoothingFactor(factor);
  }
}

/**
 * Moving average filter for reducing noise
 * Useful for very noisy signals where EMA isn't enough
 */
export class MovingAverageFilter {
  
  
  
  

  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.buffer = new Array(windowSize).fill(0);
    this.index = 0;
    this.sum = 0;
  }

  /**
   * Add a new value and return the moving average
   */
  update(value) {
    // Subtract old value from sum
    this.sum -= this.buffer[this.index];
    // Add new value
    this.buffer[this.index] = value;
    this.sum += value;
    // Move index
    this.index = (this.index + 1) % this.windowSize;
    // Return average
    return this.sum / this.windowSize;
  }

  /**
   * Reset the filter
   */
  reset(initialValue = 0) {
    this.buffer.fill(initialValue);
    this.sum = initialValue * this.windowSize;
    this.index = 0;
  }
}

/**
 * One Euro Filter - adaptive low-pass filter
 * Better for tracking tasks as it adapts based on speed
 * @see https://cristal.univ-lille.fr/~casiez/1euro/
 */
export class OneEuroFilter {
  
  
  
  
  
  

  /**
   * @param minCutoff - Minimum cutoff frequency (Hz). Lower = more smoothing.
   * @param beta - Speed coefficient. Higher = less lag when moving fast.
   * @param dCutoff - Derivative cutoff frequency (Hz).
   */
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
    this.lastTime = null;
  }

  /**
   * Filter a value
   * @param value - Raw input value
   * @param timestamp - Current timestamp in seconds
   */
  filter(value, timestamp) {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      this.xFilter.setAlpha(1.0);
      this.xFilter.filter(value);
      this.dxFilter.setAlpha(1.0);
      this.dxFilter.filter(0.0);
      return value;
    }

    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    if (dt <= 0) return this.xFilter.lastValue;

    // Estimate velocity
    const dx = (value - this.xFilter.lastValue) / dt;
    const edx = this.dxFilter.filterWithAlpha(dx, this.alpha(this.dCutoff, dt));

    // Adaptive cutoff based on velocity
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filterWithAlpha(value, this.alpha(cutoff, dt));
  }

   alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  reset() {
    this.lastTime = null;
    this.xFilter.reset();
    this.dxFilter.reset();
  }
}

/**
 * Simple low-pass filter helper for OneEuroFilter
 */
class LowPassFilter {constructor() { LowPassFilter.prototype.__init.call(this);LowPassFilter.prototype.__init2.call(this);LowPassFilter.prototype.__init3.call(this); }
   __init() {this._lastValue = 0}
   __init2() {this._alpha = 1.0}
   __init3() {this.initialized = false}

  get lastValue() {
    return this._lastValue;
  }

  setAlpha(alpha) {
    this._alpha = alpha;
  }

  filter(value) {
    if (!this.initialized) {
      this._lastValue = value;
      this.initialized = true;
    } else {
      this._lastValue = this._alpha * value + (1 - this._alpha) * this._lastValue;
    }
    return this._lastValue;
  }

  filterWithAlpha(value, alpha) {
    this.setAlpha(alpha);
    return this.filter(value);
  }

  reset() {
    this._lastValue = 0;
    this.initialized = false;
  }
}

/**
 * One Euro Filter for THREE.Vector3
 * Applies independent One Euro Filters to each axis for smooth 3D tracking.
 * Ideal for hand tracking where micro-tremors cause jitter but fast movements
 * should have minimal lag.
 *
 * @see https://cristal.univ-lille.fr/~casiez/1euro/
 */
export class Vector3OneEuroFilter {
  
  
  
  

  /**
   * @param minCutoff - Minimum cutoff frequency (Hz). Lower = more smoothing at rest.
   *                    Typical values: 0.5-2.0 for hand tracking.
   * @param beta - Speed coefficient. Higher = less lag when moving fast.
   *               Typical values: 0.5-1.5 for responsive feel.
   * @param dCutoff - Derivative cutoff frequency (Hz). Usually left at default.
   */
  constructor(minCutoff = 1.0, beta = 0.5, dCutoff = 1.0) {
    this.xFilter = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.yFilter = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.zFilter = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.result = new THREE.Vector3();
  }

  /**
   * Filter a 3D vector value
   * @param value - Raw input vector
   * @param timestamp - Current timestamp in seconds
   * @returns Smoothed vector (reused instance - clone if storing)
   */
  filter(value, timestamp) {
    this.result.set(
      this.xFilter.filter(value.x, timestamp),
      this.yFilter.filter(value.y, timestamp),
      this.zFilter.filter(value.z, timestamp)
    );
    return this.result;
  }

  /**
   * Reset all filters
   */
  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
  }
}

/**
 * One Euro Filter for scalar roll/rotation values
 * Handles angle wrap-around properly for smooth rotation tracking.
 */
export class RotationOneEuroFilter {
  
   __init4() {this.lastValue = 0}
   __init5() {this.initialized = false}

  /**
   * @param minCutoff - Minimum cutoff frequency (Hz). Lower = more smoothing.
   * @param beta - Speed coefficient. Higher = less lag during fast rotation.
   * @param dCutoff - Derivative cutoff frequency (Hz).
   */
  constructor(minCutoff = 1.5, beta = 0.8, dCutoff = 1.0) {;RotationOneEuroFilter.prototype.__init4.call(this);RotationOneEuroFilter.prototype.__init5.call(this);
    this.euroFilter = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  /**
   * Filter a rotation value, handling angle wrap-around
   * @param value - Raw rotation in radians
   * @param timestamp - Current timestamp in seconds
   * @returns Smoothed rotation
   */
  filter(value, timestamp) {
    if (!this.initialized) {
      this.lastValue = value;
      this.initialized = true;
      return this.euroFilter.filter(value, timestamp);
    }

    // Handle wrap-around: find the shortest path
    let delta = value - this.lastValue;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    // Unwrap the value for consistent filtering
    const unwrapped = this.lastValue + delta;
    const filtered = this.euroFilter.filter(unwrapped, timestamp);

    this.lastValue = value;
    return filtered;
  }

  /**
   * Reset the filter
   */
  reset() {
    this.euroFilter.reset();
    this.lastValue = 0;
    this.initialized = false;
  }
}
