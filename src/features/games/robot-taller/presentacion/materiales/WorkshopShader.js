import * as THREE from 'three';

const vertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uFresnelPower;
uniform float uTime;
uniform float uScanlineFrequency;
uniform float uScanlineSpeed;
uniform bool uEnableScanlines;
uniform float uScanY;
uniform float uScanIntensity;
uniform vec3 uScanColor;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower);
  vec3 color = uColor;
  float alpha = uOpacity;
  color += uColor * fresnel * 0.5;
  alpha += fresnel * 0.3;

  if (uEnableScanlines) {
    float scanline = sin(vWorldPosition.y * uScanlineFrequency + uTime * uScanlineSpeed) * 0.5 + 0.5;
    scanline = smoothstep(0.4, 0.6, scanline);
    alpha *= 0.7 + scanline * 0.3;
  }

  float scanWidth = 0.15;
  float dist = abs(vWorldPosition.y - uScanY);
  float beam = exp(-(dist * dist) / (scanWidth * scanWidth * 0.1));
  if (uScanIntensity > 0.0) {
    vec3 beamColor = uScanColor * uScanIntensity * 2.0;
    color += beamColor * beam;
    alpha += beam * uScanIntensity;
  }

  float flicker = sin(uTime * 30.0) * 0.02 + 1.0;
  alpha *= flicker;

  gl_FragColor = vec4(color, alpha * uOpacity);
}
`;

export const sharedTime = { value: 0 };
export const sharedScanState = { y: -10, intensity: 0, active: false };

export function createHologramMat(color, opacity = 0.6, fresnelPower = 2.0, scanlineFreq = 100.0, enableScanlines = true, isWireframe = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uFresnelPower: { value: fresnelPower },
      uTime: sharedTime,
      uScanlineFrequency: { value: scanlineFreq },
      uScanlineSpeed: { value: 2.0 },
      uEnableScanlines: { value: enableScanlines },
      uScanY: { value: -10.0 },
      uScanIntensity: { value: 0.0 },
      uScanColor: { value: new THREE.Color('#ffffff') },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    wireframe: isWireframe,
  });
}

export function setHologramColor(mat, color) {
  if (mat?.uniforms?.uColor) {
    mat.uniforms.uColor.value = new THREE.Color(color);
  }
}

export function setHologramOpacity(mat, opacity) {
  if (mat?.uniforms?.uOpacity) {
    mat.uniforms.uOpacity.value = opacity;
  }
}

export { vertexShader, fragmentShader };
