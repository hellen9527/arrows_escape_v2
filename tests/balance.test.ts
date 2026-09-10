import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  blockers,
  defaultProgress,
  failureReason,
  isComplete,
  newRun,
  requiredArrowIds,
  restoreProgress,
} from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';
import {
  BALANCE_REVISION,
  REBALANCED_LEVELS,
} from '../lib/game/challenge-balance.ts';

function activeRun(id: number) {
  const level = makeLevel(id, 'challenge');
  let run = act(level, newRun(id), { type: 'hint' });
  assert.notEqual(run.hint, null);
  run = act(level, run, { type: 'tap', id: run.hint! });
  run = act(level, run, { type: 'hint' });
  assert.equal(run.hints, 2);
  assert.notEqual(run.hint, null);
  return { ...run, mistakes: 1 };
}

function completeRun(id: number) {
  const level = makeLevel(id, 'challenge');
  let run = newRun(id);
  while (!isComplete(level, run)) {
    const free = requiredArrowIds(level, run.removed).find(
      (arrow) => !blockers(level, run.removed, arrow).length,
    );
    assert.notEqual(free, undefined);
    const next = act(level, run, { type: 'tap', id: free! });
    assert.notEqual(next, run, 'a required solution must remain playable');
    run = next;
  }
  return run;
}

void test('fresh progress records the balance revision without a notice', () => {
  for (const campaign of ['classic', 'challenge'] as const) {
    const progress = defaultProgress(campaign);
    assert.equal(
      progress.balanceRevision,
      campaign === 'challenge' ? BALANCE_REVISION : 0,
    );
    assert.equal(progress.showBalanceNotice, false);
    assert.deepEqual(
      restoreProgress(JSON.stringify(progress), campaign),
      progress,
    );
  }
});

void test('an older v3 balance resets only the changed attempt and retains validated achievements and preferences', () => {
  assert.ok(REBALANCED_LEVELS.includes(14));
  for (const balanceRevision of [undefined, BALANCE_REVISION - 1]) {
    const old = {
      ...defaultProgress('challenge'),
      balanceRevision,
      best: { 1: 3, 13: 2, 5: 7, 99: 3 },
      previousBest: { 3: 2, 20: 1, 0: 3 },
      unlocked: 30,
      run: activeRun(14),
      sound: false,
      reducedMotion: true,
      language: 'en',
    };
    const restored = restoreProgress(JSON.stringify(old), 'challenge');
    assert.deepEqual(restored.run, newRun(14));
    assert.deepEqual(restored.best, { 1: 3, 13: 2 });
    assert.deepEqual(restored.previousBest, { 3: 2, 20: 1 });
    assert.equal(restored.unlocked, 21);
    assert.equal(restored.contentRevision, 3);
    assert.equal(restored.balanceRevision, BALANCE_REVISION);
    assert.equal(restored.showBalanceNotice, true);
    assert.equal(restored.showRevisionIntro, false);
    assert.equal(restored.sound, false);
    assert.equal(restored.reducedMotion, true);
    assert.equal(restored.language, 'en');
  }
});

void test('old changed-board ids cannot award a completion even if they form a valid new solution', () => {
  const old = {
    ...defaultProgress('challenge'),
    balanceRevision: undefined,
    best: { 13: 3 },
    unlocked: 14,
    run: completeRun(14),
  };
  const restored = restoreProgress(JSON.stringify(old), 'challenge');
  assert.deepEqual(restored.best, old.best);
  assert.equal(restored.unlocked, 14);
  assert.deepEqual(restored.run, newRun(14));
  assert.equal(restored.showBalanceNotice, true);
});

for (const balanceRevision of [
  null,
  '0',
  String(BALANCE_REVISION),
  BALANCE_REVISION - 0.5,
  BALANCE_REVISION + 1,
]) {
  void test(`incompatible balance revision ${JSON.stringify(balanceRevision)} cannot award changed-board completion`, () => {
    const old = {
      ...defaultProgress('challenge'),
      balanceRevision,
      best: { 13: 3 },
      previousBest: { 8: 2 },
      unlocked: 14,
      run: completeRun(14),
      sound: false,
      reducedMotion: true,
      language: 'en',
    };
    const restored = restoreProgress(JSON.stringify(old), 'challenge');
    assert.deepEqual(restored.best, old.best);
    assert.deepEqual(restored.previousBest, old.previousBest);
    assert.equal(restored.unlocked, 14);
    assert.deepEqual(restored.run, newRun(14));
    assert.equal(restored.balanceRevision, BALANCE_REVISION);
    assert.equal(restored.showBalanceNotice, true);
    assert.equal(restored.sound, false);
    assert.equal(restored.reducedMotion, true);
    assert.equal(restored.language, 'en');
  });
}

void test('an unchanged v3 board continues its moves, mistakes and active hint', () => {
  assert.ok(!REBALANCED_LEVELS.includes(4));
  const old = {
    ...defaultProgress('challenge'),
    balanceRevision: undefined,
    best: { 3: 3 },
    unlocked: 4,
    run: activeRun(4),
  };
  const restored = restoreProgress(JSON.stringify(old), 'challenge');
  assert.deepEqual(restored.run, old.run);
  assert.deepEqual(restored, {
    ...old,
    balanceRevision: BALANCE_REVISION,
    showBalanceNotice: false,
  });
});

void test('a current-balance failed run stays failed and cannot replenish hints on reload', () => {
  assert.ok(REBALANCED_LEVELS.includes(6));
  const level = makeLevel(6, 'challenge');
  const progress = {
    ...defaultProgress('challenge'),
    balanceRevision: BALANCE_REVISION,
    best: { 5: 3 },
    unlocked: 6,
    run: { ...activeRun(6), mistakes: 3, hint: null },
  };
  assert.equal(failureReason(level, progress.run), 'hearts');
  const restored = restoreProgress(JSON.stringify(progress), 'challenge');
  assert.deepEqual(restored, progress);
  assert.equal(failureReason(level, restored.run), 'hearts');
  for (const action of [{ type: 'hint' }, { type: 'undo' }] as const)
    assert.equal(act(level, restored.run, action), restored.run);
});

void test('a current-balance attempt with no moves left stays failed on reload', () => {
  const level = makeLevel(4, 'challenge');
  assert.ok(level.objective);
  let run = newRun(4);
  while (!failureReason(level, run)) {
    const free = level.arrows.find(
      (arrow) =>
        !level.objective!.targets.includes(arrow.id) &&
        !run.removed.includes(arrow.id) &&
        !blockers(level, run.removed, arrow.id).length,
    );
    assert.ok(free, 'non-target moves must be able to exhaust the budget');
    run = act(level, run, { type: 'tap', id: free.id });
  }
  const progress = {
    ...defaultProgress('challenge'),
    best: { 3: 3 },
    unlocked: 4,
    run: { ...run, mistakes: 1, hints: 2 },
  };
  assert.equal(failureReason(level, progress.run), 'moves');
  const restored = restoreProgress(JSON.stringify(progress), 'challenge');
  assert.deepEqual(restored, progress);
  assert.equal(failureReason(level, restored.run), 'moves');
  assert.equal(act(level, restored.run, { type: 'undo' }), restored.run);
});

void test('a pending balance notice survives reload until acknowledged without resetting the new attempt', () => {
  const updated = restoreProgress(
    JSON.stringify({
      ...defaultProgress('challenge'),
      balanceRevision: undefined,
      best: { 13: 2 },
      run: activeRun(14),
    }),
    'challenge',
  );
  assert.equal(updated.showBalanceNotice, true);
  updated.run = activeRun(14);
  const pending = restoreProgress(JSON.stringify(updated), 'challenge');
  assert.deepEqual(pending, updated);
  const acknowledged = { ...pending, showBalanceNotice: false };
  assert.deepEqual(
    restoreProgress(JSON.stringify(acknowledged), 'challenge'),
    acknowledged,
  );
});

void test('historical challenge migrations keep their existing intro and advancement without a balance notice', () => {
  for (const contentRevision of [undefined, 1, 2]) {
    const old = {
      ...defaultProgress('challenge'),
      contentRevision,
      balanceRevision: undefined,
      showBalanceNotice: true,
      best: { 13: 3, 14: 2 },
      previousBest: { 14: 1, 20: 2 },
      run: { ...newRun(14), removed: [999], mistakes: 2, hints: 2 },
      sound: false,
      reducedMotion: true,
      language: 'en',
    };
    const restored = restoreProgress(JSON.stringify(old), 'challenge');
    assert.deepEqual(restored.previousBest, { 13: 3, 14: 2, 20: 2 });
    assert.deepEqual(restored.best, {});
    assert.deepEqual(restored.run, newRun(15));
    assert.equal(restored.unlocked, 21);
    assert.equal(restored.showRevisionIntro, true);
    assert.equal(restored.showBalanceNotice, false);
    assert.equal(restored.balanceRevision, BALANCE_REVISION);
    assert.equal(restored.sound, false);
    assert.equal(restored.reducedMotion, true);
    assert.equal(restored.language, 'en');
    assert.deepEqual(
      restoreProgress(JSON.stringify(restored), 'challenge'),
      restored,
    );
  }
});

void test('classic saves retain their attempt and ignore challenge balance notices', () => {
  const level = makeLevel(1);
  const run = act(level, newRun(1), { type: 'hint' });
  const old = {
    ...defaultProgress(),
    balanceRevision: undefined,
    showBalanceNotice: true,
    run: act(level, run, { type: 'tap', id: run.hint! }),
    sound: false,
    language: 'en',
  };
  assert.deepEqual(restoreProgress(JSON.stringify(old)), {
    ...old,
    balanceRevision: 0,
    showBalanceNotice: false,
  });
});
