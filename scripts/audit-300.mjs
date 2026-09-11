import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  challengeLevel,
  CHALLENGE_COUNT,
} from '../lib/game/challenge-levels.ts';
import {
  blockers,
  requiredArrowIds,
  direction,
  act,
  newRun,
  isComplete,
} from '../lib/game/engine.ts';
import { contracts, edges } from './authoring/contracts.mjs';
import { graphInfo } from './authoring/bind.mjs';
import { inside } from './authoring/geometry.mjs';
const bindingFile = new URL(
  '../docs/level-design-300/production-bindings.json',
  import.meta.url,
);
const bindings = JSON.parse(fs.readFileSync(bindingFile, 'utf8')).levels;
assert.equal(CHALLENGE_COUNT, 300);
const summaries = [],
  graphSignatures = new Map(),
  duplicates = [];
const hash = (s) => createHash('sha256').update(s).digest('hex');
for (let id = 1; id <= 300; id++) {
  const l = challengeLevel(id),
    record = bindings[id - 1],
    c = contracts[id],
    b = record.binding;
  const ck = (ok, msg) => assert.ok(ok, `C${id}: ${msg}`);
  assert.deepEqual(record.contract, c, `C${id}: regenerate stale contract`);
  const geometric = {
    ...l,
    arrows: l.arrows.map(({ id, points }) => ({ id, points })),
  };
  const g = l.arrows.map((a) => blockers(geometric, [], a.id)),
    d = l.arrows.map((a) => blockers(l, [], a.id));
  const geo = graphInfo(g),
    all = graphInfo(d),
    targets = l.objective?.targets ?? [],
    need = new Set(requiredArrowIds(l));
  assert.deepEqual(
    targets,
    (c.targets || '')
      .split(',')
      .filter(Boolean)
      .map((t) => b[t]),
    `C${id}: actual goal identities`,
  );
  for (const role of (c.branch || '').split(',').filter(Boolean))
    ck(
      g.some((parents) => parents.includes(b[role])),
      `optional branch ${role}`,
    );
  for (const [from, to] of edges(c.g))
    ck(g[b[to]].includes(b[from]), `missing geometry ${from}>${to}`);
  for (const [from, to] of edges(c.r))
    ck(
      b[from] !== b[to] && geo.closures[b[to]].has(b[from]),
      `missing geometric ancestry ${from}>${to}`,
    );
  for (const [from, to] of edges(c.no))
    ck(!all.closures[b[to]].has(b[from]), `forbidden ancestry ${from}>${to}`);
  for (const [from, to] of edges(c.notDirect))
    ck(!g[b[to]].includes(b[from]), `forbidden direct edge ${from}>${to}`);
  for (const [role, parents] of Object.entries(c.only || {}))
    assert.deepEqual(
      [...g[b[role]]].sort((a, b) => a - b),
      parents
        .split(',')
        .filter(Boolean)
        .map((r) => b[r])
        .sort((a, b) => a - b),
      `C${id} exact blockers ${role}`,
    );
  for (const [letter, role] of Object.entries(c.keys || {}))
    ck(l.arrows[b[role]].key === letter, `key identity ${role}`);
  for (const [role, letter] of Object.entries(c.locks || {}))
    ck(l.arrows[b[role]].lock === letter, `lock identity ${role}`);
  for (const [role, scope] of Object.entries(c.mask || {}))
    for (const t of (c.targets || '').split(',').filter(Boolean))
      ck(
        all.closures[b[t]].has(b[role]) === scope.split(',').includes(t),
        `exact membership ${role}/${t}`,
      );
  const free = d.flatMap((parents, i) => (parents.length ? [] : [i]));
  for (const role of (c.free || '').split(',').filter(Boolean))
    ck(free.includes(b[role]), `opening ${role}`);
  for (const role of (c.unrelated || '').split(',').filter(Boolean))
    ck(!need.has(b[role]), `unrelated ${role}`);
  if (c.opening) ck(free.length === c.opening, 'opening count');
  for (const [role, [x0, x1, y0, y1]] of Object.entries(c.zones || {})) {
    const [x, y] = l.arrows[b[role]].points.at(-1);
    ck(
      x >= l.size * x0 &&
        x < l.size * x1 &&
        y >= l.size * y0 &&
        y < l.size * y1,
      `region ${role}`,
    );
  }
  const region = ([x, y]) =>
    Math.min(
      (c.columns || 3) - 1,
      Math.floor((x / l.size) * (c.columns || 3)),
    ) +
    (c.columns || 3) *
      Math.min((c.rows || 1) - 1, Math.floor((y / l.size) * (c.rows || 1)));
  const optionalRegions = (c.unrelatedRegions || '')
    .split(',')
    .filter(Boolean)
    .map((role) => region(l.arrows[b[role]].points.at(-1)));
  ck(
    new Set(optionalRegions).size === optionalRegions.length,
    'different optional regions',
  );
  for (const zone of optionalRegions)
    ck(
      l.arrows.every(
        (a) => !need.has(a.id) || a.points.every((pt) => region(pt) !== zone),
      ),
      `whole optional region ${zone}`,
    );
  if (c.inner) {
    const a = l.arrows[b[c.inner]];
    ck(
      a.id === l.arrows.length - 1,
      'inner role is the reserved corridor arrow',
    );
    assert.deepEqual(direction(a), [0, -1]);
    ck(!g[a.id].length, 'inner corridor is clear');
  }
  for (const [role, vector] of Object.entries(c.direction || {}))
    assert.deepEqual(
      direction(l.arrows[b[role]]),
      vector,
      `C${id} direction ${role}`,
    );
  const contacts = (from, to) => {
    const a = l.arrows[b[to]],
      [dx, dy] = direction(a),
      [hx, hy] = a.points.at(-1);
    return l.arrows[b[from]].points
      .map(([x, y], i) => ({
        x,
        y,
        i,
        distance: (x - hx) * dx + (y - hy) * dy,
      }))
      .filter(
        ({ x, y, distance }) => distance > 0 && (dx ? y === hy : x === hx),
      );
  };
  for (const [from, to] of edges(c.body))
    ck(
      contacts(from, to).some(
        (pt) => pt.i < l.arrows[b[from]].points.length - 1,
      ),
      `body contact ${from}>${to}`,
    );
  for (const [from, to] of edges(c.far))
    ck(
      contacts(from, to).some((pt) => pt.distance >= 4),
      `distant contact ${from}>${to}`,
    );
  for (const [from, to] of edges(c.gap)) {
    const a = l.arrows[b[to]],
      [dx, dy] = direction(a),
      [hx, hy] = a.points.at(-1);
    ck(
      contacts(from, to).some((pt) => {
        let emptyRun = 0;
        for (let step = 1; step < pt.distance; step++) {
          const x = hx + step * dx,
            y = hy + step * dy;
          const excluded = !inside({ size: l.size, shape: record.shape }, x, y);
          emptyRun = excluded ? emptyRun + 1 : 0;
          if (emptyRun >= 1) return true;
        }
        return false;
      }),
      `visible gap ${from}>${to}`,
    );
  }
  for (const role of (c.long || '').split(',').filter(Boolean))
    ck(l.arrows[b[role]].points.length >= 6, `long body ${role}`);
  if (c.distinctContacts)
    ck(
      new Set(
        edges(c.distinctContacts).flatMap(([a, b]) =>
          contacts(a, b).map(({ x, y }) => `${x},${y}`),
        ),
      ).size >= edges(c.distinctContacts).length,
      'distinct contact cells',
    );
  const milestones = [];
  for (const [pivot, children] of Object.entries(c.release || {})) {
    const x = b[pivot],
      cs = children.split(',').map((r) => b[r]),
      before = new Set([...all.closures[x]].filter((i) => i !== x));
    for (const child of cs)
      for (const parent of d[child])
        if (parent !== x) for (const i of all.closures[parent]) before.add(i);
    ck(
      !before.has(x) && !cs.some((i) => before.has(i)),
      'release prefix retains its pivot and branches',
    );
    let r = newRun(id);
    for (const i of [...before].sort((a, b) => b - a)) {
      ck(!blockers(l, r.removed, i).length, 'legal release prefix');
      r = act(l, r, { type: 'tap', id: i });
    }
    ck(!isComplete(l, r), 'release happens before completion');
    ck(
      cs.every((i) => blockers(l, r.removed, i).includes(x)),
      'branches blocked before pivot',
    );
    r = act(l, r, { type: 'tap', id: x });
    ck(
      cs.every((i) => !blockers(l, r.removed, i).length),
      'branches legal after pivot',
    );
    ck(
      [...before].filter((i) => !need.has(i)).length <=
        (l.objective ? l.objective.moves - need.size : 0),
      'release witness fits move slack',
    );
    milestones.push({
      pivot: x,
      before: [...before],
      newlyLegal: cs,
      related: cs.filter((i) => need.has(i)),
    });
  }
  assert.deepEqual(
    [...need].sort((a, b) => a - b),
    record.required,
    `C${id}: engine target closure`,
  );
  let replay = newRun(id);
  for (const arrowId of record.solution) {
    ck(!isComplete(l, replay), 'recorded route has no redundant tail');
    ck(!blockers(l, replay.removed, arrowId).length, 'recorded route is legal');
    replay = act(l, replay, { type: 'tap', id: arrowId });
  }
  ck(isComplete(l, replay), 'recorded route reaches the goal');
  // WL fingerprints are a conservative duplicate screen, not proof of non-isomorphism.
  let labels = l.arrows.map(
    (a) =>
      `${targets.includes(a.id) ? 'target' : 'ordinary'}:${a.key || ''}:${a.lock || ''}:${need.has(a.id)}`,
  );
  for (let round = 0; round < 8; round++)
    labels = labels.map((label, i) =>
      hash(
        JSON.stringify([
          label,
          d[i].map((j) => labels[j]).sort(),
          d
            .flatMap((parents, j) => (parents.includes(i) ? [labels[j]] : []))
            .sort(),
        ]),
      ),
    );
  const fingerprint = hash(labels.slice().sort().join('|'));
  if (graphSignatures.has(fingerprint))
    duplicates.push([graphSignatures.get(fingerprint), id]);
  else graphSignatures.set(fingerprint, id);
  summaries.push({
    id,
    arrows: l.arrows.length,
    required: need.size,
    depth: Math.max(...targets.map((i) => all.depths[i]), 0),
    opening: free.length,
    relatedOpening: free.filter((i) => need.has(i)).length,
    optionalRegions,
    milestones,
    fingerprint,
  });
}
assert.equal(
  duplicates.length,
  0,
  `Potential duplicate dependency graphs: ${JSON.stringify(duplicates)}`,
);
fs.writeFileSync(
  new URL('../docs/level-design-300/production-audit.json', import.meta.url),
  JSON.stringify(
    {
      revision: 4,
      formalCount: 300,
      ruleAndContractChecks: 'passed',
      humanExperienceValidated: false,
      duplicateScreen:
        '8-round WL including goals, keys, locks and target relevance; not a proof of non-isomorphism',
      levels: summaries,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'PASS 300 engine-derived contracts, masks, budgets, region checks and authored release witnesses. Human experience is not measured by this audit.',
);
