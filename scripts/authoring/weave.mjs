// Deterministic offline reverse insertion. Later arrows may block earlier ones,
// while their own exit is clear at insertion: descending IDs always fully solve.
const directions = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
export function random(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function inShape(p, x, y) {
  const s = p.size,
    c = (s - 1) / 2,
    dx = Math.abs(x - c),
    dy = Math.abs(y - c);
  if (x < 0 || y < 0 || x >= s || y >= s) return false;
  if (p.style === 'windows') return !(dx < s * 0.1 && dy < s * 0.1);
  if (p.style === 'wings') return !(dx < s * 0.08 && dy > s * 0.32);
  if (p.style === 'bridges') return !(dy < s * 0.07 && dx > s * 0.3);
  return true;
}
export function weave(p, trial = 0) {
  const rng = random(79777 * p.id + 11117 * trial + 5917),
    s = p.size,
    occupied = new Int16Array(s * s).fill(-1),
    owners = Array.from({ length: s * s }, () => []),
    paths = [],
    deps = [],
    ancestors = [],
    up = [],
    dirs = [],
    headCounts = [0, 0, 0, 0],
    zoneDirs = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  let free = 0,
    maxDepth = 0;
  const available = (x, y) => inShape(p, x, y) && occupied[y * s + x] < 0;
  for (let n = 0; n < p.target; n++) {
    const heads = [];
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++)
        if (available(x, y))
          for (let d = 0; d < 4; d++) {
            const [dx, dy] = directions[d];
            if (!available(x - dx, y - dy)) continue;
            const ray = [];
            let clear = true;
            for (
              let a = x + dx, b = y + dy;
              a >= 0 && b >= 0 && a < s && b < s;
              a += dx, b += dy
            ) {
              if (occupied[b * s + a] >= 0) {
                clear = false;
                break;
              }
              ray.push(b * s + a);
            }
            if (clear) heads.push({ x, y, d, ray });
          }
    if (!heads.length) break;
    const long = rng() < (p.style === 'bridges' ? 0.35 : 0.22),
      wanted = long ? 16 + Math.floor(rng() * 7) : 8 + Math.floor(rng() * 5);
    let best,
      bestScore = -Infinity;
    for (let attempt = 0; attempt < 800; attempt++) {
      const h = heads[Math.floor(rng() * heads.length)],
        { x, y, d } = h,
        [dx, dy] = directions[d];
      const points = [
          [x, y],
          [x - dx, y - dy],
        ],
        cells = new Set([y * s + x, (y - dy) * s + x - dx]);
      let segment = 1,
        turns = 0;
      for (let k = 2; k < wanted; k++) {
        const [tx, ty] = points.at(-1),
          [px, py] = points.at(-2),
          vx = tx - px,
          vy = ty - py;
        const options = directions
          .map(([a, b]) => [tx + a, ty + b])
          .filter(
            ([a, b]) =>
              available(a, b) &&
              !cells.has(b * s + a) &&
              !(dx ? b === y && (a - x) * dx > 0 : a === x && (b - y) * dy > 0),
          );
        if (!options.length) break;
        const straight = options.find(
            ([a, b]) => a - tx === vx && b - ty === vy,
          ),
          bends = options.filter(([a, b]) => a - tx !== vx || b - ty !== vy);
        const turnAt = p.style === 'folds' ? 2 : long ? 4 : 3;
        const next =
          straight && (segment < turnAt || !bends.length || rng() < 0.3)
            ? straight
            : bends.length
              ? bends[Math.floor(rng() * bends.length)]
              : straight;
        if (!next) break;
        if (next[0] - tx !== vx || next[1] - ty !== vy) {
          turns++;
          segment = 1;
        } else segment++;
        points.push(next);
        cells.add(next[1] * s + next[0]);
      }
      if (points.length < 6 || (n < p.target * 0.8 && points.length < 8))
        continue;
      const hits = new Set();
      for (const cell of cells) for (const id of owners[cell]) hits.add(id);
      let freeHits = 0;
      for (const id of hits) if (!deps[id].size) freeHits++;
      const nextFree = free + 1 - freeHits;
      if (
        n > 8 &&
        (nextFree < 2 ||
          nextFree > Math.max(p.exits + 4, Math.ceil(p.target * 0.1)))
      )
        continue;
      if (n > 12 && !hits.size && nextFree > p.exits + 2) continue;
      const depth = 1 + Math.max(0, ...[...hits].map((i) => up[i]));
      const zone = (x >= s / 2 ? 1 : 0) + (y >= s / 2 ? 2 : 0),
        zc = zoneDirs[zone],
        localTotal = zc.reduce((a, b) => a + b, 0);
      const balance = (headCounts[d] + 1) / (n + 1),
        local = (zc[d] + 1) / (localTotal + 1);
      const radius =
        points.reduce(
          (sum, [a, b]) =>
            sum +
            Math.max(Math.abs(a - (s - 1) / 2), Math.abs(b - (s - 1) / 2)),
          0,
        ) / points.length;
      const cross = [...hits].filter((i) => dirs[i] !== d).length;
      const score =
        Math.min(hits.size, 8) * 0.75 +
        cross * 0.55 -
        Math.abs(nextFree - p.exits) * 2.4 -
        Math.max(0, depth - p.depth) * 2.3 +
        Math.min(depth, p.depth) * 0.2 -
        Math.max(0, balance - 0.27) * 35 -
        Math.max(0, local - 0.4) * 13 +
        Math.min(turns, 4) * 0.65 +
        Math.min(points.length, 18) * 0.38 -
        radius * 1.8 +
        rng() * 3;
      if (score > bestScore) {
        bestScore = score;
        best = { h, points, cells, hits, depth, zone, nextFree, turns };
      }
    }
    if (!best) break;
    const { h, points, cells, hits, depth, zone, nextFree } = best;
    paths.push(points.reverse());
    deps.push(new Set());
    dirs.push(h.d);
    headCounts[h.d]++;
    zoneDirs[zone][h.d]++;
    up.push(depth);
    const anc = new Set([n]);
    for (const id of hits) {
      deps[id].add(n);
      for (const ancestor of ancestors[id]) anc.add(ancestor);
    }
    ancestors.push(anc);
    for (const cell of cells) occupied[cell] = n;
    for (const cell of h.ray) owners[cell].push(n);
    free = nextFree;
    maxDepth = Math.max(maxDepth, depth);
  }
  return { paths, deps: deps.map((d) => [...d]), depth: maxDepth, free };
}
