import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockers,
  newRun,
  act,
  stars,
  restoreProgress,
  defaultProgress,
  finishLevel,
} from '../lib/game/engine.ts';
import { makeLevel, LEVEL_COUNT } from '../lib/game/levels.ts';

const level = {
  id: 1,
  size: 7,
  arrows: [
    {
      id: 0,
      points: [
        [1, 3],
        [2, 3],
      ],
    },
    {
      id: 1,
      points: [
        [4, 4],
        [4, 3],
        [4, 2],
      ],
    },
    {
      id: 2,
      points: [
        [2, 5],
        [1, 5],
      ],
    },
    {
      id: 3,
      points: [
        [5, 4],
        [5, 5],
      ],
    },
  ],
};

void test('head ray catches a crossing body and accepts all four clear directions', () => {
  assert.deepEqual(blockers(level, [], 0), [1]);
  for (const id of [1, 2, 3]) assert.deepEqual(blockers(level, [], id), []);
  assert.deepEqual(blockers(level, [1], 0), []);
});
void test('blocked taps cost accuracy but never remove arrows; duplicate taps are ignored', () => {
  const r = act(level, newRun(1), { type: 'tap', id: 0 });
  assert.equal(r.mistakes, 1);
  assert.deepEqual(r.removed, []);
  const clear = act(level, r, { type: 'tap', id: 1 });
  assert.deepEqual(clear.removed, [1]);
  assert.deepEqual(act(level, clear, { type: 'tap', id: 1 }), clear);
  assert.deepEqual(act(level, clear, { type: 'tap', id: 900 }), clear);
});
void test('undo restores the previous arrow, preserving mistakes and hint use', () => {
  let r = act(level, newRun(1), { type: 'hint' });
  assert.equal(r.hints, 1);
  assert.ok(r.hint !== null);
  assert.equal(blockers(level, r.removed, r.hint!).length, 0);
  r = act(level, r, { type: 'tap', id: r.hint! });
  r = act(level, r, { type: 'undo' });
  assert.equal(r.removed.length, 0);
  assert.equal(r.hints, 1);
  assert.equal(stars(r), 2);
  assert.equal(stars({ ...r, hints: 0, mistakes: 0 }), 3);
  assert.equal(stars({ ...r, mistakes: 9 }), 1);
});
void test('every shipped level has continuous disjoint paths and can be solved completely', () => {
  const signatures = new Set();
  for (let id = 1; id <= LEVEL_COUNT; id++) {
    const l = makeLevel(id);
    const cells = new Set();
    assert.ok(l.arrows.length >= 5, `level ${id} must contain a puzzle`);
    signatures.add(JSON.stringify(l.arrows));
    for (const a of l.arrows) {
      assert.ok(a.points.length >= 2);
      a.points.forEach(([x, y], i) => {
        assert.ok(x >= 0 && y >= 0 && x < l.size && y < l.size);
        const key = `${x},${y}`;
        assert.ok(!cells.has(key), `overlap in ${id}`);
        cells.add(key);
        if (i)
          assert.equal(
            Math.abs(x - a.points[i - 1][0]) + Math.abs(y - a.points[i - 1][1]),
            1,
          );
      });
    }
    let run = newRun(id);
    for (let n = 0; n < l.arrows.length; n++) {
      const free = l.arrows.find(
        (a) =>
          !run.removed.includes(a.id) &&
          blockers(l, run.removed, a.id).length === 0,
      );
      assert.ok(free, `deadlock level ${id} at ${n}`);
      run = act(l, run, { type: 'tap', id: free.id });
    }
    assert.equal(run.removed.length, l.arrows.length);
    assert.equal(stars(run), 3);
  }
  assert.equal(signatures.size, LEVEL_COUNT);
});
void test('save recovery rejects corruption and impossible move histories', () => {
  assert.deepEqual(restoreProgress('broken'), defaultProgress());
  assert.deepEqual(restoreProgress('{"version":999}'), defaultProgress());
  const p = defaultProgress();
  assert.deepEqual(restoreProgress(JSON.stringify(p)), p);
  p.run.removed = [999];
  assert.deepEqual(restoreProgress(JSON.stringify(p)).run.removed, []);
});
void test('valid mid-level progress and preferences survive reload; completion unlocks the next level', () => {
  let p = defaultProgress();
  const l = makeLevel(1);
  p.sound = false;
  p.language = 'en';
  p.run = act(l, p.run, { type: 'hint' });
  p.run = act(l, p.run, { type: 'tap', id: p.run.hint! });
  assert.deepEqual(restoreProgress(JSON.stringify(p)), p);
  while (p.run.removed.length < l.arrows.length) {
    const free = l.arrows.find(
      (a) =>
        !p.run.removed.includes(a.id) &&
        !blockers(l, p.run.removed, a.id).length,
    )!;
    p.run = act(l, p.run, { type: 'tap', id: free.id });
  }
  p = finishLevel(p);
  assert.equal(p.unlocked, 2);
  assert.equal(p.best[1], 2);
  assert.deepEqual(restoreProgress(JSON.stringify(p)), p);
});
