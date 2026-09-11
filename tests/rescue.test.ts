import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';

const { act, newRun, finishLevel, restoreProgress, defaultProgress } = engine;
const rescue = {
  id: 4,
  campaign: 'challenge' as const,
  size: 6,
  objective: { type: 'rescue' as const, targets: [0], moves: 2 },
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
function reveal(level: typeof rescue, run: ReturnType<typeof newRun>) {
  for (let i = 0; i < 3; i++) run = act(level, run, { type: 'hint' });
  return run;
}
const play = (level: typeof rescue, ids: number[]) =>
  ids.reduce(
    (run, id) => act(level, run, { type: 'tap', id }),
    newRun(level.id),
  );

void test('rescuing the target on the final move wins with other arrows still present', () => {
  const won = play(rescue, [1, 0]);
  assert.deepEqual(won.removed, [1, 0]);
  assert.equal(act(rescue, won, { type: 'tap', id: 2 }), won);
  assert.equal(engine.isComplete(rescue, won), true);
  assert.equal(engine.movesLeft(rescue, won), 0);
  assert.equal(engine.failureReason(rescue, won), null);
  assert.equal(engine.failed(rescue, won), false);
  for (const action of [{ type: 'hint' }, { type: 'undo' }] as const)
    assert.equal(act(rescue, won, action), won);
});

void test('spending the budget on irrelevant arrows fails and freezes all actions', () => {
  const lost = play(rescue, [2, 1]);
  assert.equal(act(rescue, lost, { type: 'tap', id: 0 }), lost);
  assert.equal(engine.isComplete(rescue, lost), false);
  assert.equal(engine.movesLeft(rescue, lost), 0);
  assert.equal(engine.failureReason(rescue, lost), 'moves');
  assert.equal(engine.failed(rescue, lost), true);
  for (const action of [{ type: 'hint' }, { type: 'undo' }] as const)
    assert.equal(act(rescue, lost, action), lost);
});

void test('exhausting the move budget clears a pending hint consistently with restore', () => {
  let run = play(rescue, [1]);
  run = reveal(rescue, run);
  assert.equal(run.hint, 0);
  run = act(rescue, run, { type: 'tap', id: 2 });
  assert.equal(engine.failureReason(rescue, run), 'moves');
  assert.equal(run.hint, null);
  assert.equal(run.hints, 1);
});

void test('blocked taps cost hearts only; undo refunds a move while preserving mistakes and hints', () => {
  const level = { ...rescue, objective: { ...rescue.objective, moves: 3 } };
  let run = act(level, newRun(4), { type: 'tap', id: 0 });
  assert.equal(run.mistakes, 1);
  assert.equal(typeof engine.movesLeft, 'function');
  assert.equal(engine.movesLeft(level, run), 3);
  run = reveal(level, run);
  assert.equal(run.hint, 1);
  assert.equal(act(level, run, { type: 'hint' }), run);
  run = act(level, run, { type: 'tap', id: 1 });
  assert.equal(engine.movesLeft(level, run), 2);
  run = act(level, run, { type: 'undo' });
  assert.equal(engine.movesLeft(level, run), 3);
  assert.equal(run.mistakes, 1);
  assert.equal(run.hints, 1);
  run = act(level, run, { type: 'tap', id: 0 });
  run = act(level, run, { type: 'tap', id: 0 });
  assert.equal(engine.failureReason(level, run), 'hearts');
  assert.equal(engine.movesLeft(level, run), 3);
  assert.equal(act(level, run, { type: 'undo' }), run);
});

void test('required arrows include transitive geometric and key blockers, skipping removed arrows', () => {
  const level = {
    ...rescue,
    arrows: [
      {
        id: 0,
        lock: 'A',
        points: [
          [0, 0],
          [1, 0],
        ],
      },
      {
        id: 1,
        key: 'A',
        points: [
          [0, 2],
          [1, 2],
        ],
      },
      {
        id: 2,
        points: [
          [3, 3],
          [3, 2],
          [3, 1],
        ],
      },
      {
        id: 3,
        points: [
          [1, 4],
          [0, 4],
        ],
      },
    ],
  };
  assert.equal(typeof engine.requiredArrowIds, 'function');
  assert.deepEqual(
    engine.requiredArrowIds(level).sort((a, b) => a - b),
    [0, 1, 2],
  );
  assert.deepEqual(
    engine.requiredArrowIds(level, [2]).sort((a, b) => a - b),
    [0, 1],
  );
  assert.deepEqual(engine.requiredArrowIds(level, [2, 1]), [0]);
  assert.deepEqual(engine.requiredArrowIds(level, [2, 1, 0]), []);
  assert.equal(reveal(level, newRun(4)).hint, 2);
});

void test('hints suggest a free required arrow even when an irrelevant move releases more arrows', () => {
  const level = {
    ...rescue,
    arrows: [
      {
        id: 0,
        points: [
          [0, 0],
          [1, 0],
        ],
      },
      {
        id: 1,
        points: [
          [3, 1],
          [3, 0],
        ],
      },
      {
        id: 2,
        points: [
          [5, 5],
          [5, 4],
          [5, 3],
          [5, 2],
        ],
      },
      {
        id: 3,
        points: [
          [0, 3],
          [1, 3],
        ],
      },
      {
        id: 4,
        points: [
          [0, 4],
          [1, 4],
        ],
      },
    ],
  };
  const hinted = reveal(level, newRun(4));
  assert.equal(hinted.hint, 1);
  assert.equal(hinted.hints, 1);
  assert.equal(act(level, hinted, { type: 'hint' }), hinted);
});

void test('levels without an objective still require all arrows and have no move limit', () => {
  const { objective: _objective, ...level } = rescue;
  const partial = act(level, act(level, newRun(4), { type: 'tap', id: 1 }), {
    type: 'tap',
    id: 0,
  });
  assert.equal(typeof engine.isComplete, 'function');
  assert.equal(engine.isComplete(level, partial), false);
  assert.equal(engine.movesLeft(level, partial), null);
  assert.equal(engine.failureReason(level, partial), null);
  assert.deepEqual(engine.requiredArrowIds(level, partial.removed), [2]);
  assert.equal(
    engine.isComplete(level, act(level, partial, { type: 'tap', id: 2 })),
    true,
  );
});

// The classic cache supplies the same Level to finish and restore. Temporarily
// attach the small objective fixture to exercise persistence without depending
// on the authored challenge layouts or mocking the engine's move validation.
void test('finish and restore share rescue completion and reject moves appended after terminal states', () => {
  const level = makeLevel(1);
  const original = { ...level };
  Object.assign(level, rescue, { id: 1, campaign: 'classic' });
  try {
    const progress = defaultProgress();
    progress.run = { ...play(rescue, [1, 0]), level: 1 };
    const won = finishLevel(progress);
    assert.equal(won.best[1], 3);
    assert.equal(won.unlocked, 2);
    assert.deepEqual(restoreProgress(JSON.stringify(won)), won);
    progress.run = { ...play(rescue, [1]), level: 1 };
    assert.deepEqual(restoreProgress(JSON.stringify(progress)), progress);
    progress.run = { ...play(rescue, [2, 1]), level: 1 };
    assert.deepEqual(finishLevel(progress), progress);
    assert.deepEqual(restoreProgress(JSON.stringify(progress)), progress);
    for (const removed of [
      [1, 0, 2],
      [2, 1, 0],
    ]) {
      progress.run = { ...newRun(1), removed };
      const restored = restoreProgress(JSON.stringify(progress));
      assert.deepEqual(restored.run, newRun(1));
      assert.deepEqual(restored.best, {});
      assert.equal(restored.unlocked, 1);
    }
  } finally {
    delete level.objective;
    delete level.campaign;
    Object.assign(level, original);
  }
});
