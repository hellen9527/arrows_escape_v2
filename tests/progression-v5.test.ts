import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProgress,
  restoreProgress,
  canStartLevel,
  newRun,
  startTutorial,
  activeRun,
  act,
  activeLevel,
  withActiveRun,
} from '../lib/game/engine.ts';
import { readProgress, saveKey } from '../lib/game/storage.ts';
void test('v4 archive preserves stage access and tutorial moves without granting new clears', () => {
  let old = startTutorial(
    {
      ...defaultProgress('challenge'),
      contentRevision: 4,
      entry: 'experienced',
      best: { 31: 3, 59: 2, 270: 3 },
      run: { ...newRun(60), removed: [0, 1] },
    },
    2,
  );
  old = withActiveRun(
    old,
    act(activeLevel(old), activeRun(old), { type: 'tap', id: 0 }),
  );
  const p = restoreProgress(JSON.stringify(old), 'challenge');
  assert.equal(p.contentRevision, 5);
  assert.equal(p.run.level, 60);
  assert.deepEqual(p.run.removed, []);
  assert.deepEqual(p.best, {});
  assert.deepEqual(p.independent, {});
  assert.deepEqual(p.previousBest, { 31: 3, 59: 2, 270: 3 });
  assert.equal(canStartLevel(p, 60), true);
  assert.equal(canStartLevel(p, 32), true);
  assert.equal(canStartLevel(p, 58), false);
  assert.deepEqual(p.training, old.training);
  assert.equal(p.showRevisionIntro, true);
  const reload = restoreProgress(JSON.stringify(p), 'challenge');
  assert.deepEqual(reload, p);
});
void test('v5 storage migrates v4 without overwriting it, and v5 takes precedence', () => {
  const raw = JSON.stringify({
    ...defaultProgress('challenge'),
    contentRevision: 4,
    best: { 60: 3 },
    run: newRun(61),
  });
  const data = new Map([['arrow-escape:challenge:v4', raw]]),
    storage = { getItem: (k: string) => data.get(k) ?? null };
  assert.equal(saveKey('challenge'), 'arrow-escape:challenge:v5');
  assert.deepEqual(readProgress(storage, 'challenge').previousBest, { 60: 3 });
  assert.equal(data.get('arrow-escape:challenge:v4'), raw);
  data.set(saveKey('challenge'), JSON.stringify(defaultProgress('challenge')));
  assert.deepEqual(
    readProgress(storage, 'challenge'),
    defaultProgress('challenge'),
  );
});
