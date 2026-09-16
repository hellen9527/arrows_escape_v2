import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  challengeLevel,
  CHALLENGE_COUNT,
} from '../lib/game/challenge-levels.ts';
import {
  act,
  newRun,
  direction,
  isComplete,
  requiredArrowIds,
} from '../lib/game/engine.ts';
import { expansionProfile } from './authoring/expansion-profile.mjs';
import {
  inspectExpansion,
  expansionFailures,
} from './authoring/expansion-metrics.mjs';
import { closure } from './authoring/weave-metrics.mjs';
const root = new URL('../', import.meta.url),
  records = JSON.parse(
    fs.readFileSync(new URL('docs/level-design-expansion/catalog.json', root)),
  ).levels;
assert.equal(CHALLENGE_COUNT, 800);
assert.equal(records.length, 500);
const signatures = new Set(),
  summaries = [];
for (let id = 1; id <= 300; id++)
  signatures.add(
    createHash('sha256')
      .update(JSON.stringify(challengeLevel(id).arrows))
      .digest('hex'),
  );
let previous = challengeLevel(300).arrows.length;
for (let id = 301; id <= 800; id++) {
  const l = challengeLevel(id),
    r = records[id - 301],
    p = expansionProfile(id),
    tag = `C${id}`,
    cells = new Set();
  assert.equal(l.id, id);
  assert.deepEqual(r.profile, p);
  for (const a of l.arrows) {
    const [dx, dy] = direction(a),
      [hx, hy] = a.points.at(-1);
    for (const [j, [x, y]] of a.points.entries()) {
      assert.ok(
        Number.isInteger(x) &&
          Number.isInteger(y) &&
          x >= 0 &&
          y >= 0 &&
          x < l.size &&
          y < l.size,
        tag + ' bounds',
      );
      assert.ok(!cells.has(`${x},${y}`), tag + ' overlap');
      cells.add(`${x},${y}`);
      if (j)
        assert.equal(
          Math.abs(x - a.points[j - 1][0]) + Math.abs(y - a.points[j - 1][1]),
          1,
          tag + ' unit paths',
        );
      assert.ok(
        !(dx ? y === hy && (x - hx) * dx > 0 : x === hx && (y - hy) * dy > 0),
        tag + ' self ray',
      );
    }
  }
  const m = inspectExpansion(l);
  assert.deepEqual(expansionFailures(p, m), [], tag + ' content contract');
  assert.ok(
    l.arrows.length >= previous * 0.92 && l.arrows.length <= 260,
    tag + ' bounded progression',
  );
  previous = l.arrows.length;
  assert.equal(l.objective?.targets.length ?? 0, p.targets);
  assert.equal(l.arrows.filter((a) => a.key).length, 2);
  for (const a of l.arrows.filter((a) => a.lock)) {
    const key = l.arrows.filter((k) => k.key === a.lock);
    assert.equal(key.length, 1, tag + ' unique key');
    assert.ok(
      !closure(m.geo, a.id).has(key[0].id),
      tag + ' meaningful permission',
    );
  }
  if (l.objective) {
    const required = requiredArrowIds(l);
    assert.equal(l.objective.moves, required.length + p.slack, tag + ' budget');
    assert.ok(
      l.arrows.filter((a) => a.key).every((a) => required.includes(a.id)),
      tag + ' necessary keys',
    );
  }
  let run = newRun(id);
  for (const aid of r.solution) {
    const next = act(l, run, { type: 'tap', id: aid });
    assert.equal(
      next.removed.length,
      run.removed.length + 1,
      tag + ' actual goal replay',
    );
    run = next;
  }
  assert.ok(isComplete(l, run), tag + ' target win');
  const full = { ...l, objective: undefined };
  run = newRun(id);
  for (let aid = l.arrows.length - 1; aid >= 0; aid--)
    run = act(full, run, { type: 'tap', id: aid });
  assert.ok(isComplete(full, run), tag + ' full win');
  assert.equal(run.mistakes, 0);
  const sig = createHash('sha256')
    .update(JSON.stringify(l.arrows))
    .digest('hex');
  assert.ok(!signatures.has(sig), tag + ' duplicate');
  signatures.add(sig);
  const { geo: _g, deps: _d, policies, ...rest } = m;
  summaries.push({
    id,
    intent: p.intent,
    ...rest,
    policies: policies.map(({ order: _o, openings: _a, ...x }) => x),
  });
}
fs.writeFileSync(
  new URL('docs/level-design-expansion/audit.json', root),
  JSON.stringify(
    {
      validated: 500,
      first: 301,
      last: 800,
      humanExperienceValidated: false,
      levels: summaries,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'PASS: 500 appended fixed boards, all geometry and actual engine solutions, real key dependencies, goals, bounded labor, distinctness and intent contracts.',
);
