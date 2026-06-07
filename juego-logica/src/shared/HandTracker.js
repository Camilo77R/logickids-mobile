/**
 * HandTracker Module
 * Manages webcam access and hand landmark detection using MediaPipe Tasks Vision API
 * @see https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
 */

import { FilesetResolver, HandLandmarker, } from '@mediapipe/tasks-vision';
import { DEFAULT_HAND_TRACKER_CONFIG, } from './HandTypes';

/**
 * HandTracker - Handles webcam initialization and MediaPipe hand detection
 */
export class HandTracker {
   __init() {this.handLandmarker = null}
   __init2() {this.videoElement = null}
   __init3() {this.stream = null}
  
   __init4() {this._isReady = false}
   __init5() {this._isCameraEnabled = false}

   __init6() {this.detectionIntervalMs = 0}
   __init7() {this.lastResult = null}

  constructor(config = {}) {;HandTracker.prototype.__init.call(this);HandTracker.prototype.__init2.call(this);HandTracker.prototype.__init3.call(this);HandTracker.prototype.__init4.call(this);HandTracker.prototype.__init5.call(this);HandTracker.prototype.__init6.call(this);HandTracker.prototype.__init7.call(this);HandTracker.prototype.__init8.call(this);
    this.config = { ...DEFAULT_HAND_TRACKER_CONFIG, ...config };
  }

  setDetectionIntervalMs(intervalMs) {
    this.detectionIntervalMs = Math.max(0, intervalMs);
  }

  getDetectionIntervalMs() {
    return this.detectionIntervalMs;
  }

  /**
   * Initialize MediaPipe HandLandmarker and webcam
   * @param videoElement - HTML video element to display camera feed
   */
  async initialize(videoElement) {
    this.videoElement = videoElement;

    // Only load MediaPipe model — camera is activated later on user gesture
    await this.initializeHandLandmarker();

    this._isReady = true;
  }

  /**
   * Static shared instance to prevent multiple WASM heaps (OOM fix)
   */
   static __initStatic() {this.sharedHandLandmarker = null}
   static __initStatic2() {this.initializationPromise = null}

  /**
   * Initialize MediaPipe Tasks Vision HandLandmarker
   */
   async initializeHandLandmarker() {
    // If we already have a shared instance, reuse it
    if (HandTracker.sharedHandLandmarker) {
      this.handLandmarker = HandTracker.sharedHandLandmarker;
      console.log('[HandTracker] Reusing shared HandLandmarker instance');
      return;
    }

    // If initialization is in progress, wait for it
    if (HandTracker.initializationPromise) {
      await HandTracker.initializationPromise;
      if (HandTracker.sharedHandLandmarker) {
        this.handLandmarker = HandTracker.sharedHandLandmarker;
        return;
      }
    }

    try {
      // Start initialization lock
      HandTracker.initializationPromise = (async () => {
        // Step 1: Load WASM runtime
        // Using local assets to guarantee version matching and prevent LinkErrors
        const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm');

        // Step 2: Create HandLandmarker with configuration
        HandTracker.sharedHandLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: this.config.modelAssetPath,
            delegate: this.config.delegate,
          },
          runningMode: 'VIDEO',
          numHands: this.config.numHands,
          minHandDetectionConfidence: this.config.minHandDetectionConfidence,
          minHandPresenceConfidence: this.config.minHandPresenceConfidence,
          minTrackingConfidence: this.config.minTrackingConfidence,
        });
      })();

      await HandTracker.initializationPromise;
      this.handLandmarker = HandTracker.sharedHandLandmarker;

      console.log('[HandTracker] MediaPipe HandLandmarker initialized (New Instance)');
    } catch (error) {
      console.error('[HandTracker] Failed to initialize HandLandmarker:', error);
      HandTracker.initializationPromise = null; // Reset on failure
      throw new Error(`MediaPipe initialization failed: ${error}`);
    }
  }

  /**
   * Initialize webcam stream
   */
   async initializeWebcam() {
    if (!this.videoElement) {
      throw new Error('Video element not set');
    }

    try {
      // Request camera access - start with minimal, let browser choose best match
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      // Attach stream to video element
      this.videoElement.srcObject = this.stream;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;

      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        if (!this.videoElement) {
          reject(new Error('Video element not set'));
          return;
        }
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play()
            .then(() => resolve())
            .catch(reject);
        };
        this.videoElement.onerror = () => reject(new Error('Video load error'));
      });

      console.log('[HandTracker] Webcam initialized:', {
        width: this.videoElement.videoWidth,
        height: this.videoElement.videoHeight,
      });

      this._isCameraEnabled = true;
    } catch (error) {
      this._isCameraEnabled = false;
      this.handleCameraError(error);
      throw error; // Re-throw so callers (enableCamera) know it failed
    }
  }

  /**
   * Handle camera access errors with user-friendly messages
   */
   handleCameraError(error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          console.error('[HandTracker] Camera permission denied. Please allow camera access.');
          break;
        case 'NotFoundError':
          console.error('[HandTracker] No camera found. Please connect a camera.');
          break;
        case 'NotReadableError':
          console.error('[HandTracker] Camera is in use by another application.');
          break;
        case 'OverconstrainedError':
          console.error('[HandTracker] Camera does not meet requirements.');
          break;
        default:
          console.error('[HandTracker] Camera error:', error.message);
      }
    } else {
      console.error('[HandTracker] Unknown camera error:', error);
    }
  }

  // Track last timestamp to avoid duplicate detections
   __init8() {this.lastDetectForVideoTimestamp = -1}

  /**
   * Detect hands in current video frame
   * @param timestamp - Current timestamp from performance.now() or requestAnimationFrame
   * @returns Hand detection results or null if not ready
   */
  detectHands(timestamp) {
    if (!this._isReady || !this.handLandmarker || !this.videoElement) {
      return null;
    }

    // Check if video is actually playing
    if (this.videoElement.readyState < 2) {
      return null;
    }

    // Ensure timestamp is strictly increasing (MediaPipe requirement)
    // This prevents "timestamp must be monotonically increasing" errors
    if (timestamp <= this.lastDetectForVideoTimestamp) {
      return this.lastResult;
    }

    // Throttle expensive detectForVideo calls to protect frame time.
    // Returning cached results keeps the render loop running at 60fps.
    if (
      this.detectionIntervalMs > 0 &&
      this.lastDetectForVideoTimestamp >= 0 &&
      timestamp - this.lastDetectForVideoTimestamp < this.detectionIntervalMs
    ) {
      return this.lastResult;
    }

    try {
      // detectForVideo is synchronous in VIDEO running mode
      const result = this.handLandmarker.detectForVideo(this.videoElement, timestamp);
      this.lastDetectForVideoTimestamp = timestamp;
      this.lastResult = result;
      return result;
    } catch (error) {
      console.error('[HandTracker] Detection error:', error);
      return null;
    }
  }

  /**
   * Check if the hand tracker is ready for detection
   */
  isReady() {
    return this._isReady;
  }

  /**
   * Check if camera is enabled and streaming
   */
  isCameraEnabled() {
    return this._isCameraEnabled;
  }

  /**
   * Re-enable camera after permission is granted (retries webcam init)
   */
  async enableCamera() {
    if (this._isCameraEnabled) return;
    if (!this.videoElement) return;
    // Stop any existing stream first
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    // Try with full constraints first
    try {
      await this.initializeWebcam();
      console.log('[HandTracker] Camera re-enabled successfully');
      return;
    } catch (e) {
      console.warn('[HandTracker] enableCamera with full constraints failed, trying minimal...', e);
    }
    // Fallback: try with minimal constraints
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      this.videoElement.srcObject = this.stream;
      await new Promise((resolve, reject) => {
        if (!this.videoElement) { reject(new Error('Video element not set')); return; }
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play().then(() => resolve()).catch(reject);
        };
        this.videoElement.onerror = () => reject(new Error('Video load error'));
      });
      this._isCameraEnabled = true;
      console.log('[HandTracker] Camera enabled with minimal constraints');
    } catch (e) {
      this._isCameraEnabled = false;
      this.handleCameraError(e);
      console.warn('[HandTracker] enableCamera failed completely:', e);
    }
  }

  /**
   * Get the last detection result
   * Useful for accessing cached results without re-running detection
   */
  getLastResult() {
    return this.lastResult;
  }

  /**
   * Get the video element dimensions
   */
  getVideoDimensions() {
    if (!this.videoElement) return null;
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Stop webcam stream
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // Close HandLandmarker
    // FIX: Do NOT close the shared instance, as other components or reloads might need it.
    // The WASM heap is expensive and should persist.
    // Only cleanup local references.
    this.handLandmarker = null;

    // Note: If we really needed to nuke everything, we would add a static destroy() method.
    // But for this use case, keeping the WASM loaded is better for performance and preventing OOM.

    // Clear video element
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this._isReady = false;
    console.log('[HandTracker] Disposed');
  }
} HandTracker.__initStatic(); HandTracker.__initStatic2();
