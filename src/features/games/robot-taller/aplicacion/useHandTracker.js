import { useCallback, useEffect, useRef, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';
import { Dimensions } from 'react-native';

const CAPTURE_INTERVAL_MS = 200;

const mapearCoordenadasMano = (w) => {
  if (!w) return null;
  const { width, height } = Dimensions.get('window');
  const aspect = width / height;
  const visibleHeight = 2 * 10 * Math.tan((45 * Math.PI) / 360);
  const visibleWidth = visibleHeight * aspect;
  return {
    x: (w.x - 0.5) * visibleWidth,
    y: -(w.y - 0.5) * visibleHeight,
    z: -((w.z ?? 0) * 6),
  };
};

export function useHandTracker(cameraRef) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hands, setHands] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const intervalRef = useRef(null);
  const moduleRef = useRef(null);
  const trackingRef = useRef(false);
  const triedRef = useRef(false);

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
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.3, base64: false });
      if (!photo?.uri) return;
      const result = await moduleRef.current.processFrame(photo.uri);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.hands) setHands(result);
    } catch (e) {
      setError(e.message);
    }
  }, [cameraRef]);

  const startTracking = useCallback(async () => {
    if (triedRef.current) return;
    triedRef.current = true;

    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        setError('Permiso de camara denegado');
        return;
      }
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
    const dx = l[4].x - l[8].x, dy = l[4].y - l[8].y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [hands]);

  const getHandPosition = useCallback(() => {
    if (!hands?.hands?.[0]?.landmarks?.length) return null;
    return mapearCoordenadasMano(hands.hands[0].landmarks[0]);
  }, [hands]);

  return {
    hands,
    isTracking,
    isAvailable,
    error,
    startTracking,
    stopTracking,
    getPinchDistance,
    getHandPosition,
  };
}
