 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }











/**
 * Pre-defined hand skeleton connections (21 landmarks).
 *
 * Typed as ReadonlyArray of tuples to enable compile-time validation
 * and avoid runtime lookups. Connections follow MediaPipe hand topology.
 */
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  // Index finger
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  // Middle finger
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  // Ring finger
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  // Pinky
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

/**
 * Configuration options for hand landmark rendering appearance.
 */











const DEFAULT_CONFIG = {
  landmarkColor: '#00ffff',
  connectionColor: '#00ffff',
  landmarkRadius: 3,
  connectionLineWidth: 2,
};

/**
 * High-performance hand landmark visualization overlay.
 *
 * Optimizations:
 * - Direct canvas drawing (no DrawingUtils dependency overhead)
 * - Batched path operations (single beginPath/stroke per hand)
 * - Desynchronized canvas context for reduced latency
 * - Pre-computed style values (set once, not per-frame)
 *
 * @example
 * ```typescript
 * const overlay = new HandLandmarkOverlay(container);
 * overlay.setEnabled(true);
 *
 * // In animation loop:
 * overlay.update(handTracker.getLastResult());
 * ```
 */
export class HandLandmarkOverlay {
  
  
  
   __init() {this.enabled = false}
   __init2() {this.width = 0}
   __init3() {this.height = 0}

  constructor(container, config = {}) {;HandLandmarkOverlay.prototype.__init.call(this);HandLandmarkOverlay.prototype.__init2.call(this);HandLandmarkOverlay.prototype.__init3.call(this);HandLandmarkOverlay.prototype.__init4.call(this);
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 20;
      transform: scaleX(-1);
    `;
    container.appendChild(this.canvas);

    // Get 2D context with performance optimizations
    const ctx = this.canvas.getContext('2d', {
      alpha: true,
      desynchronized: true, // Reduces latency on supported browsers
    });
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = ctx;

    // Set initial size
    this.resize();

    // Listen for resize
    window.addEventListener('resize', this.resize);

    // Initially hidden
    this.canvas.style.display = 'none';
  }

  /**
   * Resizes the canvas to match the parent container dimensions.
   */
   __init4() {this.resize = () => {
    const rect = _optionalChain([this, 'access', _5 => _5.canvas, 'access', _6 => _6.parentElement, 'optionalAccess', _7 => _7.getBoundingClientRect, 'call', _8 => _8()]);
    if (rect) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.width = rect.width;
      this.height = rect.height;
    }
  }}

  /**
   * Enables or disables the overlay visibility.
   *
   * When disabled, the canvas is hidden and cleared to avoid stale rendering.
   *
   * @param enabled - Whether to show the overlay
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.canvas.style.display = enabled ? 'block' : 'none';

    if (!enabled) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Renders hand landmarks from the latest detection results.
   *
   * Drawing strategy:
   * 1. Clear previous frame
   * 2. Set styles once (avoids repeated context state changes)
   * 3. Draw all connection lines in a single batched path
   * 4. Draw all landmark circles
   *
   * @param handResults - MediaPipe hand detection results, or null if none
   */
  update(handResults) {
    if (!this.enabled) return;

    const { ctx, width, height, config } = this;

    // Clear previous frame
    ctx.clearRect(0, 0, width, height);

    if (!handResults || handResults.landmarks.length === 0) {
      return;
    }

    // Set styles once (avoid repeated style changes)
    ctx.strokeStyle = config.connectionColor;
    ctx.lineWidth = config.connectionLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = config.landmarkColor;

    // Draw each detected hand
    for (const landmarks of handResults.landmarks) {
      // Draw all connections in a single path (faster than individual lines)
      ctx.beginPath();
      for (const [start, end] of HAND_CONNECTIONS) {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
      }
      ctx.stroke();

      // Draw all landmarks as circles
      const radius = config.landmarkRadius;
      const twoPI = Math.PI * 2;
      for (const lm of landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, radius, 0, twoPI);
        ctx.fill();
      }
    }
  }

  /**
   * Disposes resources and removes the canvas from the DOM.
   */
  dispose() {
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }
}
