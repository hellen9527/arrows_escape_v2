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
  assert.equal(r.hintCandidate, 1);
  assert.equal(r.hintStage, 1);
  assert.equal(r.hint, null);
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
  assert.equal(p.contentRevision, 5);
  assert.equal(p.unlocked, 1);
  assert.deepEqual(p.previousBest, best);
  assert.deepEqual(p.best, {});
  assert.deepEqual(p.run, newRun(1));
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

void test('revision2 migration merges historical and recent best scores and resets obsolete attempts', () => {
  const old = {
    ...defaultProgress('challenge'),
    contentRevision: 2,
    previousBest: { 1: 3, 2: 1, 7: 2, 99: 3 },
    best: { 1: 2, 2: 3, 4: 2, 5: 8 },
    unlocked: 30,
    run: { level: 8, removed: [999, 2], mistakes: 2, hints: 2, hint: 2 },
    sound: false,
    reducedMotion: true,
    language: 'en',
  };
  const migrated = restoreProgress(JSON.stringify(old), 'challenge');
  assert.equal(migrated.contentRevision, 5);
  assert.deepEqual(migrated.previousBest, { 1: 3, 2: 3, 4: 2, 7: 2 });
  assert.deepEqual(migrated.best, {});
  assert.equal(migrated.unlocked, 1);
  assert.deepEqual(migrated.run, newRun(1));
  assert.equal(migrated.showRevisionIntro, true);
  assert.equal(migrated.sound, false);
  assert.equal(migrated.reducedMotion, true);
  assert.equal(migrated.language, 'en');
  assert.deepEqual(
    restoreProgress(JSON.stringify(migrated), 'challenge'),
    migrated,
  );
});

void test('known challenge revisions migrate and unknown revisions cannot be reinterpreted', () => {
  for (const contentRevision of [undefined, 1, 2, 3]) {
    const old = {
      ...defaultProgress('challenge'),
      contentRevision,
      previousBest: { 1: 3 },
      best: { 2: 2 },
    };
    const restored = restoreProgress(JSON.stringify(old), 'challenge');
    assert.equal(restored.contentRevision, 5);
    assert.deepEqual(restored.previousBest, { 1: 3, 2: 2 });
    assert.equal(restored.unlocked, 1);
  }
  for (const contentRevision of [0, 6, 999, '3', null]) {
    const unknown = {
      ...defaultProgress('challenge'),
      contentRevision,
      best: { 1: 3 },
      sound: false,
    };
    assert.deepEqual(
      restoreProgress(JSON.stringify(unknown), 'challenge'),
      defaultProgress('challenge'),
    );
  }
});
