 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import * as THREE from 'three';

/**
 * Sound names available in the audio system.
 */
 








































/**
 * A standard, robust audio manager using Three.js native Audio system.
 * Supports both global (ambient/UI) and spatial (3D) audio.
 */
export class ThreeAudioManager {
  
  
   __init() {this.buffers = new Map()}
   __init2() {this.activeSounds = new Set()}
  // Track looped sounds to stop them later
   __init3() {this.loopMap = new Map()}

   __init4() {this.isEnabled = true}

  constructor(camera) {;ThreeAudioManager.prototype.__init.call(this);ThreeAudioManager.prototype.__init2.call(this);ThreeAudioManager.prototype.__init3.call(this);ThreeAudioManager.prototype.__init4.call(this);
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.audioLoader = new THREE.AudioLoader();
  }

  /**
   * Loads a set of sounds defined by a config map.
   */
  async loadSounds(configs) {
    const promises = Object.entries(configs).map(async ([name, config]) => {
      try {
        const buffer = await this.audioLoader.loadAsync(config.path);
        this.buffers.set(name , buffer);
      } catch (error) {
        console.warn(`[ThreeAudioManager] Failed to load sound: ${name} (${config.path})`, error);
      }
    });

    await Promise.all(promises);
    console.log(`[ThreeAudioManager] Loaded ${this.buffers.size} audio buffers.`);
  }

  /**
   * Plays a sound.
   * If sourceMesh is provided, plays as PositionalAudio attached to that mesh.
   * Otherwise, plays as global Audio.
   *
   * @param name The name of the sound
   * @param config The sound configuration
   * @param sourceMesh Optional mesh to attach spatial audio to
   * @returns The created audio object, or null if failed
   */
  play(
    name,
    config,
    sourceMesh
  ) {
    if (!this.isEnabled) return null;

    const buffer = this.buffers.get(name);
    if (!buffer) {
      console.warn(`[ThreeAudioManager] Sound not loaded: ${name}`);
      return null;
    }

    // Identify if this is a spatial sound
    let sound;

    if (sourceMesh) {
      const positionalSound = new THREE.PositionalAudio(this.listener);
      positionalSound.setRefDistance(_nullishCoalesce(config.refDistance, () => ( 2))); // Default to 2 meters
      positionalSound.setMaxDistance(_nullishCoalesce(config.maxDistance, () => ( 15)));
      // Linear gives a nice dropoff, but inverse is more realistic. Three uses inverse by default.
      // We can tune this model if needed.
      sourceMesh.add(positionalSound);
      sound = positionalSound;
    } else {
      sound = new THREE.Audio(this.listener);
    }

    sound.setBuffer(buffer);
    sound.setLoop(_nullishCoalesce(config.loop, () => ( false)));
    sound.setVolume(config.volume);

    // Track active sounds for cleanup
    this.activeSounds.add(sound);

    // If it's a loop, store it so we can stop it by name/id
    if (config.loop) {
      // For loops, we map by name. If multiple of same name loop, this basic map overwrites.
      // For more complex cases, we'd return a unique ID.
      // Given the requirement, simple name mapping is usually sufficient for "servoWhir" etc.
      // But if we have multiple servos, we might want to track by mesh ID?
      // For now, map by name is consistent with previous API.
      this.loopMap.set(name, sound);
    }

    // Cleanup on end
    sound.onEnded = () => {
      this.cleanupSound(sound, sourceMesh);
    };

    if (sound.isPlaying) {
      sound.stop();
    }
    sound.play();

    // specific for duration
    if (config.duration) {
      setTimeout(() => {
        if (sound.isPlaying) {
          sound.stop();
        }
      }, config.duration * 1000);
    }

    return sound;
  }

  /**
   * Stops a looping sound by name.
   */
  stop(name) {
    const sound = this.loopMap.get(name);
    if (sound) {
      sound.stop();
      this.loopMap.delete(name);
      // Cleanup will trigger via onEnded if we stop?
      // Three.js onEnded is NOT triggered by .stop() usually.
      // So we manually clean up.
      this.cleanupSound(sound);
    }
  }

  /**
   * Stops all sounds.
   */
  stopAll() {
    this.activeSounds.forEach((sound) => {
      if (sound.isPlaying) sound.stop();
      this.cleanupSound(sound);
    });
    this.loopMap.clear();
  }

  /**
   * Helper to clean up audio nodes and remove from scene.
   */
   cleanupSound(sound, parent) {
    this.activeSounds.delete(sound);
    if (parent && sound instanceof THREE.PositionalAudio) {
      parent.remove(sound);
    }
    // Note: We do not disconnect/dispose nodes aggressively as Three.js reuses context,
    // but removing from parent is good for scene graph hygiene.
  }

  setMasterVolume(volume) {
    this.listener.setMasterVolume(volume);
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) this.stopAll();
    this.setMasterVolume(enabled ? 1 : 0);
  }

  /**
   * Start ambient sound (special helper)
   */
  playAmbient(name, config) {
    // Ambients are always global
    this.play(name, config);
  }
}
