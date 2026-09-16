import type { Level } from './engine.ts';
export type MascotSpace = { x: number; y: number; side: number };
const cache = new WeakMap<Level, MascotSpace | null>();
// Inspect the initial board only: clearing arrows must not make new toys appear.
export function mascotSpace(level: Level): MascotSpace | null {
  if (cache.has(level)) return cache.get(level)!;
  const n = level.size,
    c = (n - 1) / 2,
    min = Math.max(5, Math.ceil(n * 0.16));
  const occupied = new Set(
    level.arrows.flatMap((a) => a.points).map((p) => p.join(',')),
  );
  const prefix = Array.from({ length: n + 1 }, () => new Uint16Array(n + 1));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      prefix[y + 1][x + 1] =
        Number(occupied.has(`${x},${y}`)) +
        prefix[y][x + 1] +
        prefix[y + 1][x] -
        prefix[y][x];
  let best: MascotSpace | null = null,
    dist = Infinity;
  for (let side = Math.floor(n * 0.45); side >= min && !best; side--) {
    for (
      let y = Math.max(0, Math.ceil(c - side + 1));
      y <= Math.floor(c) && y + side <= n;
      y++
    )
      for (
        let x = Math.max(0, Math.ceil(c - side + 1));
        x <= Math.floor(c) && x + side <= n;
        x++
      ) {
        if (
          prefix[y + side][x + side] -
          prefix[y][x + side] -
          prefix[y + side][x] +
          prefix[y][x]
        )
          continue;
        const d = Math.hypot(x + (side - 1) / 2 - c, y + (side - 1) / 2 - c);
        if (d < dist) {
          best = { x, y, side };
          dist = d;
        }
      }
  }
  cache.set(level, best);
  return best;
}
