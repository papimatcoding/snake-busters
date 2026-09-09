const isPortraitMobile = () => matchMedia('(max-width: 680px)').matches;

const navigationHotfix = document.createElement('style');
navigationHotfix.textContent = '@media (max-width:680px){.app-screen[hidden]{display:none!important}}';
document.head.appendChild(navigationHotfix);

const canvas = document.getElementById('game');
const movePad = document.querySelector('.mobile-controls');
const attackPad = document.getElementById('mobile-attack');
const abilityPad = document.getElementById('ability');
const ultimatePad = document.getElementById('ultimate');

const heldKeys = new Set();
const bridge = () => window.SnakeBustersMobileBridge;

function dispatchKey(code, down) {
  if (down && !heldKeys.has(code)) {
    heldKeys.add(code);
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  } else if (!down && heldKeys.has(code)) {
    heldKeys.delete(code);
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  }
}
function clearMoveKeys() {
  for (const code of ['KeyW','KeyA','KeyS','KeyD']) dispatchKey(code, false);
}
function setMoveVector(x, y) {
  const dead = .2;
  dispatchKey('KeyA', x < -dead);
  dispatchKey('KeyD', x > dead);
  dispatchKey('KeyW', y < -dead);
  dispatchKey('KeyS', y > dead);
}

function canvasPointFromVector(x, y, magnitude = 1) {
  const rect = canvas.getBoundingClientRect();
  const radius = Math.min(rect.width, rect.height) * (.34 + .28 * magnitude);
  return {
    x: rect.left + rect.width / 2 + x * radius,
    y: rect.top + rect.height / 2 + y * radius,
  };
}
function fallbackAim(x, y, magnitude = 1) {
  const p = canvasPointFromVector(x, y, magnitude);
  canvas.dispatchEvent(new PointerEvent('pointermove', {
    bubbles: true,
    pointerId: 8100,
    pointerType: 'mouse',
    clientX: p.x,
    clientY: p.y,
  }));
  return p;
}
function sendAim(x, y, magnitude = 1) {
  return bridge()?.setAimVector?.(x, y, magnitude) || fallbackAim(x, y, magnitude);
}
function fallbackFireOnce() {
  const rect = canvas.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  canvas.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, pointerId: 8200, pointerType: 'mouse', button: 0, clientX: x, clientY: y,
  }));
  setTimeout(() => canvas.dispatchEvent(new PointerEvent('pointerup', {
    bubbles: true, pointerId: 8200, pointerType: 'mouse', button: 0, clientX: x, clientY: y,
  })), 34);
}
function fireBasic(x, y, magnitude, travel = 0) {
  const api = bridge();
  if (travel < 8) api?.autoAim?.();
  else sendAim(x, y, magnitude);

  if (api?.fireOnce) api.fireOnce();
  else fallbackFireOnce();

  setTimeout(() => api?.endAim?.(), 90);
}

function addStickVisual(root, label, icon, preserve = false) {
  root.classList.add('touch-stick');
  const markup = `<span class="stick-label">${label}</span><span class="stick-ring"><span class="stick-thumb">${icon}</span></span>`;
  if (preserve) root.insertAdjacentHTML('beforeend', `<span class="stick-overlay">${markup}</span>`);
  else root.innerHTML = markup;
  return root.querySelector('.stick-thumb');
}

function bindStick(root, { onStart, onMove, onRelease, label, icon, preserve = false }) {
  if (!root) return;
  const thumb = addStickVisual(root, label, icon, preserve);
  let pointerId = null;
  let vector = { x: 0, y: 0, magnitude: 0 };
  let start = { x: 0, y: 0 }, maxTravel = 0;

  const update = event => {
    const rect = root.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = Math.max(24, Math.min(rect.width, rect.height) * .32);
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const raw = Math.hypot(dx, dy);
    const scale = raw > max ? max / raw : 1;
    dx *= scale;
    dy *= scale;
    vector = { x: dx / max, y: dy / max, magnitude: Math.min(1, raw / max) };
    thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    root.classList.add('stick-active');
    onMove?.(vector.x, vector.y, vector.magnitude, event);
  };

  root.addEventListener('pointerdown', event => {
    if (!isPortraitMobile() || root.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    pointerId = event.pointerId;
    start = { x: event.clientX, y: event.clientY };
    maxTravel = 0;
    try { root.setPointerCapture(pointerId); } catch {}
    update(event);
    onStart?.(vector.x, vector.y, vector.magnitude, event);
  }, { capture: true });

  root.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    maxTravel = Math.max(maxTravel, Math.hypot(event.clientX - start.x, event.clientY - start.y));
    update(event);
  }, { capture: true });

  const release = event => {
    if (pointerId === null || (event.pointerId != null && event.pointerId !== pointerId)) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    const released = { ...vector };
    pointerId = null;
    thumb.style.transform = 'translate(0px, 0px)';
    root.classList.remove('stick-active');
    onRelease?.(released.x, released.y, released.magnitude, event, maxTravel);
  };

  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    root.addEventListener(type, release, { capture: true });
  }
}

if (movePad) {
  movePad.innerHTML = '<div class="move-stick touch-stick" aria-label="Joystick de movimiento"><span class="stick-label">MOVER</span><span class="stick-ring"><span class="stick-thumb">●</span></span></div>';
  const moveStick = movePad.querySelector('.move-stick');
  let movePointer = null;
  const thumb = moveStick.querySelector('.stick-thumb');

  const updateMove = event => {
    const rect = moveStick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = Math.max(28, Math.min(rect.width, rect.height) * .31);
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const raw = Math.hypot(dx, dy);
    const scale = raw > max ? max / raw : 1;
    dx *= scale;
    dy *= scale;
    thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    moveStick.classList.add('stick-active');
    setMoveVector(dx / max, dy / max);
  };

  moveStick.addEventListener('pointerdown', event => {
    if (!isPortraitMobile()) return;
    event.preventDefault();
    movePointer = event.pointerId;
    try { moveStick.setPointerCapture(movePointer); } catch {}
    updateMove(event);
  });
  moveStick.addEventListener('pointermove', event => {
    if (event.pointerId !== movePointer) return;
    event.preventDefault();
    updateMove(event);
  });
  const endMove = event => {
    if (movePointer === null || (event.pointerId != null && event.pointerId !== movePointer)) return;
    movePointer = null;
    thumb.style.transform = 'translate(0px, 0px)';
    moveStick.classList.remove('stick-active');
    clearMoveKeys();
  };
  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    moveStick.addEventListener(type, endMove);
  }
}

bindStick(attackPad, {
  label: 'APUNTAR',
  icon: '⚡',
  onStart: () => attackPad.classList.add('primed'),
  onMove: (x, y, m) => {
    if (m >= .12) sendAim(x, y, m);
  },
  onRelease: (x, y, m, event, travel) => {
    attackPad.classList.remove('primed');
    if (event.type !== 'pointerup') { bridge()?.endAim?.(); return; }
    fireBasic(x, y, m, travel);
  },
});

bindStick(abilityPad, {
  label: 'SOBRECARGA',
  icon: 'E',
  preserve: true,
  onMove: (x, y, m) => { if (m >= .12) sendAim(x, y, m); },
  onRelease: (x, y, m, event, travel) => {
    if (event.type !== 'pointerup' || travel < 6 || m < .12 || abilityPad.disabled) { bridge()?.endAim?.(); return; }
    sendAim(x, y, m);
    abilityPad.click();
    setTimeout(() => bridge()?.endAim?.(), 90);
  },
});

bindStick(ultimatePad, {
  label: 'TORMENTA',
  icon: 'Q',
  preserve: true,
  onMove: (x, y, m) => { if (m >= .12) sendAim(x, y, m); },
  onRelease: (x, y, m, event, travel) => {
    if (event.type !== 'pointerup' || travel < 6 || m < .12 || ultimatePad.disabled) { bridge()?.endAim?.(); return; }
    sendAim(x, y, m);
    ultimatePad.click();
    setTimeout(() => bridge()?.endAim?.(), 90);
  },
});

for (const skill of [abilityPad, ultimatePad]) {
  skill?.addEventListener('click', event => {
    if (isPortraitMobile() && event.detail > 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true });
}

canvas?.addEventListener('pointerdown', event => {
  if (!isPortraitMobile() || event.pointerType === 'mouse') return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, { capture: true });
canvas?.addEventListener('pointermove', event => {
  if (!isPortraitMobile() || event.pointerType === 'mouse') return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, { capture: true });

document.getElementById('game-screen')?.addEventListener('touchmove', event => {
  if (isPortraitMobile()) event.preventDefault();
}, { passive: false });

window.addEventListener('blur', () => {
  clearMoveKeys();
  bridge()?.endAim?.();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearMoveKeys();
    bridge()?.endAim?.();
  }
});

document.body.dataset.mobileControls = 'release-fire';
