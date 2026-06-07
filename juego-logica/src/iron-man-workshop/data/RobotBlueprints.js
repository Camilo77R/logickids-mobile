/**
 * @fileoverview Robot blueprint definitions for the assembly workshop.
 *
 * Each robot level defines parts with:
 * - Local position (where the part sits in the assembled robot)
 * - Exploded offset (where the part floats before assembly)
 * - Color tint for the holographic display
 * - Assembly order priority
 *
 * @module iron-man-workshop/data/RobotBlueprints
 */

export const ROBOT_LEVELS = {
  BASIC: 1,
  ADVANCED: 2,
  MARK_VI: 3,
  PREMIUM: 4,
};

/**
 * Assembly position tolerance - how close (in world units) a dragged part
 * must be to its target before snapping into place.
 *
 * - SNAP_THRESHOLD:     the *strict* snap range — the part must be at
 *                       least this close for an instant snap.
 * - SOFT_SNAP_RANGE:    a wider "magnetic" range. If the part is
 *                       released within this distance (but outside the
 *                       strict threshold), it is animated to the target
 *                       with a smooth glide instead of being sent back.
 *                       This makes the assembly forgiving for kids'
 *                       imprecise hands (especially on mobile where
 *                       the camera-based pinch is less precise).
 *
 * Both values are in 2D world units (X/Y plane).
 */
export const SNAP_THRESHOLD = 3.5;
export const SOFT_SNAP_RANGE = 12.0;

/**
 * Visual feedback thresholds (0-1 range, based on distance to target)
 */
export const FEEDBACK_THRESHOLDS = {
  /** Green glow starts appearing */
  NEAR: 0.3,
  /** Strong green glow, about to snap */
  VERY_NEAR: 0.12,
};

/**
 * Peg table for the logical-assembly system (RobotLab v2).
 *
 * Each `order` value maps to a `(shape, color)` pair. Parts sharing the same
 * order share the same peg — so the child can recognize "all the green
 * triangles" by category, while still having to pick the right *order* to
 * place them in.
 *
 * Shapes are simple Babylon primitives:
 * - 'square':  box
 * - 'circle':  disc (very thin cylinder, high tessellation)
 * - 'triangle': 3-sided prism (cylinder tessellation=3)
 * - 'diamond': box rotated 45° around Y
 * - 'pentagon'..'octagon': cylinder with matching tessellation
 *
 * Receptacle visuals use the same primitive so a child can compare them
 * side by side.
 */
export const PEG_TABLE = [
  null,                          // order 0 (unused; torso is also 0)
  { shape: 'circle',   color: 0x00ffaa, label: 'Círculo' },
  { shape: 'square',   color: 0x00aaff, label: 'Cuadrado' },
  { shape: 'triangle', color: 0x00ff44, label: 'Triángulo' },
  { shape: 'diamond',  color: 0xffcc00, label: 'Diamante' },
  { shape: 'pentagon', color: 0xff8800, label: 'Pentágono' },
  { shape: 'hexagon',  color: 0xff44aa, label: 'Hexágono' },
  { shape: 'heptagon', color: 0xaa44ff, label: 'Heptágono' },
  { shape: 'octagon',  color: 0xff2244, label: 'Octágono' },
  { shape: 'nonagon',  color: 0x44ffaa, label: 'Nonágono' },
  { shape: 'decagon',  color: 0xffffff, label: 'Decágono' },
];

/**
 * Special peg for order 0 (the foundation). The torso (or first body part)
 * always uses this.
 */
export const PEG_FOUNDATION = { shape: 'square', color: 0x00aaff, label: 'Cimiento' };

/**
 * Look up the peg data for a given assembly order. Returns one of:
 * - `PEG_FOUNDATION` for order 0
 * - `PEG_TABLE[order]` for orders 1..N
 * - a fallback wrapping entry if order exceeds the table length
 *
 * @param {number} order
 * @returns {{shape: string, color: number, label: string}}
 */
export function getPegForOrder(order) {
  if (order === 0) return PEG_FOUNDATION;
  if (order > 0 && order < PEG_TABLE.length) return PEG_TABLE[order];
  // Wrap around for very long blueprints
  const wrapIndex = ((order - 1) % (PEG_TABLE.length - 1)) + 1;
  return PEG_TABLE[wrapIndex];
}

/**
 * Robot blueprint definitions.
 * Each robot has a name, description, unlock level, and an array of parts.
 */
export const ROBOT_BLUEPRINTS = {
  /* ================================================================
   * LEVEL 1: BASIC - Simple blocky robot
   * 6 parts, large and easy to grab
   * ================================================================ */
  [ROBOT_LEVELS.BASIC]: {
    level: ROBOT_LEVELS.BASIC,
    name: 'Básico',
    description: 'Un robot sencillo para empezar',
    unlockLevel: 0, // Available from start
    companionPower: 0.5, // 50% of full power
    parts: [
      {
        id: 'head',
        label: 'Cabeza',
        // Assembled position (relative to robot center)
        position: { x: 0, y: 1.8, z: 0 },
        // Offset when exploded (floating away)
        explodedOffset: { x: 0, y: 3.5, z: 2.0 },
        // Size for grabbing
        radius: 0.45,
        // Box geometry dimensions
        geometry: { type: 'box', w: 0.7, h: 0.7, d: 0.7 },
        // Visual
        color: 0x00ffff,
        emissiveIntensity: 0.8,
        order: 1,
      },
      {
        id: 'torso',
        label: 'Torso',
        position: { x: 0, y: 0.6, z: 0 },
        explodedOffset: { x: 2.5, y: 0.5, z: 1.5 },
        radius: 0.55,
        geometry: { type: 'box', w: 1.2, h: 1.4, d: 0.8 },
        color: 0x00ccff,
        emissiveIntensity: 0.7,
        order: 0, // First to place
      },
      {
        id: 'arm_left',
        label: 'Brazo Izq.',
        position: { x: -1.1, y: 0.8, z: 0 },
        explodedOffset: { x: -3.0, y: 2.0, z: 1.0 },
        radius: 0.35,
        geometry: { type: 'box', w: 0.4, h: 1.2, d: 0.4 },
        color: 0x00aaff,
        emissiveIntensity: 0.6,
        order: 2,
      },
      {
        id: 'arm_right',
        label: 'Brazo Der.',
        position: { x: 1.1, y: 0.8, z: 0 },
        explodedOffset: { x: 3.0, y: 2.0, z: 1.0 },
        radius: 0.35,
        geometry: { type: 'box', w: 0.4, h: 1.2, d: 0.4 },
        color: 0x00aaff,
        emissiveIntensity: 0.6,
        order: 2,
      },
      {
        id: 'leg_left',
        label: 'Pierna Izq.',
        position: { x: -0.4, y: -0.8, z: 0 },
        explodedOffset: { x: -2.0, y: -2.5, z: 1.5 },
        radius: 0.35,
        geometry: { type: 'box', w: 0.45, h: 1.3, d: 0.45 },
        color: 0x0088dd,
        emissiveIntensity: 0.5,
        order: 3,
      },
      {
        id: 'leg_right',
        label: 'Pierna Der.',
        position: { x: 0.4, y: -0.8, z: 0 },
        explodedOffset: { x: 2.0, y: -2.5, z: 1.5 },
        radius: 0.35,
        geometry: { type: 'box', w: 0.45, h: 1.3, d: 0.45 },
        color: 0x0088dd,
        emissiveIntensity: 0.5,
        order: 3,
      },
    ],
  },

  /* ================================================================
   * LEVEL 2: ADVANCED - More articulated, 10 parts
   * ================================================================ */
  [ROBOT_LEVELS.ADVANCED]: {
    level: ROBOT_LEVELS.ADVANCED,
    name: 'Avanzado',
    description: 'Mas piezas, mejor precision',
    unlockLevel: 5,
    companionPower: 0.75,
    parts: [
      {
        id: 'head',
        label: 'Cabeza',
        position: { x: 0, y: 2.0, z: 0 },
        explodedOffset: { x: 0, y: 4.0, z: 2.5 },
        radius: 0.4,
        geometry: { type: 'box', w: 0.65, h: 0.65, d: 0.65 },
        color: 0x00ffff,
        emissiveIntensity: 0.9,
        order: 1,
      },
      {
        id: 'torso_front',
        label: 'Pecho',
        position: { x: 0, y: 0.7, z: 0.3 },
        explodedOffset: { x: 2.0, y: 0.8, z: 2.0 },
        radius: 0.5,
        geometry: { type: 'box', w: 1.1, h: 1.0, d: 0.5 },
        color: 0x00ddff,
        emissiveIntensity: 0.8,
        order: 0,
      },
      {
        id: 'torso_back',
        label: 'Espalda',
        position: { x: 0, y: 0.7, z: -0.3 },
        explodedOffset: { x: -2.0, y: 0.8, z: -2.0 },
        radius: 0.5,
        geometry: { type: 'box', w: 1.1, h: 1.0, d: 0.4 },
        color: 0x00bbdd,
        emissiveIntensity: 0.7,
        order: 0,
      },
      {
        id: 'shoulder_left',
        label: 'Hombro Izq.',
        position: { x: -0.85, y: 1.3, z: 0 },
        explodedOffset: { x: -3.0, y: 2.5, z: 1.5 },
        radius: 0.3,
        geometry: { type: 'box', w: 0.45, h: 0.4, d: 0.4 },
        color: 0x00aaff,
        emissiveIntensity: 0.6,
        order: 2,
      },
      {
        id: 'shoulder_right',
        label: 'Hombro Der.',
        position: { x: 0.85, y: 1.3, z: 0 },
        explodedOffset: { x: 3.0, y: 2.5, z: 1.5 },
        radius: 0.3,
        geometry: { type: 'box', w: 0.45, h: 0.4, d: 0.4 },
        color: 0x00aaff,
        emissiveIntensity: 0.6,
        order: 2,
      },
      {
        id: 'arm_left',
        label: 'Brazo Izq.',
        position: { x: -1.05, y: 0.4, z: 0 },
        explodedOffset: { x: -3.5, y: 0.5, z: 1.0 },
        radius: 0.3,
        geometry: { type: 'box', w: 0.35, h: 1.0, d: 0.35 },
        color: 0x0099ee,
        emissiveIntensity: 0.6,
        order: 3,
      },
      {
        id: 'arm_right',
        label: 'Brazo Der.',
        position: { x: 1.05, y: 0.4, z: 0 },
        explodedOffset: { x: 3.5, y: 0.5, z: 1.0 },
        radius: 0.3,
        geometry: { type: 'box', w: 0.35, h: 1.0, d: 0.35 },
        color: 0x0099ee,
        emissiveIntensity: 0.6,
        order: 3,
      },
      {
        id: 'leg_left',
        label: 'Pierna Izq.',
        position: { x: -0.35, y: -0.8, z: 0 },
        explodedOffset: { x: -2.5, y: -2.8, z: 1.5 },
        radius: 0.35,
        geometry: { type: 'box', w: 0.4, h: 1.3, d: 0.4 },
        color: 0x0077cc,
        emissiveIntensity: 0.5,
        order: 4,
      },
      {
        id: 'leg_right',
        label: 'Pierna Der.',
        position: { x: 0.35, y: -0.8, z: 0 },
        explodedOffset: { x: 2.5, y: -2.8, z: 1.5 },
        radius: 0.35,
        geometry: { type: 'box', w: 0.4, h: 1.3, d: 0.4 },
        color: 0x0077cc,
        emissiveIntensity: 0.5,
        order: 4,
      },
    ],
  },

  /* ================================================================
   * LEVEL 3: MARK VI - The detailed 17-part suit
   * ================================================================ */
  [ROBOT_LEVELS.MARK_VI]: {
    level: ROBOT_LEVELS.MARK_VI,
    name: 'Mark VI',
    description: 'El traje clasico de Iron Man',
    unlockLevel: 10,
    companionPower: 1.0,
    parts: [
      { id: 'head', label: 'Casco', position: { x: 0, y: 2.2, z: 0 }, explodedOffset: { x: 0, y: 4.5, z: 3.0 }, radius: 0.4, geometry: { type: 'sphere', r: 0.35 }, color: 0xffcc00, emissiveIntensity: 1.0, order: 1 },
      { id: 'torso_front', label: 'Pecho Del.', position: { x: 0, y: 0.8, z: 0.35 }, explodedOffset: { x: 2.0, y: 1.0, z: 2.5 }, radius: 0.5, geometry: { type: 'box', w: 1.0, h: 0.9, d: 0.4 }, color: 0xff3300, emissiveIntensity: 0.9, order: 0 },
      { id: 'torso_back', label: 'Espalda', position: { x: 0, y: 0.8, z: -0.35 }, explodedOffset: { x: -2.0, y: 1.0, z: -2.5 }, radius: 0.5, geometry: { type: 'box', w: 1.0, h: 0.9, d: 0.35 }, color: 0xcc2200, emissiveIntensity: 0.7, order: 0 },
      { id: 'arm_shoulder_left', label: 'Hombro Izq.', position: { x: -0.8, y: 1.4, z: 0 }, explodedOffset: { x: -3.0, y: 3.0, z: 1.5 }, radius: 0.3, geometry: { type: 'box', w: 0.4, h: 0.35, d: 0.35 }, color: 0xff4400, emissiveIntensity: 0.6, order: 2 },
      { id: 'arm_upperarm_left', label: 'Bicep Izq.', position: { x: -0.95, y: 0.8, z: 0 }, explodedOffset: { x: -3.5, y: 1.8, z: 1.0 }, radius: 0.28, geometry: { type: 'box', w: 0.3, h: 0.7, d: 0.3 }, color: 0xff5500, emissiveIntensity: 0.6, order: 3 },
      { id: 'arm_forearm_left', label: 'Antebrazo Izq.', position: { x: -1.0, y: 0.1, z: 0 }, explodedOffset: { x: -3.8, y: 0.2, z: 0.8 }, radius: 0.28, geometry: { type: 'box', w: 0.28, h: 0.65, d: 0.28 }, color: 0xff6600, emissiveIntensity: 0.6, order: 4 },
      { id: 'arm_hand_left', label: 'Guante Izq.', position: { x: -1.0, y: -0.4, z: 0 }, explodedOffset: { x: -4.0, y: -1.0, z: 0.5 }, radius: 0.25, geometry: { type: 'sphere', r: 0.2 }, color: 0xffaa00, emissiveIntensity: 0.8, order: 5 },
      { id: 'arm_shoulder_right', label: 'Hombro Der.', position: { x: 0.8, y: 1.4, z: 0 }, explodedOffset: { x: 3.0, y: 3.0, z: 1.5 }, radius: 0.3, geometry: { type: 'box', w: 0.4, h: 0.35, d: 0.35 }, color: 0xff4400, emissiveIntensity: 0.6, order: 2 },
      { id: 'arm_upperarm_right', label: 'Bicep Der.', position: { x: 0.95, y: 0.8, z: 0 }, explodedOffset: { x: 3.5, y: 1.8, z: 1.0 }, radius: 0.28, geometry: { type: 'box', w: 0.3, h: 0.7, d: 0.3 }, color: 0xff5500, emissiveIntensity: 0.6, order: 3 },
      { id: 'arm_forearm_right', label: 'Antebrazo Der.', position: { x: 1.0, y: 0.1, z: 0 }, explodedOffset: { x: 3.8, y: 0.2, z: 0.8 }, radius: 0.28, geometry: { type: 'box', w: 0.28, h: 0.65, d: 0.28 }, color: 0xff6600, emissiveIntensity: 0.6, order: 4 },
      { id: 'arm_hand_right', label: 'Guante Der.', position: { x: 1.0, y: -0.4, z: 0 }, explodedOffset: { x: 4.0, y: -1.0, z: 0.5 }, radius: 0.25, geometry: { type: 'sphere', r: 0.2 }, color: 0xffaa00, emissiveIntensity: 0.8, order: 5 },
      { id: 'leg_left_thigh', label: 'Muslo Izq.', position: { x: -0.35, y: -0.1, z: 0 }, explodedOffset: { x: -2.5, y: -1.5, z: 2.0 }, radius: 0.32, geometry: { type: 'box', w: 0.38, h: 0.7, d: 0.38 }, color: 0xdd3300, emissiveIntensity: 0.5, order: 6 },
      { id: 'leg_left_calf', label: 'Pantorrilla Izq.', position: { x: -0.35, y: -0.9, z: 0 }, explodedOffset: { x: -2.8, y: -2.8, z: 1.5 }, radius: 0.3, geometry: { type: 'box', w: 0.34, h: 0.65, d: 0.34 }, color: 0xcc2200, emissiveIntensity: 0.5, order: 7 },
      { id: 'leg_left_feet', label: 'Botin Izq.', position: { x: -0.35, y: -1.5, z: 0.1 }, explodedOffset: { x: -3.0, y: -4.0, z: 1.0 }, radius: 0.28, geometry: { type: 'box', w: 0.35, h: 0.25, d: 0.5 }, color: 0xbb1100, emissiveIntensity: 0.6, order: 8 },
      { id: 'leg_right_thigh', label: 'Muslo Der.', position: { x: 0.35, y: -0.1, z: 0 }, explodedOffset: { x: 2.5, y: -1.5, z: 2.0 }, radius: 0.32, geometry: { type: 'box', w: 0.38, h: 0.7, d: 0.38 }, color: 0xdd3300, emissiveIntensity: 0.5, order: 6 },
      { id: 'leg_right_calf', label: 'Pantorrilla Der.', position: { x: 0.35, y: -0.9, z: 0 }, explodedOffset: { x: 2.8, y: -2.8, z: 1.5 }, radius: 0.3, geometry: { type: 'box', w: 0.34, h: 0.65, d: 0.34 }, color: 0xcc2200, emissiveIntensity: 0.5, order: 7 },
      { id: 'leg_right_feet', label: 'Botin Der.', position: { x: 0.35, y: -1.5, z: 0.1 }, explodedOffset: { x: 3.0, y: -4.0, z: 1.0 }, radius: 0.28, geometry: { type: 'box', w: 0.35, h: 0.25, d: 0.5 }, color: 0xbb1100, emissiveIntensity: 0.6, order: 8 },
    ],
  },

  /* ================================================================
   * LEVEL 4: PREMIUM - Ultimate robot with extra details
   * ================================================================ */
  [ROBOT_LEVELS.PREMIUM]: {
    level: ROBOT_LEVELS.PREMIUM,
    name: 'Premium',
    description: 'La maxima expresion del Iron Man',
    unlockLevel: 20,
    companionPower: 1.5, // 150% power
    parts: [
      // Same as Mark VI plus extras (wings, extra armor plates)
      { id: 'head', label: 'Casco', position: { x: 0, y: 2.3, z: 0 }, explodedOffset: { x: 0, y: 5.0, z: 3.5 }, radius: 0.4, geometry: { type: 'sphere', r: 0.38 }, color: 0xffcc00, emissiveIntensity: 1.2, order: 1 },
      { id: 'visor', label: 'Visor', position: { x: 0, y: 2.3, z: 0.35 }, explodedOffset: { x: 0.5, y: 5.2, z: 4.0 }, radius: 0.2, geometry: { type: 'box', w: 0.4, h: 0.15, d: 0.1 }, color: 0x00ffff, emissiveIntensity: 1.5, order: 1 },
      { id: 'torso_front', label: 'Pecho Del.', position: { x: 0, y: 0.85, z: 0.38 }, explodedOffset: { x: 2.2, y: 1.2, z: 3.0 }, radius: 0.5, geometry: { type: 'box', w: 1.1, h: 1.0, d: 0.45 }, color: 0xff3300, emissiveIntensity: 1.0, order: 0 },
      { id: 'arc_reactor', label: 'Arc Reactor', position: { x: 0, y: 0.9, z: 0.6 }, explodedOffset: { x: 0, y: 2.0, z: 4.0 }, radius: 0.18, geometry: { type: 'sphere', r: 0.15 }, color: 0x00ffff, emissiveIntensity: 2.0, order: 0 },
      { id: 'torso_back', label: 'Espalda', position: { x: 0, y: 0.85, z: -0.38 }, explodedOffset: { x: -2.2, y: 1.2, z: -3.0 }, radius: 0.5, geometry: { type: 'box', w: 1.1, h: 1.0, d: 0.4 }, color: 0xcc2200, emissiveIntensity: 0.8, order: 0 },
      { id: 'arm_shoulder_left', label: 'Hombro Izq.', position: { x: -0.85, y: 1.5, z: 0 }, explodedOffset: { x: -3.5, y: 3.5, z: 2.0 }, radius: 0.32, geometry: { type: 'box', w: 0.45, h: 0.4, d: 0.4 }, color: 0xff4400, emissiveIntensity: 0.7, order: 2 },
      { id: 'arm_upperarm_left', label: 'Bicep Izq.', position: { x: -1.0, y: 0.85, z: 0 }, explodedOffset: { x: -4.0, y: 2.0, z: 1.5 }, radius: 0.3, geometry: { type: 'box', w: 0.32, h: 0.75, d: 0.32 }, color: 0xff5500, emissiveIntensity: 0.7, order: 3 },
      { id: 'arm_forearm_left', label: 'Antebrazo Izq.', position: { x: -1.05, y: 0.1, z: 0 }, explodedOffset: { x: -4.3, y: 0.2, z: 1.0 }, radius: 0.3, geometry: { type: 'box', w: 0.3, h: 0.7, d: 0.3 }, color: 0xff6600, emissiveIntensity: 0.7, order: 4 },
      { id: 'arm_hand_left', label: 'Guante Izq.', position: { x: -1.05, y: -0.45, z: 0 }, explodedOffset: { x: -4.5, y: -1.2, z: 0.8 }, radius: 0.26, geometry: { type: 'sphere', r: 0.22 }, color: 0xffaa00, emissiveIntensity: 1.0, order: 5 },
      { id: 'arm_shoulder_right', label: 'Hombro Der.', position: { x: 0.85, y: 1.5, z: 0 }, explodedOffset: { x: 3.5, y: 3.5, z: 2.0 }, radius: 0.32, geometry: { type: 'box', w: 0.45, h: 0.4, d: 0.4 }, color: 0xff4400, emissiveIntensity: 0.7, order: 2 },
      { id: 'arm_upperarm_right', label: 'Bicep Der.', position: { x: 1.0, y: 0.85, z: 0 }, explodedOffset: { x: 4.0, y: 2.0, z: 1.5 }, radius: 0.3, geometry: { type: 'box', w: 0.32, h: 0.75, d: 0.32 }, color: 0xff5500, emissiveIntensity: 0.7, order: 3 },
      { id: 'arm_forearm_right', label: 'Antebrazo Der.', position: { x: 1.05, y: 0.1, z: 0 }, explodedOffset: { x: 4.3, y: 0.2, z: 1.0 }, radius: 0.3, geometry: { type: 'box', w: 0.3, h: 0.7, d: 0.3 }, color: 0xff6600, emissiveIntensity: 0.7, order: 4 },
      { id: 'arm_hand_right', label: 'Guante Der.', position: { x: 1.05, y: -0.45, z: 0 }, explodedOffset: { x: 4.5, y: -1.2, z: 0.8 }, radius: 0.26, geometry: { type: 'sphere', r: 0.22 }, color: 0xffaa00, emissiveIntensity: 1.0, order: 5 },
      { id: 'leg_left_thigh', label: 'Muslo Izq.', position: { x: -0.38, y: -0.1, z: 0 }, explodedOffset: { x: -3.0, y: -1.8, z: 2.5 }, radius: 0.34, geometry: { type: 'box', w: 0.4, h: 0.75, d: 0.4 }, color: 0xdd3300, emissiveIntensity: 0.6, order: 6 },
      { id: 'leg_left_calf', label: 'Pantorrilla Izq.', position: { x: -0.38, y: -0.95, z: 0 }, explodedOffset: { x: -3.2, y: -3.2, z: 2.0 }, radius: 0.32, geometry: { type: 'box', w: 0.36, h: 0.7, d: 0.36 }, color: 0xcc2200, emissiveIntensity: 0.6, order: 7 },
      { id: 'leg_left_feet', label: 'Botin Izq.', position: { x: -0.38, y: -1.6, z: 0.12 }, explodedOffset: { x: -3.5, y: -4.5, z: 1.5 }, radius: 0.3, geometry: { type: 'box', w: 0.38, h: 0.28, d: 0.55 }, color: 0xbb1100, emissiveIntensity: 0.7, order: 8 },
      { id: 'leg_right_thigh', label: 'Muslo Der.', position: { x: 0.38, y: -0.1, z: 0 }, explodedOffset: { x: 3.0, y: -1.8, z: 2.5 }, radius: 0.34, geometry: { type: 'box', w: 0.4, h: 0.75, d: 0.4 }, color: 0xdd3300, emissiveIntensity: 0.6, order: 6 },
      { id: 'leg_right_calf', label: 'Pantorrilla Der.', position: { x: 0.38, y: -0.95, z: 0 }, explodedOffset: { x: 3.2, y: -3.2, z: 2.0 }, radius: 0.32, geometry: { type: 'box', w: 0.36, h: 0.7, d: 0.36 }, color: 0xcc2200, emissiveIntensity: 0.6, order: 7 },
      { id: 'leg_right_feet', label: 'Botin Der.', position: { x: 0.38, y: -1.6, z: 0.12 }, explodedOffset: { x: 3.5, y: -4.5, z: 1.5 }, radius: 0.3, geometry: { type: 'box', w: 0.38, h: 0.28, d: 0.55 }, color: 0xbb1100, emissiveIntensity: 0.7, order: 8 },
      { id: 'wing_left', label: 'Ala Izq.', position: { x: -0.7, y: 1.0, z: -0.5 }, explodedOffset: { x: -5.0, y: 2.5, z: -3.0 }, radius: 0.35, geometry: { type: 'box', w: 0.15, h: 0.8, d: 1.2 }, color: 0xff6600, emissiveIntensity: 0.8, order: 9 },
      { id: 'wing_right', label: 'Ala Der.', position: { x: 0.7, y: 1.0, z: -0.5 }, explodedOffset: { x: 5.0, y: 2.5, z: -3.0 }, radius: 0.35, geometry: { type: 'box', w: 0.15, h: 0.8, d: 1.2 }, color: 0xff6600, emissiveIntensity: 0.8, order: 9 },
    ],
  },
};

/**
 * Get a robot blueprint by level number.
 *
 * Returns a deep clone with `peg` (shape + color) auto-injected into each
 * part based on its assembly `order`. This keeps the source data clean
 * while giving every part the metadata it needs for the logical-assembly
 * system.
 *
 * @param {number} level - Robot level (1-4)
 * @returns {object|null} Blueprint or null if invalid level
 */
export function getRobotBlueprint(level) {
  const src = ROBOT_BLUEPRINTS[level];
  if (!src) return null;
  return {
    ...src,
    parts: src.parts.map((p) => ({
      ...p,
      peg: getPegForOrder(p.order),
    })),
  };
}

/**
 * Get all robot blueprints sorted by level.
 * @returns {Array} Sorted array of blueprints
 */
export function getAllBlueprints() {
  return Object.values(ROBOT_BLUEPRINTS).sort((a, b) => a.level - b.level);
}

/**
 * Check if a robot level is unlocked based on game progress.
 * @param {number} robotLevel - Robot level to check
 * @param {number} gameLevel - Current game level in Cosmic Slash
 * @returns {boolean} Whether the robot is unlocked
 */
export function isRobotUnlocked(robotLevel, gameLevel) {
  const blueprint = ROBOT_BLUEPRINTS[robotLevel];
  if (!blueprint) return false;
  return gameLevel >= blueprint.unlockLevel;
}
