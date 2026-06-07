 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


















export const DEFAULT_HAND_TRAIL_CONFIG = {
  interpolationPoints: 5,
  minMovementThreshold: 2,
  maxTrailLength: 50,
  baseClearRadius: 60,
  dynamicRadius: true,
};




























/**
 * HandTrailTracker manages hand position tracking and trail interpolation
 * for smooth fog clearing effects
 */
export class HandTrailTracker {
  
  
   __init() {this.newTrailPoints = []}
   __init2() {this.canvasWidth = 0}
   __init3() {this.canvasHeight = 0}

  /**
   * Create a new HandTrailTracker instance
   * @param config - Configuration options
   */
  constructor(config = {}) {;HandTrailTracker.prototype.__init.call(this);HandTrailTracker.prototype.__init2.call(this);HandTrailTracker.prototype.__init3.call(this);
    this.config = { ...DEFAULT_HAND_TRAIL_CONFIG, ...config };
    this.trackedHands = new Map();
  }

  /**
   * Update canvas dimensions for coordinate conversion
   * @param width - Canvas width in pixels
   * @param height - Canvas height in pixels
   */
  setDimensions(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Update tracked hands from MediaPipe hand detection results
   * @param handResults - Hand detection results from MediaPipe
   * @returns Array of tracked hands with interpolated trails
   */
  update(handResults) {
    // Reset new trail points for this frame
    this.newTrailPoints = [];

    if (!handResults || !handResults.landmarks || handResults.landmarks.length === 0) {
      // No hands detected, clear tracked hands
      this.trackedHands.clear();
      return [];
    }

    const updatedHands = [];
    const currentHandIds = new Set();

    // Process each detected hand
    for (let i = 0; i < handResults.landmarks.length; i++) {
      const landmarks = handResults.landmarks[i];
      const handedness = _optionalChain([handResults, 'access', _ => _.handedness, 'optionalAccess', _2 => _2[i], 'optionalAccess', _3 => _3[0], 'optionalAccess', _4 => _4.categoryName]) || 'Unknown';
      const handId = `${handedness}-${i}`;

      currentHandIds.add(handId);

      // Get palm position (wrist landmark at index 0)
      const wrist = landmarks[0];
      const palmPosition = {
        x: wrist.x * this.canvasWidth,
        y: wrist.y * this.canvasHeight,
      };

      // Calculate hand size (distance from wrist to middle finger tip)
      const middleFingerTip = landmarks[12]; // Middle finger tip
      const handSize = this.calculateDistance(
        { x: wrist.x * this.canvasWidth, y: wrist.y * this.canvasHeight },
        {
          x: middleFingerTip.x * this.canvasWidth,
          y: middleFingerTip.y * this.canvasHeight,
        }
      );

      // Get previous hand data if exists
      const previousHand = this.trackedHands.get(handId);
      const previousPosition = _optionalChain([previousHand, 'optionalAccess', _5 => _5.palmPosition]) || null;

      // Calculate clear radius
      const clearRadius = this.calculateClearRadius(handSize);

      // Calculate velocity (pixels per frame)
      let velocity = 0;
      if (previousPosition) {
        velocity = this.calculateDistance(palmPosition, previousPosition);
      }

      // Generate interpolated trail
      const trail = this.generateTrail(palmPosition, previousPosition, clearRadius);

      // Add to new trail points
      this.newTrailPoints.push(...trail);

      const trackedHand = {
        palmPosition,
        previousPosition,
        trail,
        handSize,
        handedness,
        velocity,
      };

      this.trackedHands.set(handId, trackedHand);
      updatedHands.push(trackedHand);
    }

    // Remove hands that are no longer detected
    for (const handId of this.trackedHands.keys()) {
      if (!currentHandIds.has(handId)) {
        this.trackedHands.delete(handId);
      }
    }

    return updatedHands;
  }

  /**
   * Generate interpolated trail between current and previous position
   * @param current - Current palm position
   * @param previous - Previous palm position (null if first frame)
   * @param radius - Clear radius for this hand
   * @returns Array of interpolated trail points
   */
   generateTrail(current, previous, radius) {
    const trail = [];
    const timestamp = performance.now();

    // If no previous position, just return current point
    if (!previous) {
      trail.push({
        x: current.x,
        y: current.y,
        radius,
        timestamp,
      });
      return trail;
    }

    // Check if movement exceeds threshold
    const distance = this.calculateDistance(current, previous);
    if (distance < this.config.minMovementThreshold) {
      // No significant movement, return current point
      trail.push({
        x: current.x,
        y: current.y,
        radius,
        timestamp,
      });
      return trail;
    }

    // Interpolate between previous and current position
    const points = this.config.interpolationPoints;
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const interpolated = {
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
        radius,
        timestamp,
      };
      trail.push(interpolated);
    }

    return trail;
  }

  /**
   * Calculate clear radius based on hand size
   * @param handSize - Measured hand size in pixels
   * @returns Clear radius in pixels
   */
   calculateClearRadius(handSize) {
    if (!this.config.dynamicRadius) {
      return this.config.baseClearRadius;
    }

    // Scale radius based on hand size (larger hands = larger radius)
    // Typical hand size is around 100-200px
    const scale = handSize / 150;
    const dynamicRadius = this.config.baseClearRadius * scale;

    // Clamp between 30px and 150px
    return Math.max(30, Math.min(150, dynamicRadius));
  }

  /**
   * Calculate Euclidean distance between two points
   * @param p1 - First point
   * @param p2 - Second point
   * @returns Distance in pixels
   */
   calculateDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get all current trail points from all tracked hands
   * @returns Flattened array of all trail points
   */
  getAllTrailPoints() {
    const allPoints = [];

    for (const hand of this.trackedHands.values()) {
      allPoints.push(...hand.trail);
    }

    return allPoints;
  }

  /**
   * Get only the new trail points generated in the last update
   * @returns Array of new trail points
   */
  getNewTrailPoints() {
    return this.newTrailPoints;
  }

  /**
   * Get number of currently tracked hands
   * @returns Number of tracked hands
   */
  getHandCount() {
    return this.trackedHands.size;
  }

  /**
   * Clear all tracked hand data
   */
  reset() {
    this.trackedHands.clear();
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.trackedHands.clear();
    console.log('[HandTrailTracker] Disposed');
  }
}
