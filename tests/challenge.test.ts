import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  newRun,
  defaultProgress,
  restoreProgress,
  finishLevel,
} from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';

const puzzle = {
  id: 4,
  campaign: 'challenge' as const,
  size: 6,
  arrows: [
    {
      id: 0,
      points: [
        [0, 2],
        [1, 2],
      ],
    },
    {
      id: 1,
      points: [
        [3, 3],
        [3, 2],
        [3, 1],
      ],
    },
    {
      id: 2,
      points: [
        [1, 4],
        [0, 4],
      ],
    },
  ],
};

void test('third error ends a challenge attempt and cannot be bypassed by undo, hint or tap', () => {
  let r = newRun(4);
  for (let i = 0; i < 3; i++) r = act(puzzle, r, { type: 'tap', id: 0 });
  assert.equal(r.mistakes, 3);
  for (const action of [
    { type: 'tap', id: 1 },
    { type: 'hint' },
    { type: 'undo' },
  ] as const)
    assert.deepEqual(act(puzzle, r, action), r);
  assert.equal(
    act(puzzle, newRun(4), { type: 'tap', id: 1 }).removed.length,
    1,
  );
});
void test('tutorials and classic keep unlimited errors', () => {
  for (const l of [
    { ...puzzle, id: 3, tutorial: true },
    { ...puzzle, campaign: 'classic' as const },
  ]) {
    let r = newRun(l.id);
    for (let i = 0; i < 5; i++) r = act(l, r, { type: 'tap', id: 0 });
    assert.equal(act(l, r, { type: 'tap', id: 1 }).removed.length, 1);
  }
});
void test('challenge grants two hints per attempt; undo does not replenish hints or errors', () => {
  let r = act(puzzle, newRun(4), { type: 'tap', id: 0 });
  for (let i = 0; i < 2; i++) {
    r = act(puzzle, r, { type: 'hint' });
    assert.equal(r.hints, i + 1);
    assert.equal(act(puzzle, r, { type: 'hint' }).hints, i + 1);
    assert.equal(r.hintStage, 1);
    r = act(puzzle, r, { type: 'hint' });
    assert.equal(r.hintStage, 2);
    assert.equal(r.hint, null);
    r = act(puzzle, r, { type: 'hint' });
    assert.equal(r.hintStage, 3);
    assert.notEqual(r.hint, null);
    r = act(puzzle, r, { type: 'tap', id: r.hint! });
    r = act(puzzle, r, { type: 'undo' });
  }
  assert.equal(r.mistakes, 1);
  assert.equal(act(puzzle, r, { type: 'hint' }).hints, 2);
});
void test('new challenge progress is separate from old classic saves', () => {
  const classic = defaultProgress();
  classic.best = { 1: 3, 2: 2, 30: 3 };
  classic.unlocked = 31;
  classic.run = newRun(30);
  const legacy = JSON.parse(JSON.stringify(classic));
  delete legacy.campaign;
  const recovered = restoreProgress(JSON.stringify(legacy));
  assert.equal(recovered.unlocked, 31);
  assert.deepEqual(recovered.best, classic.best);
  const challenge = restoreProgress(JSON.stringify(legacy), 'challenge');
  assert.equal(challenge.campaign, 'challenge');
  assert.deepEqual(challenge.best, {});
  assert.equal(challenge.run.level, 1);
});
void test('challenge failure and hint budget survive reload without unlocking next level', () => {
  const p = defaultProgress('challenge');
  p.best = { 1: 3, 2: 3, 3: 3 };
  p.unlocked = 4;
  p.run = { ...newRun(4), mistakes: 3, hints: 2 };
  const restored = restoreProgress(JSON.stringify(p), 'challenge');
  assert.deepEqual(restored, p);
  const l = makeLevel(4, 'challenge');
  assert.deepEqual(act(l, restored.run, { type: 'hint' }), p.run);
  assert.equal(finishLevel(restored).unlocked, 4);
});
