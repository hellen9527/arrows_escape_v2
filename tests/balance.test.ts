import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProgress,
  restoreProgress,
  newRun,
  canStartLevel,
} from '../lib/game/engine.ts';

// v3 rebalance migration is superseded by the v4 content boundary. Every old
// balance uses different board identities; none may replay moves into v4.
for (const contentRevision of [undefined, 1, 2, 3]) {
  for (const balanceRevision of [undefined, 0, 1, 999]) {
    void test(`revision ${contentRevision}, balance ${balanceRevision}: archive scores and discard old moves`, () => {
      const old = {
        ...defaultProgress('challenge'),
        contentRevision,
        balanceRevision,
        best: { 1: 3, 13: 2, 99: 3 },
        previousBest: { 3: 2, 20: 1 },
        unlocked: 30,
        run: {
          ...newRun(14),
          removed: [4, 3, 2, 1, 0],
          mistakes: 2,
          hints: 1,
          hint: 2,
        },
        sound: false,
        reducedMotion: true,
        language: 'en',
      };
      const p = restoreProgress(JSON.stringify(old), 'challenge');
      assert.equal(p.contentRevision, 4);
      assert.deepEqual(p.best, {});
      assert.deepEqual(p.previousBest, { 1: 3, 3: 2, 13: 2, 20: 1 });
      assert.deepEqual(p.run, newRun(1));
      assert.equal(p.showRevisionIntro, true);
      assert.equal(p.entry, 'pending');
      assert.equal(canStartLevel(p, 14), false);
      assert.equal(canStartLevel(p, 271), true);
      assert.equal(p.sound, false);
      assert.equal(p.reducedMotion, true);
      assert.equal(p.language, 'en');
      assert.deepEqual(restoreProgress(JSON.stringify(p), 'challenge'), p);
    });
  }
}
