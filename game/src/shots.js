// Midnight Vault II — deterministic staged scenes for screenshots.
// ?shot=cover | level2 | level3 | shop  (fixed time, no randomness).
import { TILE } from './levels.js';
import { startLevel } from './engine.js';

function place(game, tx, ty, dir) {
  const s = game.state;
  s.thief.tx = tx;
  s.thief.ty = ty;
  s.thief.px = (tx + 0.5) * TILE;
  s.thief.py = (ty + 0.5) * TILE;
  s.thief.dir = dir;
}

function guardAt(game, i, tx, ty, face) {
  const g = game.state.guards[i];
  g.tx = tx;
  g.ty = ty;
  g.px = (tx + 0.5) * TILE;
  g.py = (ty + 0.5) * TILE;
  g.face = face;
}

export function stageShot(game, name) {
  const s0 = game.state;
  if (name === 'cover') {
    startLevel(game, 0);
    const s = game.state;
    s.mode = 'play';
    place(game, 19, 6, Math.PI);
    guardAt(game, 0, 16, 6, 0); // Rani's cone sweeps right, toward the thief
    guardAt(game, 1, 25, 15, -Math.PI / 2);
    s.lootTaken.add('24,2');
    s.lootTaken.add('27,10');
    s.coins = 50;
    game.coins = 50;
    s.alarm = 62;
    s.message = 'SUSPICIOUS — the guard is turning your way.';
    s.messageTimer = 99;
    s.time = 1.2;
    return 'cover';
  }
  if (name === 'level2') {
    startLevel(game, 1);
    const s = game.state;
    s.mode = 'play';
    place(game, 12, 10, 0);
    s.lootTaken.add('3,2');
    s.coins = 65;
    game.coins = 65;
    s.alarm = 38;
    s.message = 'UNEASY — CAM-02 is sweeping the hall.';
    s.messageTimer = 99;
    s.time = 2.4;
    return 'level2';
  }
  if (name === 'level3') {
    startLevel(game, 2);
    const s = game.state;
    s.mode = 'play';
    place(game, 16, 13, -Math.PI / 2); // just below the vault-ring gap
    guardAt(game, 0, 11, 9, 0);
    guardAt(game, 1, 21, 9, Math.PI);
    s.lootTaken.add('3,2');
    s.lootTaken.add('26,2');
    s.coins = 90;
    game.coins = 90;
    s.alarm = 45;
    s.message = 'The Crown Sapphire glows behind the vault ring.';
    s.messageTimer = 99;
    s.time = 3.1;
    return 'level3';
  }
  if (name === 'shop') {
    game.coins = 120;
    startLevel(game, 0);
    game.state.mode = 'shop';
    return 'shop';
  }
  return null;
}
