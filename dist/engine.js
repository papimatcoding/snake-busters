// Pure simulation. Seconds, logical pixels and fixed steps; no DOM or audio.
export const WIDTH = 1200, HEIGHT = 740, TOTAL_WAVES = 5, STEP = 1 / 120;
const PI = Math.PI, ARC = PI * 100;
export const PATH_LENGTH = 2790 + 2 * ARC;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function pathAt(d) {
  d = clamp(d, 0, PATH_LENGTH);
  if (d < 900) return { x: 130 + d, y: 130, a: 0 };
  d -= 900;
  if (d < ARC) { const a = -PI / 2 + d / 100; return { x: 1030 + Math.cos(a) * 100, y: 230 + Math.sin(a) * 100, a: a + PI / 2 }; }
  d -= ARC;
  if (d < 900) return { x: 1030 - d, y: 330, a: PI };
  d -= 900;
  if (d < ARC) { const a = -PI / 2 - d / 100; return { x: 130 + Math.cos(a) * 100, y: 430 + Math.sin(a) * 100, a: a - PI / 2 }; }
  d -= ARC;
  return { x: 130 + d, y: 530, a: 0 };
}
export const UPGRADES = [
  { id: 'chain', name: 'Arco doble', icon: '↯', text: 'Tus disparos saltan a un vecino adicional.', apply: s => s.stats.chain++ },
  { id: 'power', name: 'Alto voltaje', icon: '+', text: '+30 % de daño en tus disparos y sus arcos.', apply: s => s.stats.damage *= 1.3 },
  { id: 'rapid', name: 'Gatillo iónico', icon: '»', text: 'La munición recarga un 22 % más rápido y encadenas tiros un 15 % más rápido.', apply: s => { s.stats.ammoReload /= 1.22; s.stats.interval /= 1.15; } },
  { id: 'blast', name: 'Ruptura reactiva', icon: '✳', text: 'Cada rotura inflige 16 de daño a sus vecinos.', apply: s => s.stats.blast += 16 },
  { id: 'pulse', name: 'Condensador', icon: '↻', text: 'Sobrecarga recarga un 25 % más rápido y golpea a dos objetivos más.', apply: s => { s.stats.cooldown *= .75; s.stats.targets += 2; } },
  { id: 'force', name: 'Onda de choque', icon: '≋', text: 'Las roturas empujan un 60 % más. Sobrecarga hace +25 % de daño.', apply: s => { s.stats.push *= 1.6; s.stats.pulseDamage *= 1.25; } },
];
export function createGame() {
  const s = { phase: 'ready', wave: 1, score: 0, time: 0, waveTime: 0, head: 800,
    player: { x: 600, y: 660 }, aim: { x: 600, y: 330 },
    segments: [], bullets: [], events: [], upgrades: [], choices: [], kills: 0, shots: 0, hits: 0,
    combo: 0, maxCombo: 0, comboTimer: 0, fireTimer: 0, cooldown: 0, uid: 0,
    ammo: 3, ammoTimer: 0,
    stats: { damage: 14, interval: .16, ammoMax: 3, ammoReload: .82, chain: 1, blast: 0, push: 25, cooldown: 9, targets: 5, pulseDamage: 48 } };
  spawnWave(s); s.phase = 'ready'; return s;
}
export function spawnWave(s) {
  s.phase = 'playing'; s.waveTime = 0; s.head = 1250 + 100 * (s.wave - 1);
  s.bullets = []; s.cooldown = 0; s.fireTimer = 0; s.combo = 0; s.comboTimer = 0;
  s.ammo = s.stats.ammoMax; s.ammoTimer = 0;
  s.player = { x: 600, y: 660 };
  s.segments = Array.from({ length: 12 + (s.wave - 1) * 3 }, (_, i) => {
    const type = i % 5 === 3 ? 'volatile' : i % 4 === 0 ? 'armor' : 'normal';
    const maxHp = (80 + (s.wave - 1) * 25) * (type === 'armor' ? 1.7 : type === 'volatile' ? .8 : 1);
    return { id: s.uid++, type, hp: maxHp, maxHp, d: s.head - i * 39, flash: 0 };
  });
  placeSegments(s);
  s.events.push({ type: 'wave', wave: s.wave });
}
export function placeSegments(s) {
  s.segments.forEach((seg, i) => { seg.d = s.head - i * 39; Object.assign(seg, pathAt(seg.d)); });
}
export function startGame(s) { s.phase = 'playing'; }
export function chooseUpgrade(s, id) {
  if (s.phase !== 'upgrade' || !s.choices.includes(id)) return false;
  const u = UPGRADES.find(u => u.id === id); if (!u) return false;
  u.apply(s); s.upgrades.push(id); s.wave++; spawnWave(s); return true;
}
function finishWave(s) {
  s.bullets = [];
  const bonus = Math.max(0, Math.round((90 - s.waveTime) * 20));
  s.score += bonus; s.events.push({ type: 'clear', bonus });
  if (s.wave >= TOTAL_WAVES) { s.phase = 'won'; s.events.push({ type: 'end' }); }
  else {
    s.phase = 'upgrade';
    // All runs have the same offers. Choices and execution determine the build.
    const offers = [['chain', 'power', 'force'], ['rapid', 'blast', 'pulse'], ['power', 'chain', 'blast'], ['force', 'pulse', 'rapid']];
    s.choices = offers[s.wave - 1];
  }
}
export function damage(s, id, amount, source = 'shot') {
  const index = s.segments.findIndex(seg => seg.id === id);
  if (index < 0) return;
  const seg = s.segments[index];
  const dealt = Math.min(seg.hp, amount * (seg.type === 'armor' && source === 'shot' ? .75 : 1));
  seg.hp -= dealt; seg.flash = .09;
  s.score += Math.round(dealt);
  s.events.push({ type: 'hit', x: seg.x, y: seg.y, amount: dealt, source });
  if (seg.hp > .0001) return;
  const neighbors = [s.segments[index - 1], s.segments[index + 1]].filter(Boolean).map(n => n.id);
  s.segments.splice(index, 1); s.kills++;
  s.combo = s.comboTimer > 0 ? s.combo + 1 : 1; s.comboTimer = 1.65;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  s.score += 100 * Math.min(s.combo, 8);
  // Capped retreat and a minimum remaining chain length prevent indefinite lockout.
  s.head = Math.max(s.segments.length * 39 + 30, s.head - Math.min(85, s.stats.push));
  s.events.push({ type: 'break', x: seg.x, y: seg.y, kind: seg.type, combo: s.combo });
  const explosion = s.stats.blast + (seg.type === 'volatile' ? 48 + s.wave * 6 : 0);
  if (explosion) neighbors.forEach(next => damage(s, next, explosion, 'explosion'));
}
export function activateAbility(s) {
  if (s.phase !== 'playing' || s.cooldown > 0 || !s.segments.length) return false;
  const target = [...s.segments].filter(n => n.d >= 0).sort((a, b) => Math.hypot(a.x - s.aim.x, a.y - s.aim.y) - Math.hypot(b.x - s.aim.x, b.y - s.aim.y))[0];
  if (!target) return false;
  const index = s.segments.indexOf(target);
  const targets = [...s.segments].filter(n => n.d >= 0).sort((a, b) => Math.abs(s.segments.indexOf(a) - index) - Math.abs(s.segments.indexOf(b) - index)).slice(0, s.stats.targets);
  let from = { ...s.player };
  targets.forEach(n => { s.events.push({ type: 'arc', x: from.x, y: from.y, tx: n.x, ty: n.y, big: true }); from = { x: n.x, y: n.y }; damage(s, n.id, s.stats.pulseDamage, 'pulse'); });
  s.cooldown = s.stats.cooldown; s.events.push({ type: 'pulse' });
  if (!s.segments.length) finishWave(s);
  return true;
}
export function segmentCircleHit(ax, ay, bx, by, cx, cy, radius) {
  const dx = bx - ax, dy = by - ay, length2 = dx * dx + dy * dy;
  if (!length2) return Math.hypot(ax - cx, ay - cy) <= radius ? 0 : null;
  const fx = ax - cx, fy = ay - cy;
  const c = fx * fx + fy * fy - radius * radius;
  if (c <= 0) return 0;
  const b = 2 * (fx * dx + fy * dy), disc = b * b - 4 * length2 * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * length2);
  return t >= 0 && t <= 1 ? t : null;
}
export function update(s, dt, input = {}) {
  if (s.phase !== 'playing') return;
  dt = clamp(dt, 0, .05); s.time += dt; s.waveTime += dt;
  s.cooldown = Math.max(0, s.cooldown - dt); s.fireTimer -= dt;
  if (s.ammo < s.stats.ammoMax) {
    s.ammoTimer -= dt;
    while (s.ammoTimer <= 0 && s.ammo < s.stats.ammoMax) {
      s.ammo++;
      s.events.push({ type: 'reload', ammo: s.ammo });
      s.ammoTimer += s.stats.ammoReload;
    }
    if (s.ammo >= s.stats.ammoMax) s.ammoTimer = 0;
  }
  s.comboTimer = Math.max(0, s.comboTimer - dt); if (!s.comboTimer) s.combo = 0;
  const mx = input.x || 0, my = input.y || 0, len = Math.max(1, Math.hypot(mx, my));
  s.player.x = clamp(s.player.x + mx / len * 330 * dt, 45, 1155);
  s.player.y = clamp(s.player.y + my / len * 330 * dt, 605, 705);
  if (input.aim) s.aim = { ...input.aim };
  if (input.fire && s.fireTimer <= 0 && s.ammo > 0) {
    const a = Math.atan2(s.aim.y - s.player.y, s.aim.x - s.player.x);
    s.bullets.push({ x: s.player.x + Math.cos(a) * 28, y: s.player.y + Math.sin(a) * 28, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000, life: 1.5 });
    s.ammo--;
    if (s.ammoTimer <= 0) s.ammoTimer = s.stats.ammoReload;
    s.fireTimer = s.stats.interval; s.shots++; s.events.push({ type: 'shot', ammo: s.ammo });
  }
  // Increasing speed is visible as pressure, and bounds the length of a failed run.
  s.head += (47 + s.wave * 8 + s.waveTime * .55) * dt;
  placeSegments(s);
  for (const seg of s.segments) seg.flash = Math.max(0, seg.flash - dt);
  for (const b of s.bullets) {
    const ox = b.x, oy = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let first = null, nearest = Infinity;
    for (const seg of s.segments) {
      if (seg.d < 0) continue;
      const t = segmentCircleHit(ox, oy, b.x, b.y, seg.x, seg.y, 23);
      if (t !== null && t < nearest) { first = seg; nearest = t; }
    }
    if (first) {
      b.life = 0; s.hits++;
      const idx = s.segments.indexOf(first);
      const neighbors = [...s.segments].filter(n => n.id !== first.id && n.d >= 0).sort((a, c) => Math.abs(s.segments.indexOf(a) - idx) - Math.abs(s.segments.indexOf(c) - idx)).slice(0, s.stats.chain);
      damage(s, first.id, s.stats.damage);
      for (const n of neighbors) {
        s.events.push({ type: 'arc', x: first.x, y: first.y, tx: n.x, ty: n.y });
        damage(s, n.id, s.stats.damage * .3, 'arc');
      }
    }
  }
  s.bullets = s.bullets.filter(b => b.life > 0 && b.x > -20 && b.x < WIDTH + 20 && b.y > -20 && b.y < HEIGHT + 20);
  if (!s.segments.length) finishWave(s);
  else if (s.head >= PATH_LENGTH) { s.phase = 'lost'; s.bullets = []; s.events.push({ type: 'end' }); }
}
