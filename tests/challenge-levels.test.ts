import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  blockers,
  direction,
  requiredArrowIds,
  act,
  newRun,
  isComplete,
  type Level,
} from '../lib/game/engine.ts';
import {
  challengeLevel,
  challengeInfo,
  CHALLENGE_COUNT,
} from '../lib/game/challenge-levels.ts';
import { tutorialLevel } from '../lib/game/tutorials.ts';
const briefs = JSON.parse(
  readFileSync(
    new URL('../docs/level-design-300/v5-catalog.json', import.meta.url),
    'utf8',
  ),
).levels;

void test('300 stable formal boards, eight separate tutorials and bilingual labels', () => {
  assert.equal(CHALLENGE_COUNT, 300);
  const signatures = new Set<string>();
  for (let id = 1; id <= 300; id++) {
    const l = challengeLevel(id);
    assert.deepEqual(l, challengeLevel(id));
    assert.equal(l.id, id);
    signatures.add(JSON.stringify(l.arrows));
    assert.ok(challengeInfo(id).title.every(Boolean));
    assert.ok(challengeInfo(id).focus.every(Boolean));
    assert.equal(l.objective?.targets.length || 0, briefs[id - 1].targetCount);
    const [min, max] = briefs[id - 1].candidateArrowRange;
    assert.ok(
      l.arrows.length >= min && l.arrows.length <= max,
      `C${id} arrow range`,
    );
    assert.equal(
      l.arrows.filter((a) => a.key).length,
      briefs[id - 1].keyGroups,
    );
  }
  assert.equal(signatures.size, 300);
  assert.equal(challengeLevel(999).id, 300);
  assert.equal(challengeLevel(NaN).id, 1);
  for (let id = 1; id <= 8; id++) {
    const l = tutorialLevel(id);
    assert.equal(l.tutorial, true);
    assert.equal(l.arrows.length, [6, 10, 14, 18, 20, 22, 24, 26][id - 1]);
  }
});
function inspect(l: Level) {
  const tag = `${l.tutorial ? 'T' : 'C'}${l.id}`,
    cells = new Set<string>();
  assert.ok(l.size <= 70, tag);
  for (const a of l.arrows) {
    const [dx, dy] = direction(a),
      [hx, hy] = a.points.at(-1)!;
    assert.ok(a.points.length >= 2, tag);
    a.points.forEach(([x, y], i) => {
      assert.ok(
        Number.isInteger(x) &&
          Number.isInteger(y) &&
          x >= 0 &&
          y >= 0 &&
          x < l.size &&
          y < l.size,
        tag,
      );
      assert.ok(!cells.has(`${x},${y}`), `overlap ${tag}`);
      cells.add(`${x},${y}`);
      assert.ok(
        !(dx ? y === hy && (x - hx) * dx > 0 : x === hx && (y - hy) * dy > 0),
        `self ray ${tag}`,
      );
      if (i)
        assert.equal(
          Math.abs(x - a.points[i - 1][0]) + Math.abs(y - a.points[i - 1][1]),
          1,
          tag,
        );
    });
    if (a.lock)
      assert.equal(
        l.arrows.filter((k) => k.key === a.lock).length,
        1,
        `unique key ${tag}`,
      );
  }
  let full = newRun(l.id);
  const clear = { ...l, objective: undefined };
  for (let step = 0; step < l.arrows.length; step++) {
    const a = l.arrows.find(
      (a) =>
        !full.removed.includes(a.id) &&
        !blockers(clear, full.removed, a.id).length,
    );
    assert.ok(a, `full solution stalled ${tag}/${step}`);
    full = act(clear, full, { type: 'tap', id: a.id });
  }
  assert.ok(isComplete(clear, full), tag);
  const required = requiredArrowIds(l),
    need = new Set(required);
  let run = newRun(l.id);
  for (let step = 0; step < required.length; step++) {
    assert.ok(!isComplete(l, run), `no redundant required tail ${tag}`);
    const id = required.find(
      (id) => !run.removed.includes(id) && !blockers(l, run.removed, id).length,
    );
    assert.notEqual(id, undefined, `target solution stalled ${tag}/${step}`);
    run = act(l, run, { type: 'tap', id: id! });
  }
  assert.ok(isComplete(l, run), `rescue solution ${tag}`);
  assert.equal(run.mistakes, 0, tag);
  if (l.objective) {
    assert.equal(
      l.objective.moves,
      required.length +
        (l.tutorial
          ? l.id === 6
            ? 4
            : 3
          : briefs[l.id - 1].candidateMoveSlack),
      `budget ${tag}`,
    );
    assert.ok(required.length < l.arrows.length, tag);
    assert.ok(
      l.arrows.filter((a) => a.key).every((a) => need.has(a.id)),
      `necessary keys ${tag}`,
    );
  }
}
void test('every formal and practice board has disjoint unit paths, a full solution and exact target budget', () => {
  for (let id = 1; id <= 300; id++) inspect(challengeLevel(id));
  for (let id = 1; id <= 8; id++) inspect(tutorialLevel(id));
});
void test('relief keeps chapter mechanisms, count floor, and more move tolerance', () => {
  for (let i = 1; i < briefs.length; i++)
    if (briefs[i].designIntent === 'relief') {
      const l = challengeLevel(i + 1),
        prev = challengeLevel(i);
      assert.ok(
        l.arrows.length >= prev.arrows.length * 0.8,
        `arrow continuity ${i + 1}`,
      );
      assert.ok(
        (l.objective?.targets.length || 0) >=
          (prev.objective?.targets.length || 0),
        `targets ${i + 1}`,
      );
      assert.ok(
        l.arrows.filter((a) => a.key).length >=
          prev.arrows.filter((a) => a.key).length,
        `keys ${i + 1}`,
      );
      if (l.objective)
        assert.equal(l.objective.moves - requiredArrowIds(l).length, 4);
    }
});
