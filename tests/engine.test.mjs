import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, update, damage, activateAbility, chooseUpgrade, placeSegments, pathAt, PATH_LENGTH, segmentCircleHit, STEP } from '../dist/engine.js';

test('the track is continuous across each straight/curve junction and reaches the core', () => {
  for (const d of [900, 900 + Math.PI * 100, 1800 + Math.PI * 100, 1800 + Math.PI * 200]) {
    const a = pathAt(d - .001), b = pathAt(d + .001);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .003);
  }
  const end = pathAt(PATH_LENGTH);
  assert.ok(Math.abs(end.x - 1120) < 1e-9); assert.equal(end.y, 530); assert.equal(end.a, 0);
});
test('swept collision detects a fast bullet crossing a segment and rejects a near miss', () => {
  assert.ok(segmentCircleHit(0, 0, 100, 0, 50, 0, 20) > 0);
  assert.equal(segmentCircleHit(0, 0, 100, 0, 50, 21, 20), null);
  assert.equal(segmentCircleHit(50, 0, 50, 0, 50, 0, 20), 0);
});
test('a volatile kill chains once per victim and pushes the snake back', () => {
  const s = createGame(); startGame(s);
  s.segments = s.segments.slice(1, 4);
  s.segments.forEach(n => { n.hp = 1; n.type = 'volatile'; }); placeSegments(s);
  const before = s.head;
  damage(s, s.segments[1].id, 100);
  assert.equal(s.segments.length, 0); assert.equal(s.kills, 3); assert.equal(s.maxCombo, 3);
  assert.ok(s.head < before); assert.equal(s.events.filter(e => e.type === 'break').length, 3);
});
test('an idle player loses; pause does not advance the snake or cooldown', () => {
  const s = createGame(); startGame(s);
  for (let i = 0; i < 120 * 90 && s.phase === 'playing'; i++) { update(s, STEP); s.events = []; }
  assert.equal(s.phase, 'lost'); assert.ok(s.head >= PATH_LENGTH);
  const paused = createGame(); paused.phase = 'paused'; paused.cooldown = 5;
  const before = JSON.stringify(paused); update(paused, .05, { fire: true, x: 1 });
  assert.equal(JSON.stringify(paused), before);
});
test('the ability respects cooldown and armor takes reduced direct damage', () => {
  const s = createGame(); startGame(s);
  const armor = s.segments.find(n => n.type === 'armor'), hp = armor.hp;
  damage(s, armor.id, 20, 'shot'); assert.equal(armor.hp, hp - 15);
  assert.equal(activateAbility(s), true); const after = s.segments.map(n => n.hp);
  assert.equal(activateAbility(s), false); assert.deepEqual(s.segments.map(n => n.hp), after);
  assert.equal(s.cooldown, s.stats.cooldown);
});
test('upgrade selection is restricted to offers; a new game resets all upgrades', () => {
  const s = createGame(); startGame(s);
  s.segments = []; update(s, STEP);
  assert.equal(s.phase, 'upgrade'); assert.equal(chooseUpgrade(s, 'rapid'), false);
  assert.equal(chooseUpgrade(s, 'power'), true); assert.equal(s.wave, 2);
  assert.ok(s.stats.damage > 14); assert.equal(s.phase, 'playing');
  const fresh = createGame(); assert.equal(fresh.stats.damage, 14); assert.deepEqual(fresh.upgrades, []);
});
test('a repeatable aiming strategy can finish all five waves with each offer column', () => {
  for (const column of [0, 1, 2]) {
    const s = createGame(); startGame(s);
    for (let tick = 0; tick < 120 * 240 && !['won', 'lost'].includes(s.phase); tick++) {
      if (s.phase === 'upgrade') chooseUpgrade(s, s.choices[column]);
      const target = s.segments.filter(n => n.d >= 0).sort((a, b) => b.y - a.y || a.hp - b.hp)[0];
      if (target) {
        s.aim = { x: target.x, y: target.y }; if (s.cooldown === 0) activateAbility(s);
        update(s, STEP, { aim: s.aim, fire: true, x: Math.abs(target.x - s.player.x) > 5 ? Math.sign(target.x - s.player.x) : 0 });
      } else update(s, STEP);
      s.events = [];
    }
    assert.equal(s.phase, 'won', `offer column ${column}`); assert.equal(s.kills, 90);
    assert.ok(s.score > 0); assert.ok(s.time < 240);
  }
});
