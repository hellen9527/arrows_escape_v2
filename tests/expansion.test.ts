import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  challengeLevel,
  CHALLENGE_COUNT,
} from '../lib/game/challenge-levels.ts';
import {
  act,
  newRun,
  requiredArrowIds,
  isComplete,
} from '../lib/game/engine.ts';

void test('expansion appends 500 distinct fixed boards after the original 300', () => {
  assert.equal(CHALLENGE_COUNT, 800);
  const signatures = new Set<string>();
  let count = challengeLevel(300).arrows.length;
  for (let id = 301; id <= 800; id++) {
    const l = challengeLevel(id);
    assert.equal(l.id, id);
    assert.ok(l.arrows.length >= count * 0.92, `count continuity C${id}`);
    assert.ok(
      l.arrows.length >= 230 && l.arrows.length <= 260,
      `bounded labor C${id}`,
    );
    assert.ok(l.size <= 70, `mobile grid C${id}`);
    signatures.add(JSON.stringify(l.arrows));
    const required = requiredArrowIds(l);
    let run = newRun(id);
    // The offline reverse-construction witness is independent of the goal selector.
    for (let aid = l.arrows.length - 1; aid >= 0; aid--)
      if (required.includes(aid)) run = act(l, run, { type: 'tap', id: aid });
    assert.ok(isComplete(l, run), `C${id} goal solution`);
    assert.equal(run.mistakes, 0);
    count = l.arrows.length;
  }
  assert.equal(signatures.size, 500);
});

void test('the original 300 board definitions remain byte-identical during expansion', () => {
  const data = readFileSync(
    new URL('../lib/game/challenge-data.ts', import.meta.url),
  );
  assert.equal(
    createHash('sha256').update(data).digest('hex'),
    '569991a788e0caa66ab90e615cf4bb0b1f8c83f590424228d74752af509e5fc0',
  );
});
