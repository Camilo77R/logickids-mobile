import { useCallback, useEffect, useRef, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';

const CAPTURE_INTERVAL_MS = 200;

export function useHandTracker(cameraRef) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hands, setHands] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef(null);
  const moduleRef = useRef(null);
  const trackingRef = useRef(false);

  useEffect(() => {
    try {
      const m = require('expo-hand-tracker');
      if (m?.default?.processFrame) {
        moduleRef.current = m.default;
        console.log('useHandTracker: module loaded');
      } else if (m?.processFrame) {
        moduleRef.current = m;
        console.log('useHandTracker: module loaded (direct)');
      }
    } catch (e) {
      console.log('useHandTracker: module not available, using touch fallback', e.message);
    }
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!cameraRef?.current || !moduleRef.current || !trackingRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: false,
        skipProcessing: true,
      });
      if (!photo?.uri) return;
      const result = await moduleRef.current.processFrame(photo.uri);
      if (result?.hands) setHands(result);
    } catch (e) {
      console.log('useHandTracker: capture error', e.message);
    }
  }, [cameraRef]);

  const startTracking = useCallback(async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) return;
    }
    if (!moduleRef.current) return;
    try {
      await moduleRef.current.initialize();
    } catch (e) {
      console.log('useHandTracker: init error', e.message);
      return;
    }
    trackingRef.current = true;
    setIsTracking(true);
    captureAndProcess();
    intervalRef.current = setInterval(captureAndProcess, CAPTURE_INTERVAL_MS);
  }, [permission, requestPermission, captureAndProcess]);

  const stopTracking = useCallback(() => {
    trackingRef.current = false;
    setIsTracking(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHands(null);
  }, []);

  useEffect(() => {
    return () => {
      trackingRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const getPinchDistance = useCallback(() => {
    if (!hands?.hands?.[0]?.landmarks?.length) return null;
    const l = hands.hands[0].landmarks;
    const dx = l[4].x - l[8].x, dy = l[4].y - l[8].y, dz = (l[4].z ?? 0) - (l[8].z ?? 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [hands]);

  const getHandPosition = useCallback(() => {
    if (!hands?.hands?.[0]?.landmarks?.length) return null;
    const w = hands.hands[0].landmarks[0];
    if (!w) return null;
    return { x: (w.x - 0.5) * 8, y: -(w.y - 0.5) * 8, z: -((w.z ?? 0) * 8) };
  }, [hands]);

  return {
    hands,
    isTracking,
    isAvailable: !!moduleRef.current,
    startTracking,
    stopTracking,
    getPinchDistance,
    getHandPosition,
  };
}
