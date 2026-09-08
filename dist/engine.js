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

export function pathAtLane(d, lane = 0, totalLanes = 1) {
  const p = pathAt(d);
  if (totalLanes <= 1) return p;
  const offset = (lane - (totalLanes - 1) / 2) * 68;
  return {
    x: p.x - Math.sin(p.a) * offset,
    y: p.y + Math.cos(p.a) * offset,
    a: p.a,
  };
}

export const BUSTERS = {
  volt: {
    id: 'volt',
    name: 'Volt',
    role: 'Conductor',
    basic: {
      id: 'tesla-trident', name: 'Tridente Tesla',
      damage: 11, interval: .2, ammoMax: 3, ammoReload: .66, chain: 1, push: 38,
      projectiles: 3, spread: .105, chainScale: .24, ultimateGain: .08,
    },
    ability: {
      id: 'overload', name: 'Sobrecarga',
      cooldown: 9, damage: 48, targets: 5,
    },
    ultimate: {
      id: 'storm-core', name: 'Tormenta de núcleo',
      chargeMax: 140, damage: 34, radius: 145, bolts: 7,
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
      { id: 'drain-gate', name: 'Drain Gate', kind: 'containment', rule: 'baseline', segments: 12, hp: 80, speed: 55, accel: .48, armorEvery: 5, volatileEvery: 6, mutationAfter: 'plated-scales' },
      { id: 'filter-hall', name: 'Filter Hall', kind: 'pressure', rule: 'filter-pressure', segments: 14, hp: 92, speed: 61, accel: .52, armorEvery: 5, volatileEvery: 5, mutationAfter: 'unstable-glands' },
      { id: 'split-pipe', name: 'Split Pipe', kind: 'split', rule: 'split-dual', splitLanes: 2, segments: 16, hp: 98, speed: 62, accel: .5, armorEvery: 5, volatileEvery: 6, mutationAfter: 'overgrowth' },
      { id: 'the-sump', name: 'The Sump', kind: 'hunt', rule: 'hunt-escape', huntTarget: 1320, huntTime: 20, segments: 17, hp: 112, speed: 78, accel: .58, armorEvery: 4, volatileEvery: 5, mutationAfter: 'frenzy' },
      { id: 'greenfang-alpha', name: 'Greenfang Alpha', kind: 'alpha', rule: 'alpha-phases', segments: 18, hp: 128, speed: 74, accel: .66, armorEvery: 4, volatileEvery: 5, headHpMultiplier: 2.2 },
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
  if (s.run.routeModifier?.sector === s.run.sector) ROUTES[s.run.routeModifier.id]?.apply(c);
  return c;
}

export const ROUTES = {
  maintenance: {
    id: 'maintenance',
    name: 'Conducto de mantenimiento',
    risk: 'safe',
    text: 'Ruta estable: Greenfang avanza un 10 % más lento en el siguiente sector.',
    apply: config => { config.speedMultiplier *= .9; },
    salvage: 0,
  },
  'infested-nest': {
    id: 'infested-nest',
    name: 'Nido infestado',
    risk: 'danger',
    text: 'Más cuerpo, más vida y más velocidad. Si limpias el sector, recuperas 1 muestra de mutación.',
    apply: config => { config.segmentBonus += 4; config.hpMultiplier *= 1.1; config.speedMultiplier *= 1.08; config.nestCount = 3; config.nestHp = 95; },
    salvage: 1,
  },
};

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
    player: { x: 600, y: 625 },
    aim: { x: 600, y: 330 },
    buster,
    run: {
      outbreakId,
      sector: 1,
      cleared: [],
      mutations: [],
      encounterHistory: [],
      routeChoices: [],
      routeHistory: [],
      routeModifier: null,
      salvage: 0,
    },
    encounter: null,
    segments: [],
    objectives: [],
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
    rule: config.rule,
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
  s.player = { x: 600, y: 625 };

  const count = config.segments + config.segmentBonus;
  const nestPositions = [{ x: 310, y: 255 }, { x: 600, y: 445 }, { x: 890, y: 255 }];
  s.objectives = Array.from({ length: config.nestCount || 0 }, (_, i) => ({
    id: `nest-${s.uid++}`,
    type: 'nest',
    x: nestPositions[i % nestPositions.length].x,
    y: nestPositions[i % nestPositions.length].y,
    hp: (config.nestHp || 80) * config.hpMultiplier,
    maxHp: (config.nestHp || 80) * config.hpMultiplier,
    flash: 0,
  }));
  s.encounterState = {
    initialSegments: count,
    pressureTimer: 8,
    splitTriggered: false,
    sludgeTimer: 7,
    sludgeActive: 0,
    alphaPhase: 0,
    splitLanes: config.splitLanes || 1,
    laneHeads: config.splitLanes ? Array.from({ length: config.splitLanes }, (_, lane) => s.head - lane * 110) : null,
    huntDamage: 0,
    huntTarget: config.huntTarget || 0,
    huntTimer: config.huntTime || 0,
  };
  s.segments = Array.from({ length: count }, (_, i) => {
    const type = typeForIndex(config, i);
    const lane = config.splitLanes ? i % config.splitLanes : 0;
    const typeHp = type === 'armor' ? 1.7 : type === 'volatile' ? .8 : 1;
    const headHp = i === 0 ? config.headHpMultiplier : 1;
    const maxHp = config.hp * config.hpMultiplier * typeHp * headHp;
    return { id: s.uid++, type, lane, hp: maxHp, maxHp, d: s.head - i * 39, flash: 0 };
  });
  placeSegments(s);
  s.run.encounterHistory.push({ sector: s.run.sector, encounterId: config.id, mutations: [...s.run.mutations] });
  s.events.push({ type: 'sector', sector: s.run.sector, encounter: s.encounter, mutations: [...s.run.mutations] });
  s.events.push({ type: 'wave', wave: s.run.sector });
}

export function placeSegments(s) {
  const lanes = s.encounterState?.splitLanes || 1;
  const laneIndexes = Array.from({ length: lanes }, () => 0);
  for (const seg of s.segments) {
    const lane = Math.min(lanes - 1, seg.lane || 0);
    const index = laneIndexes[lane]++;
    const head = s.encounterState?.laneHeads?.[lane] ?? s.head;
    seg.d = head - index * 42;
    Object.assign(seg, pathAtLane(seg.d, lane, lanes));
  }
  if (s.encounterState?.laneHeads) s.head = Math.max(...s.encounterState.laneHeads);
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
  const clearedSector = s.run.sector;
  u.apply(s);
  s.upgrades.push(id);
  applyMutationAfterSector(s, clearedSector);

  if (clearedSector === 2) {
    s.phase = 'route';
    s.run.routeChoices = ['maintenance', 'infested-nest'];
    s.events.push({ type: 'route-choice', sector: clearedSector, choices: [...s.run.routeChoices] });
    return true;
  }

  s.run.sector++;
  spawnSector(s);
  return true;
}

export function chooseRoute(s, id) {
  if (s.phase !== 'route' || !s.run.routeChoices.includes(id) || !ROUTES[id]) return false;
  const nextSector = s.run.sector + 1;
  s.run.routeModifier = { id, sector: nextSector };
  s.run.routeHistory.push({ afterSector: s.run.sector, routeId: id, targetSector: nextSector });
  s.run.routeChoices = [];
  s.run.sector = nextSector;
  spawnSector(s);
  s.events.push({ type: 'route-selected', id, sector: nextSector });
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
  if (s.run.routeModifier?.sector === sector) {
    const route = ROUTES[s.run.routeModifier.id];
    if (route?.salvage) {
      s.run.salvage += route.salvage;
      s.events.push({ type: 'route-reward', routeId: route.id, salvage: route.salvage });
    }
  }

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

function branchFor(s, seg) {
  const lane = seg?.lane || 0;
  return s.segments.filter(n => (n.lane || 0) === lane);
}

function branchNeighbors(s, seg) {
  const branch = branchFor(s, seg);
  const index = branch.findIndex(n => n.id === seg.id);
  return [branch[index - 1], branch[index + 1]].filter(Boolean);
}

export function damage(s, id, amount, source = 'shot') {
  if (s.phase !== 'playing') return;
  const index = s.segments.findIndex(seg => seg.id === id);
  if (index < 0) return;
  const seg = s.segments[index];
  const directArmor = source === 'basic' ? .75 : 1;
  const dealt = Math.min(seg.hp, amount * (seg.type === 'armor' ? directArmor : 1));
  seg.hp -= dealt;
  let huntComplete = false;
  if (s.encounter?.rule === 'hunt-escape' && s.encounterState?.huntTarget) {
    s.encounterState.huntDamage = Math.min(s.encounterState.huntTarget, s.encounterState.huntDamage + dealt);
    huntComplete = s.encounterState.huntDamage >= s.encounterState.huntTarget;
  }
  seg.flash = .09;
  s.score += Math.round(dealt);
  if (isBasicSource(source)) gainUltimate(s, dealt * s.buster.basic.ultimateGain);
  s.events.push({ type: 'hit', x: seg.x, y: seg.y, amount: dealt, source });

  if (seg.hp > .0001) {
    if (huntComplete && s.phase === 'playing') {
      s.events.push({ type: 'hunt-complete', damage: s.encounterState.huntDamage, target: s.encounterState.huntTarget });
      finishSector(s);
    }
    return;
  }
  const neighbors = branchNeighbors(s, seg).map(n => n.id);
  s.segments.splice(index, 1);
  s.kills++;
  s.combo = s.comboTimer > 0 ? s.combo + 1 : 1;
  s.comboTimer = 1.65;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  s.score += 100 * Math.min(s.combo, 8);
  if (isBasicSource(source)) gainUltimate(s, .75);
  const push = Math.min(85, s.buster.basic.push);
  if (s.encounterState?.laneHeads) {
    const lane = Math.min(s.encounterState.laneHeads.length - 1, seg.lane || 0);
    s.encounterState.laneHeads[lane] = Math.max(80, s.encounterState.laneHeads[lane] - push);
    s.head = Math.max(...s.encounterState.laneHeads);
  } else {
    s.head = Math.max(s.segments.length * 39 + 30, s.head - push);
  }
  s.events.push({ type: 'break', x: seg.x, y: seg.y, kind: seg.type, combo: s.combo });

  const config = getEncounterConfig(s);
  const explosion = s.build.blast + (seg.type === 'volatile' ? 48 + s.run.sector * 6 + config.volatileBlast : 0);
  if (explosion) neighbors.forEach(next => damage(s, next, explosion, 'explosion'));
  if (huntComplete && s.phase === 'playing') {
    s.events.push({ type: 'hunt-complete', damage: s.encounterState.huntDamage, target: s.encounterState.huntTarget });
    finishSector(s);
  }
}

function damageObjective(s, id, amount, source = 'basic') {
  const obj = s.objectives.find(o => o.id === id);
  if (!obj) return false;
  const dealt = Math.min(obj.hp, amount);
  obj.hp -= dealt;
  obj.flash = .09;
  s.score += Math.round(dealt);
  if (isBasicSource(source)) gainUltimate(s, dealt * s.buster.basic.ultimateGain);
  s.events.push({ type: 'objective-hit', objective: obj.type, x: obj.x, y: obj.y, amount: dealt, source });
  if (obj.hp <= .0001) {
    s.objectives = s.objectives.filter(o => o.id !== id);
    s.score += 180;
    s.events.push({ type: 'objective-break', objective: obj.type, x: obj.x, y: obj.y });
  }
  return true;
}

function encounterComplete(s) {
  if (s.encounter?.rule === 'hunt-escape') return s.encounterState.huntDamage >= s.encounterState.huntTarget;
  return s.segments.length === 0 && s.objectives.length === 0;
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
  const branch = branchFor(s, target);
  const index = branch.indexOf(target);
  const targets = branch
    .filter(n => n.d >= 0)
    .sort((a, b) => Math.abs(branch.indexOf(a) - index) - Math.abs(branch.indexOf(b) - index))
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
  if (encounterComplete(s)) finishSector(s);
  return true;
}

export function activateUltimate(s) {
  const ultimate = s.buster.ultimate;
  if (s.phase !== 'playing' || s.ultimateCharge < ultimate.chargeMax || !s.segments.length) return false;
  const center = { ...s.aim };
  const targets = [...s.segments]
    .filter(n => n.d >= 0 && Math.hypot(n.x - center.x, n.y - center.y) <= ultimate.radius)
    .sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y))
    .slice(0, ultimate.bolts);
  if (!targets.length) return false;

  s.ultimateCharge = 0;
  s.events.push({ type: 'ultimate-zone', id: ultimate.id, x: center.x, y: center.y, radius: ultimate.radius });
  for (let i = 0; i < targets.length; i++) {
    const n = targets[i];
    const skyX = n.x + ((i % 3) - 1) * 26;
    s.events.push({ type: 'arc', x: skyX, y: -24, tx: n.x, ty: n.y, big: true, ultimate: true });
    s.events.push({ type: 'ultimate-bolt', x: n.x, y: n.y, index: i });
    damage(s, n.id, ultimate.damage, 'ultimate');
  }
  s.events.push({ type: 'ultimate', id: ultimate.id, x: center.x, y: center.y, hits: targets.length, radius: ultimate.radius });
  if (encounterComplete(s)) finishSector(s);
  return true;
}

function appendSegments(s, count, hpScale = .72, forceArmor = false) {
  const config = getEncounterConfig(s);
  for (let i = 0; i < count; i++) {
    const type = forceArmor ? 'armor' : (i % 3 === 2 ? 'volatile' : 'normal');
    const typeHp = type === 'armor' ? 1.7 : type === 'volatile' ? .8 : 1;
    const maxHp = config.hp * config.hpMultiplier * typeHp * hpScale;
    const lanes = config.splitLanes || 1;
    const lane = lanes > 1 ? i % lanes : 0;
    s.segments.push({ id: s.uid++, type, lane, hp: maxHp, maxHp, d: 0, flash: 0 });
  }
  placeSegments(s);
}

function encounterRuleEffects(s, dt) {
  const rule = s.encounter?.rule;
  const runtime = s.encounterState;
  const effects = { move: 1, reload: 1, speed: 1 };
  if (!runtime) return effects;

  if (rule === 'filter-pressure') {
    runtime.pressureTimer -= dt;
    if (runtime.pressureTimer <= 0) {
      runtime.pressureTimer += 8;
      const reinforced = s.segments.filter(n => n.type === 'normal' && n.d >= 0).slice(0, 2);
      for (const seg of reinforced) {
        seg.type = 'armor';
        seg.maxHp *= 1.28;
        seg.hp *= 1.28;
      }
      if (reinforced.length) s.events.push({ type: 'reinforce', count: reinforced.length });
    }
  }

  if (rule === 'split-dual') {
    effects.speed = 1.03;
  }

  if (rule === 'toxic-sump') {
    runtime.sludgeTimer -= dt;
    if (runtime.sludgeActive > 0) {
      runtime.sludgeActive = Math.max(0, runtime.sludgeActive - dt);
      effects.move = .72;
      effects.reload = 1.7;
    } else if (runtime.sludgeTimer <= 0) {
      runtime.sludgeTimer += 10;
      runtime.sludgeActive = 3;
      effects.move = .72;
      effects.reload = 1.7;
      s.events.push({ type: 'sludge', duration: 3 });
    }
  }

  if (rule === 'alpha-phases') {
    const ratio = s.segments.length / Math.max(1, runtime.initialSegments);
    const nextPhase = ratio <= .33 ? 2 : ratio <= .66 ? 1 : 0;
    if (nextPhase > runtime.alphaPhase) {
      runtime.alphaPhase = nextPhase;
      appendSegments(s, 2, .58, nextPhase === 2);
      s.events.push({ type: 'alpha-phase', phase: nextPhase });
    }
    effects.speed = 1 + runtime.alphaPhase * .18;
  }

  return effects;
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
  const config = getEncounterConfig(s);
  const ruleEffects = encounterRuleEffects(s, dt);

  if (s.ammo < s.buster.basic.ammoMax) {
    s.ammoTimer -= dt / ruleEffects.reload;
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
  s.player.x = clamp(s.player.x + mx / len * 330 * ruleEffects.move * dt, 45, 1155);
  s.player.y = clamp(s.player.y + my / len * 330 * ruleEffects.move * dt, 570, 650);
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

  const advance = (config.speed * config.speedMultiplier + s.sectorTime * config.accel) * ruleEffects.speed * dt;
  if (s.encounterState?.laneHeads) {
    s.encounterState.laneHeads = s.encounterState.laneHeads.map((head, lane) => head + advance * (1 + lane * .055));
    s.head = Math.max(...s.encounterState.laneHeads);
  } else {
    s.head += advance;
  }

  if (s.encounter?.rule === 'hunt-escape') {
    s.encounterState.huntTimer = Math.max(0, s.encounterState.huntTimer - dt);
    if (s.encounterState.huntTimer <= 0 && s.phase === 'playing') {
      s.phase = 'lost';
      s.events.push({ type: 'hunt-escaped', damage: s.encounterState.huntDamage, target: s.encounterState.huntTarget });
      s.events.push({ type: 'end' });
      return;
    }
  }
  placeSegments(s);
  for (const seg of s.segments) seg.flash = Math.max(0, seg.flash - dt);
  for (const obj of s.objectives) obj.flash = Math.max(0, obj.flash - dt);

  for (const b of s.bullets) {
    const ox = b.x, oy = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let first = null, nearest = Infinity, firstKind = '';

    for (const seg of s.segments) {
      if (seg.d < 0) continue;
      const t = segmentCircleHit(ox, oy, b.x, b.y, seg.x, seg.y, 23);
      if (t !== null && t < nearest) { first = seg; nearest = t; firstKind = 'segment'; }
    }
    for (const obj of s.objectives) {
      const t = segmentCircleHit(ox, oy, b.x, b.y, obj.x, obj.y, 29);
      if (t !== null && t < nearest) { first = obj; nearest = t; firstKind = 'objective'; }
    }

    if (first) {
      b.life = 0;
      s.hits++;
      if (firstKind === 'objective') {
        damageObjective(s, first.id, s.buster.basic.damage, 'basic');
      } else {
        const branch = branchFor(s, first);
        const idx = branch.indexOf(first);
        const neighbors = branch
          .filter(n => n.id !== first.id && n.d >= 0)
          .sort((a, c) => Math.abs(branch.indexOf(a) - idx) - Math.abs(branch.indexOf(c) - idx))
          .slice(0, s.buster.basic.chain);

        damage(s, first.id, s.buster.basic.damage, 'basic');
        for (const n of neighbors) {
          s.events.push({ type: 'arc', x: first.x, y: first.y, tx: n.x, ty: n.y });
          damage(s, n.id, s.buster.basic.damage * s.buster.basic.chainScale, 'basic-chain');
        }
      }
    }
  }

  s.bullets = s.bullets.filter(b => b.life > 0 && b.x > -20 && b.x < WIDTH + 20 && b.y > -20 && b.y < HEIGHT + 20);
  if (encounterComplete(s)) finishSector(s);
  else if (s.segments.length && s.head >= PATH_LENGTH) {
    s.phase = 'lost';
    s.bullets = [];
    s.events.push({ type: 'end' });
  }
}
