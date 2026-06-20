import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

export function useShaderTime(materialRef) {
  const startTime = useRef(performance.now());
  useFrame(() => {
    if (materialRef.current?.uniforms?.uTime) {
      materialRef.current.uniforms.uTime.value = (performance.now() - startTime.current) / 1000;
    }
  });
}
