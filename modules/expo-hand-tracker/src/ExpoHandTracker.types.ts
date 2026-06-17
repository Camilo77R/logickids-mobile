export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  score: number;
}

export interface HandTrackerResult {
  hands: HandData[];
  timestamp: number;
}
