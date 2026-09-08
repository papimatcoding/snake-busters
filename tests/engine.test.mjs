import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, startGame, update, damage, activateAbility, activateUltimate,
  chooseUpgrade, placeSegments, pathAt, PATH_LENGTH, segmentCircleHit, STEP,
  getEncounterConfig, MUTATIONS,
} from '../dist/engine.js';

test('the track is continuous across each straight/curve junction and reaches the core', () => {
  for (const d of [900, 900 + Math.PI * 100, 1800 + Math.PI * 100, 1800 + Math.PI * 200]) {
    const a = pathAt(d - .001), b = pathAt(d + .001);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .003);
  }
  const end = pathAt(PATH_LENGTH);
  assert.ok(Math.abs(end.x - 1120) < 1e-9);
  assert.equal(end.y, 530);
  assert.equal(end.a, 0);
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
  assert.ok(s.head >= PATH_LENGTH);

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
  assert.equal(s.buster.ability.name, 'Sobrecarga');
  assert.equal(s.buster.ultimate.chargeMax, 100);

  const armor = s.segments.find(n => n.type === 'armor');
  const hp = armor.hp;
  damage(s, armor.id, 20, 'shot');
  assert.equal(armor.hp, hp - 15);
  assert.ok(s.ultimateCharge > 0, 'dealing damage should charge the ultimate');

  assert.equal(activateAbility(s), true);
  const after = s.segments.map(n => n.hp);
  assert.equal(activateAbility(s), false);
  assert.deepEqual(s.segments.map(n => n.hp), after);
  assert.equal(s.abilityCooldown, s.buster.ability.cooldown);

  s.ultimateCharge = s.buster.ultimate.chargeMax;
  assert.equal(activateUltimate(s), true);
  assert.equal(s.ultimateCharge, 0);
  assert.ok(s.events.some(e => e.type === 'ultimate'));
  assert.equal(activateUltimate(s), false);
});

test('Volt has three rechargeable ammo charges and cannot fire while empty', () => {
  const s = createGame();
  startGame(s);
  assert.equal(s.ammo, 3);

  for (let i = 0; i < 3; i++) {
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
  assert.ok(s.buster.basic.damage > 24, 'Buster build persists between sectors');
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

test('a repeatable aiming strategy can finish all five sectors with each offer column', () => {
  for (const column of [0, 1, 2]) {
    const s = createGame();
    startGame(s);

    for (let tick = 0; tick < 120 * 300 && !['won', 'lost'].includes(s.phase); tick++) {
      if (s.phase === 'upgrade') chooseUpgrade(s, s.choices[column]);
      const target = s.segments.filter(n => n.d >= 0).sort((a, b) => b.y - a.y || a.hp - b.hp)[0];

      if (target) {
        s.aim = { x: target.x, y: target.y };
        if (s.abilityCooldown === 0) activateAbility(s);
        if (s.ultimateCharge >= s.buster.ultimate.chargeMax) activateUltimate(s);
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
    assert.ok(s.kills > 80);
    assert.ok(s.score > 0);
    assert.ok(s.time < 300);
  }
});
