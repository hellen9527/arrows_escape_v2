import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  blockers,
  newRun,
  restoreProgress,
  defaultProgress,
} from '../lib/game/engine.ts';

const level = {
  id: 5,
  campaign: 'challenge' as const,
  size: 8,
  arrows: [
    {
      id: 0,
      lock: 'A',
      points: [
        [0, 2],
        [1, 2],
      ],
    },
    {
      id: 1,
      key: 'A',
      points: [
        [3, 5],
        [3, 4],
        [3, 3],
      ],
    },
    {
      id: 2,
      points: [
        [2, 6],
        [1, 6],
      ],
    },
  ],
};
void test('a visible lock blocks a geometrically clear arrow until its key leaves', () => {
  assert.deepEqual(blockers(level, [], 0), [1]);
  assert.deepEqual(blockers(level, [1], 0), []);
  assert.deepEqual(
    act(level, newRun(5), { type: 'tap', id: 0 }),
    newRun(5),
    'inspecting a visible lock is not a mistake',
  );
  let r = act(level, newRun(5), { type: 'tap', id: 1 });
  assert.deepEqual(act(level, r, { type: 'tap', id: 0 }).removed, [1, 0]);
  r = act(level, r, { type: 'undo' });
  assert.deepEqual(
    blockers(level, r.removed, 0),
    [1],
    'undoing a key relocks its group',
  );
});
void test('hints respect locks and prefer the key opening a group', () => {
  const r = act(level, newRun(5), { type: 'hint' });
  assert.equal(r.hint, 1);
  assert.equal(r.hints, 1);
});
void test('old challenge progress migrates without reusing any old arrow ids or awarding new stars', () => {
  const best = Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => [i + 1, 3]),
  );
  const old = {
    version: 1,
    campaign: 'challenge',
    unlocked: 21,
    best,
    run: { level: 21, removed: [999, 2, 1], mistakes: 2, hints: 1, hint: 1 },
    sound: false,
    reducedMotion: true,
    language: 'en',
  };
  const p = restoreProgress(JSON.stringify(old), 'challenge');
  assert.equal(p.contentRevision, 2);
  assert.equal(p.unlocked, 21);
  assert.deepEqual(p.previousBest, best);
  assert.deepEqual(p.best, {});
  assert.deepEqual(p.run, newRun(21));
  assert.equal(p.showRevisionIntro, true);
  assert.equal(p.language, 'en');
  assert.equal(p.sound, false);
  assert.equal(p.reducedMotion, true);
  assert.deepEqual(restoreProgress(JSON.stringify(p), 'challenge'), p);
});
void test('fresh challenge saves and classic saves do not trigger migration', () => {
  const fresh = defaultProgress('challenge');
  assert.equal(fresh.showRevisionIntro, false);
  assert.deepEqual(restoreProgress(JSON.stringify(fresh), 'challenge'), fresh);
  const classic = defaultProgress();
  classic.best = { 1: 3 };
  classic.unlocked = 2;
  classic.run = newRun(2);
  assert.deepEqual(restoreProgress(JSON.stringify(classic)), classic);
});
