import { requireNativeModule } from 'expo';
import type { HandTrackerResult } from './ExpoHandTracker.types';

export type LandmarkCallback = (result: HandTrackerResult) => void;

let nativeModule: any = null;

try {
  nativeModule = requireNativeModule('ExpoHandTracker');
} catch {}

function stub() {
  return Promise.reject(new Error('Hand tracker native module not available'));
}

const fallback = {
  initialize: stub,
  processFrame: stub,
  startTracking: stub,
  stopTracking: stub,
  isTracking: () => false,
};

export default nativeModule ?? fallback;
