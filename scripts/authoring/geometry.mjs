// Offline geometry candidate construction. No runtime generation.
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
export function inside(p, x, y) {
  if (x < 0 || y < 0 || x >= p.size || y >= p.size) return false;
  if (p.corridor && x === p.corridor.x && y < p.corridor.y) return false;
  const c = (p.size - 1) / 2,
    dx = Math.abs(x - c),
    dy = Math.abs(y - c);
  switch (p.shape) {
    case 'three-islands':
      return x !== Math.floor(p.size / 3) && x !== Math.floor((p.size * 2) / 3);
    case 'four-islands':
      return x !== Math.floor(c) && y !== Math.floor(c);
    case 'six-windows':
      return (
        x !== Math.floor(p.size / 3) &&
        x !== Math.floor((p.size * 2) / 3) &&
        y !== Math.floor(c)
      );
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
export function construct(p, trial) {
  const { id, size, target } = p,
    rng = random(id * 104729 + trial * 7919 + 96319);
  const occupied = new Uint8Array(size * size),
    paths = [],
    rayOwners = Array.from({ length: size * size }, () => []);
  let deps = [],
    m = metrics(deps);
  let placingAnchor = false;
  const allowed = (x, y) =>
    inside(p, x, y) &&
    !occupied[y * size + x] &&
    (placingAnchor ||
      !p.corridor ||
      x !== p.corridor.x ||
      y < p.corridor.y ||
      y > p.corridor.y + 2);
  let long = p.kind === 'long';
  const opening = p.exits
    ? Math.floor((p.exits[0] + p.exits[1]) / 2)
    : target >= 40
      ? 5
      : 3;
  const attempts = p.attempts || (long ? 750 : 450);
  for (let n = 0; n < target; n++) {
    placingAnchor = Boolean(p.corridor && n === target - 1);
    long = p.kind === 'long' || (p.kind === 'mixed' && rng() < 0.28);
    let best = null,
      bestScore = -Infinity;
    const heads = [];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (!allowed(x, y)) continue;
        for (const [dx, dy] of dirs) {
          if (!allowed(x - dx, y - dy)) continue;
          if (
            placingAnchor &&
            (x !== p.corridor.x || y !== p.corridor.y || dx !== 0 || dy !== -1)
          )
            continue;
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
      const wanted = placingAnchor
        ? p.corridor.length || 3
        : long
          ? 6 + Math.floor(rng() * 3)
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
      if (placingAnchor && points.length < 3) continue;
      if (!placingAnchor && long && points.length < 6) continue;
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
