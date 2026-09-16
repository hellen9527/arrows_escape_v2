import fs from 'node:fs';
import assert from 'node:assert/strict';
import { encodeRoute } from '../lib/game/route-codec.ts';
import {
  expansionProfile,
  expansionLabels,
} from './authoring/expansion-profile.mjs';
import {
  inspectExpansion,
  expansionFailures,
} from './authoring/expansion-metrics.mjs';
const root = new URL('../', import.meta.url),
  records = [];
for (let id = 301; id <= 800; id++) {
  const r = JSON.parse(
    fs.readFileSync(new URL(`work/authoring-expansion/${id}.json`, root)),
  );
  assert.deepEqual(r.profile, expansionProfile(id));
  const b = r.board,
    m = inspectExpansion({
      ...b,
      arrows: b.paths.map((points, id) => ({
        id,
        points,
        key: b.keys[id],
        lock: b.locks[id],
      })),
    });
  assert.deepEqual(expansionFailures(r.profile, m), [], `C${id}`);
  const { geo: _g, deps: _d, ...metrics } = m;
  records.push({ ...r, metrics });
}
const packed = records.map(({ board: { paths, ...b } }) => ({
  ...b,
  routes: paths.map(encodeRoute),
}));
fs.writeFileSync(
  new URL('lib/game/expansion-data.ts', root),
  `// Fixed, offline validated expansion. Original 300 boards are untouched.\nimport type { ChallengeData } from './challenge-data.ts';\nimport { decodeRoute } from './route-codec.ts';\ntype Packed = Omit<ChallengeData,'paths'> & {routes:string[]};\nconst packed: Packed[] = [\n${packed.map((x) => JSON.stringify(x)).join(',\n')}\n];\nexport const expansionData: ChallengeData[] = packed.map(({routes,...rest})=>({...rest,get paths(){return routes.map(decodeRoute);}}));\n`,
);
fs.writeFileSync(
  new URL('lib/game/expansion-briefs.ts', root),
  'export const expansionBriefs = ' +
    JSON.stringify(records.map((r) => expansionLabels(r.profile))) +
    ';\n',
);
const levels = records.map(
  ({ profile, trial, metrics: { policies, ...metrics } }) => ({
    profile,
    trial,
    metrics: {
      ...metrics,
      policies: policies.map(({ order: _o, openings: _a, ...x }) => x),
    },
    solution: policies[0].order,
  }),
);
fs.writeFileSync(
  new URL('docs/level-design-expansion/catalog.json', root),
  JSON.stringify(
    { first: 301, last: 800, humanExperienceValidated: false, levels },
    null,
    2,
  ) + '\n',
);
console.log(
  'Assembled 500 fixed expansion boards; independent engine audit still required.',
);
