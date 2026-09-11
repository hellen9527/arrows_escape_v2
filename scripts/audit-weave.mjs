import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { challengeLevel } from '../lib/game/challenge-levels.ts';
import {
  act,
  newRun,
  isComplete,
  direction,
  requiredArrowIds,
} from '../lib/game/engine.ts';
import {
  inspectWeave,
  weaveFailures,
  closure,
} from './authoring/weave-metrics.mjs';
import { weaveProfile } from './authoring/weave-profile.mjs';
const records = JSON.parse(
  fs.readFileSync(
    new URL('../docs/level-design-300/v5-catalog.json', import.meta.url),
    'utf8',
  ),
).levels;
const signatures = new Set(),
  summaries = [];
let previous = 0;
for (let id = 1; id <= 300; id++) {
  const l = challengeLevel(id),
    record = records[id - 1],
    p = weaveProfile(id),
    tag = `C${id}`;
  assert.deepEqual(record.profile, p, tag + ' stale profile');
  const cells = new Set();
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
          tag + ' unit segments',
        );
      assert.ok(
        !(dx ? y === hy && (x - hx) * dx > 0 : x === hx && (y - hy) * dy > 0),
        tag + ' self-ray',
      );
    }
  }
  const m = inspectWeave(l);
  assert.deepEqual(weaveFailures(p, m), [], tag + ' structural floor');
  assert.ok(
    !previous || l.arrows.length >= previous * 0.92,
    tag + ' no excessive count drop',
  );
  previous = l.arrows.length;
  assert.equal(l.objective?.targets.length || 0, p.targets);
  assert.equal(l.arrows.filter((a) => a.key).length, p.keys);
  for (const a of l.arrows.filter((a) => a.lock)) {
    const key = l.arrows.filter((k) => k.key === a.lock);
    assert.equal(key.length, 1, tag + ' key identity');
    assert.ok(
      !closure(m.geo, a.id).has(key[0].id),
      tag + ' key permission must add a dependency',
    );
  }
  if (l.objective) {
    const need = requiredArrowIds(l);
    assert.equal(l.objective.moves, need.length + p.slack, tag + ' budget');
    assert.ok(
      need.length <= l.arrows.length * 0.91,
      tag + ' optional branches',
    );
    assert.ok(
      l.arrows.filter((a) => a.key).every((a) => need.includes(a.id)),
      tag + ' keys matter',
    );
  }
  let run = newRun(id);
  for (const aid of record.solution) {
    const next = act(l, run, { type: 'tap', id: aid });
    assert.equal(next.removed.length, run.removed.length + 1, tag + ' replay');
    run = next;
  }
  assert.ok(isComplete(l, run), tag + ' target win');
  const full = { ...l, objective: undefined };
  let cleared = newRun(id);
  for (let aid = l.arrows.length - 1; aid >= 0; aid--) {
    cleared = act(full, cleared, { type: 'tap', id: aid });
  }
  assert.ok(isComplete(full, cleared), tag + ' full solution');
  const signature = createHash('sha256')
    .update(JSON.stringify(l.arrows))
    .digest('hex');
  assert.ok(!signatures.has(signature), tag + ' duplicate');
  signatures.add(signature);
  const { geo: _geo, deps: _deps, policies, ...summary } = m;
  summaries.push({
    id,
    ...summary,
    policies: policies.map(({ openings: _openings, order: _order, ...x }) => x),
  });
}
fs.writeFileSync(
  new URL('../docs/level-design-300/v5-audit.json', import.meta.url),
  JSON.stringify(
    {
      revision: 5,
      validated: 300,
      humanExperienceValidated: false,
      levels: summaries,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'PASS: 300 dense boards, geometry, complete/goal solutions, key identities, pacing floors and three sampled removal policies.',
);
