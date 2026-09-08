// Pure simulation. Seconds, logical pixels and fixed steps; no DOM or audio.
export const WIDTH = 1200, HEIGHT = 740, TOTAL_SECTORS = 5, TOTAL_WAVES = TOTAL_SECTORS, STEP = 1 / 120;
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

export const BUSTERS = {
  volt: {
    id: 'volt',
    name: 'Volt',
    role: 'Conductor',
    basic: {
      id: 'tesla-trident', name: 'Tridente Tesla',
      damage: 11, interval: .2, ammoMax: 3, ammoReload: .66, chain: 1, push: 38,
      projectiles: 3, spread: .105, chainScale: .24, ultimateGain: .3,
    },
    ability: {
      id: 'overload', name: 'Sobrecarga',
      cooldown: 9, damage: 48, targets: 5,
    },
    ultimate: {
      id: 'storm-core', name: 'Tormenta de núcleo',
      chargeMax: 120, damage: 42, targets: 8,
    },
  },
};

export const MUTATIONS = {
  'plated-scales': {
    id: 'plated-scales', name: 'Escamas blindadas',
    text: 'Greenfang desarrolla placas más frecuentes y gana resistencia.',
    apply: c => { c.armorEvery = Math.min(c.armorEvery, 4); c.hpMultiplier *= 1.08; },
  },
  'unstable-glands': {
    id: 'unstable-glands', name: 'Glándulas inestables',
    text: 'Aparecen más segmentos explosivos y su ruptura es más violenta.',
    apply: c => { c.volatileEvery = Math.min(c.volatileEvery, 4); c.volatileBlast += 18; },
  },
  overgrowth: {
    id: 'overgrowth', name: 'Sobrecrecimiento',
    text: 'Greenfang regenera más cuerpo entre sectores.',
    apply: c => { c.segmentBonus += 4; c.hpMultiplier *= 1.05; },
  },
  frenzy: {
    id: 'frenzy', name: 'Frenesí alfa',
    text: 'La criatura acelera su avance al acercarse al nido.',
    apply: c => { c.speedMultiplier *= 1.15; c.accel *= 1.18; },
  },
};

export const OUTBREAKS = {
  'toxic-sewers': {
    id: 'toxic-sewers',
    name: 'Toxic Sewers',
    target: 'Greenfang',
    sectors: [
      { id: 'drain-gate', name: 'Drain Gate', kind: 'containment', segments: 12, hp: 80, speed: 55, accel: .48, armorEvery: 5, volatileEvery: 6, mutationAfter: 'plated-scales' },
      { id: 'filter-hall', name: 'Filter Hall', kind: 'pressure', segments: 14, hp: 92, speed: 61, accel: .52, armorEvery: 5, volatileEvery: 5, mutationAfter: 'unstable-glands' },
      { id: 'split-pipe', name: 'Split Pipe', kind: 'armor-break', segments: 15, hp: 104, speed: 65, accel: .56, armorEvery: 4, volatileEvery: 6, mutationAfter: 'overgrowth' },
      { id: 'the-sump', name: 'The Sump', kind: 'surge', segments: 17, hp: 115, speed: 70, accel: .62, armorEvery: 4, volatileEvery: 5, mutationAfter: 'frenzy' },
      { id: 'greenfang-alpha', name: 'Greenfang Alpha', kind: 'alpha', segments: 18, hp: 128, speed: 74, accel: .66, armorEvery: 4, volatileEvery: 5, headHpMultiplier: 2.2 },
    ],
  },
};

function cloneBuster(id) {
  const source = BUSTERS[id];
  if (!source) throw new Error(`Unknown Buster: ${id}`);
  return JSON.parse(JSON.stringify(source));
}

function getOutbreak(id) {
  const outbreak = OUTBREAKS[id];
  if (!outbreak) throw new Error(`Unknown outbreak: ${id}`);
  return outbreak;
}

export function getEncounter(s) {
  return getOutbreak(s.run.outbreakId).sectors[s.run.sector - 1];
}

export function getEncounterConfig(s) {
  const e = getEncounter(s);
  const c = {
    ...e,
    segmentBonus: 0,
    hpMultiplier: 1,
    speedMultiplier: 1,
    volatileBlast: 0,
    headHpMultiplier: e.headHpMultiplier || 1,
    armorEvery: e.armorEvery || 99,
    volatileEvery: e.volatileEvery || 99,
  };
  for (const id of s.run.mutations) MUTATIONS[id]?.apply(c);
  return c;
}

export const UPGRADES = [
  { id: 'chain', name: 'Arco doble', icon: '↯', text: 'Cada rayo del Tridente salta a un vecino adicional.', apply: s => s.buster.basic.chain++ },
  { id: 'power', name: 'Alto voltaje', icon: '+', text: '+25 % de daño a los tres rayos del básico.', apply: s => s.buster.basic.damage *= 1.25 },
  { id: 'rapid', name: 'Bobina rápida', icon: '»', text: 'La munición recarga un 20 % más rápido y el Tridente dispara un 12 % más rápido.', apply: s => { s.buster.basic.ammoReload /= 1.2; s.buster.basic.interval /= 1.12; } },
  { id: 'blast', name: 'Ruptura reactiva', icon: '✳', text: 'Cada rotura inflige 16 de daño a sus vecinos.', apply: s => s.build.blast += 16 },
  { id: 'pulse', name: 'Condensador', icon: '↻', text: 'La habilidad recarga un 25 % más rápido y golpea a dos objetivos más.', apply: s => { s.buster.ability.cooldown *= .75; s.buster.ability.targets += 2; } },
  { id: 'force', name: 'Onda de choque', icon: '≋', text: 'Las roturas empujan un 60 % más y la habilidad hace +25 % de daño.', apply: s => { s.buster.basic.push *= 1.6; s.buster.ability.damage *= 1.25; } },
];

export function createGame(options = {}) {
  const busterId = options.busterId || 'volt';
  const outbreakId = options.outbreakId || 'toxic-sewers';
  const buster = cloneBuster(busterId);
  const s = {
    phase: 'ready',
    wave: 1,
    score: 0,
    time: 0,
    sectorTime: 0,
    waveTime: 0,
    head: 800,
    player: { x: 600, y: 660 },
    aim: { x: 600, y: 330 },
    buster,
    run: {
      outbreakId,
      sector: 1,
      cleared: [],
      mutations: [],
      encounterHistory: [],
    },
    encounter: null,
    segments: [],
    bullets: [],
    events: [],
    upgrades: [],
    choices: [],
    build: { blast: 0 },
    kills: 0,
    shots: 0,
    hits: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    fireTimer: 0,
    abilityCooldown: 0,
    ultimateCharge: 0,
    ammo: buster.basic.ammoMax,
    ammoTimer: 0,
    uid: 0,
  };
  spawnSector(s);
  s.phase = 'ready';
  return s;
}

function typeForIndex(config, i) {
  if (i === 0) return 'normal';
  if (i % config.volatileEvery === config.volatileEvery - 1) return 'volatile';
  if (i % config.armorEvery === 0) return 'armor';
  return 'normal';
}

export function spawnSector(s) {
  const config = getEncounterConfig(s);
  s.encounter = {
    id: config.id,
    name: config.name,
    kind: config.kind,
    target: getOutbreak(s.run.outbreakId).target,
  };
  s.wave = s.run.sector;
  s.phase = 'playing';
  s.sectorTime = 0;
  s.waveTime = 0;
  s.head = 1220 + 80 * (s.run.sector - 1);
  s.bullets = [];
  s.abilityCooldown = 0;
  s.fireTimer = 0;
  s.combo = 0;
  s.comboTimer = 0;
  s.ammo = s.buster.basic.ammoMax;
  s.ammoTimer = 0;
  s.player = { x: 600, y: 660 };

  const count = config.segments + config.segmentBonus;
  s.segments = Array.from({ length: count }, (_, i) => {
    const type = typeForIndex(config, i);
    const typeHp = type === 'armor' ? 1.7 : type === 'volatile' ? .8 : 1;
    const headHp = i === 0 ? config.headHpMultiplier : 1;
    const maxHp = config.hp * config.hpMultiplier * typeHp * headHp;
    return { id: s.uid++, type, hp: maxHp, maxHp, d: s.head - i * 39, flash: 0 };
  });
  placeSegments(s);
  s.run.encounterHistory.push({ sector: s.run.sector, encounterId: config.id, mutations: [...s.run.mutations] });
  s.events.push({ type: 'sector', sector: s.run.sector, encounter: s.encounter, mutations: [...s.run.mutations] });
  s.events.push({ type: 'wave', wave: s.run.sector });
}

export function placeSegments(s) {
  s.segments.forEach((seg, i) => {
    seg.d = s.head - i * 39;
    Object.assign(seg, pathAt(seg.d));
  });
}

export function startGame(s) {
  if (s.phase === 'ready') s.phase = 'playing';
}

function applyMutationAfterSector(s, sector) {
  const encounter = getOutbreak(s.run.outbreakId).sectors[sector - 1];
  const id = encounter?.mutationAfter;
  if (!id || s.run.mutations.includes(id)) return;
  s.run.mutations.push(id);
  s.events.push({ type: 'mutation', id, mutation: MUTATIONS[id] });
}

export function chooseUpgrade(s, id) {
  if (s.phase !== 'upgrade' || !s.choices.includes(id)) return false;
  const u = UPGRADES.find(u => u.id === id);
  if (!u) return false;
  u.apply(s);
  s.upgrades.push(id);
  applyMutationAfterSector(s, s.run.sector);
  s.run.sector++;
  spawnSector(s);
  return true;
}

function finishSector(s) {
  if (s.phase !== 'playing') return;
  s.bullets = [];
  const sector = s.run.sector;
  const bonus = Math.max(0, Math.round((90 - s.sectorTime) * 20));
  s.score += bonus;
  if (!s.run.cleared.includes(sector)) s.run.cleared.push(sector);
  s.events.push({ type: 'clear', sector, encounter: s.encounter, bonus });

  if (sector >= TOTAL_SECTORS) {
    s.phase = 'won';
    s.events.push({ type: 'end' });
    return;
  }
  s.phase = 'upgrade';
  const offers = [
    ['chain', 'power', 'force'],
    ['rapid', 'blast', 'pulse'],
    ['power', 'chain', 'blast'],
    ['force', 'pulse', 'rapid'],
  ];
  s.choices = offers[sector - 1];
}

function gainUltimate(s, amount) {
  const max = s.buster.ultimate.chargeMax;
  s.ultimateCharge = clamp(s.ultimateCharge + amount, 0, max);
}

function isBasicSource(source) {
  return source === 'basic' || source === 'basic-chain';
}

export function damage(s, id, amount, source = 'shot') {
  const index = s.segments.findIndex(seg => seg.id === id);
  if (index < 0) return;
  const seg = s.segments[index];
  const directArmor = source === 'basic' ? .75 : 1;
  const dealt = Math.min(seg.hp, amount * (seg.type === 'armor' ? directArmor : 1));
  seg.hp -= dealt;
  seg.flash = .09;
  s.score += Math.round(dealt);
  if (isBasicSource(source)) gainUltimate(s, dealt * s.buster.basic.ultimateGain);
  s.events.push({ type: 'hit', x: seg.x, y: seg.y, amount: dealt, source });

  if (seg.hp > .0001) return;
  const neighbors = [s.segments[index - 1], s.segments[index + 1]].filter(Boolean).map(n => n.id);
  s.segments.splice(index, 1);
  s.kills++;
  s.combo = s.comboTimer > 0 ? s.combo + 1 : 1;
  s.comboTimer = 1.65;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  s.score += 100 * Math.min(s.combo, 8);
  if (isBasicSource(source)) gainUltimate(s, 2);
  s.head = Math.max(s.segments.length * 39 + 30, s.head - Math.min(85, s.buster.basic.push));
  s.events.push({ type: 'break', x: seg.x, y: seg.y, kind: seg.type, combo: s.combo });

  const config = getEncounterConfig(s);
  const explosion = s.build.blast + (seg.type === 'volatile' ? 48 + s.run.sector * 6 + config.volatileBlast : 0);
  if (explosion) neighbors.forEach(next => damage(s, next, explosion, 'explosion'));
}

function nearestTarget(s) {
  return [...s.segments]
    .filter(n => n.d >= 0)
    .sort((a, b) => Math.hypot(a.x - s.aim.x, a.y - s.aim.y) - Math.hypot(b.x - s.aim.x, b.y - s.aim.y))[0];
}

export function activateAbility(s) {
  if (s.phase !== 'playing' || s.abilityCooldown > 0 || !s.segments.length) return false;
  const target = nearestTarget(s);
  if (!target) return false;
  const index = s.segments.indexOf(target);
  const targets = [...s.segments]
    .filter(n => n.d >= 0)
    .sort((a, b) => Math.abs(s.segments.indexOf(a) - index) - Math.abs(s.segments.indexOf(b) - index))
    .slice(0, s.buster.ability.targets);

  let from = { ...s.player };
  targets.forEach(n => {
    s.events.push({ type: 'arc', x: from.x, y: from.y, tx: n.x, ty: n.y, big: true });
    from = { x: n.x, y: n.y };
    damage(s, n.id, s.buster.ability.damage, 'ability');
  });
  s.abilityCooldown = s.buster.ability.cooldown;
  s.events.push({ type: 'ability', id: s.buster.ability.id });
  s.events.push({ type: 'pulse' });
  if (!s.segments.length) finishSector(s);
  return true;
}

export function activateUltimate(s) {
  const ultimate = s.buster.ultimate;
  if (s.phase !== 'playing' || s.ultimateCharge < ultimate.chargeMax || !s.segments.length) return false;
  const targets = [...s.segments].filter(n => n.d >= 0).slice(0, ultimate.targets);
  if (!targets.length) return false;

  s.ultimateCharge = 0;
  let from = { ...s.player };
  for (const n of targets) {
    s.events.push({ type: 'arc', x: from.x, y: from.y, tx: n.x, ty: n.y, big: true, ultimate: true });
    from = { x: n.x, y: n.y };
    damage(s, n.id, ultimate.damage, 'ultimate');
  }
  s.events.push({ type: 'ultimate', id: ultimate.id });
  if (!s.segments.length) finishSector(s);
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
  dt = clamp(dt, 0, .05);
  s.time += dt;
  s.sectorTime += dt;
  s.waveTime = s.sectorTime;
  s.abilityCooldown = Math.max(0, s.abilityCooldown - dt);
  s.fireTimer -= dt;

  if (s.ammo < s.buster.basic.ammoMax) {
    s.ammoTimer -= dt;
    while (s.ammoTimer <= 0 && s.ammo < s.buster.basic.ammoMax) {
      s.ammo++;
      s.events.push({ type: 'reload', ammo: s.ammo });
      s.ammoTimer += s.buster.basic.ammoReload;
    }
    if (s.ammo >= s.buster.basic.ammoMax) s.ammoTimer = 0;
  }

  s.comboTimer = Math.max(0, s.comboTimer - dt);
  if (!s.comboTimer) s.combo = 0;

  const mx = input.x || 0, my = input.y || 0, len = Math.max(1, Math.hypot(mx, my));
  s.player.x = clamp(s.player.x + mx / len * 330 * dt, 45, 1155);
  s.player.y = clamp(s.player.y + my / len * 330 * dt, 605, 705);
  if (input.aim) s.aim = { ...input.aim };

  if (input.fire && s.fireTimer <= 0 && s.ammo > 0) {
    const a = Math.atan2(s.aim.y - s.player.y, s.aim.x - s.player.x);
    const count = s.buster.basic.projectiles;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * s.buster.basic.spread;
      const angle = a + offset;
      s.bullets.push({
        x: s.player.x + Math.cos(angle) * 28,
        y: s.player.y + Math.sin(angle) * 28,
        vx: Math.cos(angle) * 1000,
        vy: Math.sin(angle) * 1000,
        life: 1.5,
        source: 'basic',
        fork: i,
      });
    }
    s.ammo--;
    if (s.ammoTimer <= 0) s.ammoTimer = s.buster.basic.ammoReload;
    s.fireTimer = s.buster.basic.interval;
    s.shots++;
    s.events.push({ type: 'shot', ammo: s.ammo, projectiles: count });
  }

  const config = getEncounterConfig(s);
  s.head += (config.speed * config.speedMultiplier + s.sectorTime * config.accel) * dt;
  placeSegments(s);
  for (const seg of s.segments) seg.flash = Math.max(0, seg.flash - dt);

  for (const b of s.bullets) {
    const ox = b.x, oy = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let first = null, nearest = Infinity;

    for (const seg of s.segments) {
      if (seg.d < 0) continue;
      const t = segmentCircleHit(ox, oy, b.x, b.y, seg.x, seg.y, 23);
      if (t !== null && t < nearest) { first = seg; nearest = t; }
    }

    if (first) {
      b.life = 0;
      s.hits++;
      const idx = s.segments.indexOf(first);
      const neighbors = [...s.segments]
        .filter(n => n.id !== first.id && n.d >= 0)
        .sort((a, c) => Math.abs(s.segments.indexOf(a) - idx) - Math.abs(s.segments.indexOf(c) - idx))
        .slice(0, s.buster.basic.chain);

      damage(s, first.id, s.buster.basic.damage, 'basic');
      for (const n of neighbors) {
        s.events.push({ type: 'arc', x: first.x, y: first.y, tx: n.x, ty: n.y });
        damage(s, n.id, s.buster.basic.damage * s.buster.basic.chainScale, 'basic-chain');
      }
    }
  }

  s.bullets = s.bullets.filter(b => b.life > 0 && b.x > -20 && b.x < WIDTH + 20 && b.y > -20 && b.y < HEIGHT + 20);
  if (!s.segments.length) finishSector(s);
  else if (s.head >= PATH_LENGTH) {
    s.phase = 'lost';
    s.bullets = [];
    s.events.push({ type: 'end' });
  }
}
