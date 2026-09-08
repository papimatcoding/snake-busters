import { createGame, startGame, update, activateAbility, activateUltimate, chooseUpgrade, getEncounter, MUTATIONS, pathAt, PATH_LENGTH, UPGRADES, WIDTH, HEIGHT, STEP, clamp } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = WIDTH * dpr; canvas.height = HEIGHT * dpr;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const colors = { normal: '#c1fb60', armor: '#8cabff', volatile: '#ff9875' };
let state = createGame(), last = 0, accumulator = 0, shown = 'ready', best = 0, bestSector = 0;
let particles = [], arcs = [], labels = [], rings = [], shake = 0, announcementTime = 0, lobbyToastTime = 0;
let pointer = { x: 600, y: 330 }, shooting = false, keys = new Set(), touchMoves = new Map();
let sound = false, audioContext;
try {
  best = Number(localStorage.getItem('snake-busters:best:v1')) || 0;
  bestSector = Number(localStorage.getItem('snake-busters:toxic-sewers:best-sector:v1')) || 0;
} catch {}

function goScreen(id) {
  document.querySelectorAll('.app-screen').forEach(screen => { screen.hidden = screen.id !== id; });
  document.body.dataset.screen = id;
  resetInput();
  window.scrollTo(0, 0);
}
function syncLobbyProgress() {
  const bestEl = $('lobby-best-sector');
  if (bestEl) bestEl.textContent = bestSector ? `${String(bestSector).padStart(2, '0')} / 05` : '—';
  const pips = $('lobby-sector-pips');
  if (pips) [...pips.children].forEach((pip, i) => pip.classList.toggle('cleared', i < bestSector));
}
function lobbyToast(text) {
  const toast = $('lobby-toast'); if (!toast) return;
  toast.textContent = text; toast.classList.add('show'); lobbyToastTime = 2.3;
}
function leaveRun(destination = 'lobby-screen') {
  state = createGame(); state.phase = 'ready'; particles = []; arcs = []; rings = []; labels = []; accumulator = 0; shown = 'ready';
  $('overlay').hidden = true; syncLobbyProgress(); goScreen(destination);
}
function deploy() { goScreen('game-screen'); restart(); }
syncLobbyProgress();
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
    if (e.type === 'reload' && e.ammo === state.buster.basic.ammoMax) tone(610, .045, .009, 'sine');
    if (e.type === 'hit') { burst(e.x, e.y, '#d8f3ff', 2); labels.push({ x: e.x, y: e.y - 19, text: `-${Math.max(1, Math.round(e.amount))}`, life: .42, color: e.source === 'ability' ? '#fff0a8' : e.source === 'ultimate' ? '#d8b8ff' : e.source === 'explosion' ? '#ffb08e' : '#eaf9ff', small: true }); }
    if (e.type === 'arc') arcs.push({ ...e, life: e.big ? .28 : .1 });
    if (e.type === 'pulse') { shake = reduceMotion ? 0 : 7; tone(150, .32, .06, 'sawtooth'); }
    if (e.type === 'ultimate') { shake = reduceMotion ? 0 : 12; tone(95, .55, .075, 'sawtooth'); announce('ULTIMATE · TORMENTA DE NÚCLEO'); }
    if (e.type === 'wave') announce(`SECTOR ${e.wave} / 5 · ${state.encounter?.name || ''}`);
    if (e.type === 'break') {
      burst(e.x, e.y, colors[e.kind], e.kind === 'volatile' ? 30 : 18);
      rings.push({ x: e.x, y: e.y, life: .45, color: colors[e.kind], explosive: e.kind === 'volatile' });
      labels.push({ x: e.x, y: e.y - 25, text: e.combo > 1 ? `×${Math.min(e.combo, 8)} CADENA` : '+100', life: .85, color: e.combo > 1 ? '#fff0ac' : '#c1fb60' });
      shake = reduceMotion ? 0 : Math.min(9, 3 + e.combo); tone(170 + e.combo * 90, .15, .045, 'triangle');
    }
    if (e.type === 'clear') {
      bestSector = Math.max(bestSector, e.sector || state.run.sector);
      try { localStorage.setItem('snake-busters:toxic-sewers:best-sector:v1', String(bestSector)); } catch {}
      syncLobbyProgress();
    }
    if (e.type === 'end') {
      if (state.score > best) { best = state.score; try { localStorage.setItem('snake-busters:best:v1', String(best)); } catch {} }
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
  const pulse = reduceMotion ? 0 : Math.sin(t * 1.8) * .5 + .5;
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#102333'); bg.addColorStop(1, '#07111c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(86,139,168,.10)'; ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 48) line(x, 0, x, HEIGHT);
  for (let y = 0; y < HEIGHT; y += 48) line(0, y, WIDTH, y);

  ctx.fillStyle = '#13283a'; ctx.fillRect(20, 582, 1160, 141);
  ctx.fillStyle = 'rgba(115,218,250,.055)'; ctx.fillRect(20, 582, 1160, 7);
  ctx.strokeStyle = '#3b6175'; ctx.setLineDash([7, 11]); line(25, 585, 1175, 585); ctx.setLineDash([]);

  ctx.font = '800 11px ui-monospace, monospace'; ctx.fillStyle = '#80a8bd'; ctx.textAlign = 'left';
  ctx.fillText('BUSTER ZONE', 40, 614); ctx.fillText(`${state.encounter?.kind?.toUpperCase() || 'CONTAINMENT'} // ${state.encounter?.name?.toUpperCase() || 'DRAIN GATE'}`, 40, 40);
  ctx.textAlign = 'right'; ctx.fillStyle = '#5e8499'; ctx.fillText(`SECTOR ${String(state.run.sector).padStart(2, '0')}`, 1160, 40);

  ctx.lineCap = 'round';
  track(); ctx.strokeStyle = '#06101a'; ctx.lineWidth = 68; ctx.stroke();
  track(); ctx.strokeStyle = '#425868'; ctx.lineWidth = 56; ctx.stroke();
  track(); ctx.strokeStyle = '#152a38'; ctx.lineWidth = 49; ctx.stroke();
  track(); ctx.strokeStyle = '#2f4b5c'; ctx.lineWidth = 2; ctx.setLineDash([2, 11]); ctx.stroke(); ctx.setLineDash([]);

  for (let d = 85; d < PATH_LENGTH - 70; d += 175) {
    const p = pathAt(d); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.strokeStyle = '#547284'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(1, 0); ctx.lineTo(-7, 6); ctx.stroke(); ctx.restore();
  }

  ctx.textAlign = 'center'; ctx.fillStyle = '#7797a8'; ctx.font = '800 10px ui-monospace, monospace'; ctx.fillText('ENTRADA', 130, 86);
  const remaining = clamp(100 * (1 - state.head / PATH_LENGTH), 0, 100);
  const danger = remaining < 22;
  const p = pathAt(PATH_LENGTH);
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.shadowColor = danger ? '#ff6d62' : '#73dafa'; ctx.shadowBlur = danger ? 18 + pulse * 12 : 10;
  ctx.strokeStyle = danger ? '#ff796d' : '#75cde2'; ctx.lineWidth = 4; circle(0, 0, 37); ctx.stroke();
  ctx.rotate(reduceMotion ? 0 : t * .4); polygon(0, 0, 25, 6); ctx.fillStyle = danger ? '#3f2629' : '#193746'; ctx.fill(); ctx.stroke();
  ctx.rotate(reduceMotion ? 0 : -t * .8); polygon(0, 0, 14, 4, Math.PI / 4); ctx.fillStyle = danger ? '#ff8b75' : '#b9f5ff'; ctx.fill();
  ctx.restore();
  ctx.fillStyle = danger ? '#ff8c7f' : '#a2eaf4'; ctx.font = '900 11px ui-monospace, monospace'; ctx.fillText('NÚCLEO', p.x, p.y - 54);

  if (danger && state.phase === 'playing') {
    ctx.strokeStyle = `rgba(255,105,89,${.20 + pulse * .22})`; ctx.lineWidth = 7; ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);
  }
}
function drawSnake(t) {
  for (let i = state.segments.length - 1; i >= 0; i--) {
    const s = state.segments[i]; if (s.d < 0) continue;
    const color = colors[s.type], hpRatio = Math.max(0, s.hp / s.maxHp);
    const hovered = Math.hypot(pointer.x - s.x, pointer.y - s.y) < 58;
    const wobble = reduceMotion ? 0 : Math.sin(t * 4 + s.id * .8) * 1.2;

    ctx.save(); ctx.translate(s.x, s.y + wobble); ctx.rotate(s.a);
    ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 6;
    polygon(0, 0, 25, s.type === 'armor' ? 8 : 6); ctx.fillStyle = '#06121a'; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    polygon(0, 0, 22, s.type === 'armor' ? 8 : 6);
    ctx.fillStyle = s.flash > 0 ? '#f4ffff' : s.type === 'normal' ? '#547f35' : s.type === 'armor' ? '#435b99' : '#9a4a38';
    ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();

    if (s.type === 'armor') {
      ctx.strokeStyle = '#b9c9ff'; ctx.lineWidth = 2;
      line(-7, -7, 4, -7); line(-9, 0, 7, 0); line(-7, 7, 4, 7);
      ctx.fillStyle = '#d8e1ff'; circle(-12, 0, 2.2); ctx.fill();
    } else if (s.type === 'volatile') {
      ctx.fillStyle = '#ffc18f'; polygon(-1, 0, 10 + Math.sin(t * 8 + s.id) * 1.5, 3); ctx.fill();
      ctx.strokeStyle = '#ffe0af'; ctx.lineWidth = 2; line(-10, -7, 8, 7); line(-10, 7, 8, -7);
    } else {
      ctx.fillStyle = '#d4ff8f'; circle(-3, 0, 5); ctx.fill();
      ctx.fillStyle = '#31551f'; circle(-3, 0, 2); ctx.fill();
    }

    if (i === 0) {
      ctx.fillStyle = '#f7fff1'; circle(10, -8, 4.3); ctx.fill(); circle(10, 8, 4.3); ctx.fill();
      ctx.fillStyle = '#17211a'; circle(12, -8, 1.8); ctx.fill(); circle(12, 8, 1.8); ctx.fill();
      ctx.strokeStyle = '#efffda'; ctx.lineWidth = 2; line(18, -4, 25, 0); line(25, 0, 18, 4);
    }
    ctx.restore();

    const barW = 42, barX = s.x - barW / 2, barY = s.y - 35;
    ctx.fillStyle = 'rgba(3,10,16,.86)'; ctx.fillRect(barX - 2, barY - 2, barW + 4, 7);
    ctx.fillStyle = hpRatio < .3 ? '#ff7d72' : color; ctx.fillRect(barX, barY, barW * hpRatio, 3);
    if (hovered || hpRatio < .999 || i === 0) {
      ctx.textAlign = 'center'; ctx.font = '800 9px ui-monospace, monospace'; ctx.fillStyle = '#d9e8ef';
      ctx.fillText(`${Math.ceil(s.hp)} / ${Math.ceil(s.maxHp)}`, s.x, barY - 5);
    }
  }
}
function drawPlayer(t) {
  const p = state.player, a = Math.atan2(pointer.y - p.y, pointer.x - p.x);
  const bob = reduceMotion ? 0 : Math.sin(t * 5.5) * 1.8;
  const charged = state.ammo > 0;

  ctx.save(); ctx.translate(p.x, p.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 24, 29, 10, 0, 0, Math.PI * 2); ctx.fill();

  ctx.shadowColor = charged ? '#73dafa' : '#314b59'; ctx.shadowBlur = charged ? 14 : 4;
  ctx.fillStyle = '#1d3a50'; circle(0, 0, 25); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = '#75d9f3'; ctx.lineWidth = 3; circle(0, 0, 25); ctx.stroke();

  ctx.fillStyle = '#2c536d'; circle(-19, 4, 9); ctx.fill(); circle(19, 4, 9); ctx.fill();
  ctx.fillStyle = '#0b1722'; ctx.fillRect(-13, -12, 26, 19);
  ctx.strokeStyle = '#69bdd5'; ctx.lineWidth = 2; ctx.strokeRect(-13, -12, 26, 19);
  ctx.fillStyle = charged ? '#c9fbff' : '#6c8290'; ctx.fillRect(-8, -7, 5, 5); ctx.fillRect(3, -7, 5, 5);
  ctx.fillStyle = '#c1fb60'; ctx.fillRect(-6, 11, 12, 4);

  ctx.save(); ctx.rotate(a);
  ctx.fillStyle = '#31556b'; ctx.fillRect(10, -9, 24, 18);
  ctx.strokeStyle = '#83d9f0'; ctx.lineWidth = 2; ctx.strokeRect(10, -9, 24, 18);
  ctx.fillStyle = charged ? '#c1fb60' : '#5f7168'; ctx.fillRect(31, -6, 12, 12);
  ctx.fillStyle = '#eaffbd'; ctx.fillRect(40, -3, 8, 6);
  ctx.restore();

  if (charged && !reduceMotion) {
    ctx.strokeStyle = '#a9f6ff'; ctx.lineWidth = 1.5;
    const spark = Math.sin(t * 18) * 4;
    line(-29, -5, -34, -11 + spark); line(-34, -11 + spark, -30, -17);
  }

  ctx.textAlign = 'center'; ctx.font = '900 10px ui-monospace, monospace'; ctx.fillStyle = '#d9f7ff'; ctx.fillText('VOLT', 0, 39);
  ctx.restore();

  if (state.phase === 'playing') {
    ctx.strokeStyle = state.ammo > 0 ? '#9beafa' : '#ff9c82'; ctx.lineWidth = 1.5; circle(pointer.x, pointer.y, 10); ctx.stroke();
    line(pointer.x - 16, pointer.y, pointer.x - 7, pointer.y); line(pointer.x + 7, pointer.y, pointer.x + 16, pointer.y);
    line(pointer.x, pointer.y - 16, pointer.x, pointer.y - 7); line(pointer.x, pointer.y + 7, pointer.x, pointer.y + 16);
  }
}
function render(t, dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.save(); if (shake > .1) { ctx.translate(Math.sin(t * 89) * shake, Math.cos(t * 107) * shake * .5); shake *= Math.exp(-dt * 18); }
  drawBackground(t); drawSnake(t); drawPlayer(t);
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
  for (const l of labels) { l.life -= dt; l.y -= dt * (l.small ? 24 : 32); ctx.globalAlpha = Math.max(0, Math.min(1, l.life * 3)); ctx.fillStyle = l.color; ctx.font = l.small ? '800 11px ui-monospace, monospace' : 'bold 15px ui-monospace, monospace'; ctx.fillText(l.text, l.x, l.y); }
  ctx.globalAlpha = 1;
  particles = particles.filter(p => p.life > 0); arcs = arcs.filter(a => a.life > 0); rings = rings.filter(r => r.life > 0); labels = labels.filter(l => l.life > 0);
  if (state.combo >= 2 && state.phase === 'playing') { ctx.textAlign = 'center'; ctx.fillStyle = '#d8ff9a'; ctx.font = '900 30px ui-monospace, monospace'; ctx.fillText(`×${Math.min(state.combo, 8)}`, 600, 435); ctx.fillStyle = '#8ba781'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText('ROTURAS EN CADENA', 600, 455); }
  ctx.restore();
}
function panel(html) { $('panel').innerHTML = html; $('overlay').hidden = false; resetInput(); $('panel').querySelector('button')?.focus({ preventScroll: true }); }
function restart() {
  state = createGame(); startGame(state); particles = []; arcs = []; rings = []; labels = []; accumulator = 0;
  pointer = { x: 600, y: 330 }; resetInput(); shown = ''; syncUI(); canvas.focus({ preventScroll: true });
}
function resume() { state.phase = 'playing'; shown = ''; accumulator = 0; resetInput(); syncUI(); canvas.focus({ preventScroll: true }); }
function pause(help = false) {
  if (!['playing', 'paused'].includes(state.phase)) return;
  state.phase = 'paused'; shown = 'paused';
  panel(`<span class="run-tag">TOXIC SEWERS · SECTOR ${state.run.sector}</span><p class="eyebrow">${help ? 'CONTROLES' : 'EXPEDICIÓN EN PAUSA'}</p><h2>${help ? 'Kit de combate.' : state.encounter.name}</h2><ul class="rules"><li><b>WASD / flechas:</b> movimiento.</li><li><b>Clic mantenido:</b> ataque básico. Tres cargas que se recuperan una a una.</li><li><b>E:</b> Sobrecarga, habilidad con cooldown.</li><li><b>Q:</b> Tormenta de núcleo. La ultimate sólo se carga haciendo daño y rompiendo segmentos.</li><li><b>Azul:</b> blindado. <b>Naranja:</b> explosivo.</li><li>Si Greenfang alcanza el núcleo, termina la expedición.</li></ul><div class="pause-actions"><button id="resume" class="primary">SEGUIR <span>↗</span></button><button id="retreat" class="secondary">ABANDONAR AL HQ</button></div>`);
  $('resume').onclick = resume; $('retreat').onclick = () => leaveRun('lobby-screen'); syncHUD();
}
function syncUI() {
  syncHUD();
  if (shown === state.phase) return;
  shown = state.phase;
  if (state.phase === 'playing') { $('overlay').hidden = true; return; }
  if (state.phase === 'upgrade') {
    const mutationId = getEncounter(state).mutationAfter, mutation = mutationId ? MUTATIONS[mutationId] : null;
    panel(`<span class="run-tag">SECTOR ${state.run.sector} LIMPIO</span><p class="eyebrow">BUILD DE EXPEDICIÓN</p><h2>Elige tu mejora.</h2><p class="intro">Tu build persiste hasta que termine esta run.${mutation ? ` Greenfang también evoluciona: <b>${mutation.name}</b> — ${mutation.text}` : ''}</p><div class="upgrade-grid">${state.choices.map((id, i) => { const u = UPGRADES.find(u => u.id === id); return `<button class="upgrade-card" data-upgrade="${id}"><span class="symbol" aria-hidden="true">${u.icon}</span><strong>${u.name}</strong><p>${u.text}</p><small>ELEGIR · ${i + 1}</small></button>`; }).join('')}</div>`);
    document.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => select(b.dataset.upgrade));
  }
  if (['won', 'lost'].includes(state.phase)) {
    const won = state.phase === 'won';
    panel(`<span class="run-tag">OUTBREAK 01 · TOXIC SEWERS</span><p class="eyebrow">${won ? 'GREENFANG CONTENIDA' : 'CONTENCIÓN FALLIDA'}</p><h2>${won ? 'Expedición completa.<br>Por ahora.' : 'Greenfang rompió<br>la línea.'}</h2><div class="results"><div><small>PUNTUACIÓN</small><strong>${format(state.score)}</strong></div><div><small>MEJOR CADENA</small><strong>×${Math.min(8, state.maxCombo)}</strong></div><div><small>SECTORES</small><strong>${won ? 5 : Math.max(0, state.wave - 1)} / 5</strong></div></div><p class="intro">${state.kills} segmentos destruidos · ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} de combate · ${Math.round(state.hits / Math.max(1, state.shots) * 100)} % de precisión</p><div class="result-actions"><button id="again" class="primary">REINTENTAR <span>↗</span></button><button id="return-hq" class="secondary">VOLVER AL HQ</button></div><p class="footnote">Tu mejor sector de Toxic Sewers queda guardado localmente.</p>`);
    $('again').onclick = restart; $('return-hq').onclick = () => leaveRun('lobby-screen');
  }
}
function syncHUD() {
  $('wave').innerHTML = `${String(state.run.sector).padStart(2, '0')} <small>/ 05</small>`;
  $('encounter-name').textContent = state.encounter?.name?.toUpperCase() || 'DRAIN GATE';
  $('mutation-count').textContent = state.run.mutations.length ? `${state.run.mutations.length} MUTACIÓN${state.run.mutations.length === 1 ? '' : 'ES'}` : 'SIN MUTACIONES';
  const remaining = clamp(100 * (1 - state.head / PATH_LENGTH), 0, 100);
  $('distance').textContent = `${Math.ceil(remaining)} % DE MARGEN`;
  $('danger').value = remaining;
  const coreStatus = $('core-status');
  coreStatus.textContent = remaining > 45 ? 'SEGURO' : remaining > 20 ? 'ALERTA' : 'PELIGRO';
  coreStatus.dataset.state = remaining > 45 ? 'safe' : remaining > 20 ? 'warn' : 'danger';

  const ammo = $('ammo'), ammoCells = [...ammo.children];
  ammoCells.forEach((cell, i) => {
    const filled = i < state.ammo;
    cell.classList.toggle('empty', !filled);
    cell.style.setProperty('--reload', !filled && i === state.ammo && state.ammoTimer > 0 ? `${100 * (1 - state.ammoTimer / state.buster.basic.ammoReload)}%` : '0%');
  });
  ammo.setAttribute('aria-label', `${state.ammo} de ${state.buster.basic.ammoMax} cargas disponibles`);
  $('ammo-text').textContent = `${state.ammo} / ${state.buster.basic.ammoMax}`;

  $('ability').disabled = state.phase !== 'playing' || state.abilityCooldown > 0;
  $('cooldown').textContent = state.abilityCooldown > 0 ? `${state.abilityCooldown.toFixed(1)} s` : 'LISTA';
  $('ability-meter').style.width = `${100 * (1 - state.abilityCooldown / state.buster.ability.cooldown)}%`;

  const ultMax = state.buster.ultimate.chargeMax, ultPct = clamp(100 * state.ultimateCharge / ultMax, 0, 100);
  $('ultimate').disabled = state.phase !== 'playing' || state.ultimateCharge < ultMax;
  $('ultimate-status').textContent = state.ultimateCharge >= ultMax ? 'LISTA' : `${Math.floor(ultPct)} %`;
  $('ultimate-meter').style.width = `${ultPct}%`;
  $('pause').disabled = !['playing', 'paused'].includes(state.phase);
  $('pause').innerHTML = state.phase === 'paused' ? 'Continuar <kbd>P</kbd>' : 'Pausa <kbd>P</kbd>';
}
function select(id) {
  if (!chooseUpgrade(state, id)) return;
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
  if ((e.code === 'KeyE' || e.code === 'Space') && state.phase === 'playing') { state.aim = { ...pointer }; activateAbility(state); }
  if (e.code === 'KeyQ' && state.phase === 'playing') activateUltimate(state);
  if (state.phase === 'upgrade' && /^Digit[123]$/.test(e.code)) select(state.choices[Number(e.code.slice(-1)) - 1]);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { resetInput(); if (state.phase === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (state.phase === 'playing') pause(); } });
$('title-enter').onclick = () => goScreen('lobby-screen');
$('lobby-home').onclick = () => goScreen('title-screen');
$('lobby-play').onclick = () => goScreen('outbreak-screen');
$('outbreak-back').onclick = () => goScreen('lobby-screen');
$('outbreak-deploy').onclick = deploy;
$('game-hq').onclick = () => leaveRun('lobby-screen');
document.querySelectorAll('[data-feature]').forEach(button => button.onclick = () => {
  const feature = button.dataset.feature;
  const copy = { busters: 'Volt es el primer Buster. El roster llegará sobre esta pantalla.', locker: 'Locker preparado para skins, efectos, banners y emotes.', shop: 'La tienda todavía no tiene economía ni compras.', social: 'Party de 3 preparada visualmente. El multiplayer real vendrá después.' };
  lobbyToast(copy[feature] || 'Próximamente.');
});
$('pause').onclick = () => state.phase === 'paused' ? resume() : pause();
$('ability').onclick = () => { state.aim = { ...pointer }; activateAbility(state); canvas.focus({ preventScroll: true }); };
$('ultimate').onclick = () => { activateUltimate(state); canvas.focus({ preventScroll: true }); };
$('sound').onclick = () => { sound = !sound; $('sound').textContent = `Sonido: ${sound ? 'sí' : 'no'}`; $('sound').setAttribute('aria-pressed', String(sound)); if (sound) tone(550, .1); };
$('help').onclick = () => { if (state.phase === 'playing' || state.phase === 'paused') pause(true); else announce('WASD · CLIC · E HABILIDAD · Q ULTIMATE'); };
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
  if (lobbyToastTime > 0) { lobbyToastTime -= dt; if (lobbyToastTime <= 0) $('lobby-toast')?.classList.remove('show'); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
