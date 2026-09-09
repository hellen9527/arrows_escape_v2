/** Offline authoring only. Each path is inserted with an unobstructed ray, so
 * reverse insertion is a solution. Locks point to later key IDs too. The game
 * imports only the checked-in output; it never searches or generates a board.
 */
import fs from 'node:fs';
const dirs = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const tutorials = [
  {
    id: 1,
    size: 7,
    paths: [
      [
        [1, 6],
        [2, 6],
        [2, 5],
        [2, 4],
      ],
      [
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
      [
        [0, 3],
        [1, 3],
        [2, 3],
      ],
      [
        [4, 4],
        [3, 4],
        [3, 3],
        [3, 2],
        [2, 2],
      ],
      [
        [5, 0],
        [5, 1],
        [5, 2],
        [5, 3],
      ],
    ],
  },
  {
    id: 2,
    size: 7,
    paths: [
      [
        [0, 5],
        [1, 5],
        [2, 5],
      ],
      [
        [4, 6],
        [3, 6],
        [3, 5],
        [3, 4],
      ],
      [
        [5, 5],
        [4, 5],
        [4, 4],
      ],
      [
        [4, 2],
        [5, 2],
        [6, 2],
      ],
      [
        [4, 0],
        [3, 0],
        [2, 0],
      ],
      [
        [1, 1],
        [1, 0],
        [0, 0],
      ],
      [
        [5, 3],
        [4, 3],
        [3, 3],
        [2, 3],
      ],
    ],
  },
  {
    id: 3,
    size: 7,
    paths: [
      [
        [4, 1],
        [4, 2],
        [4, 3],
      ],
      [
        [5, 5],
        [4, 5],
        [3, 5],
        [2, 5],
      ],
      [
        [4, 6],
        [5, 6],
        [6, 6],
      ],
      [
        [1, 6],
        [1, 5],
        [1, 4],
      ],
      [
        [1, 0],
        [0, 0],
        [0, 1],
      ],
      [
        [1, 2],
        [0, 2],
        [0, 3],
        [0, 4],
        [0, 5],
      ],
      [
        [5, 4],
        [4, 4],
        [3, 4],
        [3, 3],
      ],
      [
        [2, 2],
        [3, 2],
        [3, 1],
      ],
      [
        [1, 1],
        [2, 1],
        [2, 0],
        [3, 0],
      ],
    ],
  },
];

// Rhythm is deliberately discontinuous: small rests, long ribbons, staged
// keys, dense short-path weaves, then a large peak. Shapes have real voids.
const profiles = [
  [4, 13, 22, 'diamond', 'weave', 7],
  [5, 11, 16, 'cross', 'keys', 6],
  [6, 17, 38, 'hourglass', 'rush', 10],
  [7, 11, 12, 'diamond', 'relief', 5],
  [8, 15, 30, 'ring', 'weave', 8],
  [9, 17, 42, 'wings', 'rush', 10],
  [10, 17, 18, 'diamond', 'long', 8],
  [11, 19, 48, 'cross', 'keys', 11],
  [12, 21, 60, 'ring', 'rush', 13],
  [13, 11, 16, 'hourglass', 'relief', 6],
  [14, 17, 36, 'islands', 'weave', 9],
  [15, 19, 52, 'diamond', 'rush', 12],
  [16, 19, 24, 'ring', 'long', 10],
  [17, 19, 44, 'wings', 'keys', 11],
  [18, 23, 64, 'cross', 'rush', 14],
  [19, 13, 18, 'diamond', 'relief', 6],
  [20, 19, 46, 'hourglass', 'weave', 11],
  [21, 21, 62, 'ring', 'rush', 13],
  [22, 21, 28, 'islands', 'long', 11],
  [23, 21, 58, 'diamond', 'keys', 13],
  [24, 23, 72, 'wings', 'rush', 15],
  [25, 13, 20, 'cross', 'relief', 7],
  [26, 21, 54, 'hourglass', 'weave', 12],
  [27, 23, 68, 'islands', 'rush', 14],
  [28, 23, 34, 'ring', 'long', 12],
  [29, 23, 64, 'diamond', 'keys', 14],
  [30, 23, 80, 'cross', 'rush', 16],
].map(([id, size, target, shape, kind, depth]) => ({
  id,
  size,
  target,
  shape,
  kind,
  depth,
}));

function random(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function inside(p, x, y) {
  if (x < 0 || y < 0 || x >= p.size || y >= p.size) return false;
  const c = (p.size - 1) / 2,
    dx = Math.abs(x - c),
    dy = Math.abs(y - c);
  switch (p.shape) {
    case 'diamond':
      return dx + dy <= Math.floor(p.size * 0.67);
    case 'ring':
      return Math.max(dx, dy) >= Math.ceil(p.size * 0.25);
    case 'hourglass':
      return dx <= Math.max(Math.ceil(p.size * 0.17), dy + 1);
    case 'cross':
      return Math.min(dx, dy) <= Math.floor(p.size * 0.23);
    case 'wings':
      return !(
        dx <= Math.floor(p.size * 0.12) && dy > Math.floor(p.size * 0.2)
      );
    case 'islands':
      return dx >= 2;
    default:
      return true;
  }
}
function metrics(deps) {
  const depths = Array(deps.length).fill(1),
    outgoing = Array(deps.length).fill(0);
  for (let i = deps.length - 1; i >= 0; i--)
    for (const d of deps[i]) {
      if (d <= i) throw Error('Dependency violates reverse insertion order');
      depths[i] = Math.max(depths[i], depths[d] + 1);
      outgoing[d]++;
    }
  const waves = Array(Math.max(0, ...depths)).fill(0);
  for (const d of depths) waves[d - 1]++;
  let run = 0,
    maxRun = 0;
  for (const w of waves) {
    run = w === 1 ? run + 1 : 0;
    maxRun = Math.max(run, maxRun);
  }
  return {
    depths,
    waves,
    depth: waves.length,
    free: waves[0] || 0,
    merges: deps.filter((d) => d.length >= 2).length,
    shared: Math.max(0, ...outgoing),
    singles: waves.filter((w) => w === 1).length,
    maxRun,
  };
}
function construct(p, trial) {
  const { id, size, target } = p,
    rng = random(id * 104729 + trial * 7919 + 96319);
  const occupied = new Uint8Array(size * size),
    paths = [],
    rayOwners = Array.from({ length: size * size }, () => []);
  let deps = [],
    m = metrics(deps);
  const allowed = (x, y) => inside(p, x, y) && !occupied[y * size + x];
  const long = p.kind === 'long',
    opening = target >= 40 ? 5 : 3;
  const attempts = long ? 1100 : 650;
  for (let n = 0; n < target; n++) {
    let best = null,
      bestScore = -Infinity;
    const heads = [];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (!allowed(x, y)) continue;
        for (const [dx, dy] of dirs) {
          if (!allowed(x - dx, y - dy)) continue;
          const ray = [];
          let clear = true;
          for (
            let a = x + dx, b = y + dy;
            a >= 0 && b >= 0 && a < size && b < size;
            a += dx, b += dy
          ) {
            const cell = b * size + a;
            if (occupied[cell]) {
              clear = false;
              break;
            }
            ray.push(cell);
          }
          if (clear) heads.push({ x, y, dx, dy, ray });
        }
      }
    if (!heads.length) break;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const { x, y, dx, dy, ray } = heads[Math.floor(rng() * heads.length)];
      const points = [
          [x, y],
          [x - dx, y - dy],
        ],
        cells = new Set([y * size + x, (y - dy) * size + x - dx]);
      const wanted = long
        ? 7 + Math.floor(rng() * 3)
        : 3 + Math.floor(rng() * 2);
      for (let k = 2; k < wanted; k++) {
        const [tx, ty] = points.at(-1),
          [px, py] = points.at(-2);
        const options = dirs
          .map(([a, b]) => [tx + a, ty + b])
          .filter(
            ([a, b]) =>
              allowed(a, b) &&
              !cells.has(b * size + a) &&
              !(dx ? b === y && (a - x) * dx > 0 : a === x && (b - y) * dy > 0),
          );
        if (!options.length) break;
        const straight = options.find(
          ([a, b]) => a - tx === tx - px && b - ty === ty - py,
        );
        const next =
          straight && rng() < (long ? 0.35 : 0.55)
            ? straight
            : options[Math.floor(rng() * options.length)];
        points.push(next);
        cells.add(next[1] * size + next[0]);
      }
      if (long && points.length < 6) continue;
      const hits = new Set();
      for (const cell of cells)
        for (const owner of rayOwners[cell]) hits.add(owner);
      let freeHits = 0;
      for (const hit of hits) if (!deps[hit].length) freeHits++;
      const free = m.free + 1 - freeHits;
      if (n >= opening && (free < 2 || free > opening + 4)) continue;
      const nextDeps = [
        ...deps.map((d, i) => (hits.has(i) ? [...d, n] : d)),
        [],
      ];
      const nm = metrics(nextDeps);
      if (nm.depth > p.depth + 2) continue;
      const desiredDepth = Math.min(
        p.depth,
        Math.floor(((n + 1) * p.depth) / target) + 2,
      );
      const centerDistance =
        points.reduce(
          (sum, [a, b]) =>
            sum +
            Math.max(
              Math.abs(a - (size - 1) / 2),
              Math.abs(b - (size - 1) / 2),
            ),
          0,
        ) / points.length;
      const score =
        hits.size * 0.65 +
        freeHits * 0.25 -
        Math.abs(free - opening) * 2.2 -
        Math.abs(nm.depth - desiredDepth) * 1.2 +
        Math.min(nm.merges, 8) * 0.15 +
        (long
          ? points.length * 1.3
          : points.length === 3
            ? 0.6
            : points.length === 4
              ? 0.7
              : -1.5) -
        centerDistance * 1.6 +
        rng() * 4;
      if (score > bestScore) {
        bestScore = score;
        best = { points: points.reverse(), cells, ray, deps: nextDeps, m: nm };
      }
    }
    if (!best) break;
    paths.push(best.points);
    deps = best.deps;
    m = best.m;
    for (const cell of best.cells) occupied[cell] = 1;
    for (const cell of best.ray) rayOwners[cell].push(n);
  }
  return { paths, deps, m };
}
function addKeys(p, result) {
  if (![5, 11, 17, 18, 23, 24, 29, 30].includes(p.id))
    return { ...result, keys: {}, locks: {} };
  const { paths, m } = result,
    n = paths.length,
    keys = {},
    locks = {};
  const groups = p.id <= 11 ? 1 : 2;
  const candidates = Array.from({ length: n }, (_, i) => i)
    .filter((i) => i >= 5 && (p.id === 5 || result.deps[i].length))
    .sort((a, b) => b - a);
  for (let g = 0; g < groups; g++) {
    const letter = ['A', 'B'][g];
    let keyId, lockIds;
    for (const candidate of candidates) {
      if (keys[candidate] || locks[candidate]) continue;
      const available = Array.from({ length: candidate }, (_, i) => i)
        .filter((i) => !keys[i] && !locks[i])
        .sort((a, b) => m.depths[a] - m.depths[b]);
      if (available.length < 3 || m.depths[available[0]] > m.depths[candidate])
        continue;
      keyId = candidate;
      lockIds = available.slice(
        0,
        p.id === 5 ? 3 : Math.min(7, Math.max(4, Math.floor(n / 10))),
      );
      break;
    }
    if (keyId === undefined) return null;
    keys[keyId] = letter;
    for (const i of lockIds) locks[i] = letter;
    // Later dual-key boards stage B behind A, while preserving reverse order.
    if (g === 1 && p.id >= 23) {
      const a = Number(Object.keys(keys).find((i) => keys[i] === 'A'));
      if (keyId < a) locks[keyId] = 'A';
    }
  }
  const deps = result.deps.map((d, i) =>
    locks[i]
      ? [
          ...new Set([
            ...d,
            Number(Object.keys(keys).find((k) => keys[k] === locks[i])),
          ]),
        ]
      : d,
  );
  return { ...result, keys, locks, m: metrics(deps) };
}
function acceptable(p, r) {
  if (!r || r.paths.length !== p.target) return false;
  const { m } = r,
    count = r.paths.flat().length,
    average = count / p.target;
  let maskCells = 0;
  for (let y = 0; y < p.size; y++)
    for (let x = 0; x < p.size; x++) if (inside(p, x, y)) maskCells++;
  const points = r.paths.flat(),
    xs = points.map(([x]) => x),
    ys = points.map(([, y]) => y);
  return (
    m.free >= 2 &&
    m.free <= 12 &&
    m.depth >= (p.id % 6 === 0 ? [7, 9, 10, 11, 12][p.id / 6 - 1] : 4) &&
    m.depth <= 24 &&
    m.merges >= 3 &&
    m.shared >= 3 &&
    Math.max(...m.waves) >= 3 &&
    m.singles <= Math.ceil(m.depth * 0.6) &&
    m.maxRun <= 3 &&
    count >= maskCells * 0.35 &&
    Math.max(...xs) - Math.min(...xs) >= p.size - 3 &&
    Math.max(...ys) - Math.min(...ys) >= p.size - 3 &&
    (p.kind !== 'long' ||
      (average >= 6 &&
        average <= 9 &&
        r.paths.filter((a) => a.length >= 8).length >= p.target / 3))
  );
}
const start = Number(process.argv[2] || 1),
  end = Number(process.argv[3] || 30),
  results = [];
for (let id = start; id <= end; id++) {
  if (id <= 3) {
    results.push({
      ...tutorials[id - 1],
      shape: 'square',
      kind: 'tutorial',
      keys: {},
      locks: {},
    });
    continue;
  }
  const p = profiles.find((p) => p.id === id);
  let best = null,
    bestScore = -Infinity;
  for (let trial = 0; trial < 250; trial++) {
    const result = addKeys(p, construct(p, trial));
    if (acceptable(p, result)) {
      const score =
        -Math.abs(result.m.depth - p.depth) * 2 -
        result.m.singles +
        Math.min(result.m.shared, 8) +
        result.m.merges * 0.1;
      if (score > bestScore) {
        best = result;
        bestScore = score;
      }
    }
    if (best && trial >= 5) break;
    if (trial % 20 === 19)
      console.error(
        `search ${id} trial ${trial + 1}: ${result?.paths.length} arrows, ${JSON.stringify(result?.m)}, avg ${result && result.paths.flat().length / result.paths.length}`,
      );
  }
  if (!best) throw Error(`No suitable challenge ${id}`);
  results.push({
    id,
    size: p.size,
    shape: p.shape,
    kind: p.kind,
    paths: best.paths,
    keys: best.keys,
    locks: best.locks,
  });
  console.log(
    JSON.stringify({
      id,
      size: p.size,
      shape: p.shape,
      kind: p.kind,
      arrows: best.paths.length,
      average: Number(
        (best.paths.flat().length / best.paths.length).toFixed(2),
      ),
      ...best.m,
      depths: undefined,
    }),
  );
}
if (start === 1 && end === 30)
  fs.writeFileSync(
    new URL('../lib/game/challenge-data.ts', import.meta.url),
    '// Original static layouts, authored offline by scripts/generate-challenges.mjs. No runtime search.\nexport const challengeData = ' +
      JSON.stringify(results) +
      ';\n',
  );
else
  fs.writeFileSync(
    `/tmp/challenge-subset-${start}-${end}.json`,
    JSON.stringify(results),
  );
