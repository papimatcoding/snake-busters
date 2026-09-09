const isPortraitMobile = () => matchMedia('(max-width: 680px)').matches;
const canvas = document.getElementById('game');
const attack = document.getElementById('mobile-attack');
let aimClient = null;
let firingPointerId = 9001;

function rememberAim(event) {
  aimClient = { x: event.clientX, y: event.clientY };
  canvas.dispatchEvent(new PointerEvent('pointermove', {
    bubbles: true,
    pointerId: 9000,
    pointerType: 'mouse',
    clientX: event.clientX,
    clientY: event.clientY,
  }));
}

canvas?.addEventListener('pointerdown', event => {
  if (!isPortraitMobile() || event.pointerType === 'mouse') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  rememberAim(event);
}, { capture: true });

canvas?.addEventListener('pointermove', event => {
  if (!isPortraitMobile() || event.pointerType === 'mouse') return;
  rememberAim(event);
}, { capture: true });

function defaultAim() {
  const rect = canvas.getBoundingClientRect();
  return { x: rect.left + rect.width * .5, y: rect.top + rect.height * .38 };
}

function beginFire(event) {
  if (!isPortraitMobile()) return;
  event.preventDefault();
  attack.classList.add('is-firing');
  const aim = aimClient || defaultAim();
  canvas.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    pointerId: firingPointerId,
    pointerType: 'mouse',
    button: 0,
    clientX: aim.x,
    clientY: aim.y,
  }));
  try { attack.setPointerCapture(event.pointerId); } catch {}
}

function endFire(event) {
  if (!isPortraitMobile()) return;
  event?.preventDefault?.();
  attack.classList.remove('is-firing');
  const aim = aimClient || defaultAim();
  canvas.dispatchEvent(new PointerEvent('pointerup', {
    bubbles: true,
    pointerId: firingPointerId,
    pointerType: 'mouse',
    button: 0,
    clientX: aim.x,
    clientY: aim.y,
  }));
  firingPointerId += 1;
}

attack?.addEventListener('pointerdown', beginFire);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) attack?.addEventListener(type, endFire);

// Mobile UX: prevent double-tap zoom/selection while fighting without affecting menus.
document.getElementById('game-screen')?.addEventListener('touchmove', event => {
  if (isPortraitMobile()) event.preventDefault();
}, { passive: false });
