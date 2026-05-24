// All game constants — zero magic numbers in game logic

// Canvas / layout
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 512;
export const TILE_SIZE = 32;

// Map dimensions
export const MAP_COLS = 20;
export const MAP_ROWS = 16;

// PC Station world positions (center of each desk)
// Top row: 3 PCs at tile cols 2-3, 8-9, 14-15 (row 2-3)
// Bottom row: 2 PCs at tile cols 5-6, 11-12 (row 8-9)
export const PC_POSITIONS: { x: number; y: number }[] = [
  { x: 80,  y: 96  }, // PC1
  { x: 272, y: 96  }, // PC2
  { x: 464, y: 96  }, // PC3
  { x: 176, y: 288 }, // PC4
  { x: 368, y: 288 }, // PC5
];

// Tile indices (match tileset image columns × TILE_SIZE)
export const TILES = {
  FLOOR:  0,
  WALL:   1,
  DESK:   2,
  NEON:   3,
} as const;

// Colors (hex)
export const COLORS = {
  BG_DEEP:    0x050510,
  FLOOR:      0x0d0d1a,
  WALL:       0x0a0a1c,
  DESK:       0x141128,
  NEON_BLUE:  0x00d4ff,
  NEON_PURPLE:0x7c3aed,
  NEON_GREEN: 0x00ff88,
  NEON_RED:   0xff3333,
  NEON_YELLOW:0xffcc00,
  TEXT_DIM:   0x8080b0,
} as const;

// Monitor screen colours per status
export const MONITOR_COLORS: Record<string, { screen: number; glow: number }> = {
  idle:      { screen: 0x000510, glow: 0x000820 },
  occupied:  { screen: 0x001840, glow: 0x002060 },
  rebooting: { screen: 0x201400, glow: 0x302000 },
  banned:    { screen: 0x080808, glow: 0x100810 },
};

// Status LED colours
export const LED_COLORS: Record<string, number> = {
  idle:      0x222240,
  occupied:  0x00ff88,
  rebooting: 0xffaa00,
  banned:    0x440000,
};

// Client emojis per status
export const CLIENT_EMOJIS: Record<string, string> = {
  idle:      '💤',
  occupied:  '🧑‍💻',
  rebooting: '🔄',
  banned:    '🚫',
};

// Polling interval ms
export const POLL_INTERVAL = 5000;

