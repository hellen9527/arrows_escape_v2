import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeLevel } from '../lib/game/challenge-levels.ts';
void test('formal 31–60 grows into long, multi-bend hundred-arrow boards', () => {
  for (const id of [31, 45, 60]) {
    const l = challengeLevel(id);
    assert.ok(l.arrows.length >= 100, `C${id} must have at least 100 arrows`);
    let bent = 0,
      long = 0;
    for (const a of l.arrows) {
      let turns = 0;
      for (let j = 2; j < a.points.length; j++) {
        const [p, q, r] = [a.points[j], a.points[j - 1], a.points[j - 2]];
        if (p[0] - q[0] !== q[0] - r[0] || p[1] - q[1] !== q[1] - r[1]) turns++;
      }
      if (turns >= 2) bent++;
      if (a.points.length >= 8) long++;
    }
    assert.ok(bent / l.arrows.length >= 0.55, `C${id} multi-bend routes`);
    assert.ok(long / l.arrows.length >= 0.35, `C${id} long routes`);
  }
  assert.ok(
    challengeLevel(60).arrows.length >= challengeLevel(31).arrows.length + 20,
  );
});
