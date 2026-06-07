/**
 * Hand tracking type definitions
 * Based on MediaPipe Tasks Vision HandLandmarker API
 * @see https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
 */

/**
 * Hand identifier type for gesture attribution
 */
 



































/**
 * MediaPipe hand landmark indices
 * @see https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker#hand_landmark_model
 */
export const HandLandmarkIndex = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} ;

 



















/**
 * Default hand tracker configuration
 */
export const DEFAULT_HAND_TRACKER_CONFIG = {
  modelAssetPath:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  delegate: 'GPU',
  // numHands is overridden per-device: 1 on mobile (we only need to
  // track one hand for the pinch grab, and 2 hands is ~85% more
  // expensive on the detector). Desktop stays at 2 to allow
  // experimentation (e.g. two-hand gestures in other modes).
  numHands: 2,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

/**
 * Processed hand data for application use
 */








