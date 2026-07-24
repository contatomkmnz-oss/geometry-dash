export const BLOCK = 40;
export const GRAVITY = 2650;
export const JUMP_V = -860;
export const SHIP_ACCEL = 2400;
export const UFO_IMPULSE = -720;
export const WAVE_SPEED_Y = 520;
export const BALL_JUMP = -620;
export const SCROLL_BASE = 380;
export const PLAYER_SIZE = 30;
export const GROUND_Y = 0; // relative to level floor in world units

export const MODES = {
  CUBE: "cube",
  SHIP: "ship",
  BALL: "ball",
  UFO: "ufo",
  WAVE: "wave",
};

export const COLORS = {
  // Ícones neon no estilo GD
  player: ["#b8ff3c", "#ff2d95", "#00e5ff", "#ffd24a", "#a78bfa", "#ff6b35", "#34d399", "#60a5fa"],
  // Fundos azul/roxo profundos
  bg: ["#1a1464", "#14105a", "#0e2a5c", "#1c0f4a", "#102050"],
  accent: ["#7ef9ff", "#ff2d95", "#b8ff3c", "#ffd24a", "#c4a0ff"],
};

export const ICON_UNLOCKS = [
  { id: 0, name: "Cyan", unlock: 0 },
  { id: 1, name: "Pink", unlock: 1 },
  { id: 2, name: "Lime", unlock: 2 },
  { id: 3, name: "Gold", unlock: 3 },
  { id: 4, name: "Violet", unlock: 4 },
  { id: 5, name: "Rose", unlock: 5 },
  { id: 6, name: "Mint", unlock: 6 },
  { id: 7, name: "Sky", unlock: 7 },
];
