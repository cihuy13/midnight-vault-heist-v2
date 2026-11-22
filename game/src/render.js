// Midnight Vault II — cinematic night-museum renderer (canvas 2D).
// Dark gallery, warm light pools, gold-framed paintings, glass cases,
// drawn figures (no circles for people), glowing loot, legible HUD.

import { TILE, COLS, ROWS } from './levels.js';
import { alarmWord, exitIsOpen } from './engine.js';

function hash2(x, y, salt) {
  let h = (x * 374761393 + y * 668265263 + salt * 974634211) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

const PAINT_HUES = [8, 38, 150, 200, 265, 330];

function drawCone(ctx, x, y, angle, range, half, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawFigure(ctx, x, y, face, opts) {
  // opts: { body, trim, cap, outline }
  ctx.save();
  ctx.translate(x, y);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // body (coat)
  ctx.fillStyle = opts.body;
  ctx.beginPath();
  ctx.moveTo(-9, 10);
  ctx.quadraticCurveTo(-11, -4, -6, -8);
  ctx.lineTo(6, -8);
  ctx.quadraticCurveTo(11, -4, 9, 10);
  ctx.closePath();
  ctx.fill();
  // belt / trim
  ctx.strokeStyle = opts.trim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(9, 2);
  ctx.stroke();
  // head + cap
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(0, -13, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = opts.cap;
  ctx.beginPath();
  ctx.arc(0, -14, 6.5, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-6.5, -15, 13, 2.5);
  // facing tick (flashlight direction)
  ctx.strokeStyle = opts.outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(face) * 15, Math.sin(face) * 15);
  ctx.stroke();
  ctx.restore();
}

function drawLoot(ctx, x, y, kind, t) {
  const pulse = 1 + Math.sin(t * 3 + x) * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  if (kind === 'gold') {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    g.addColorStop(0, 'rgba(255,215,90,0.85)');
    g.addColorStop(1, 'rgba(255,215,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a67c00';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#a67c00';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0.5);
  } else if (kind === 'sapphire') {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    g.addColorStop(0, 'rgba(80,200,255,0.8)');
    g.addColorStop(1, 'rgba(80,200,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#39b6ff';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'painting') {
    ctx.fillStyle = '#3a2a12';
    ctx.fillRect(-11, -8, 22, 16);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(-11, -8, 22, 2);
    ctx.fillRect(-11, 6, 22, 2);
    ctx.fillRect(-11, -8, 2, 16);
    ctx.fillRect(9, -8, 2, 16);
    ctx.fillStyle = '#7fb069';
    ctx.fillRect(-8, -5, 16, 10);
    ctx.fillStyle = '#e07a5f';
    ctx.beginPath();
    ctx.arc(-2, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'crown') {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    g.addColorStop(0, 'rgba(120,220,255,0.85)');
    g.addColorStop(1, 'rgba(120,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(-11, 6);
    ctx.lineTo(-11, -6);
    ctx.lineTo(-5, 0);
    ctx.lineTo(0, -9);
    ctx.lineTo(5, 0);
    ctx.lineTo(11, -6);
    ctx.lineTo(11, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#39b6ff';
    ctx.beginPath();
    ctx.arc(0, 1, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function draw(ctx, game, t) {
  const s = game.state;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  ctx.clearRect(0, 0, W, H);

  if (!s) {
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const level = s.level;

  // --- floor: dark marble ---
  ctx.fillStyle = '#101826';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,150,200,0.07)';
  ctx.lineWidth = 1;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (level.grid[y][x] === '#') continue;
      const h = hash2(x, y, 1);
      if (h < 0.5) {
        ctx.beginPath();
        ctx.moveTo(x * TILE + h * 40, y * TILE + hash2(x, y, 2) * 40);
        ctx.lineTo(x * TILE + 20 + h * 20, y * TILE + 40);
        ctx.stroke();
      }
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.012)';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  // --- warm light pools ---
  for (const lamp of level.lamps) {
    const cx = (lamp.x + 0.5) * TILE;
    const cy = (lamp.y + 0.5) * TILE;
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130);
    g.addColorStop(0, 'rgba(255,190,90,0.14)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 130, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- walls, paintings, cases ---
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (level.grid[y][x] !== '#') continue;
      ctx.fillStyle = '#241a12';
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      ctx.fillStyle = '#31241a';
      ctx.fillRect(x * TILE, y * TILE, TILE, 6);
      ctx.strokeStyle = 'rgba(212,175,55,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
      // painting on a wall that faces floor
      const facesFloor =
        (y + 1 < ROWS && level.grid[y + 1][x] !== '#') ||
        (y - 1 >= 0 && level.grid[y - 1][x] !== '#');
      if (facesFloor && hash2(x, y, 7) < 0.45) {
        const hue = PAINT_HUES[Math.floor(hash2(x, y, 8) * PAINT_HUES.length)];
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(x * TILE + 8, y * TILE + 9, 24, 20);
        ctx.fillStyle = `hsl(${hue}, 55%, 42%)`;
        ctx.fillRect(x * TILE + 11, y * TILE + 12, 18, 14);
        ctx.fillStyle = `hsl(${(hue + 40) % 360}, 60%, 60%)`;
        ctx.beginPath();
        ctx.arc(x * TILE + 20, y * TILE + 19, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  for (const c of level.cases) {
    const x = c.x * TILE;
    const y = c.y * TILE;
    ctx.fillStyle = 'rgba(160,200,230,0.16)';
    ctx.fillRect(x, y, c.w * TILE, c.h * TILE);
    ctx.strokeStyle = 'rgba(200,220,240,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, c.w * TILE - 2, c.h * TILE - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + c.h * TILE - 6);
    ctx.lineTo(x + c.w * TILE - 14, y + 6);
    ctx.stroke();
    // velvet rope in front of the case
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + c.h * TILE + 8);
    ctx.quadraticCurveTo(x + (c.w * TILE) / 2, y + c.h * TILE + 16, x + c.w * TILE - 2, y + c.h * TILE + 8);
    ctx.stroke();
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(x + 2, y + c.h * TILE + 8, 3, 0, Math.PI * 2);
    ctx.arc(x + c.w * TILE - 2, y + c.h * TILE + 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- exit ---
  const ex = { x: (level.exit.x + 0.5) * TILE, y: (level.exit.y + 0.5) * TILE };
  const open = exitIsOpen(s);
  ctx.save();
  if (open) {
    const g = ctx.createRadialGradient(ex.x, ex.y, 4, ex.x, ex.y, 34);
    g.addColorStop(0, 'rgba(60,255,140,0.5)');
    g.addColorStop(1, 'rgba(60,255,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = open ? '#1f7a44' : '#3a2a2a';
  ctx.fillRect(ex.x - 15, ex.y - 17, 30, 34);
  ctx.strokeStyle = open ? '#3cff8c' : '#7a5a5a';
  ctx.lineWidth = 2;
  ctx.strokeRect(ex.x - 15, ex.y - 17, 30, 34);
  ctx.fillStyle = open ? '#b8ffd4' : '#c9a0a0';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', ex.x, ex.y);
  ctx.restore();

  // --- vault door ---
  if (level.vault) {
    const v = level.vault;
    const vx = (v.x + 0.5) * TILE;
    const vy = (v.y + 0.5) * TILE;
    ctx.fillStyle = '#3d4450';
    ctx.fillRect(vx - 18, vy - 18, 36, 36);
    ctx.strokeStyle = '#9aa5b5';
    ctx.lineWidth = 2;
    ctx.strokeRect(vx - 18, vy - 18, 36, 36);
    ctx.fillStyle = '#20242c';
    ctx.beginPath();
    ctx.arc(vx, vy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8d2de';
    ctx.beginPath();
    ctx.arc(vx, vy, 9, 0, Math.PI * 2);
    ctx.stroke();
    if (s.vaultProgress > 0 && !s.vaultTaken) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(vx, vy, 14, -Math.PI / 2, -Math.PI / 2 + s.vaultProgress * Math.PI * 2);
      ctx.stroke();
    }
    if (s.vaultTaken) {
      ctx.fillStyle = '#3cff8c';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OPEN', vx, vy + 26);
    }
  }

  // --- loot ---
  for (const l of level.loot) {
    if (s.lootTaken.has(`${l.x},${l.y}`)) continue;
    drawLoot(ctx, (l.x + 0.5) * TILE, (l.y + 0.5) * TILE, l.kind, t);
  }

  // --- camera cones (under figures) ---
  for (const cam of s.cameras) {
    const cp = { x: (cam.x + 0.5) * TILE, y: (cam.y + 0.5) * TILE };
    drawCone(ctx, cp.x, cp.y, cam.angle, 6 * TILE, 0.5, 'rgba(60,220,220,0.10)');
    drawCone(ctx, cp.x, cp.y, cam.angle, 6 * TILE, 0.32, 'rgba(60,220,220,0.12)');
    // camera body
    ctx.fillStyle = '#222a33';
    ctx.fillRect(cp.x - 7, cp.y - 5, 14, 10);
    ctx.strokeStyle = '#5fd7d7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cp.x - 7, cp.y - 5, 14, 10);
    const blink = Math.sin(t * 4) > 0;
    ctx.fillStyle = blink ? '#ff3b30' : '#5a1a18';
    ctx.beginPath();
    ctx.arc(cp.x + 8, cp.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- guard cones + figures ---
  for (const g of s.guards) {
    const col = g.state === 'chase' ? 'rgba(255,70,50,0.20)' : 'rgba(255,180,60,0.13)';
    drawCone(ctx, g.px, g.py, g.face, 5 * TILE, 0.62, col);
    drawCone(ctx, g.px, g.py, g.face, 5 * TILE, 0.4, g.state === 'chase' ? 'rgba(255,70,50,0.16)' : 'rgba(255,180,60,0.12)');
  }
  // coin toss marker
  if (s.coinToss) {
    const cx = (s.coinToss.x + 0.5) * TILE;
    const cy = (s.coinToss.y + 0.5) * TILE;
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(247,201,72,0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, 10 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const g of s.guards) {
    drawFigure(ctx, g.px, g.py, g.face, {
      body: g.state === 'chase' ? '#5a1a1a' : '#232c3d',
      trim: '#d4af37',
      cap: '#1a2230',
      outline: '#ffd9a0',
    });
    if (g.state !== 'patrol') {
      ctx.fillStyle = g.state === 'chase' ? '#ff5040' : '#ffb43c';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.state === 'chase' ? '!' : '?', g.px, g.py - 24);
    }
  }

  // --- thief ---
  if (s.smokeTimer > 0) {
    ctx.fillStyle = 'rgba(180,180,190,0.35)';
    ctx.beginPath();
    ctx.arc(s.thief.px, s.thief.py, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  drawFigure(ctx, s.thief.px, s.thief.py, s.thief.dir, {
    body: '#14181f',
    trim: '#e8e8e8',
    cap: '#0c0f14',
    outline: '#ffffff',
  });

  // --- vignette ---
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  drawHUD(ctx, game, t);
  drawOverlays(ctx, game, t);
}

function drawHUD(ctx, game, t) {
  const s = game.state;
  const W = COLS * TILE;
  // top bar
  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${s.level.name}  ·  ${s.level.sub}`, 14, 22);
  // alarm bar
  const bw = 300;
  const bx = W / 2 - bw / 2;
  const by = 12;
  const word = alarmWord(s.alarm);
  const col = word === 'CALM' ? '#3cff8c' : word === 'UNEASY' ? '#ffd23c' : word === 'SUSPICIOUS' ? '#ff9a3c' : '#ff5040';
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(bx, by, bw, 14);
  ctx.fillStyle = col;
  ctx.fillRect(bx, by, (bw * s.alarm) / 100, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw, 14);
  ctx.fillStyle = col;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ALARM ${word}`, bx, by + 28);
  // coins + loot
  const taken = s.lootTaken.size + (s.vaultTaken ? 1 : 0);
  ctx.fillStyle = '#f7c948';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`◉ ${s.coins}   ◆ ${taken}/${s.level.required}`, W - 14, 22);
  // bottom hint bar
  ctx.fillStyle = 'rgba(8,12,20,0.82)';
  ctx.fillRect(0, ROWS * TILE - 30, W, 30);
  ctx.fillStyle = '#9fb2cc';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  const tools = `1 Smoke ×${s.tools.smoke}   2 Coin ×${s.tools.coin}   3 Lockpick ×${s.tools.lockpick}   Shift Sneakers ${s.tools.sneakers ? 'ON' : '—'}`;
  ctx.fillText('WASD move · E crack vault · ' + tools, 14, ROWS * TILE - 15);
  if (s.messageTimer > 0 && s.message) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.message, W / 2, ROWS * TILE - 48);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6,10,18,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawOverlays(ctx, game, t) {
  const s = game.state;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (s.mode === 'title') {
    ctx.fillStyle = 'rgba(4,6,12,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f7c948';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('MIDNIGHT VAULT II', W / 2, H / 2 - 90);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '20px sans-serif';
    ctx.fillText('A museum heist in three galleries. Take the loot. Beat the cones. Get out.', W / 2, H / 2 - 40);
    ctx.fillStyle = '#9fb2cc';
    ctx.font = '16px sans-serif';
    ctx.fillText('WASD / arrows to move · E to crack the vault · 1/2/3 tools · Shift to sneak faster', W / 2, H / 2 + 10);
    ctx.fillStyle = '#3cff8c';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press ENTER to start the heist', W / 2, H / 2 + 70);
    return;
  }
  if (s.mode === 'caught') {
    ctx.fillStyle = 'rgba(60,4,4,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff5040';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('CAUGHT!', W / 2, H / 2 - 40);
    ctx.fillStyle = '#ffd9d9';
    ctx.font = '19px sans-serif';
    ctx.fillText(`Guard ${s.caught || ''} spotted you. The alarm was ${alarmWord(s.alarm)}.`, W / 2, H / 2 + 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Press R to retry this level', W / 2, H / 2 + 60);
    return;
  }
  if (s.mode === 'clear') {
    ctx.fillStyle = 'rgba(4,20,10,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3cff8c';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(`${s.level.name.toUpperCase()} CLEARED`, W / 2, H / 2 - 30);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '19px sans-serif';
    ctx.fillText(`You slipped out with ${s.coins} coins. The shop is open — spend it before the next gallery.`, W / 2, H / 2 + 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Press ENTER to open the shop', W / 2, H / 2 + 70);
    return;
  }
  if (s.mode === 'shop') {
    panel(ctx, W / 2 - 330, H / 2 - 190, 660, 380);
    ctx.fillStyle = '#f7c948';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('BLACK-MARKET SHOP', W / 2, H / 2 - 150);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '16px sans-serif';
    const nextName = game.levels[Math.min(game.levelIndex + 1, game.levels.length - 1)].name;
    ctx.fillText(`Coins: ${game.coins}  ·  next: ${nextName}`, W / 2, H / 2 - 112);
    const items = [
      ['1', 'Smoke Bomb', '40', 'Vanish for 4s. Alarm drops 25.'],
      ['2', 'Coin Toss', '15', 'Throw a coin. Guards go look.'],
      ['3', 'Lockpick', '30', 'Open the vault instantly.'],
      ['4', 'Sneakers', '50', 'Move faster, harder to spot.'],
    ];
    items.forEach((it, i) => {
      const y = H / 2 - 70 + i * 52;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`[${it[0]}] ${it[1]}`, W / 2 - 290, y);
      ctx.fillStyle = '#f7c948';
      ctx.textAlign = 'right';
      ctx.fillText(`${it[2]} coins`, W / 2 + 290, y);
      ctx.fillStyle = '#9fb2cc';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(it[3], W / 2 - 290, y + 20);
    });
    ctx.fillStyle = '#3cff8c';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press 1–4 to buy · ENTER to continue', W / 2, H / 2 + 155);
    return;
  }
  if (s.mode === 'win') {
    ctx.fillStyle = 'rgba(4,16,8,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f7c948';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText('GETAWAY!', W / 2, H / 2 - 60);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '21px sans-serif';
    ctx.fillText('The Crown Sapphire is yours. Three galleries, zero alarms that mattered.', W / 2, H / 2 - 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`FINAL SCORE: ${game.score}`, W / 2, H / 2 + 45);
    ctx.fillStyle = '#9fb2cc';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press ENTER to play again', W / 2, H / 2 + 90);
  }
}
