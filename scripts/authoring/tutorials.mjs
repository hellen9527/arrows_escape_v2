import fs from 'node:fs';
import { construct } from './geometry.mjs';
import { bind } from './bind.mjs';
const cards = [
  {},
  {},
  { g: 'X>P,Y>X' },
  { g: 'X>P,X>Q,Y>X' },
  { targets: 'P', g: 'X>P,U>X' },
  { targets: 'P,Q', g: 'X>P,X>Q,U>X', unrelated: 'D', free: 'D' },
  {
    targets: 'P,Q',
    g: 'Y>X,X>Q,U>P',
    keys: { A: 'A' },
    locks: { X: 'A' },
    unrelated: 'D',
    free: 'D',
  },
  {
    targets: 'P,Q',
    g: 'X>P,Y>Q,U>A',
    keys: { A: 'A', B: 'B' },
    locks: { B: 'A', Y: 'B' },
    unrelated: 'D',
    free: 'D',
  },
];
const out = [];
for (let id = 1; id <= 8; id++) {
  const target = [6, 10, 14, 18, 20, 22, 24, 26][id - 1];
  const p = {
    id,
    size: [7, 9, 11, 11, 13, 13, 13, 15][id - 1],
    target,
    depth: id < 3 ? 3 : 6,
    shape: 'square',
    kind: 'normal',
    clear: id <= 4,
    tutorial: true,
    slack: id === 6 ? 4 : 3,
  };
  if (id === 1) {
    out.push({
      id,
      size: 7,
      shape: 'square',
      kind: 'tutorial',
      paths: [
        [
          [1, 1],
          [1, 0],
        ],
        [
          [2, 0],
          [3, 0],
        ],
        [
          [5, 2],
          [6, 2],
        ],
        [
          [5, 5],
          [5, 6],
        ],
        [
          [3, 6],
          [2, 6],
        ],
        [
          [1, 4],
          [0, 4],
        ],
      ],
      keys: {},
      locks: {},
    });
    continue;
  }
  let level;
  for (let trial = 0; trial < 500; trial++) {
    const candidate = construct(p, trial);
    level = bind(p, candidate, cards[id - 1]);
    if (level) break;
  }
  if (!level) throw Error('Tutorial failed ' + id);
  const {
    binding,
    required,
    solution: _solution,
    opening: _opening,
    depth: _depth,
    trial: _trial,
    ...data
  } = level;
  out.push(data);
  console.log(
    JSON.stringify({ id, arrows: target, binding, required: required.length }),
  );
}
fs.writeFileSync(
  new URL('../../lib/game/tutorial-data.ts', import.meta.url),
  '// Fixed practice boards, authored offline.\nimport type { ChallengeData } from "./challenge-data.ts";\nexport const tutorialData: ChallengeData[] = ' +
    JSON.stringify(out) +
    ';\n',
);
