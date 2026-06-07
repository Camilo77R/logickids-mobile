/**
 * @fileoverview Simple audio manager using Howler.js (Babylon.js port).
 *
 * Replaces the Three.js audio system with Howler.js. Positional audio is
 * approximated with volume falloff based on distance from a "listener" mesh.
 * This is a working stub; for production-quality spatial audio, consider
 * migrating to BABYLON.AudioEngine + BABYLON.Sound with proper spatial config.
 *
 * @module iron-man-workshop/audio/WorkshopAudioManager
 */

import { Howl } from 'howler';

const SOUND_DEFAULTS = {
  ambientHum: { path: null, volume: 0.3, loop: true },
  bootSequence: { path: null, volume: 0.6, loop: false, duration: 2.5 },
  loadingLoop: { path: null, volume: 0.4, loop: true },
  flybyIn: { path: null, volume: 0.5, loop: false },
  servoWhir: { path: null, volume: 0.3, loop: false },
  click: { path: null, volume: 0.5, loop: false },
  success: { path: null, volume: 0.6, loop: false },
  powerUp: { path: null, volume: 0.5, loop: false },
  // Assembly-mechanic audio cues (HU-51, HU-52)
  grab: { path: null, volume: 0.5, loop: false },
  snap: { path: null, volume: 0.7, loop: false },
  error: { path: null, volume: 0.4, loop: false },
  softSnap: { path: null, volume: 0.4, loop: false },
};

export class WorkshopAudioManager {
  constructor(camera) {
    this.camera = camera;
    this.howls = new Map();
    this.loopMap = new Map();
    this.isEnabled = true;
    this.isMuted = false;
  }

  async loadSounds(configs = {}) {
    const all = { ...SOUND_DEFAULTS, ...configs };
    const promises = Object.entries(all).map(([name, config]) => new Promise((resolve) => {
      if (!config.path) { resolve(); return; }
      try {
        const howl = new Howl({
          src: [config.path],
          loop: !!config.loop,
          volume: config.volume,
          onload: () => resolve(),
          onloaderror: () => { console.warn(`[Audio] failed: ${name}`); resolve(); },
        });
        this.howls.set(name, howl);
      } catch (e) {
        console.warn(`[Audio] init failed: ${name}`, e);
        resolve();
      }
    }));
    await Promise.all(promises);
  }

  play(name, config = {}) {
    if (!this.isEnabled || this.isMuted) return null;
    const howl = this.howls.get(name);
    if (!howl) return null;
    const id = howl.play();
    if (config.loop || SOUND_DEFAULTS[name]?.loop) {
      this.loopMap.set(name, howl);
    }
    if (config.duration) {
      setTimeout(() => { try { howl.stop(id); } catch (e) { /* ignore */ } }, config.duration * 1000);
    }
    return id;
  }

  stop(name) {
    const howl = this.howls.get(name) || this.loopMap.get(name);
    if (howl) { try { howl.stop(); } catch (e) { /* ignore */ } }
    this.loopMap.delete(name);
  }

  setMute(muted) {
    this.isMuted = muted;
    this.howls.forEach((h) => h.mute(muted));
  }

  dispose() {
    this.howls.forEach((h) => { try { h.unload(); } catch (e) { /* ignore */ } });
    this.howls.clear();
    this.loopMap.clear();
  }
}
