// Midnight Vault II — entry point: loop, mode transitions, shop, shots.
import { LEVELS, COLS, ROWS, TILE } from './levels.js';
import { newGame, startLevel, update, buyItem, SHOP_ITEMS } from './engine.js';
import { draw } from './render.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

const game = newGame(LEVELS);
const input = createInput(canvas);
let carry = null;

function snapshotCarry() {
  carry = { coins: game.coins, tools: { ...game.tools } };
}

function beginLevel(idx) {
  snapshotCarry();
  startLevel(game, idx);
}

beginLevel(0);
game.state.mode = 'title';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
let shotReady = false;
if (shotName) {
  stageShot(game, shotName);
  shotReady = true;
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const s = game.state;

  if (!shotName) {
    if (s.mode === 'play') {
      update(game, input, dt);
    } else if (s.mode === 'title' && input.pressed.enter) {
      s.mode = 'play';
    } else if (s.mode === 'caught' && input.pressed.r) {
      game.coins = carry.coins;
      game.tools = { ...carry.tools };
      startLevel(game, game.levelIndex);
    } else if (s.mode === 'clear' && input.pressed.enter) {
      s.mode = 'shop';
    } else if (s.mode === 'shop') {
      for (let i = 1; i <= 4; i++) {
        if (input.pressed[String(i)]) {
          const item = SHOP_ITEMS[i - 1];
          if (buyItem(game, item.key)) {
            s.message = `${item.name} bought.`;
            s.messageTimer = 2;
          }
        }
      }
      if (input.click) {
        const y = input.click.y;
        const top = (ROWS * TILE) / 2 - 70;
        for (let i = 0; i < 4; i++) {
          if (y >= top + i * 52 - 14 && y <= top + i * 52 + 30) {
            buyItem(game, SHOP_ITEMS[i].key);
          }
        }
      }
      if (input.pressed.enter) {
        beginLevel(game.levelIndex + 1);
      }
    } else if (s.mode === 'win' && input.pressed.enter) {
      const fresh = newGame(LEVELS);
      game.coins = fresh.coins;
      game.tools = fresh.tools;
      game.score = 0;
      game.elapsed = 0;
      game.win = false;
      beginLevel(0);
      game.state.mode = 'title';
    }
    if (s.mode === 'play' || s.mode === 'caught' || s.mode === 'clear' || s.mode === 'shop' || s.mode === 'win') {
      s.time += dt;
    }
  }

  draw(ctx, game, shotName ? 1.2 : (s ? s.time : 0));
  input.endFrame();
  requestAnimationFrame(frame);
}

window.__game = game;
window.__shotReady = shotReady;
window.__stageShot = (name) => stageShot(game, name);
requestAnimationFrame(frame);
