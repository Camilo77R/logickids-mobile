/**
 * RobotCustomization - Shared state for customized robot and unlockable robots
 */

export const ROBOT_COLORS = [
  { name: 'Rojo Vibranium', hex: 0xff3b30 },
  { name: 'Oro Stark', hex: 0xffcc00 },
  { name: 'Sigilo Negro', hex: 0x1c1c1e },
  { name: 'Cian Holograma', hex: 0x00ffff },
  { name: 'Verde Gamma', hex: 0x34c759 },
  { name: 'Púrpura Quásar', hex: 0xaf52de },
];

export const ROBOT_WEAPONS = [
  { id: 'repulsor', name: 'Láser Repulsor', icon: '⚡', description: 'Rayo continuo supercargado' },
  { id: 'missiles', name: 'Micro Misiles', icon: '🚀', description: 'Impactos explosivos de ráfaga' },
  { id: 'plasma', name: 'Cañón de Plasma', icon: '🌀', description: 'Esfera de energía de fusión' },
];

class RobotCustomizationManager {
  __init() {
    this.data = {
      colorHex: 0x00ffff,
      colorName: 'Cian Holograma',
      weapon: 'repulsor',
      robotName: 'MK-VI Lógico',
      glowIntensity: 1.5,
      selectedRobotLevel: 1,
      unlockedRobots: [1],
      assembledParts: {},
    };
  }

  constructor() {
    RobotCustomizationManager.prototype.__init.call(this);
    this.load();
  }

  getData() {
    return { ...this.data };
  }

  updateData(updates) {
    this.data = { ...this.data, ...updates };
    this.save();
  }

  /* ---- Robot selection ---- */

  getSelectedRobotLevel() {
    return this.data.selectedRobotLevel || 1;
  }

  selectRobot(level) {
    if (this.data.unlockedRobots.includes(level)) {
      this.data.selectedRobotLevel = level;
      this.save();
    }
  }

  getUnlockedRobots() {
    return [...this.data.unlockedRobots];
  }

  isRobotUnlocked(level) {
    return this.data.unlockedRobots.includes(level);
  }

  unlockRobot(level) {
    if (!this.data.unlockedRobots.includes(level)) {
      this.data.unlockedRobots.push(level);
      this.save();
      return true;
    }
    return false;
  }

  /* ---- Assembly progress per robot ---- */

  getAssembledParts(robotLevel) {
    return this.data.assembledParts[robotLevel] || [];
  }

  setPartAssembled(robotLevel, partId) {
    if (!this.data.assembledParts[robotLevel]) {
      this.data.assembledParts[robotLevel] = [];
    }
    if (!this.data.assembledParts[robotLevel].includes(partId)) {
      this.data.assembledParts[robotLevel].push(partId);
      this.save();
    }
  }

  isPartAssembled(robotLevel, partId) {
    const parts = this.data.assembledParts[robotLevel] || [];
    return parts.includes(partId);
  }

  resetAssembly(robotLevel) {
    this.data.assembledParts[robotLevel] = [];
    this.save();
  }

  isRobotFullyAssembled(robotLevel, totalParts) {
    const parts = this.data.assembledParts[robotLevel] || [];
    return parts.length >= totalParts;
  }

  /* ---- Persistence ---- */

  save() {
    try {
      localStorage.setItem('juego-logica-robot-custom', JSON.stringify(this.data));
    } catch (e) {
      // Ignorar en entornos restringidos
    }
  }

  load() {
    try {
      const stored = localStorage.getItem('juego-logica-robot-custom');
      if (stored) {
        this.data = { ...this.data, ...JSON.parse(stored) };
      }
    } catch (e) {
      // Usar valores predeterminados
    }
  }
}

export const RobotCustomization = new RobotCustomizationManager();
