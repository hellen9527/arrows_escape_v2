import fs from 'node:fs';
import { encodeRoute } from '../lib/game/route-codec.ts';
import assert from 'node:assert/strict';
import { inspectWeave, weaveFailures } from './authoring/weave-metrics.mjs';
import { weaveProfile } from './authoring/weave-profile.mjs';
const root = new URL('../', import.meta.url),
  records = [];
for (let id = 1; id <= 300; id++) {
  const r = JSON.parse(
    fs.readFileSync(new URL(`work/authoring-v5/${id}.json`, root), 'utf8'),
  );
  assert.deepEqual(r.profile, weaveProfile(id));
  const b = r.board,
    m = inspectWeave({
      ...b,
      arrows: b.paths.map((points, id) => ({
        id,
        points,
        key: b.keys[id],
        lock: b.locks[id],
      })),
    });
  assert.deepEqual(weaveFailures(r.profile, m), [], `C${id}`);
  const { geo: _geo, deps: _deps, ...metrics } = m;
  r.metrics = metrics;
  records.push(r);
}
const header =
  "// Fixed v5 boards selected offline. Routes decode only when a board is opened.\nimport {decodeRoute} from './route-codec.ts';\nexport type ChallengeData = { id:number; size:number; shape:string; kind:string; paths:number[][][]; keys:Record<number,string>; locks:Record<number,string>; objective?:{type:'rescue'; targets:number[]; moves:number} };\ntype Packed = Omit<ChallengeData,'paths'> & {routes:string[]};\nconst packed: Packed[] = [\n";
const packed = records.map(({ board: { paths, ...rest } }) => ({
  ...rest,
  routes: paths.map(encodeRoute),
}));
fs.writeFileSync(
  new URL('lib/game/challenge-data.ts', root),
  header +
    packed.map((r) => JSON.stringify(r)).join(',\n') +
    '\n];\nexport const challengeData: ChallengeData[] = packed.map(({routes,...rest})=>({...rest,get paths(){return routes.map(decodeRoute);}}));\n',
);
const styles = {
  weave: ['四向编织', 'Four-way weave'],
  bridges: ['长桥牵引', 'Long bridges'],
  folds: ['折返迷阵', 'Folded routes'],
  windows: ['环窗追踪', 'Window routes'],
  wings: ['双翼连锁', 'Linked wings'],
};
const labels = records.map(({ profile: p, metrics: m }) => ({
  id: p.id,
  title: [`${styles[p.style][0]} · ${p.id}`, `${styles[p.style][1]} · ${p.id}`],
  focus: p.targets
    ? [
        '从星标反向追踪阻挡；先判断哪些支路必须解开。',
        'Trace back from the stars and identify the branches they need.',
      ]
    : [
        '沿尖端追踪长线；解开交织的阻挡，清空整盘。',
        'Follow the tips and untangle the long routes to clear the board.',
      ],
  tier: p.relief ? 'relief' : p.hard ? 'hard' : 'normal',
  shape: p.style,
  kind: 'woven',
  targets: p.targets,
  keyGroups: p.keys,
  target: p.target,
  size: p.size,
  depth: m.depth,
}));
fs.writeFileSync(
  new URL('lib/game/challenge-briefs.ts', root),
  '// 5.0 player-facing labels.\nexport const challengeBriefs = ' +
    JSON.stringify(labels) +
    ';\n',
);
const levels = records.map(({ profile: p, trial, metrics: m }) => ({
  number: p.id,
  profile: p,
  trial,
  targetCount: p.targets,
  keyGroups: p.keys,
  candidateArrowRange: [p.target, p.target],
  candidateMoveSlack: p.slack,
  designIntent: p.relief ? 'relief' : p.hard ? 'challenge' : 'normal',
  metrics: {
    ...m,
    policies: m.policies.map(
      ({ openings: _openings, order: _order, ...rest }) => rest,
    ),
  },
  solution: m.policies[0].order,
}));
fs.writeFileSync(
  new URL('docs/level-design-300/v5-catalog.json', root),
  JSON.stringify(
    { revision: 5, humanExperienceValidated: false, levels },
    null,
    2,
  ) + '\n',
);
console.log(
  'Assembled 300 v5 fixed boards. Run independent audit before publishing.',
);
