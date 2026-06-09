// Re-export the native module. On web, it will be resolved to ExpoHandTrackerModule.web.ts
// and on native platforms to ExpoHandTrackerModule.ts
export { default } from './src/ExpoHandTrackerModule';
export * from './src/ExpoHandTracker.types';
