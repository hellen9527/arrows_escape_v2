import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { contracts } from './authoring/contracts.mjs';
import { profile } from './authoring/profile.mjs';
const root = new URL('../', import.meta.url);
const briefs = JSON.parse(
  fs.readFileSync(
    new URL('docs/level-design-300/design-briefs.json', root),
    'utf8',
  ),
).levels;
const boards = briefs.map((b) =>
  JSON.parse(
    fs.readFileSync(new URL(`work/authoring-v4/${b.id}.json`, root), 'utf8'),
  ),
);
for (const [i, board] of boards.entries()) {
  const c = contracts[briefs[i].number],
    p = profile(briefs[i], c);
  assert.deepEqual(board.contract, c, `Stale contract: ${board.card}`);
  assert.equal(
    board.signature,
    createHash('sha256').update(JSON.stringify({ c, p })).digest('hex'),
    `Stale profile: ${board.card}`,
  );
}
const compact = boards.map(
  ({ id, size, shape, kind, paths, keys, locks, objective }) => ({
    id,
    size,
    shape,
    kind,
    paths,
    keys,
    locks,
    ...(objective ? { objective } : {}),
  }),
);
const dataType =
  "export type ChallengeData = { id:number; size:number; shape:string; kind:string; paths:number[][][]; keys:Record<number,string>; locks:Record<number,string>; objective?:{type:'rescue'; targets:number[]; moves:number} };\n";
fs.writeFileSync(
  new URL('lib/game/challenge-data.ts', root),
  '// Fixed v4 layouts. Authored offline; restarting or reloading uses the same board.\n' +
    dataType +
    'export const challengeData: ChallengeData[] = ' +
    JSON.stringify(compact) +
    ';\n',
);
const titles = [
  'Trace the goal',
  'Shared routes',
  'Across the gap',
  'Keys and exits',
  'Two-key connections',
  'Three-star overlaps',
  'Woven regions',
  'Several openings',
  'Moves that matter',
  'Bring it together',
];
const runtime = briefs.map((b, i) => ({
  id: b.number,
  title: [b.title, `${titles[b.stage - 1]} · ${b.number}`],
  focus:
    b.objective === 'rescue'
      ? [
          '沿星标出口追踪阻挡；普通箭头可以留下。',
          'Trace the starred exits. Ordinary arrows may stay.',
        ]
      : [
          '看清尖端方向，移走全部箭头。',
          'Follow each tip and free every arrow.',
        ],
  tier:
    b.designIntent === 'relief'
      ? 'relief'
      : ['assessment', 'challenge'].includes(b.designIntent)
        ? 'hard'
        : 'normal',
  shape: boards[i].shape,
  kind: boards[i].kind,
  targets: b.targetCount,
  keyGroups: b.keyGroups,
  target: boards[i].paths.length,
  size: boards[i].size,
  depth: boards[i].depth,
}));
fs.writeFileSync(
  new URL('lib/game/challenge-briefs.ts', root),
  '// Player-facing labels; production contracts live in scripts/authoring.\nexport const challengeBriefs = ' +
    JSON.stringify(runtime) +
    ';\n',
);
fs.writeFileSync(
  new URL('docs/level-design-300/production-bindings.json', root),
  JSON.stringify(
    {
      revision: 4,
      mode: 'fixed_offline_authored',
      humanExperienceValidated: false,
      levels: boards.map(({ paths: _paths, ...b }) => b),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Assembled 300 fixed boards and production bindings. Independent geometry audit is still required.',
);
