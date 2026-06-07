 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * PostProcessingManager Module
 * Manages all post-processing effects using pmndrs/postprocessing library
 *
 * Features:
 * - Bloom effect for glowing particles (HDR-quality)
 * - Chromatic aberration for lens distortion
 * - LUT-based color grading for cosmic atmosphere
 *
 * Architecture:
 * - Single Responsibility: Manages post-processing pipeline only
 * - Dependency Injection: Accepts renderer, scene, camera
 * - Clean disposal pattern for resource management
 *
 * @see https://github.com/pmndrs/postprocessing
 */

import * as THREE from 'three';
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  ChromaticAberrationEffect,
  LUT3DEffect,
  BlendFunction,
  KernelSize,

} from 'postprocessing';


/**
 * Post-processing configuration
 */





















/**
 * Default configuration optimized for cosmic visuals
 */
export const DEFAULT_POSTPROCESSING_CONFIG = {
  enableBloom: true,
  bloomIntensity: 1.5,
  bloomLuminanceThreshold: 0.4,
  bloomRadius: 0.8,
  bloomKernelSize: 2, // KernelSize.MEDIUM
  bloomResolutionScale: 0.5,

  enableChromaticAberration: false,
  chromaticAberrationOffset: 0.001,

  enableColorGrading: true,
  colorGradingIntensity: 0.8,
};

/**
 * PostProcessingManager
 * Encapsulates all post-processing logic following SOLID principles
 */
export class PostProcessingManager {
  
  

  // Effects (store references for dynamic control)
   __init() {this.bloomEffect = null}
   __init2() {this.chromaticAberrationEffect = null}
   __init3() {this.colorGradingEffect = null}
   __init4() {this.enabled = true}

  // Three.js references (not owned by this manager)
  
  

  /**
   * Creates a PostProcessingManager
   * @param renderer WebGLRenderer instance
   * @param scene Scene to render
   * @param camera Camera for rendering
   * @param config Post-processing configuration
   */
  constructor(
    renderer,
    scene,
    camera,
    config = {}
  ) {;PostProcessingManager.prototype.__init.call(this);PostProcessingManager.prototype.__init2.call(this);PostProcessingManager.prototype.__init3.call(this);PostProcessingManager.prototype.__init4.call(this);
    this.scene = scene;
    this.camera = camera;
    this.config = { ...DEFAULT_POSTPROCESSING_CONFIG, ...config };
    this.renderer = renderer;

    // Initialize composer with HDR-quality frame buffers
    // HalfFloatType prevents color banding in dark scenes
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
    });

    this.setupPasses();
  }

  /**
   * Setup rendering passes and effects
   * @private
   */
   setupPasses() {
    // Pass 1: Render the scene
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Pass 2: Apply effects
    const effects = [];

    // Bloom Effect (glowing particles)
    if (this.config.enableBloom) {
      this.bloomEffect = new BloomEffect({
        intensity: this.config.bloomIntensity,
        luminanceThreshold: this.config.bloomLuminanceThreshold,
        luminanceSmoothing: 0.5, // Smooth threshold transition
        radius: this.config.bloomRadius,
        kernelSize: this.config.bloomKernelSize != null ? this.config.bloomKernelSize : KernelSize.MEDIUM,
        resolutionScale: this.config.bloomResolutionScale, // Half-res for performance
        blendFunction: BlendFunction.SCREEN, // Additive blending for glow
      });
      effects.push(this.bloomEffect);
    }

    // Chromatic Aberration (lens distortion)
    if (this.config.enableChromaticAberration) {
      this.chromaticAberrationEffect = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(
          this.config.chromaticAberrationOffset,
          this.config.chromaticAberrationOffset
        ),
        radialModulation: true, // Stronger at edges
        modulationOffset: 0.2, // Start distortion at 20% from center
      });
      effects.push(this.chromaticAberrationEffect);
    }

    // Color Grading (cosmic palette)
    if (this.config.enableColorGrading) {
      const lut = this.createCosmicLUT();
      this.colorGradingEffect = new LUT3DEffect(lut, {
        blendFunction: BlendFunction.NORMAL,
      });

      // Set intensity via blend mode opacity
      this.colorGradingEffect.blendMode.opacity.value = this.config.colorGradingIntensity;

      effects.push(this.colorGradingEffect);
    }



    // Add all effects to a single pass (more efficient)
    if (effects.length > 0) {
      const effectPass = new EffectPass(this.camera, ...effects);
      this.composer.addPass(effectPass);
    }
  }

  /**
   * Creates a 3D LUT for cosmic color grading
   * Dramatically enhances colors for maximum wow factor:
   * - Saturation boost for vibrant colors
   * - Hue rotation toward cosmic palette (blues, purples, magentas, cyans)
   * - Contrast enhancement with S-curve
   * - Color temperature shift toward cooler tones
   * @private
   * @returns Data3DTexture for color lookup
   */
   createCosmicLUT() {
    const size = 32; // 32x32x32 = 32,768 color mappings (good balance)
    const data = new Uint8Array(size * size * size * 4);

    // Helper: RGB to HSL conversion
    const rgbToHsl = (r, g, b) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;

      // Luminance
      const l = (max + min) / 2;

      // Saturation
      let s = 0;
      if (delta !== 0) {
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      }

      // Hue
      let h = 0;
      if (delta !== 0) {
        if (max === r) {
          h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
          h = ((b - r) / delta + 2) / 6;
        } else {
          h = ((r - g) / delta + 4) / 6;
        }
      }

      return [h, s, l];
    };

    // Helper: HSL to RGB conversion
    const hslToRgb = (h, s, l) => {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      if (s === 0) {
        return [l, l, l]; // Achromatic
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      const r = hue2rgb(p, q, h + 1 / 3);
      const g = hue2rgb(p, q, h);
      const b = hue2rgb(p, q, h - 1 / 3);

      return [r, g, b];
    };

    // Helper: Smooth S-curve for contrast (3x² - 2x³)
    const smoothstep = (x) => {
      const t = Math.max(0, Math.min(1, x));
      return t * t * (3 - 2 * t);
    };

    // Generate LUT with dramatic cosmic color grading
    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const index = (b * size * size + g * size + r) * 4;

          // Normalize to [0, 1]
          const rNorm = r / (size - 1);
          const gNorm = g / (size - 1);
          const bNorm = b / (size - 1);

          // Convert to HSL
          let [h, s, l] = rgbToHsl(rNorm, gNorm, bNorm);

          // === COSMIC ENHANCEMENTS ===

          // 1. HUE ROTATION toward cosmic palette
          // Red/Orange (0-60°) → Purple/Magenta (300°)
          // Yellow/Green (60-180°) → Blue/Cyan (210°)
          // Blue/Purple (180-360°) → Keep/enhance
          const hDeg = h * 360;
          if (hDeg < 60) {
            // Reds → shift strongly toward magenta/purple
            h = (hDeg + (300 - hDeg) * 0.5) / 360;
          } else if (hDeg < 180) {
            // Yellows/Greens → shift toward deep blue (reduce greenish)
            h = (hDeg + (210 - hDeg) * 0.6) / 360;
          }
          // Blues/Purples (180-360) already cosmic, keep them

          // 2. SATURATION BOOST (1.8x for vibrant colors)
          s = Math.min(1, s * 1.8);

          // 3. CONTRAST ENHANCEMENT (S-curve on luminance)
          l = smoothstep(l);

          // Convert back to RGB
          let [rOut, gOut, bOut] = hslToRgb(h, s, l);

          // 4. COLOR TEMPERATURE shift (cooler = more blue/purple, less red/green)
          rOut *= 0.75; // Reduce red more
          gOut *= 0.85; // Reduce green to fight greenish tint
          bOut *= 1.3; // Boost blue even more

          // Clamp and convert to byte
          const transformedR = Math.min(255, Math.floor(rOut * 255));
          const transformedG = Math.min(255, Math.floor(gOut * 255));
          const transformedB = Math.min(255, Math.floor(bOut * 255));

          // Store RGBA
          data[index + 0] = transformedR;
          data[index + 1] = transformedG;
          data[index + 2] = transformedB;
          data[index + 3] = 255; // Full alpha
        }
      }
    }

    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Render the scene with post-processing effects
   * Call this instead of renderer.render()
   * @param deltaTime Optional delta time for time-based effects
   */
  render(deltaTime) {
    if (!this.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.composer.render(deltaTime);
  }

  /**
   * Enable or disable post-processing entirely
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Check if post-processing is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Resize the composer (call on window resize)
   * @param width New width in pixels
   * @param height New height in pixels
   */
  resize(width, height) {
    this.composer.setSize(width, height);
  }

  /**
   * Update effect parameters dynamically
   * Note: BloomEffect properties are read-only after construction
   * To change bloom settings, recreate the effect
   */
  setBloomIntensity(intensity) {
    if (this.bloomEffect) {
      this.bloomEffect.blendMode.opacity.value = intensity;
    }
  }

  setChromaticAberrationOffset(offset) {
    if (this.chromaticAberrationEffect) {
      this.chromaticAberrationEffect.offset.set(offset, offset);
    }
  }

  setColorGradingIntensity(intensity) {
    if (this.colorGradingEffect) {
      this.colorGradingEffect.blendMode.opacity.value = intensity;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }



  /**
   * Clean up resources
   */
  dispose() {
    this.composer.dispose();

    // Individual effect disposal - Effect base class has dispose method
    _optionalChain([this, 'access', _ => _.bloomEffect, 'optionalAccess', _2 => _2.dispose, 'call', _3 => _3()]);
    _optionalChain([this, 'access', _4 => _4.chromaticAberrationEffect, 'optionalAccess', _5 => _5.dispose, 'call', _6 => _6()]);
    _optionalChain([this, 'access', _7 => _7.colorGradingEffect, 'optionalAccess', _8 => _8.dispose, 'call', _9 => _9()]);

    console.log('[PostProcessingManager] Disposed');
  }
}
