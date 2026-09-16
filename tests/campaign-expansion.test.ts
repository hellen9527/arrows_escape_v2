import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  blockers,
  canStartLevel,
  defaultProgress,
  enterLevel,
  finishLevel,
  isComplete,
  newRun,
  requiredArrowIds,
  restoreProgress,
} from '../lib/game/engine.ts';
import { levelCount, makeLevel } from '../lib/game/levels.ts';
import { saveKey } from '../lib/game/storage.ts';
import { parseFeedback } from '../lib/feedback/server.ts';
import {
  challengeChapterCopy,
  chapterLevelIds,
  clampChapter,
} from '../lib/game/chapter-copy.ts';
import { CHALLENGE_COUNT } from '../lib/game/campaign-size.ts';

void test('chapter navigation covers every level once with a bounded final chapter', () => {
  const chapters = challengeChapterCopy(CHALLENGE_COUNT);
  assert.equal(chapters.length, 27);
  assert.ok(
    chapters.every(
      (chapter) => chapter.title.length === 2 && chapter.note.length === 2,
    ),
  );
  const ids = chapters.flatMap((_, chapter) =>
    chapterLevelIds(chapter, 30, CHALLENGE_COUNT),
  );
  assert.deepEqual(
    ids,
    Array.from({ length: 800 }, (_, i) => i + 1),
  );
  assert.deepEqual(
    chapterLevelIds(26, 30, CHALLENGE_COUNT),
    Array.from({ length: 20 }, (_, i) => i + 781),
  );
  assert.equal(clampChapter(27, 30, CHALLENGE_COUNT), 26);
  assert.equal(clampChapter(-1, 30, CHALLENGE_COUNT), 0);
  assert.equal(clampChapter(26, 12, 60), 4);
  assert.equal(challengeChapterCopy(300).length, 10);
});

function solvedRun(id: number) {
  const level = makeLevel(id, 'challenge');
  let run = newRun(id);
  while (!isComplete(level, run)) {
    const next = requiredArrowIds(level, run.removed).find(
      (arrow) => !blockers(level, run.removed, arrow).length,
    );
    assert.notEqual(next, undefined);
    const advanced = act(level, run, { type: 'tap', id: next! });
    assert.notEqual(advanced.removed.length, run.removed.length);
    run = advanced;
  }
  return run;
}

void test('the expanded campaign has 800 levels and a playable transition from 300 to 301', () => {
  assert.equal(levelCount('challenge'), 800);
  const finished = finishLevel({
    ...defaultProgress('challenge'),
    entry: 'experienced',
    run: solvedRun(300),
  });
  assert.equal(finished.unlocked, 301);
  assert.equal(canStartLevel(finished, 301), true);
  const next = enterLevel(finished, 301);
  assert.equal(next.run.level, 301);
  assert.equal(makeLevel(next.run.level, 'challenge').id, 301);
  assert.equal(next.best[300], 3);
  assert.equal(next.best[301], undefined);
});

void test('current saves keep old moves, achievements, tutorial records and revision', () => {
  const level = makeLevel(271, 'challenge');
  const free = requiredArrowIds(level, []).find(
    (id) => !blockers(level, [], id).length,
  )!;
  const saved = {
    ...defaultProgress('challenge'),
    entry: 'experienced' as const,
    best: { 1: 3, 270: 2 },
    independent: { 1: true },
    unlocked: 271,
    previousBest: { 31: 3 },
    tutorialBest: { 1: 3, 8: 2 },
    run: act(level, newRun(271), { type: 'tap', id: free }),
  };
  assert.equal(saveKey('challenge'), 'arrow-escape:challenge:v5');
  assert.deepEqual(restoreProgress(JSON.stringify(saved), 'challenge'), saved);
});

void test('the final clear and restored access stop at the actual campaign boundary', () => {
  assert.equal(levelCount('challenge'), 800);
  const finished = finishLevel({
    ...defaultProgress('challenge'),
    run: solvedRun(800),
  });
  assert.equal(finished.unlocked, 800);
  assert.equal(finished.best[800], 3);
  assert.equal(canStartLevel(finished, 801), false);
  assert.equal(enterLevel(finished, 801), finished);
  assert.equal(makeLevel(801, 'challenge').id, 800);
  const restored = restoreProgress(
    JSON.stringify({
      ...finished,
      best: { ...finished.best, 801: 3 },
      legacyAccess: [800, 801],
    }),
    'challenge',
  );
  assert.equal(restored.run.level, 800);
  assert.equal(restored.unlocked, 800);
  assert.equal(restored.best[801], undefined);
  assert.deepEqual(restored.legacyAccess, [800]);
});

void test('feedback accepts level 800 and rejects 801 without loosening other campaigns', () => {
  const payload = {
    id: '106b54e0-247d-4a02-b587-721048d3d8b4',
    feeling: 'enjoyed',
    message: '',
    context: {
      mode: 'challenge',
      level: 800,
      removed: 0,
      total: 10,
      mistakes: 0,
      hints: 0,
      skin: 'kite',
    },
  };
  assert.equal(parseFeedback(payload)?.context.level, 800);
  assert.equal(
    parseFeedback({ ...payload, context: { ...payload.context, level: 801 } }),
    null,
  );
  assert.equal(
    parseFeedback({
      ...payload,
      context: { ...payload.context, mode: 'classic', level: 61 },
    }),
    null,
  );
});
