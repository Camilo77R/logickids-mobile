import { useCallback, useEffect, useRef, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';

const CAPTURE_INTERVAL_MS = 0;
const obtenerSeguro = (arr, idx, fallback = { x: 0, y: 0, z: 0 }) => {
  if (!arr || typeof arr !== 'object') return fallback;
  const v = arr[idx];
  return v && typeof v.x === 'number' ? v : fallback;
};

export function useHandTracker(cameraRef) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const moduleRef = useRef(null);
  const trackingRef = useRef(false);
  const triedRef = useRef(false);
  const lastResultRef = useRef(null);
  const captureTimerRef = useRef(null);
  const capturingRef = useRef(false);

  useEffect(() => {
    try {
      const m = require('expo-hand-tracker');
      const mod = m?.default?.processFrame ? m.default : m?.processFrame ? m : null;
      if (mod) {
        moduleRef.current = mod;
        setIsAvailable(true);
      }
    } catch (e) {
      setIsAvailable(false);
    }
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!cameraRef?.current || !moduleRef.current || !trackingRef.current) return;
    if (capturingRef.current) return;
    capturingRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.12, base64: false, skipProcessing: true,
      });
      if (!photo?.uri) { capturingRef.current = false; return; }
      const result = await moduleRef.current.processFrame(photo.uri);
      if (result?.error) { setError(result.error); return; }
      if (result?.hands) {
        lastResultRef.current = result;
      }
    } catch (e) {
      setError(e.message);
    }
    capturingRef.current = false;
    if (trackingRef.current) {
      captureTimerRef.current = setTimeout(captureAndProcess, CAPTURE_INTERVAL_MS);
    }
  }, [cameraRef]);

  const startTracking = useCallback(async () => {
    if (triedRef.current) return;
    triedRef.current = true;
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) { setError('Permiso de camara denegado'); return; }
    }
    if (!moduleRef.current || !moduleRef.current.initialize) {
      setError('Modulo de mano no disponible en esta build');
      return;
    }
    try {
      await moduleRef.current.initialize();
    } catch (e) {
      setError('Error al inicializar: ' + e.message);
      return;
    }
    setError(null);
    trackingRef.current = true;
    setIsTracking(true);
    captureAndProcess();
  }, [permission, requestPermission, captureAndProcess]);

  const stopTracking = useCallback(() => {
    trackingRef.current = false;
    setIsTracking(false);
    if (captureTimerRef.current) { clearTimeout(captureTimerRef.current); captureTimerRef.current = null; }
    lastResultRef.current = null;
  }, []);

  useEffect(() => () => { trackingRef.current = false; if (captureTimerRef.current) clearTimeout(captureTimerRef.current); }, []);

  const getRightHand = useCallback(() => {
    const data = lastResultRef.current;
    if (!data?.hands?.[0]?.landmarks?.length) return null;
    const l = data.hands[0].landmarks;
    const thumbTip = obtenerSeguro(l, 4);
    const indexTip = obtenerSeguro(l, 8);
    const wrist = obtenerSeguro(l, 0);
    const indexBase = obtenerSeguro(l, 9);

    const pinchDistance = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y,
      thumbTip.z - indexTip.z
    );

    const palmX = (wrist.x + indexBase.x) / 2;
    const palmY = (wrist.y + indexBase.y) / 2;

    return {
      landmarks: l,
      pinchDistance,
      world: {
        x: (0.5 - palmX) * 6,
        y: (0.5 - palmY) * 4,
        z: 0,
      },
      normalized: { x: palmX, y: palmY },
    };
  }, []);

  const getLeftHand = useCallback(() => {
    const data = lastResultRef.current;
    if (!data?.hands?.[1]?.landmarks?.length) return null;
    const l = data.hands[1].landmarks;
    const palmCenter = {
      x: (l[5].x + l[9].x + l[0].x) / 3,
      y: (l[5].y + l[9].y + l[0].y) / 3,
    };
    const tips = [l[8], l[12], l[16], l[20]];
    let totalDist = 0;
    for (const tip of tips) {
      totalDist += Math.hypot(tip.x - palmCenter.x, tip.y - palmCenter.y);
    }
    return {
      landmarks: l,
      avgFingerDistance: totalDist / tips.length,
      palmCenter,
    };
  }, []);

  return {
    isTracking, isAvailable, error,
    startTracking, stopTracking,
    getRightHand, getLeftHand,
  };
}
