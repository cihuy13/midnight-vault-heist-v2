// Midnight Vault II — game engine (pure logic, no DOM/canvas).
// Tile-step movement with smooth pixel interpolation; guard AI with
// patrol / investigate / chase; cone + line-of-sight detection; alarm
// bands; tools; vault cracking; exit and shop flow.

import { TILE, COLS, ROWS } from './levels.js';

export const ALARM_BANDS = [
  { max: 25, word: 'CALM' },
  { max: 50, word: 'UNEASY' },
  { max: 75, word: 'SUSPICIOUS' },
  { max: 101, word: 'ALARMED' },
];
export function alarmWord(a) {
  for (const b of ALARM_BANDS) if (a < b.max) return b.word;
  return 'ALARMED';
}

export function isWall(level, x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  return level.grid[y][x] === '#';
}

// Bresenham line-of-sight on the grid (walls block sight).
export function losClear(level, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    if (!(x === x0 && y === y0) && !(x === x1 && y === y1) && isWall(level, x, y)) return false;
    if (x === x1 && y === y1) return true;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

// Next tile step of a BFS path from (sx,sy) toward (tx,ty), or null.
export function bfsNextStep(level, sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return null;
  const prev = new Map();
  const q = [[sx, sy]];
  prev.set(sy * COLS + sx, null);
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) {
      let cur = [x, y];
      let p = prev.get(y * COLS + x);
      while (p && !(p[0] === sx && p[1] === sy)) { cur = p; p = prev.get(p[1] * COLS + p[0]); }
      return cur;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (isWall(level, nx, ny)) continue;
      const k = ny * COLS + nx;
      if (!prev.has(k)) {
        prev.set(k, [x, y]);
        q.push([nx, ny]);
      }
    }
  }
  return null;
}

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

export function newLevelState(level, carry) {
  const c = tileCenter(level.thief.x, level.thief.y);
  return {
    level,
    mode: 'play',
    time: 0,
    thief: {
      tx: level.thief.x, ty: level.thief.y,
      px: c.x, py: c.y, dir: 0, moving: false,
    },
    guards: level.guards.map((g) => {
      const p = tileCenter(g.waypoints[0].x, g.waypoints[0].y);
      return {
        name: g.name, waypoints: g.waypoints, speed: g.speed,
        tx: g.waypoints[0].x, ty: g.waypoints[0].y,
        px: p.x, py: p.y, wp: 1, face: 0, state: 'patrol',
        investigate: null, seenTimer: 0,
      };
    }),
    cameras: level.cameras.map((c) => ({ ...c, angle: c.base })),
    lootTaken: new Set(),
    vaultTaken: false,
    vaultProgress: 0,
    alarm: 0,
    lastSeen: null,
    coins: carry.coins,
    tools: { ...carry.tools },
    smokeTimer: 0,
    coinToss: null,
    caught: null,
    message: '',
    messageTimer: 0,
    score: carry.score,
    elapsed: carry.elapsed,
  };
}

export function newGame(levels) {
  return {
    levels,
    levelIndex: 0,
    state: null,
    coins: 0,
    tools: { smoke: 1, coin: 1, lockpick: 0, sneakers: 0 },
    score: 0,
    elapsed: 0,
    shop: { selected: -1 },
    win: false,
  };
}

export function startLevel(game, idx) {
  game.levelIndex = idx;
  game.state = newLevelState(game.levels[idx], {
    coins: game.coins,
    tools: game.tools,
    score: game.score,
    elapsed: game.elapsed,
  });
}

function guardSees(state, gx, gy, face, range, halfAngle) {
  const t = state.thief;
  const dx = t.px - gx;
  const dy = t.py - gy;
  const d = Math.hypot(dx, dy);
  if (d > range * TILE) return false;
  if (state.smokeTimer > 0) return false;
  const ang = Math.atan2(dy, dx);
  if (angDiff(ang, face) > halfAngle) return false;
  const tx = Math.floor(t.px / TILE);
  const ty = Math.floor(t.py / TILE);
  const gxT = Math.floor(gx / TILE);
  const gyT = Math.floor(gy / TILE);
  return losClear(state.level, gxT, gyT, tx, ty);
}

function stepWalker(w, speed, dt, level) {
  // w: {tx,ty,px,py} moving tile to tile; returns true when arrived.
  const c = tileCenter(w.tx, w.ty);
  const dx = c.x - w.px;
  const dy = c.y - w.py;
  const d = Math.hypot(dx, dy);
  const step = speed * TILE * dt;
  if (d <= step) {
    w.px = c.x;
    w.py = c.y;
    return true;
  }
  w.px += (dx / d) * step;
  w.py += (dy / d) * step;
  return false;
}

export function update(game, input, dt) {
  const s = game.state;
  if (!s || s.mode !== 'play') return;
  s.time += dt;
  game.elapsed += dt;
  if (s.smokeTimer > 0) s.smokeTimer -= dt;
  if (s.messageTimer > 0) s.messageTimer -= dt;

  // --- tools (edge-triggered keys) ---
  if (input.pressed['1'] && s.tools.smoke > 0 && s.smokeTimer <= 0) {
    s.tools.smoke--;
    s.smokeTimer = 4;
    s.alarm = Math.max(0, s.alarm - 25);
    s.message = 'Smoke bomb! You vanish for 4s.';
    s.messageTimer = 2.5;
  }
  if (input.pressed['2'] && s.tools.coin > 0) {
    s.tools.coin--;
    const fx = Math.round(Math.cos(s.thief.dir));
    const fy = Math.round(Math.sin(s.thief.dir));
    let cx = s.thief.tx + fx * 2;
    let cy = s.thief.ty + fy * 2;
    cx = Math.max(1, Math.min(COLS - 2, cx));
    cy = Math.max(1, Math.min(ROWS - 2, cy));
    if (isWall(s.level, cx, cy)) { cx = s.thief.tx + fx; cy = s.thief.ty + fy; }
    s.coinToss = { x: cx, y: cy, timer: 5 };
    s.message = 'Coin tossed — the guards turn to look.';
    s.messageTimer = 2.5;
  }
  if (input.pressed['3'] && s.tools.lockpick > 0 && s.level.vault && !s.vaultTaken) {
    const v = s.level.vault;
    const d = Math.abs(s.thief.tx - v.approach.x) + Math.abs(s.thief.ty - v.approach.y);
    if (d <= 1) {
      s.tools.lockpick--;
      s.vaultTaken = true;
      s.coins += v.value;
      game.coins = s.coins;
      s.alarm = Math.min(100, s.alarm + 10);
      s.message = `Lockpick! Vault open, +${v.value} coins.`;
      s.messageTimer = 2.5;
    }
  }
  const sneakers = s.tools.sneakers > 0;
  const speed = (sneakers ? 5.6 : 4.2) * (input.shift ? 1.15 : 1);

  // --- thief movement (tile stepping) ---
  const t = s.thief;
  if (stepWalker(t, speed, dt, s.level)) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx = -1;
    else if (input.right) dx = 1;
    else if (input.up) dy = -1;
    else if (input.down) dy = 1;
    if (dx || dy) {
      const nx = t.tx + dx;
      const ny = t.ty + dy;
      if (!isWall(s.level, nx, ny)) {
        t.tx = nx;
        t.ty = ny;
        t.dir = Math.atan2(dy, dx);
        t.moving = true;
      } else {
        t.moving = false;
      }
    } else {
      t.moving = false;
    }
  }

  // --- loot pickup ---
  for (const l of s.level.loot) {
    const key = `${l.x},${l.y}`;
    if (!s.lootTaken.has(key) && t.tx === l.x && t.ty === l.y) {
      s.lootTaken.add(key);
      s.coins += l.value;
      game.coins = s.coins;
      s.message = `+${l.value} coins — ${l.kind}.`;
      s.messageTimer = 2;
    }
  }
  const takenCount = s.lootTaken.size + (s.vaultTaken ? 1 : 0);
  const exitOpen = takenCount >= s.level.required;

  // --- vault cracking (hold E next to the vault approach) ---
  if (s.level.vault && !s.vaultTaken) {
    const v = s.level.vault;
    const near = Math.abs(t.tx - v.approach.x) + Math.abs(t.ty - v.approach.y) <= 1;
    if (near && input.e) {
      s.vaultProgress += dt / 3;
      if (s.vaultProgress >= 1) {
        s.vaultTaken = true;
        s.coins += v.value;
        game.coins = s.coins;
        s.alarm = Math.min(100, s.alarm + 10);
        s.message = `Vault cracked! +${v.value} coins.`;
        s.messageTimer = 2.5;
      }
    } else {
      s.vaultProgress = Math.max(0, s.vaultProgress - dt / 2);
    }
  }

  // --- exit ---
  if (exitOpen && t.tx === s.level.exit.x && t.ty === s.level.exit.y) {
    game.score = s.coins + 150 * (game.levelIndex + 1);
    if (game.levelIndex >= game.levels.length - 1) {
      game.score += Math.max(0, 300 - Math.floor(game.elapsed));
      game.win = true;
      s.mode = 'win';
    } else {
      s.mode = 'clear';
    }
    return;
  }

  // --- cameras ---
  let seen = false;
  for (const cam of s.cameras) {
    cam.angle = cam.base + Math.sin(s.time * 0.6 + cam.x) * cam.sweep;
    const cp = tileCenter(cam.x, cam.y);
    const range = sneakers ? 5.2 : 6;
    if (guardSees(s, cp.x, cp.y, cam.angle, range, 0.5)) seen = true;
  }

  // --- guards ---
  for (const g of s.guards) {
    const range = sneakers ? 4.2 : 5;
    const sees = guardSees(s, g.px, g.py, g.face, range, 0.62);
    if (sees) {
      s.lastSeen = { x: t.tx, y: t.ty };
      g.seenTimer += dt;
      if (s.alarm >= 75) g.state = 'chase';
      else g.state = 'investigate';
    } else if (g.state === 'investigate' && g.investigate && g.tx === g.investigate.x && g.ty === g.investigate.y) {
      g.state = 'patrol';
      g.investigate = null;
    } else if (g.state === 'chase' && s.alarm < 50) {
      g.state = 'investigate';
      g.investigate = s.lastSeen ? { ...s.lastSeen } : null;
    }
    if (s.coinToss) {
      const d = Math.abs(g.tx - s.coinToss.x) + Math.abs(g.ty - s.coinToss.y);
      if (d <= 6 && g.state === 'patrol') {
        g.state = 'investigate';
        g.investigate = { x: s.coinToss.x, y: s.coinToss.y };
      }
    }
    // movement per state
    if (g.state === 'patrol') {
      if (stepWalker(g, g.speed, dt, s.level)) {
        const wp = g.waypoints[g.wp];
        if (g.tx === wp.x && g.ty === wp.y) {
          g.wp = (g.wp + 1) % g.waypoints.length;
        } else {
          const nx = g.tx + Math.sign(wp.x - g.tx);
          const ny = g.ty + Math.sign(wp.y - g.ty);
          if (!isWall(s.level, nx, ny)) {
            g.tx = nx;
            g.ty = ny;
            g.face = Math.atan2(ny - g.py / TILE, nx - g.px / TILE);
          }
        }
      }
      g.face = Math.atan2(
        tileCenter(g.waypoints[g.wp].x, g.waypoints[g.wp].y).y - g.py,
        tileCenter(g.waypoints[g.wp].x, g.waypoints[g.wp].y).x - g.px,
      );
    } else if (g.state === 'investigate' && g.investigate) {
      const tgt = g.investigate;
      if (g.tx === tgt.x && g.ty === tgt.y) {
        // look around, then back to patrol after a beat
        g.seenTimer += dt;
        if (g.seenTimer > 1.5) {
          g.state = 'patrol';
          g.investigate = null;
          g.seenTimer = 0;
        }
      } else if (stepWalker(g, g.speed * 1.15, dt, s.level)) {
        const next = bfsNextStep(s.level, g.tx, g.ty, tgt.x, tgt.y);
        if (next) {
          g.face = Math.atan2(next[1] - g.ty, next[0] - g.tx);
          g.tx = next[0];
          g.ty = next[1];
        }
      }
    } else if (g.state === 'chase') {
      if (stepWalker(g, g.speed * 1.5, dt, s.level)) {
        const next = bfsNextStep(s.level, g.tx, g.ty, t.tx, t.ty);
        if (next) {
          g.face = Math.atan2(next[1] - g.ty, next[0] - g.tx);
          g.tx = next[0];
          g.ty = next[1];
        }
      }
    }
    // caught?
    const d = Math.hypot(g.px - t.px, g.py - t.py);
    if (d < 0.55 * TILE && s.smokeTimer <= 0) {
      s.mode = 'caught';
      s.caught = g.name;
      return;
    }
  }
  if (s.coinToss) {
    s.coinToss.timer -= dt;
    if (s.coinToss.timer <= 0) s.coinToss = null;
  }

  // --- alarm ---
  if (seen) s.alarm = Math.min(100, s.alarm + 26 * dt);
  else if (s.alarm > 0) s.alarm = Math.max(0, s.alarm - 3.5 * dt);
  if (s.lastSeen && s.alarm >= 75) s.alarm = Math.min(100, s.alarm + 2 * dt);
}

export function exitIsOpen(state) {
  return state.lootTaken.size + (state.vaultTaken ? 1 : 0) >= state.level.required;
}

export const SHOP_ITEMS = [
  { key: 'smoke', name: 'Smoke Bomb', price: 40, desc: 'Vanish for 4s. Alarm drops 25.' },
  { key: 'coin', name: 'Coin Toss', price: 15, desc: 'Throw a coin. Guards go look.' },
  { key: 'lockpick', name: 'Lockpick', price: 30, desc: 'Open the vault instantly.' },
  { key: 'sneakers', name: 'Sneakers', price: 50, desc: 'Move faster, harder to spot.' },
];

export function buyItem(game, key) {
  const item = SHOP_ITEMS.find((i) => i.key === key);
  if (!item || game.coins < item.price) return false;
  game.coins -= item.price;
  if (key === 'sneakers') game.tools.sneakers = 1;
  else game.tools[key] = (game.tools[key] || 0) + 1;
  return true;
}
