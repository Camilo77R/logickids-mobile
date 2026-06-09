import { NativeModule, requireNativeModule } from 'expo';
import type { HandTrackerResult } from './ExpoHandTracker.types';

export type LandmarkCallback = (result: HandTrackerResult) => void;

declare class ExpoHandTrackerModule extends NativeModule<{
  onLandmarks: (result: HandTrackerResult) => void;
}> {
  initialize(): Promise<void>;
  processFrame(imagePath: string): Promise<HandTrackerResult | null>;
  startTracking(fps?: number): Promise<void>;
  stopTracking(): Promise<void>;
  isTracking(): boolean;
}

export default requireNativeModule<ExpoHandTrackerModule>('ExpoHandTracker');
