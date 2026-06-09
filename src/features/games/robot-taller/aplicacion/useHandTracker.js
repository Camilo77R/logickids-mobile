import { useCallback, useEffect, useRef, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';

const SCREEN_UPDATE_MS = 400;

export function useHandTracker(cameraRef) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hands, setHands] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef(null);

  const moduleRef = useRef(null);

  useEffect(() => {
    try {
      const m = require('expo-hand-tracker').default;
      if (m?.processFrame) moduleRef.current = m;
    } catch {}
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!cameraRef?.current || !moduleRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        skipProcessing: true,
      });
      if (!photo?.uri) return;
      const result = await moduleRef.current.processFrame(photo.uri);
      if (result?.hands) setHands(result);
      if (photo.uri.startsWith('file:///')) {
        FileSystem.deleteAsync(photo.uri, { idempotent: true }).catch(() => {});
      }
    } catch {}
  }, [cameraRef]);

  const startTracking = useCallback(async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) return;
    }
    if (!moduleRef.current) return;
    try {
      await moduleRef.current.initialize();
    } catch {}
    setIsTracking(true);
    intervalRef.current = setInterval(captureAndProcess, SCREEN_UPDATE_MS);
    captureAndProcess();
  }, [permission, requestPermission, captureAndProcess]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHands(null);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const getPinchDistance = useCallback(() => {
    if (!hands?.hands?.[0]?.landmarks || hands.hands[0].landmarks.length < 21) return null;
    const l = hands.hands[0].landmarks;
    const dx = l[4].x - l[8].x, dy = l[4].y - l[8].y, dz = l[4].z - l[8].z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [hands]);

  const getHandPosition = useCallback(() => {
    if (!hands?.hands?.[0]?.landmarks?.length) return null;
    const w = hands.hands[0].landmarks[0];
    if (!w) return null;
    return { x: (w.x - 0.5) * 8, y: -(w.y - 0.5) * 8, z: -w.z * 8 };
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
