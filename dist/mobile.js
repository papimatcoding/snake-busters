const isPortraitMobile = () => matchMedia('(max-width: 680px)').matches;
const canvas = document.getElementById('game');
const movePad = document.querySelector('.mobile-controls');
const attackPad = document.getElementById('mobile-attack');
const abilityPad = document.getElementById('ability');
const ultimatePad = document.getElementById('ultimate');

const heldKeys = new Set();
let activeFire = false;
let attackPointerId = null;

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
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) dispatchKey(code, false);
}

function setMoveVector(x, y) {
  const dead = .24;
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

function sendAim(x, y, magnitude = 1) {
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

function startFire(x, y, magnitude = 1) {
  const p = sendAim(x, y, magnitude);
  if (activeFire) return;
  activeFire = true;
  canvas.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    pointerId: 8200,
    pointerType: 'mouse',
    button: 0,
    clientX: p.x,
    clientY: p.y,
  }));
}

function stopFire() {
  if (!activeFire) return;
  activeFire = false;
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent('pointerup', {
    bubbles: true,
    pointerId: 8200,
    pointerType: 'mouse',
    button: 0,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  }));
}

function addStickVisual(root, label, icon) {
  root.classList.add('touch-stick');
  root.innerHTML = `<span class="stick-label">${label}</span><span class="stick-ring"><span class="stick-thumb">${icon}</span></span>`;
  return root.querySelector('.stick-thumb');
}

function bindStick(root, { onMove, onRelease, label, icon, fireWhileHeld = false }) {
  if (!root) return;
  const thumb = addStickVisual(root, label, icon);
  let pointerId = null;
  let vector = { x: 0, y: 0, magnitude: 0 };

  const update = event => {
    const rect = root.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = Math.max(24, Math.min(rect.width, rect.height) * .32);
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const raw = Math.hypot(dx, dy);
    const scale = raw > max ? max / raw : 1;
    dx *= scale; dy *= scale;
    vector = { x: dx / max, y: dy / max, magnitude: Math.min(1, raw / max) };
    thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    root.classList.add('stick-active');
    onMove?.(vector.x, vector.y, vector.magnitude, event);
  };

  root.addEventListener('pointerdown', event => {
    if (!isPortraitMobile() || root.disabled) return;
    event.preventDefault();
    pointerId = event.pointerId;
    try { root.setPointerCapture(pointerId); } catch {}
    update(event);
    if (fireWhileHeld) startFire(vector.x, vector.y, vector.magnitude);
  });
  root.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    update(event);
    if (fireWhileHeld) sendAim(vector.x, vector.y, vector.magnitude);
  });

  const release = event => {
    if (pointerId === null || (event.pointerId != null && event.pointerId !== pointerId)) return;
    event.preventDefault?.();
    const released = { ...vector };
    pointerId = null;
    thumb.style.transform = 'translate(0px, 0px)';
    root.classList.remove('stick-active');
    if (fireWhileHeld) stopFire();
    onRelease?.(released.x, released.y, released.magnitude, event);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, release);
}

if (movePad) {
  movePad.innerHTML = '<div class="move-stick touch-stick" aria-label="Joystick de movimiento"><span class="stick-label">MOVER</span><span class="stick-ring"><span class="stick-thumb">●</span></span></div>';
  const moveStick = movePad.querySelector('.move-stick');
  let movePointer = null;
  const thumb = moveStick.querySelector('.stick-thumb');
  moveStick.addEventListener('pointerdown', event => {
    if (!isPortraitMobile()) return;
    event.preventDefault(); movePointer = event.pointerId;
    try { moveStick.setPointerCapture(movePointer); } catch {}
  });
  moveStick.addEventListener('pointermove', event => {
    if (event.pointerId !== movePointer) return;
    const rect = moveStick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const max = Math.max(28, Math.min(rect.width, rect.height) * .31);
    let dx = event.clientX - cx, dy = event.clientY - cy;
    const raw = Math.hypot(dx, dy), scale = raw > max ? max / raw : 1;
    dx *= scale; dy *= scale;
    thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    moveStick.classList.add('stick-active');
    setMoveVector(dx / max, dy / max);
  });
  const endMove = event => {
    if (movePointer === null || (event.pointerId != null && event.pointerId !== movePointer)) return;
    movePointer = null; thumb.style.transform = 'translate(0px, 0px)';
    moveStick.classList.remove('stick-active'); clearMoveKeys();
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) moveStick.addEventListener(type, endMove);
}

bindStick(attackPad, {
  label: 'ATAQUE', icon: '⚡', fireWhileHeld: true,
  onMove: (x, y, magnitude) => sendAim(x, y, magnitude),
});

bindStick(abilityPad, {
  label: 'SOBRECARGA', icon: 'E',
  onMove: (x, y, magnitude) => sendAim(x, y, magnitude),
  onRelease: (x, y, magnitude) => {
    if (magnitude < .12 || abilityPad.disabled) return;
    sendAim(x, y, magnitude); abilityPad.click();
  },
});

bindStick(ultimatePad, {
  label: 'TORMENTA', icon: 'Q',
  onMove: (x, y, magnitude) => sendAim(x, y, magnitude),
  onRelease: (x, y, magnitude) => {
    if (magnitude < .12 || ultimatePad.disabled) return;
    sendAim(x, y, magnitude); ultimatePad.click();
  },
});

// Direct canvas touches are ignored on mobile: aiming belongs to the right-side sticks.
canvas?.addEventListener('pointerdown', event => {
  if (!isPortraitMobile() || event.pointerType === 'mouse') return;
  event.preventDefault(); event.stopImmediatePropagation();
}, { capture: true });
canvas?.addEventListener('pointermove', event => {
  if (!isPortraitMobile() || event.pointerType === 'mouse') return;
  event.preventDefault(); event.stopImmediatePropagation();
}, { capture: true });

document.getElementById('game-screen')?.addEventListener('touchmove', event => {
  if (isPortraitMobile()) event.preventDefault();
}, { passive: false });
window.addEventListener('blur', () => { clearMoveKeys(); stopFire(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearMoveKeys(); stopFire(); } });
