/** Offline-only constructive search. Nothing in the game imports this script.
 * Every inserted arrow has a clear exit against earlier arrows, so removing in
 * reverse insertion order is a solution. Scoring favors blocking existing exits,
 * branching, and a bounded dependency depth. The checked-in output is the game.
 */
import fs from 'node:fs';
const dirs = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
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
function rays(points, size) {
  const [hx, hy] = points.at(-1),
    [px, py] = points.at(-2),
    dx = hx - px,
    dy = hy - py;
  const r = [];
  for (
    let x = hx + dx, y = hy + dy;
    x >= 0 && y >= 0 && x < size && y < size;
    x += dx, y += dy
  )
    r.push(y * size + x);
  return r;
}
function metrics(arrows, size) {
  const owner = new Map(
    arrows.flatMap((a, i) => a.map(([x, y]) => [y * size + x, i])),
  );
  const deps = arrows.map((a) => [
    ...new Set(
      rays(a, size)
        .filter((c) => owner.has(c))
        .map((c) => owner.get(c)),
    ),
  ]);
  const depth = Array(arrows.length).fill(1),
    outgoing = Array(arrows.length).fill(0);
  for (let i = arrows.length - 1; i >= 0; i--)
    for (const d of deps[i]) {
      if (d <= i) throw Error('Construction violated reverse order');
      depth[i] = Math.max(depth[i], depth[d] + 1);
      outgoing[d]++;
    }
  const waves = Array(Math.max(0, ...depth)).fill(0);
  for (const d of depth) waves[d - 1]++;
  let run = 0,
    maxRun = 0;
  for (const width of waves) {
    run = width === 1 ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  return {
    maxRun,
    deps,
    depth: waves.length,
    waves,
    free: waves[0] || 0,
    merges: deps.filter((d) => d.length >= 2).length,
    shared: Math.max(0, ...outgoing),
    singles: waves.filter((w) => w === 1).length,
  };
}
function profile(id) {
  if (id <= 3)
    return {
      size: 7,
      target: [5, 7, 9][id - 1],
      depth: [3, 4, 5][id - 1],
      minDepth: [2, 3, 4][id - 1],
      mask: 0,
    };
  const group = Math.floor((id - 1) / 6),
    pos = (id - 1) % 6,
    relief = pos === 0;
  if (relief)
    return {
      size: group <= 2 ? 9 : 10,
      target: 14 + (group > 2 ? 2 : 0),
      depth: 5 + Math.floor(group / 2),
      minDepth: 5,
      mask: group % 3,
    };
  const targets = [
    [0, 0, 0, 13, 15, 18],
    [0, 16, 17, 18, 19, 20],
    [0, 18, 20, 21, 22, 24],
    [0, 21, 22, 23, 24, 26],
    [0, 24, 25, 26, 28, 30],
  ];
  const peaks = [7, 9, 11, 13, 15];
  return {
    size: 9 + group,
    target: targets[group][pos],
    depth: peaks[group] - (5 - pos),
    minDepth:
      pos === 5
        ? [7, 9, 10, 12, 14][group]
        : Math.max(5, peaks[group] - (5 - pos) - 1),
    mask: (id + group) % 4,
  };
}
function construct(id, trial) {
  const p = profile(id),
    { size, target } = p,
    rng = random(id * 104729 + trial * 7919 + 6287);
  const occupied = new Set(),
    arrows = [],
    arrowRays = [];
  const allowed = (x, y) =>
    x >= 0 &&
    y >= 0 &&
    x < size &&
    y < size &&
    !occupied.has(y * size + x) &&
    !(
      p.mask === 1 &&
      (x === 0 || x === size - 1) &&
      (y === 0 || y === size - 1)
    ) &&
    !(
      p.mask === 2 &&
      Math.abs(x - (size - 1) / 2) + Math.abs(y - (size - 1) / 2) > size - 1
    ) &&
    !(p.mask === 3 && x >= size - 2 && y >= size - 2);
  let m = metrics(arrows, size);
  for (let n = 0; n < target; n++) {
    let best = null,
      bestScore = -Infinity;
    for (let attempt = 0; attempt < 850; attempt++) {
      const x = Math.floor(rng() * size),
        y = Math.floor(rng() * size),
        [dx, dy] = dirs[Math.floor(rng() * 4)];
      if (!allowed(x, y) || !allowed(x - dx, y - dy)) continue;
      const ray = [];
      let clear = true;
      for (
        let a = x + dx, b = y + dy;
        a >= 0 && b >= 0 && a < size && b < size;
        a += dx, b += dy
      ) {
        const c = b * size + a;
        ray.push(c);
        if (occupied.has(c)) {
          clear = false;
          break;
        }
      }
      if (!clear) continue;
      const headFirst = [
          [x, y],
          [x - dx, y - dy],
        ],
        cells = new Set([y * size + x, (y - dy) * size + x - dx]);
      const maxLength = 2 + Math.floor(rng() * 4);
      for (let k = 2; k < maxLength; k++) {
        const [tx, ty] = headFirst.at(-1),
          prev = headFirst.at(-2);
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
          ([a, b]) => a - tx === tx - prev[0] && b - ty === ty - prev[1],
        );
        const next =
          straight && rng() < 0.55
            ? straight
            : options[Math.floor(rng() * options.length)];
        headFirst.push(next);
        cells.add(next[1] * size + next[0]);
      }
      const hits = [];
      let freeHits = 0;
      for (let i = 0; i < n; i++)
        if (arrowRays[i].some((c) => cells.has(c))) {
          hits.push(i);
          if (!m.deps[i].length) freeHits++;
        }
      const free = m.free + 1 - freeHits;
      if (n >= 3 && (free < 2 || free > 5)) continue;
      const candidate = headFirst.reverse();
      const nm = metrics([...arrows, candidate], size);
      if (nm.depth > p.depth + 1) continue;
      const desiredDepth = Math.min(
        p.depth,
        Math.floor(((n + 1) * p.depth) / (target - 3)) + 1,
      );
      const desiredFree = id <= 3 ? 2 : 2 + (id % 2);
      const score =
        hits.length * 1.1 +
        freeHits * 0.6 -
        Math.abs(free - desiredFree) * 2.8 -
        Math.abs(nm.depth - desiredDepth) * 2 +
        Math.min(nm.merges, 6) * 0.25 +
        (candidate.length >= 3 ? 0.5 : -0.8) -
        (candidate.length > 4 ? (candidate.length - 4) * 0.35 : 0) +
        rng() * 3;
      if (score > bestScore) {
        bestScore = score;
        best = { candidate, ray, cells, nm };
      }
    }
    if (!best) break;
    arrows.push(best.candidate);
    arrowRays.push(best.ray);
    for (const c of best.cells) occupied.add(c);
    m = best.nm;
  }
  return { arrows, size, m };
}
function acceptable(id, result) {
  const p = profile(id),
    m = result.m;
  return (
    result.arrows.length >= (id <= 3 ? p.target : Math.max(12, p.target - 3)) &&
    m.depth >= p.minDepth &&
    m.depth <= p.depth + 1 &&
    (id <= 3 ||
      (m.free >= 2 &&
        m.free <= 5 &&
        m.merges >= 3 &&
        m.shared >= 3 &&
        Math.max(...m.waves) >= 3 &&
        m.singles <= Math.ceil(m.depth * 0.6) &&
        m.maxRun <= 3))
  );
}
function score(result, p) {
  const m = result.m;
  return (
    result.arrows.length * 0.3 -
    Math.abs(m.depth - p.depth) * 4 -
    Math.abs(m.free - 3) * 1.5 +
    m.merges * 0.25 +
    Math.min(m.shared, 6) * 0.5 -
    m.singles * 0.8 -
    m.maxRun * 0.7
  );
}
const start = Number(process.argv[2] || 1),
  end = Number(process.argv[3] || 30),
  results = [];
for (let id = start; id <= end; id++) {
  let best = null,
    bestScore = -Infinity;
  for (let trial = 0; trial < 600; trial++) {
    const result = construct(id, trial);
    if (acceptable(id, result)) {
      const s = score(result, profile(id));
      if (s > bestScore) {
        best = result;
        bestScore = s;
      }
    }
    if (best && trial >= 80) break;
  }
  if (!best) throw Error(`No suitable challenge ${id}`);
  results.push({ id, size: best.size, paths: best.arrows });
  console.log(
    JSON.stringify({
      id,
      arrows: best.arrows.length,
      ...best.m,
      deps: undefined,
    }),
  );
}
if (start === 1 && end === 30)
  fs.writeFileSync(
    new URL('../lib/game/challenge-data.ts', import.meta.url),
    '// Static original layouts selected by scripts/generate-challenges.mjs. No runtime search.\nexport const challengeData = ' +
      JSON.stringify(results, null, 0) +
      ';\n',
  );
else
  fs.writeFileSync(
    `/tmp/challenge-subset-${start}-${end}.json`,
    JSON.stringify(results),
  );
