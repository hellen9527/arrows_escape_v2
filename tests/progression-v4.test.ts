import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProgress,
  restoreProgress,
  chooseEntry,
  canStartLevel,
  enterLevel,
  activeRun,
  activeLevel,
  startTutorial,
  continueTutorial,
  withActiveRun,
  finishLevel,
  act,
  blockers,
  requiredArrowIds,
  isComplete,
  lives,
  newRun,
} from '../lib/game/engine.ts';
import { readProgress, saveKey } from '../lib/game/storage.ts';
import { hintCopy } from '../lib/game/hint-copy.ts';

void test('experienced chapter access does not award earlier clears', () => {
  const p = chooseEntry(defaultProgress('challenge'), 'experienced');
  assert.equal(p.run.level, 31);
  assert.deepEqual(p.best, {});
  assert.equal(canStartLevel(p, 271), true);
  assert.equal(canStartLevel(p, 32), false);
  assert.equal(enterLevel(p, 32), p);
});
void test('v3 achievements migrate separately without replaying old arrows', () => {
  const old = {
    ...defaultProgress('challenge'),
    contentRevision: 3,
    best: { 1: 3, 20: 2 },
    unlocked: 21,
    run: { ...newRun(21), removed: [0, 1] },
  };
  const p = restoreProgress(JSON.stringify(old), 'challenge');
  assert.deepEqual(p.previousBest, { 1: 3, 20: 2 });
  assert.deepEqual(p.best, {});
  assert.equal(p.entry, 'pending');
  assert.equal(p.showRevisionIntro, true);
  assert.deepEqual(p.run.removed, []);
  assert.equal(canStartLevel(p, 21), false);
});
void test('v4 storage reads v3 only as a fallback and retains its original key', () => {
  const data = new Map([
    [
      'arrow-escape:challenge:v3',
      JSON.stringify({
        ...defaultProgress('challenge'),
        contentRevision: 3,
        best: { 5: 3 },
      }),
    ],
  ]);
  assert.equal(saveKey('challenge'), 'arrow-escape:challenge:v4');
  assert.deepEqual(
    readProgress({ getItem: (k) => data.get(k) ?? null }, 'challenge')
      .previousBest,
    { 5: 3 },
  );
  assert.equal(data.size, 1);
});
void test('tutorial resume and return never modify a formal checkpoint or award a formal clear', () => {
  const base = enterLevel(
    chooseEntry(defaultProgress('challenge'), 'experienced'),
    91,
  );
  let p = startTutorial(base, 7, false);
  const l = activeLevel(p);
  let r = activeRun(p);
  while (!isComplete(l, r)) {
    const needed = requiredArrowIds(l, r.removed);
    const a = l.arrows.find(
      (a) => needed.includes(a.id) && !blockers(l, r.removed, a.id).length,
    );
    assert.ok(a);
    r = act(l, r, { type: 'tap', id: a.id });
    if (r.removed.length > l.arrows.length) throw Error('Stalled');
  }
  p = finishLevel(withActiveRun(p, r));
  assert.deepEqual(p.best, {});
  assert.ok(p.tutorialBest[7]);
  const restored = restoreProgress(JSON.stringify(p), 'challenge');
  assert.equal(restored.training?.id, 7);
  assert.equal(activeRun(restored).removed.length, r.removed.length);
  p = continueTutorial(restored);
  assert.equal(p.training, null);
  assert.equal(p.run.level, 91);
});
void test('all formal levels have three hearts; tutorials remain practice', () => {
  assert.equal(
    lives({ id: 1, size: 3, campaign: 'challenge', arrows: [] }, newRun(1)),
    3,
  );
  const p = startTutorial(defaultProgress('challenge'), 1, true);
  assert.equal(lives(activeLevel(p), activeRun(p)), null);
});

void test('returning from practice to the active formal level preserves its moves', () => {
  let p = chooseEntry(defaultProgress('challenge'), 'experienced');
  const l = activeLevel(p),
    id = requiredArrowIds(l).find((id) => !blockers(l, [], id).length)!;
  p = withActiveRun(p, act(l, activeRun(p), { type: 'tap', id }));
  const saved = p.run;
  p = startTutorial(p, 3, true);
  p = enterLevel(p, 31);
  assert.deepEqual(p.run, saved);
  assert.equal(p.training, null);
});
void test('a skipped practice lesson resumes its moves and sequence', () => {
  let p = startTutorial(
    chooseEntry(defaultProgress('challenge'), 'experienced'),
    3,
    true,
  );
  const l = activeLevel(p),
    id = requiredArrowIds(l).find((id) => !blockers(l, [], id).length)!;
  p = withActiveRun(p, act(l, activeRun(p), { type: 'tap', id }));
  const saved = activeRun(p);
  p = enterLevel(p, 31);
  p = startTutorial(p, 3);
  assert.deepEqual(activeRun(p), saved);
  assert.equal(p.training?.sequence, true);
});
void test('choosing newcomer route promotes resumed standalone lessons into the sequence', () => {
  let p = startTutorial(
    chooseEntry(defaultProgress('challenge'), 'experienced'),
    1,
  );
  const l = activeLevel(p);
  p = withActiveRun(p, act(l, activeRun(p), { type: 'tap', id: 0 }));
  p = enterLevel(p, 31);
  p = chooseEntry(p, 'new');
  assert.deepEqual(activeRun(p).removed, [0]);
  assert.equal(p.training?.sequence, true);
  p = continueTutorial(p);
  assert.equal(p.training?.id, 2);
  assert.equal(p.training?.sequence, true);
});
void test('classic retains an active hint when a different legal arrow leaves', () => {
  const l = {
    id: 1,
    size: 5,
    arrows: [
      {
        id: 0,
        points: [
          [0, 1],
          [0, 0],
        ],
      },
      {
        id: 1,
        points: [
          [3, 3],
          [4, 3],
        ],
      },
    ],
  };
  const hinted = act(l, newRun(1), { type: 'hint' });
  const other = l.arrows.find((a) => a.id !== hinted.hint)!;
  const next = act(l, hinted, { type: 'tap', id: other.id });
  assert.equal(next.hint, hinted.hint);
  assert.equal(act(l, next, { type: 'hint' }).hints, 1);
});
void test('saved hint stages restore their displayed explanation without charging again', () => {
  let p = chooseEntry(defaultProgress('challenge'), 'experienced');
  for (let stage = 1; stage <= 3; stage++) {
    p = withActiveRun(p, act(activeLevel(p), activeRun(p), { type: 'hint' }));
    const before = hintCopy(activeLevel(p), activeRun(p), 'zh');
    assert.ok(before);
    p = restoreProgress(JSON.stringify(p), 'challenge');
    assert.equal(activeRun(p).hintStage, stage);
    assert.equal(activeRun(p).hints, 1);
    assert.equal(hintCopy(activeLevel(p), activeRun(p), 'zh'), before);
  }
});
