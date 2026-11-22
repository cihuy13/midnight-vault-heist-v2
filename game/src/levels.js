// Midnight Vault II — level data + winnability check (pure, Node-testable).
// Grid: 32 cols x 20 rows, tile 40. '#' = wall, '.' = floor.
// All coordinates are (x = col 0..31, y = row 0..19).

export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;

function rows(...lines) {
  return lines.map((l) => l.split(''));
}

// Breadth-first walkability over floor tiles.
export function reachableFrom(grid, sx, sy) {
  const seen = new Set([sy * COLS + sx]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (grid[ny][nx] === '#') continue;
      const k = ny * COLS + nx;
      if (!seen.has(k)) {
        seen.add(k);
        q.push([nx, ny]);
      }
    }
  }
  return seen;
}

// A level is winnable when the thief can walk from the start to every
// required loot tile (vault counts via its approach tile) and to the exit.
export function levelIsWinnable(level) {
  const reach = reachableFrom(level.grid, level.thief.x, level.thief.y);
  const at = (p) => reach.has(p.y * COLS + p.x);
  if (!level.loot.every((l) => at(l))) return false;
  if (level.vault && !at(level.vault.approach)) return false;
  return at(level.exit);
}

export const LEVELS = [
  {
    name: 'Gallery',
    sub: 'Level 1 — steal the opening pieces',
    grid: rows(
      '################################',
      '#..............................#',
      '#....##........##.......L......#',
      '#....##........##..............#',
      '#..............................#',
      '#.....####......####...........#',
      '#..............................#',
      '#..T........##........E........#',
      '#...........##.................#',
      '#....##........##..............#',
      '#....##........##......L.......#',
      '#..............................#',
      '#......####.......####.........#',
      '#..............................#',
      '#..............................#',
      '#....L........##...............#',
      '#............##................#',
      '#..............................#',
      '#..............................#',
      '################################',
    ),
    thief: { x: 3, y: 7 },
    exit: { x: 25, y: 7 },
    loot: [
      { x: 24, y: 2, kind: 'gold', value: 25 },
      { x: 27, y: 10, kind: 'painting', value: 25 },
      { x: 5, y: 15, kind: 'gold', value: 25 },
    ],
    required: 2,
    vault: null,
    guards: [
      { name: 'Rani', waypoints: [{ x: 13, y: 3 }, { x: 13, y: 11 }, { x: 18, y: 11 }, { x: 18, y: 3 }], speed: 1.6 },
      { name: 'Bimo', waypoints: [{ x: 22, y: 14 }, { x: 28, y: 14 }, { x: 28, y: 17 }, { x: 22, y: 17 }], speed: 1.5 },
    ],
    cameras: [
      { name: 'CAM-01', x: 16, y: 1, base: Math.PI / 2, sweep: 0.9 },
    ],
    lamps: [{ x: 8, y: 4 }, { x: 16, y: 9 }, { x: 24, y: 4 }, { x: 10, y: 14 }, { x: 23, y: 14 }],
    cases: [{ x: 6, y: 2, w: 2, h: 1 }, { x: 20, y: 8, w: 2, h: 1 }, { x: 12, y: 16, w: 2, h: 1 }],
  },
  {
    name: 'Vault Hall',
    sub: 'Level 2 — crack the vault, take the sapphire',
    grid: rows(
      '################################',
      '#..............................#',
      '#....##........##.......##.....#',
      '#....##........##.......##.....#',
      '#..............................#',
      '#.....####......####......##...#',
      '#..............................#',
      '#..............................#',
      '#..T.........##.........##.....#',
      '#...........##.........##..V...#',
      '#...........##.........##......#',
      '#....##........##..............#',
      '#....##........##......##......#',
      '#..............................#',
      '#......####.......####.........#',
      '#..............................#',
      '#..............................#',
      '#....L.........##.......L......#',
      '#..............................#',
      '################################',
    ),
    thief: { x: 3, y: 8 },
    exit: { x: 2, y: 17 },
    loot: [
      { x: 3, y: 2, kind: 'sapphire', value: 40 },
      { x: 16, y: 6, kind: 'gold', value: 25 },
      { x: 26, y: 17, kind: 'painting', value: 25 },
    ],
    required: 3,
    vault: { x: 29, y: 9, approach: { x: 28, y: 9 }, value: 50 },
    guards: [
      { name: 'Sari', waypoints: [{ x: 10, y: 4 }, { x: 10, y: 12 }, { x: 14, y: 12 }, { x: 14, y: 4 }], speed: 1.7 },
      { name: 'Dedi', waypoints: [{ x: 20, y: 6 }, { x: 26, y: 6 }, { x: 26, y: 12 }, { x: 20, y: 12 }], speed: 1.6 },
      { name: 'Maya', waypoints: [{ x: 6, y: 15 }, { x: 14, y: 15 }, { x: 14, y: 18 }, { x: 6, y: 18 }], speed: 1.5 },
    ],
    cameras: [
      { name: 'CAM-02', x: 10, y: 1, base: Math.PI / 2, sweep: 0.8 },
      { name: 'CAM-03', x: 22, y: 18, base: -Math.PI / 2, sweep: 0.8 },
    ],
    lamps: [{ x: 10, y: 5 }, { x: 16, y: 10 }, { x: 25, y: 5 }, { x: 8, y: 15 }, { x: 25, y: 15 }],
    cases: [{ x: 6, y: 2, w: 2, h: 1 }, { x: 18, y: 3, w: 2, h: 1 }, { x: 12, y: 17, w: 2, h: 1 }],
  },
  {
    name: 'Grand Vault',
    sub: 'Level 3 — the Crown Sapphire',
    grid: rows(
      '################################',
      '#..............................#',
      '#....##........##.......##.....#',
      '#....##........##.......##.....#',
      '#..............................#',
      '#.....####......####...........#',
      '#.............##.###...........#',
      '#............##....##..........#',
      '#............##.C..##..........#',
      '#............##....##..........#',
      '#............##....##..........#',
      '#............##....##..........#',
      '#.............##.###...........#',
      '#..............................#',
      '#....##........##.......##.....#',
      '#....##........##.......##.....#',
      '#..............................#',
      '#..............................#',
      '#..............................#',
      '################################',
    ),
    thief: { x: 2, y: 10 },
    exit: { x: 29, y: 1 },
    loot: [
      { x: 16, y: 8, kind: 'crown', value: 60 },
      { x: 3, y: 2, kind: 'gold', value: 25 },
      { x: 26, y: 2, kind: 'gold', value: 25 },
      { x: 5, y: 17, kind: 'sapphire', value: 40 },
      { x: 26, y: 17, kind: 'painting', value: 25 },
    ],
    required: 4,
    vault: null,
    guards: [
      { name: 'Rani', waypoints: [{ x: 10, y: 5 }, { x: 10, y: 14 }, { x: 12, y: 14 }, { x: 12, y: 5 }], speed: 1.8 },
      { name: 'Bimo', waypoints: [{ x: 20, y: 5 }, { x: 20, y: 14 }, { x: 23, y: 14 }, { x: 23, y: 5 }], speed: 1.7 },
      { name: 'Sari', waypoints: [{ x: 13, y: 2 }, { x: 19, y: 2 }, { x: 19, y: 4 }, { x: 13, y: 4 }], speed: 1.6 },
      { name: 'Agus', waypoints: [{ x: 13, y: 16 }, { x: 19, y: 16 }, { x: 19, y: 18 }, { x: 13, y: 18 }], speed: 1.6 },
    ],
    cameras: [
      { name: 'CAM-04', x: 16, y: 1, base: Math.PI / 2, sweep: 0.7 },
      { name: 'CAM-05', x: 2, y: 9, base: 0, sweep: 0.7 },
      { name: 'CAM-06', x: 29, y: 9, base: Math.PI, sweep: 0.7 },
    ],
    lamps: [{ x: 8, y: 4 }, { x: 24, y: 4 }, { x: 16, y: 10 }, { x: 8, y: 16 }, { x: 24, y: 16 }],
    cases: [{ x: 6, y: 2, w: 2, h: 1 }, { x: 25, y: 3, w: 2, h: 1 }, { x: 12, y: 17, w: 2, h: 1 }],
  },
];

// Sanity guard for the shipped file itself (also run from the browser console).
export function allLevelsWinnable() {
  return LEVELS.map((l) => levelIsWinnable(l));
}
