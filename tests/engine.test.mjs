import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, startGame, update, damage, activateAbility, activateUltimate,
  chooseUpgrade, chooseRoute, spawnSector, placeSegments, pathAt, PATH_LENGTH, segmentCircleHit, STEP,
  getEncounterConfig, MUTATIONS, ROUTES,
} from '../dist/engine.js';

test('the portrait track is continuous, vertical and reaches the containment core', () => {
  for (const ratio of [.15, .3, .5, .7, .9]) {
    const d = PATH_LENGTH * ratio;
    const a = pathAt(d - .001), b = pathAt(d + .001);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .01);
  }
  const start = pathAt(0), end = pathAt(PATH_LENGTH);
  assert.ok(start.y < 100);
  assert.ok(end.y > 800);
  assert.ok(Math.abs(end.x - 360) < 1e-6);
  assert.ok(Math.abs(end.y - 842) < 1e-6);
  assert.ok(PATH_LENGTH > 1000);
});

test('swept collision detects a fast bullet crossing a segment and rejects a near miss', () => {
  assert.ok(segmentCircleHit(0, 0, 100, 0, 50, 0, 20) > 0);
  assert.equal(segmentCircleHit(0, 0, 100, 0, 50, 21, 20), null);
  assert.equal(segmentCircleHit(50, 0, 50, 0, 50, 0, 20), 0);
});

test('a volatile kill chains once per victim and pushes the snake back', () => {
  const s = createGame();
  startGame(s);
  s.segments = s.segments.slice(1, 4);
  s.segments.forEach(n => { n.hp = 1; n.type = 'volatile'; });
  placeSegments(s);
  const before = s.head;
  damage(s, s.segments[1].id, 100);
  assert.equal(s.segments.length, 0);
  assert.equal(s.kills, 3);
  assert.equal(s.maxCombo, 3);
  assert.ok(s.head < before);
  assert.equal(s.events.filter(e => e.type === 'break').length, 3);
});

test('an idle player loses; pause does not advance the expedition', () => {
  const s = createGame();
  startGame(s);
  for (let i = 0; i < 120 * 100 && s.phase === 'playing'; i++) {
    update(s, STEP);
    s.events = [];
  }
  assert.equal(s.phase, 'lost');
  assert.equal(s.core.hp, 0, 'idle loss now happens after repeated core breaches');
  assert.ok(s.head < PATH_LENGTH, 'each breach repels Greenfang before the final destruction');

  const paused = createGame();
  paused.phase = 'paused';
  paused.abilityCooldown = 5;
  paused.ultimateCharge = 37;
  const before = JSON.stringify(paused);
  update(paused, .05, { fire: true, x: 1 });
  assert.equal(JSON.stringify(paused), before);
});

test('Volt basic, ability and ultimate are separate runtime systems', () => {
  const s = createGame();
  startGame(s);

  assert.equal(s.buster.basic.ammoMax, 3);
  assert.equal(s.buster.basic.projectiles, 3);
  assert.equal(s.buster.basic.name, 'Tridente Tesla');
  assert.equal(s.buster.ability.name, 'Sobrecarga');
  assert.equal(s.buster.ultimate.chargeMax, 140);

  const armor = s.segments.find(n => n.type === 'armor');
  const hp = armor.hp;
  damage(s, armor.id, 20, 'basic');
  assert.equal(armor.hp, hp - 15);
  assert.ok(s.ultimateCharge > 0, 'basic damage should charge the ultimate');

  assert.equal(activateAbility(s), true);
  const after = s.segments.map(n => n.hp);
  assert.equal(activateAbility(s), false);
  assert.deepEqual(s.segments.map(n => n.hp), after);
  assert.equal(s.abilityCooldown, s.buster.ability.cooldown);

  const ultTarget = s.segments.find(n => n.d >= 0);
  s.aim = { x: ultTarget.x, y: ultTarget.y };
  s.ultimateCharge = s.buster.ultimate.chargeMax;
  assert.equal(activateUltimate(s), true);
  assert.equal(s.ultimateCharge, 0);
  assert.ok(s.events.some(e => e.type === 'ultimate-zone'));
  assert.ok(s.events.some(e => e.type === 'ultimate-bolt'));
  assert.equal(activateUltimate(s), false);
});


test('the containment core survives breaches until its HP reaches zero', () => {
  const s = createGame();
  startGame(s);
  const initialHp = s.core.hp;

  s.head = PATH_LENGTH + 5;
  if (s.encounterState?.laneHeads) s.encounterState.laneHeads = s.encounterState.laneHeads.map(() => PATH_LENGTH + 5);
  placeSegments(s);
  update(s, STEP);

  assert.equal(s.phase, 'playing');
  assert.ok(s.core.hp < initialHp);
  assert.ok(s.core.hp > 0);
  assert.ok(s.head < PATH_LENGTH);
  assert.ok(s.events.some(e => e.type === 'core-hit'));

  for (let breach = 0; breach < 10 && s.phase === 'playing'; breach++) {
    s.core.hitCooldown = 0;
    s.head = PATH_LENGTH + 5;
    if (s.encounterState?.laneHeads) s.encounterState.laneHeads = s.encounterState.laneHeads.map(() => PATH_LENGTH + 5);
    placeSegments(s);
    update(s, STEP);
  }

  assert.equal(s.phase, 'lost');
  assert.equal(s.core.hp, 0);
  assert.ok(s.events.some(e => e.type === 'core-destroyed'));
});

test('Volt spends one ammo charge to fire a three-ray Tesla Trident volley', () => {
  const s = createGame();
  startGame(s);
  assert.equal(s.ammo, 3);

  s.fireTimer = 0;
  update(s, STEP, { fire: true, aim: { x: 600, y: 250 } });
  assert.equal(s.ammo, 2);
  assert.equal(s.shots, 1);
  assert.equal(s.bullets.length, 3);
  assert.deepEqual(s.bullets.map(b => b.source), ['basic', 'basic', 'basic']);

  for (let i = 0; i < 2; i++) {
    s.fireTimer = 0;
    update(s, STEP, { fire: true, aim: { x: 600, y: 250 } });
  }
  assert.equal(s.ammo, 0);
  assert.equal(s.shots, 3);

  s.fireTimer = 0;
  update(s, STEP, { fire: true, aim: { x: 600, y: 250 } });
  assert.equal(s.shots, 3);

  for (let i = 0; i < Math.ceil(s.buster.basic.ammoReload / STEP) + 2; i++) update(s, STEP);
  assert.equal(s.ammo, 1);
});

test('Volt ultimate is aimed and only damages segments inside its AOE', () => {
  const s = createGame();
  startGame(s);
  const visible = s.segments.filter(n => n.d >= 0);
  assert.ok(visible.length >= 2);
  const target = visible[0];
  const far = visible.find(n => Math.hypot(n.x - target.x, n.y - target.y) > s.buster.ultimate.radius + 20);
  assert.ok(far, 'test needs a segment outside the AOE');
  const farHp = far.hp;

  s.aim = { x: target.x, y: target.y };
  s.ultimateCharge = s.buster.ultimate.chargeMax;
  assert.equal(activateUltimate(s), true);
  assert.equal(far.hp, farHp);
  assert.ok(s.events.some(e => e.type === 'ultimate-zone' && e.radius === s.buster.ultimate.radius));
});

test('only basic damage charges Volt ultimate', () => {
  const s = createGame();
  startGame(s);
  const ids = s.segments.slice(0, 4).map(n => n.id);

  damage(s, ids[0], 10, 'ability');
  damage(s, ids[1], 10, 'ultimate');
  damage(s, ids[2], 10, 'explosion');
  assert.equal(s.ultimateCharge, 0);

  damage(s, ids[3], 10, 'basic-chain');
  assert.ok(s.ultimateCharge > 0);
});

test('clearing a sector preserves the run build and mutates Greenfang before the next encounter', () => {
  const s = createGame();
  startGame(s);
  s.ultimateCharge = 41;
  s.segments = [];
  update(s, STEP);

  assert.equal(s.phase, 'upgrade');
  assert.deepEqual(s.run.cleared, [1]);
  assert.equal(chooseUpgrade(s, 'power'), true);

  assert.equal(s.run.sector, 2);
  assert.equal(s.wave, 2);
  assert.equal(s.encounter.id, 'filter-hall');
  assert.ok(s.run.mutations.includes('plated-scales'));
  assert.equal(s.run.mutations.length, 1);
  assert.equal(s.ultimateCharge, 41, 'ultimate charge persists between sectors');
  assert.ok(s.buster.basic.damage > 11, 'Buster build persists between sectors');
  assert.equal(MUTATIONS[s.run.mutations[0]].name, 'Escamas blindadas');

  const config = getEncounterConfig(s);
  assert.ok(config.hpMultiplier > 1);
  assert.ok(config.armorEvery <= 4);
});

test('encounter history records the evolving expedition state', () => {
  const s = createGame();
  startGame(s);
  assert.equal(s.run.encounterHistory.length, 1);
  assert.deepEqual(s.run.encounterHistory[0].mutations, []);

  s.segments = [];
  update(s, STEP);
  chooseUpgrade(s, 'chain');

  assert.equal(s.run.encounterHistory.length, 2);
  assert.equal(s.run.encounterHistory[1].sector, 2);
  assert.deepEqual(s.run.encounterHistory[1].mutations, ['plated-scales']);
});

test('sector 2 branches into a safe or infested route with persistent consequences', () => {
  const safe = createGame();
  startGame(safe);
  safe.run.sector = 2;
  spawnSector(safe);
  safe.segments = [];
  update(safe, STEP);
  assert.equal(safe.phase, 'upgrade');
  assert.equal(chooseUpgrade(safe, safe.choices[0]), true);
  assert.equal(safe.phase, 'route');
  assert.deepEqual(safe.run.routeChoices, ['maintenance', 'infested-nest']);
  assert.equal(chooseRoute(safe, 'maintenance'), true);
  assert.equal(safe.run.sector, 3);
  assert.equal(safe.run.routeHistory[0].routeId, 'maintenance');
  assert.ok(getEncounterConfig(safe).speedMultiplier < 1);

  const risky = createGame();
  startGame(risky);
  risky.run.sector = 2;
  spawnSector(risky);
  risky.segments = [];
  update(risky, STEP);
  chooseUpgrade(risky, risky.choices[0]);
  assert.equal(chooseRoute(risky, 'infested-nest'), true);
  const riskyConfig = getEncounterConfig(risky);
  assert.ok(riskyConfig.segmentBonus >= 4);
  assert.ok(riskyConfig.hpMultiplier > 1);
  assert.equal(ROUTES['infested-nest'].salvage, 1);

  assert.equal(risky.objectives.length, 3);
  risky.encounterState.splitTriggered = true;
  risky.segments = [];
  risky.objectives = [];
  update(risky, STEP);
  assert.equal(risky.run.salvage, 1);
  assert.ok(risky.events.some(e => e.type === 'route-reward'));
});

test('Greenfang Alpha telegraphs venom and punishes a stationary Buster', () => {
  const s = createGame();
  s.run.sector = 5;
  spawnSector(s);
  startGame(s);
  let hit = false;
  for (let i = 0; i < 120 * 8 && s.phase === 'playing'; i++) {
    update(s, STEP);
    if (s.events.some(e => e.type === 'venom-hit')) { hit = true; break; }
  }
  assert.ok(s.events.some(e => e.type === 'venom-telegraph'));
  assert.equal(hit, true);
  assert.ok(s.playerDebuff > 0);
  assert.ok(s.ammo < s.buster.basic.ammoMax);
  assert.ok(s.abilityCooldown > 0);
});

test('Split branches isolate neighbor effects and Hunt can fail by escape', () => {
  const split = createGame();
  split.run.sector = 3;
  spawnSector(split);
  startGame(split);
  const lane0 = split.segments.filter(n => n.lane === 0);
  const lane1 = split.segments.filter(n => n.lane === 1);
  const victim = lane0[1];
  victim.type = 'volatile';
  victim.hp = 1;
  const otherLaneHp = lane1.map(n => n.hp);
  damage(split, victim.id, 999, 'basic');
  assert.deepEqual(lane1.map(n => n.hp), otherLaneHp);

  const hunt = createGame();
  hunt.run.sector = 4;
  spawnSector(hunt);
  startGame(hunt);
  for (let i = 0; i < 120 * 35 && hunt.phase === 'playing'; i++) update(hunt, STEP);
  assert.equal(hunt.phase, 'lost');
  assert.ok(hunt.events.some(e => e.type === 'hunt-escaped'));
});

test('Toxic Sewers sectors have distinct runtime rules', () => {
  const pressure = createGame();
  pressure.run.sector = 2;
  spawnSector(pressure);
  startGame(pressure);
  const armorBefore = pressure.segments.filter(n => n.type === 'armor').length;
  for (let i = 0; i < 120 * 8.2 && pressure.phase === 'playing'; i++) update(pressure, STEP);
  assert.ok(pressure.segments.filter(n => n.type === 'armor').length > armorBefore);
  assert.ok(pressure.events.some(e => e.type === 'reinforce'));

  const split = createGame();
  split.run.sector = 3;
  spawnSector(split);
  startGame(split);
  assert.equal(split.encounterState.splitLanes, 2);
  assert.equal(split.encounterState.laneHeads.length, 2);
  assert.deepEqual([...new Set(split.segments.map(n => n.lane))].sort(), [0, 1]);
  const headsBefore = [...split.encounterState.laneHeads];
  for (let i = 0; i < 120; i++) update(split, STEP);
  assert.ok(split.encounterState.laneHeads[0] > headsBefore[0]);
  assert.ok(split.encounterState.laneHeads[1] > headsBefore[1]);
  const lane0 = split.segments.find(n => n.lane === 0 && n.d >= 0);
  const lane1 = split.segments.find(n => n.lane === 1 && n.d >= 0);
  assert.ok(lane0 && lane1);
  assert.notEqual(Math.round(lane0.y), Math.round(lane1.y));

  const hunt = createGame();
  hunt.run.sector = 4;
  spawnSector(hunt);
  startGame(hunt);
  assert.ok(hunt.encounterState.huntTarget > 0);
  assert.ok(hunt.encounterState.huntTimer > 0);
  while (hunt.phase === 'playing' && hunt.segments.length) {
    damage(hunt, hunt.segments[0].id, 180, 'ability');
  }
  assert.equal(hunt.phase, 'upgrade');
  assert.ok(hunt.events.some(e => e.type === 'hunt-complete'));

  const alpha = createGame();
  alpha.run.sector = 5;
  spawnSector(alpha);
  startGame(alpha);
  alpha.segments = alpha.segments.slice(0, Math.floor(alpha.encounterState.initialSegments * .6));
  placeSegments(alpha);
  update(alpha, STEP);
  assert.equal(alpha.encounterState.alphaPhase, 1);
  assert.ok(alpha.events.some(e => e.type === 'alpha-phase' && e.phase === 1));
});

test('a repeatable aiming strategy can finish all five sectors with each offer column', () => {
  for (const column of [0, 1, 2]) {
    const s = createGame();
    startGame(s);

    for (let tick = 0; tick < 120 * 300 && !['won', 'lost'].includes(s.phase); tick++) {
      if (s.phase === 'upgrade') chooseUpgrade(s, s.choices[column]);
      if (s.phase === 'route') chooseRoute(s, column === 1 ? 'infested-nest' : 'maintenance');
      const segmentTarget = s.segments.filter(n => n.d >= 0).sort((a, b) => b.y - a.y || a.hp - b.hp)[0];
      const target = segmentTarget || s.objectives[0];

      if (target) {
        s.aim = { x: target.x, y: target.y };
        if (segmentTarget && s.abilityCooldown === 0) activateAbility(s);
        if (segmentTarget && s.ultimateCharge >= s.buster.ultimate.chargeMax) activateUltimate(s);
        update(s, STEP, {
          aim: s.aim,
          fire: true,
          x: Math.abs(target.x - s.player.x) > 5 ? Math.sign(target.x - s.player.x) : 0,
        });
      } else {
        update(s, STEP);
      }
      s.events = [];
    }

    assert.equal(s.phase, 'won', `offer column ${column}`);
    assert.equal(s.run.cleared.length, 5);
    assert.ok(s.kills > 70);
    assert.ok(s.score > 0);
    assert.ok(s.time < 300);
  }
});
