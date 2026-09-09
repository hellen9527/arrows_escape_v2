import { challengeLevel, CHALLENGE_COUNT } from './challenge-levels.ts';
import type { Campaign, Level, Arrow } from './engine.ts';
export const LEVEL_COUNT = 60;
export const levelCount = (campaign: Campaign = 'classic') =>
  campaign === 'challenge' ? CHALLENGE_COUNT : LEVEL_COUNT;
const cache = new Map<number, Level>();
const directions = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const key = (x: number, y: number) => `${x},${y}`;
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeLevel(
  requested: number,
  campaign: Campaign = 'classic',
): Level {
  if (campaign === 'challenge') return challengeLevel(requested);
  const id = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(requested) || 1));
  if (cache.has(id)) return cache.get(id)!;
  const chapter = Math.floor((id - 1) / 12);
  const size = id <= 3 ? 7 : 8 + Math.min(chapter, 3);
  const rng = random(9743 + id * 7919);
  const occupied = new Set<string>();
  const arrows: Arrow[] = [];
  const target =
    id === 1
      ? 7
      : id === 2
        ? 9
        : id === 3
          ? 10
          : Math.floor((size * size) / (chapter >= 2 ? 3.8 : 4.5));
  const available = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < size &&
    y < size &&
    !occupied.has(key(x, y)) &&
    !(
      chapter === 2 &&
      id % 3 === 0 &&
      Math.abs(x - (size - 1) / 2) + Math.abs(y - (size - 1) / 2) > size * 0.72
    ) &&
    !(
      chapter === 3 &&
      id % 3 === 1 &&
      x > size / 2 - 1.5 &&
      x < size / 2 + 0.5 &&
      y > size / 2 - 1.5 &&
      y < size / 2 + 0.5
    );
  for (let attempt = 0; attempt < 6000 && arrows.length < target; attempt++) {
    const x = Math.floor(rng() * size),
      y = Math.floor(rng() * size);
    if (!available(x, y)) continue;
    const [dx, dy] = directions[Math.floor(rng() * 4)];
    let clear = true;
    for (
      let a = x + dx, b = y + dy;
      a >= 0 && b >= 0 && a < size && b < size;
      a += dx, b += dy
    )
      if (occupied.has(key(a, b))) {
        clear = false;
        break;
      }
    if (!clear || !available(x - dx, y - dy)) continue;
    const headFirst = [
      [x, y],
      [x - dx, y - dy],
    ];
    const pathCells = new Set(headFirst.map(([a, b]) => key(a, b)));
    const length = 3 + Math.floor(rng() * (id <= 3 ? 2 : chapter >= 3 ? 7 : 5));
    for (let n = 2; n < length; n++) {
      const [tx, ty] = headFirst.at(-1)!;
      const previous = headFirst.at(-2)!;
      const options = directions
        .map(([a, b]) => [tx + a, ty + b])
        .filter(
          ([a, b]) =>
            available(a, b) &&
            !pathCells.has(key(a, b)) &&
            !(dx ? b === y && (a - x) * dx > 0 : a === x && (b - y) * dy > 0),
        );
      if (!options.length) break;
      const straight = options.find(
        ([a, b]) => a - tx === tx - previous[0] && b - ty === ty - previous[1],
      );
      const next =
        straight && rng() < 0.53
          ? straight
          : options[Math.floor(rng() * options.length)];
      headFirst.push(next);
      pathCells.add(key(next[0], next[1]));
    }
    for (const c of pathCells) occupied.add(c);
    arrows.push({ id: arrows.length, points: headFirst.reverse() });
  }
  const level = { id, size, arrows };
  cache.set(id, level);
  return level;
}
