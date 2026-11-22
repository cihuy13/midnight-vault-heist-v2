// Midnight Vault II — keyboard + mouse input (edge-triggered keys).
export function createInput(canvas) {
  const input = {
    up: false, down: false, left: false, right: false,
    e: false, shift: false, enter: false,
    pressed: {},
    click: null,
  };
  const keymap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyE: 'e',
    Enter: 'enter',
  };
  window.addEventListener('keydown', (ev) => {
    const k = keymap[ev.code];
    if (k) {
      if (!input[k]) input.pressed[k] = true;
      input[k] = true;
      ev.preventDefault();
    } else if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') {
      input.shift = true;
    } else if (ev.code === 'KeyR') {
      if (!input.pressed.r) input.pressed.r = true;
    } else if (ev.code === 'Digit1' || ev.code === 'Digit2' || ev.code === 'Digit3' || ev.code === 'Digit4') {
      const n = ev.code.slice(-1);
      if (!input.pressed[n]) input.pressed[n] = true;
    }
  });
  window.addEventListener('keyup', (ev) => {
    const k = keymap[ev.code];
    if (k) input[k] = false;
    if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') input.shift = false;
  });
  canvas.addEventListener('click', (ev) => {
    const r = canvas.getBoundingClientRect();
    input.click = { x: (ev.clientX - r.left) * (canvas.width / r.width), y: (ev.clientY - r.top) * (canvas.height / r.height) };
  });
  input.endFrame = () => {
    input.pressed = {};
    input.click = null;
  };
  return input;
}
