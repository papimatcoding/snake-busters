import { createGame, startGame, update, activateAbility, chooseUpgrade, pathAt, PATH_LENGTH, UPGRADES, WIDTH, HEIGHT, STEP, clamp } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = WIDTH * dpr; canvas.height = HEIGHT * dpr;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const colors = { normal: '#c1fb60', armor: '#8cabff', volatile: '#ff9875' };
let state = createGame(), last = 0, accumulator = 0, shown = 'ready', best = 0;
let particles = [], arcs = [], labels = [], rings = [], shake = 0, announcementTime = 0;
let pointer = { x: 600, y: 330 }, shooting = false, keys = new Set(), touchMoves = new Map();
let sound = false, audioContext;
try { best = Number(localStorage.getItem('snake-busters:best:v1')) || 0; } catch {}
$('best').textContent = format(best);
function format(n) { return Math.round(n).toString().padStart(6, '0'); }
function tone(frequency, duration, volume = .035, type = 'sine') {
  if (!sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const o = audioContext.createOscillator(), g = audioContext.createGain();
    o.type = type; o.frequency.setValueAtTime(frequency, audioContext.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * .45), audioContext.currentTime + duration);
    g.gain.setValueAtTime(volume, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    o.connect(g); g.connect(audioContext.destination); o.start(); o.stop(audioContext.currentTime + duration);
  } catch { sound = false; $('sound').textContent = 'Sonido no disponible'; }
}
function resetInput() { shooting = false; keys.clear(); touchMoves.clear(); }
function announce(text) { $('announce').textContent = text; $('announce').classList.add('show'); announcementTime = 2; }
function burst(x, y, color, count = 15) {
  for (let i = 0; i < (reduceMotion ? 4 : count); i++) {
    const a = Math.random() * Math.PI * 2, speed = 40 + Math.random() * 210;
    particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .3 + Math.random() * .4, color });
  }
  if (particles.length > 450) particles.splice(0, particles.length - 450);
}
function events() {
  for (const e of state.events) {
    if (e.type === 'shot') tone(390, .055, .014, 'triangle');
    if (e.type === 'hit') burst(e.x, e.y, '#d8f3ff', 2);
    if (e.type === 'arc') arcs.push({ ...e, life: e.big ? .28 : .1 });
    if (e.type === 'pulse') { shake = reduceMotion ? 0 : 7; tone(150, .32, .06, 'sawtooth'); }
    if (e.type === 'wave') announce(`OLEADA ${e.wave} / 5`);
    if (e.type === 'break') {
      burst(e.x, e.y, colors[e.kind], e.kind === 'volatile' ? 30 : 18);
      rings.push({ x: e.x, y: e.y, life: .45, color: colors[e.kind], explosive: e.kind === 'volatile' });
      labels.push({ x: e.x, y: e.y - 25, text: e.combo > 1 ? `×${Math.min(e.combo, 8)} CADENA` : '+100', life: .85, color: e.combo > 1 ? '#fff0ac' : '#c1fb60' });
      shake = reduceMotion ? 0 : Math.min(9, 3 + e.combo); tone(170 + e.combo * 90, .15, .045, 'triangle');
    }
    if (e.type === 'end') {
      if (state.score > best) { best = state.score; try { localStorage.setItem('snake-busters:best:v1', String(best)); } catch {} }
      $('best').textContent = format(best);
      tone(state.phase === 'won' ? 820 : 90, .6, .06);
    }
  }
  state.events.length = 0;
}
function polygon(x, y, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) { const a = rotation + Math.PI * 2 * i / sides; const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}
function line(ax, ay, bx, by) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function track() {
  ctx.beginPath();
  for (let d = 0; d < PATH_LENGTH; d += 8) { const p = pathAt(d); d ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
  const end = pathAt(PATH_LENGTH); ctx.lineTo(end.x, end.y);
}
function drawBackground(t) {
  ctx.fillStyle = '#0c1723'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = '#152330'; ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 40) line(x, 0, x, HEIGHT);
  for (let y = 0; y < HEIGHT; y += 40) line(0, y, WIDTH, y);
  ctx.fillStyle = '#111f2c'; ctx.fillRect(20, 587, 1160, 136);
  ctx.strokeStyle = '#304757'; ctx.setLineDash([5, 10]); line(25, 585, 1175, 585); ctx.setLineDash([]);
  ctx.font = '11px ui-monospace, monospace'; ctx.fillStyle = '#71899a'; ctx.textAlign = 'left';
  ctx.fillText('ZONA BUSTER', 40, 615); ctx.fillText('01 / CIRCUITO DE CONTENCIÓN', 40, 40);
  ctx.textAlign = 'right'; ctx.fillText('SECTOR 07', 1160, 40);
  ctx.lineCap = 'round';
  track(); ctx.strokeStyle = '#070e18'; ctx.lineWidth = 62; ctx.stroke();
  track(); ctx.strokeStyle = '#31404c'; ctx.lineWidth = 51; ctx.stroke();
  track(); ctx.strokeStyle = '#192632'; ctx.lineWidth = 47; ctx.stroke();
  track(); ctx.strokeStyle = '#283c47'; ctx.lineWidth = 1; ctx.setLineDash([3, 13]); ctx.stroke(); ctx.setLineDash([]);
  for (let d = 90; d < PATH_LENGTH - 70; d += 190) {
    const p = pathAt(d); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.strokeStyle = '#435662'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(1, 0); ctx.lineTo(-5, 5); ctx.stroke(); ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#697f8e'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText('ENTRADA', 130, 87);
  const danger = state.head > PATH_LENGTH * .78;
  const p = pathAt(PATH_LENGTH); ctx.strokeStyle = danger ? '#ff796d' : '#6c93a5';
  ctx.lineWidth = 3; circle(p.x, p.y, 34); ctx.stroke();
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(reduceMotion ? 0 : t * .3); polygon(0, 0, 24, 6); ctx.fillStyle = '#1b333f'; ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.fillStyle = danger ? '#ff796d' : '#82c6d4'; circle(p.x, p.y, 8); ctx.fill();
  ctx.font = '11px ui-monospace, monospace'; ctx.fillText('NÚCLEO', p.x, p.y - 52);
  if (danger && state.phase === 'playing') { ctx.strokeStyle = `rgba(255,105,89,${.3 + .15 * Math.sin(t * 5)})`; ctx.lineWidth = 6; ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6); }
}
function drawSnake() {
  for (let i = state.segments.length - 1; i >= 0; i--) {
    const s = state.segments[i]; if (s.d < 0) continue;
    const color = colors[s.type];
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5;
    polygon(0, 0, 24, s.type === 'armor' ? 8 : 6); ctx.fillStyle = '#0a151e'; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    polygon(0, 0, 21, s.type === 'armor' ? 8 : 6); ctx.fillStyle = s.flash > 0 ? '#ebfff5' : s.type === 'normal' ? '#425b29' : s.type === 'armor' ? '#354269' : '#723e30'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    polygon(-2, 0, 12, s.type === 'volatile' ? 3 : 6, s.type === 'volatile' ? 0 : Math.PI / 6); ctx.fillStyle = '#182526'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    if (s.type === 'volatile') { line(-3, -6, 1, 0); line(1, 0, -3, 6); }
    else if (s.type === 'armor') { line(-6, -5, 3, -5); line(-6, 0, 3, 0); line(-6, 5, 3, 5); }
    else { ctx.fillStyle = color; circle(-2, 0, 4); ctx.fill(); }
    if (i === 0) { ctx.fillStyle = '#efffda'; ctx.fillRect(10, -11, 6, 4); ctx.fillRect(10, 7, 6, 4); }
    ctx.restore();
    ctx.fillStyle = '#061018'; ctx.fillRect(s.x - 18, s.y - 32, 36, 4);
    ctx.fillStyle = color; ctx.fillRect(s.x - 18, s.y - 32, 36 * Math.max(0, s.hp / s.maxHp), 4);
  }
}
function drawPlayer(t) {
  const p = state.player, a = Math.atan2(pointer.y - p.y, pointer.x - p.x);
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.strokeStyle = '#29485a'; ctx.lineWidth = 1; circle(0, 0, 32); ctx.stroke();
  ctx.fillStyle = '#050c13'; ctx.beginPath(); ctx.ellipse(0, 14, 23, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(a); ctx.fillStyle = '#456078'; ctx.fillRect(-14, -21, 19, 10); ctx.fillRect(-14, 11, 19, 10);
  polygon(0, 0, 22, 6); ctx.fillStyle = '#263d52'; ctx.fill(); ctx.strokeStyle = '#83d9f0'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#9ab8cf'; ctx.fillRect(7, -6, 24, 12); ctx.fillStyle = '#c1fb60'; ctx.fillRect(27, -4, 7, 8);
  polygon(-3, 0, 10, 3); ctx.fillStyle = '#75d9f3'; ctx.fill(); ctx.restore();
  if (state.phase === 'playing') {
    ctx.strokeStyle = '#84cdd6'; ctx.lineWidth = 1; circle(pointer.x, pointer.y, 10); ctx.stroke();
    line(pointer.x - 15, pointer.y, pointer.x - 7, pointer.y); line(pointer.x + 7, pointer.y, pointer.x + 15, pointer.y);
    line(pointer.x, pointer.y - 15, pointer.x, pointer.y - 7); line(pointer.x, pointer.y + 7, pointer.x, pointer.y + 15);
  }
}
function render(t, dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.save(); if (shake > .1) { ctx.translate(Math.sin(t * 89) * shake, Math.cos(t * 107) * shake * .5); shake *= Math.exp(-dt * 18); }
  drawBackground(t); drawSnake(); drawPlayer(t);
  ctx.lineWidth = 3; ctx.strokeStyle = '#d5ff8d'; ctx.shadowColor = '#baff70'; ctx.shadowBlur = 8;
  for (const b of state.bullets) line(b.x, b.y, b.x - b.vx * .014, b.y - b.vy * .014);
  ctx.shadowBlur = 0;
  for (const a of arcs) {
    ctx.globalAlpha = Math.min(1, a.life * 8); ctx.strokeStyle = a.big ? '#e4ffb4' : '#87e0fb'; ctx.lineWidth = a.big ? 4 : 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); for (let i = 1; i < 6; i++) { const k = i / 6, wiggle = Math.sin(i * 13 + t * 30) * (a.big ? 13 : 6); ctx.lineTo(a.x + (a.tx - a.x) * k + wiggle, a.y + (a.ty - a.y) * k - wiggle); } ctx.lineTo(a.tx, a.ty); ctx.stroke(); a.life -= dt;
  }
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
  for (const r of rings) { r.life -= dt; ctx.globalAlpha = Math.max(0, r.life * 2); ctx.strokeStyle = r.color; ctx.lineWidth = 2; circle(r.x, r.y, (1 - r.life / .45) * (r.explosive ? 95 : 50) + 10); ctx.stroke(); }
  ctx.textAlign = 'center'; ctx.font = 'bold 15px ui-monospace, monospace';
  for (const l of labels) { l.life -= dt; l.y -= dt * 32; ctx.globalAlpha = Math.max(0, Math.min(1, l.life * 3)); ctx.fillStyle = l.color; ctx.fillText(l.text, l.x, l.y); }
  ctx.globalAlpha = 1;
  particles = particles.filter(p => p.life > 0); arcs = arcs.filter(a => a.life > 0); rings = rings.filter(r => r.life > 0); labels = labels.filter(l => l.life > 0);
  if (state.combo >= 2 && state.phase === 'playing') { ctx.textAlign = 'center'; ctx.fillStyle = '#d8ff9a'; ctx.font = '900 30px ui-monospace, monospace'; ctx.fillText(`×${Math.min(state.combo, 8)}`, 600, 435); ctx.fillStyle = '#8ba781'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText('ROTURAS EN CADENA', 600, 455); }
  ctx.restore();
}
function panel(html) { $('panel').innerHTML = html; $('overlay').hidden = false; resetInput(); $('panel').querySelector('button')?.focus({ preventScroll: true }); }
function restart() {
  state = createGame(); startGame(state); particles = []; arcs = []; rings = []; labels = []; accumulator = 0;
  $('build').innerHTML = '<span class="muted">Tu primera mejora llega tras la oleada 1.</span>';
  pointer = { x: 600, y: 330 }; resetInput(); shown = ''; syncUI(); canvas.focus({ preventScroll: true });
}
function resume() { state.phase = 'playing'; shown = ''; accumulator = 0; resetInput(); syncUI(); canvas.focus({ preventScroll: true }); }
function pause(help = false) {
  if (!['playing', 'paused'].includes(state.phase)) return;
  state.phase = 'paused'; shown = 'paused';
  panel(`<p class="eyebrow">${help ? 'MANUAL DE CAMPO' : 'RESPIRA. EL NÚCLEO ESTÁ A SALVO.'}</p><h2>${help ? 'Domina el circuito.' : 'Partida en pausa.'}</h2><ul class="rules"><li><b>WASD o flechas:</b> mueve a Volt por la zona inferior.</li><li><b>Ratón + clic mantenido:</b> apunta y dispara. En móvil, mantén el dedo sobre el objetivo.</li><li><b>Espacio o Sobrecarga:</b> descarga sobre el segmento más cercano a tu mira y sus vecinos.</li><li>Rompe segmentos naranjas para provocar explosiones. Los azules resisten los disparos directos.</li><li>Encadena roturas en menos de 1,65 s para multiplicar sus puntos, hasta ×8. Completar rápido da una bonificación.</li><li>La serpiente acelera con el tiempo. Si llega al núcleo, pierdes.</li></ul><button id="resume" class="primary">VOLVER A LA ARENA <span>↗</span></button>`);
  $('resume').onclick = resume; syncHUD();
}
function syncUI() {
  syncHUD();
  if (shown === state.phase) return;
  shown = state.phase;
  if (state.phase === 'playing') { $('overlay').hidden = true; return; }
  if (state.phase === 'upgrade') {
    panel(`<p class="eyebrow">OLEADA ${state.wave} COMPLETADA / NÚCLEO A SALVO</p><h2>Más poder.<br>Tu siguiente combinación.</h2><p class="intro">Elige una mejora para el resto de esta partida.</p><div class="upgrade-grid">${state.choices.map((id, i) => { const u = UPGRADES.find(u => u.id === id); return `<button class="upgrade-card" data-upgrade="${id}"><span class="symbol" aria-hidden="true">${u.icon}</span><strong>${u.name}</strong><p>${u.text}</p><small>ELEGIR MEJORA · ${i + 1}</small></button>`; }).join('')}</div>`);
    document.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => select(b.dataset.upgrade));
  }
  if (['won', 'lost'].includes(state.phase)) {
    const won = state.phase === 'won';
    panel(`<p class="eyebrow">${won ? 'CIRCUITO COMPLETADO' : 'BRECHA EN EL NÚCLEO'}</p><h2>${won ? 'Cinco oleadas.<br>Una buena descarga.' : 'Esta vez ha pasado.<br>La siguiente es tuya.'}</h2><div class="results"><div><small>PUNTUACIÓN</small><strong>${format(state.score)}</strong></div><div><small>MEJOR CADENA</small><strong>×${Math.min(8, state.maxCombo)}</strong></div><div><small>OLEADAS</small><strong>${won ? 5 : state.wave - 1} / 5</strong></div></div><p class="intro">${state.kills} segmentos destruidos · ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} de combate · ${Math.round(state.hits / Math.max(1, state.shots) * 100)} % de precisión</p><button id="again" class="primary">OTRA PARTIDA <span>↗</span></button><p class="footnote">Récord guardado solo en este navegador. El competitivo online llegará más adelante.</p>`);
    $('again').onclick = restart;
  }
}
function syncHUD() {
  $('wave').innerHTML = `${String(state.wave).padStart(2, '0')} <small>/ 05</small>`;
  $('score').textContent = format(state.score);
  const remaining = clamp(100 * (1 - state.head / PATH_LENGTH), 0, 100);
  $('distance').textContent = `${Math.ceil(remaining)} %`;
  $('danger').value = remaining;
  $('ability').disabled = state.phase !== 'playing' || state.cooldown > 0;
  $('cooldown').textContent = state.cooldown > 0 ? `Recargando · ${state.cooldown.toFixed(1)} s` : 'Lista · golpea al objetivo y sus vecinos';
  $('ability-meter').style.width = `${100 * (1 - state.cooldown / state.stats.cooldown)}%`;
  $('pause').disabled = !['playing', 'paused'].includes(state.phase);
  $('pause').innerHTML = state.phase === 'paused' ? 'Continuar <kbd>P</kbd>' : 'Pausa <kbd>P</kbd>';
}
function select(id) {
  if (!chooseUpgrade(state, id)) return;
  $('build').innerHTML = state.upgrades.map(id => `<span class="chip">${UPGRADES.find(u => u.id === id).name}</span>`).join('');
  resetInput(); accumulator = 0; syncUI(); canvas.focus({ preventScroll: true });
}
function toWorld(e) {
  const r = canvas.getBoundingClientRect(), scale = Math.min(r.width / WIDTH, r.height / HEIGHT);
  return { x: clamp((e.clientX - r.left - (r.width - WIDTH * scale) / 2) / scale, 0, WIDTH), y: clamp((e.clientY - r.top - (r.height - HEIGHT * scale) / 2) / scale, 0, HEIGHT) };
}
canvas.addEventListener('pointermove', e => { pointer = toWorld(e); });
canvas.addEventListener('pointerdown', e => {
  if (state.phase !== 'playing' || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); canvas.focus({ preventScroll: true }); pointer = toWorld(e); shooting = true; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', () => { shooting = false; });
canvas.addEventListener('pointercancel', () => { shooting = false; });
canvas.addEventListener('lostpointercapture', () => { shooting = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.querySelectorAll('[data-move]').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); touchMoves.set(e.pointerId, b.dataset.move); b.setPointerCapture(e.pointerId); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, e => touchMoves.delete(e.pointerId));
});
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code) && ['playing', 'paused'].includes(state.phase)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyP' || e.code === 'Escape') { if (state.phase === 'playing') pause(); else if (state.phase === 'paused') resume(); }
  if (e.code === 'Space' && state.phase === 'playing') { state.aim = { ...pointer }; activateAbility(state); }
  if (state.phase === 'upgrade' && /^Digit[123]$/.test(e.code)) select(state.choices[Number(e.code.slice(-1)) - 1]);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { resetInput(); if (state.phase === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (state.phase === 'playing') pause(); } });
$('start').onclick = restart;
$('pause').onclick = () => state.phase === 'paused' ? resume() : pause();
$('ability').onclick = () => { state.aim = { ...pointer }; activateAbility(state); canvas.focus({ preventScroll: true }); };
$('sound').onclick = () => { sound = !sound; $('sound').textContent = `Sonido: ${sound ? 'sí' : 'no'}`; $('sound').setAttribute('aria-pressed', String(sound)); if (sound) tone(550, .1); };
$('help').onclick = () => { if (state.phase === 'playing' || state.phase === 'paused') pause(true); else announce('WASD · CLIC PARA DISPARAR · ESPACIO: SOBRECARGA'); };
function frame(now) {
  const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
  if (state.phase === 'playing') {
    accumulator += dt;
    const moves = new Set(touchMoves.values());
    const input = {
      x: Number(keys.has('KeyD') || keys.has('ArrowRight') || moves.has('right')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || moves.has('left')),
      y: Number(keys.has('KeyS') || keys.has('ArrowDown') || moves.has('down')) - Number(keys.has('KeyW') || keys.has('ArrowUp') || moves.has('up')),
      fire: shooting, aim: pointer,
    };
    while (accumulator >= STEP) { update(state, STEP, input); accumulator -= STEP; if (state.phase !== 'playing') { accumulator = 0; break; } }
  } else accumulator = 0;
  events(); syncUI(); render(now / 1000, state.phase === 'paused' ? 0 : dt);
  if (announcementTime > 0) { announcementTime -= dt; if (announcementTime <= 0) $('announce').classList.remove('show'); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
