/**
 * @fileoverview Mission definitions for RobotLab.
 *
 * Each mission defines:
 * - id: unique identifier
 * - name: display name
 * - description: short text for the child
 * - icon: emoji icon
 * - color: theme color for the mission card
 * - targetLevel: maps to RobotBlueprint level (1-4)
 * - story: opening line from Dr. Cables
 * - partOverrides (optional): per-part renames + recolors so the SAME
 *   robot blueprint can tell different thematic stories (e.g. a
 *   gardening mission turns the BASIC robot's "head" into "Ojos de
 *   Humedad" and gives the whole robot a green palette).
 *
 * The actual assembly validation (shape/color pegs, order) is handled
 * by the RobotAssemblyEngine (Phase B). For now, missions just route
 * the child to a different robot blueprint.
 *
 * @module iron-man-workshop/data/Missions
 */

export const MISSIONS = {
  'space-cleaner': {
    id: 'space-cleaner',
    name: 'Limpiador Espacial',
    description: '¡Limpia los escombros cósmicos!',
    icon: '🛸',
    color: '#00d4ff',
    targetLevel: 1,
    story: '¡Hola, ayudante! Necesito un robot con dos brazos largos y un imán gigante para recoger la basura espacial. ¿Me ayudas a construirlo?',
    requiresParts: ['arm_long', 'arm_long', 'magnet'],
  },
  'galactic-chef': {
    id: 'galactic-chef',
    name: 'Cocinero Galáctico',
    description: '¡Prepara el desayuno estelar!',
    icon: '🍳',
    color: '#ff8800',
    targetLevel: 2,
    story: '¡Bienvenido a la cocina del espacio! Necesito un robot chef con un brazo para revolver y otro para servir. ¡Tendrá ojos que ven la temperatura!',
    requiresParts: ['arm_spoon', 'arm_blender', 'heat_goggles'],
  },
  'space-firefighter': {
    id: 'space-firefighter',
    name: 'Bombero Estelar',
    description: '¡Apaga el fuego cósmico!',
    icon: '🚒',
    color: '#ff3344',
    targetLevel: 3,
    story: '¡Emergencia! Un meteoro ha provocado un incendio en la estación. Construye un bombero con manguera, casco reflector y extintor.',
    requiresParts: ['arm_hose', 'helmet', 'extinguisher'],
  },
  /**
   * Mission 3: gardening on the emerald planet. Same BASIC robot
   * (6 parts), recolored green and relabeled as water-tank,
   * watering-can, humidity-sensor, and crawler-roots. Dr. Cables'
   * intro teaches "right amount of water" (cause-and-effect, the
   * cognitive skill this mission focuses on).
   *
   * See docs/MISSIONS.md for the full narrative and feedback rules.
   */
  'galactic-gardener': {
    id: 'galactic-gardener',
    name: 'Jardinera del Planeta Esmeralda',
    description: '¡Riega las plantas sin ahogarlas!',
    icon: '🌱',
    color: '#44ff88',
    targetLevel: 1,
    story: '¡Hola, botánica espacial! Mis plantas tienen sed, pero si les echo demasiada agua se ahogan. Necesito un robot que sepa cuánta agua es la *justa*. Tendrá que medir la humedad y tener una regadera, no un aspersor gigante. ¿Me ayudas a armarlo?',
    requiresParts: ['arm_wateringcan', 'eyes_humidity', 'base_roots'],
    partOverrides: {
      head: { label: 'Ojos de Humedad', color: 0x88ddff },
      torso: { label: 'Tanque de Agua', color: 0x44ff88 },
      arm_left: { label: 'Brazo Regadera', color: 0xddff44 },
      arm_right: { label: 'Brazo Tijera de Podar', color: 0x66ffaa },
      leg_left: { label: 'Raíz-Oruga Izq.', color: 0x22cc66 },
      leg_right: { label: 'Raíz-Oruga Der.', color: 0x22cc66 },
    },
  },
};

export const MISSION_LIST = Object.values(MISSIONS);

export function getMission(id) {
  return MISSIONS[id] || null;
}

/**
 * Apply a mission's `partOverrides` to a blueprint. Returns a NEW
 * blueprint object (does not mutate the source). Overrides are merged
 * field-by-field, so a mission can change just the label, just the
 * color, or both.
 *
 * @param {object} blueprint - from getRobotBlueprint()
 * @param {string|null} missionId
 * @returns {object} new blueprint (same reference if no overrides)
 */
export function applyPartOverrides(blueprint, missionId) {
  if (!missionId || !blueprint) return blueprint;
  const mission = MISSIONS[missionId];
  if (!mission || !mission.partOverrides) return blueprint;
  const overrides = mission.partOverrides;
  return {
    ...blueprint,
    parts: blueprint.parts.map((p) => {
      const ov = overrides[p.id];
      if (!ov) return p;
      return { ...p, ...ov, peg: p.peg }; // keep the auto-injected peg
    }),
  };
}
