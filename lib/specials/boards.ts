import type { Arrow, Level } from '../game/engine.ts';
const dirs = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
// Reverse construction: every new head ray avoids all previously placed arrows.
// Removing the arrows in reverse construction order is therefore a legal witness.
export function buildBoard(
  seed: number,
  size: number,
  count: number,
  giant: boolean,
): Level {
  let value = seed;
  const rand = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
  const arrows: Arrow[] = [];
  const occupied = new Set<string>();
  function add(points: number[][]) {
    arrows.push({ id: arrows.length, points });
    points.forEach((p) => occupied.add(p.join(',')));
  }
  if (giant) {
    let x = 3,
      y = size - 3;
    const points = [[x, y]];
    while (x < size - 3 || y > 3) {
      for (let i = 0; i < 3 && x < size - 3; i++) points.push([++x, y]);
      for (let i = 0; i < 3 && y > 3; i++) points.push([x, --y]);
    }
    add(points);
    add([
      [x, 1],
      [x + 1, 1],
    ]);
    add([
      [x, 0],
      [x + 1, 0],
    ]);
  }
  const available = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && !occupied.has(`${x},${y}`);
  for (let attempt = 0; attempt < 18000 && arrows.length < count; attempt++) {
    const x = Math.floor(rand() * size),
      y = Math.floor(rand() * size),
      [dx, dy] = dirs[Math.floor(rand() * 4)];
    if (!available(x, y) || !available(x - dx, y - dy)) continue;
    let clear = true;
    for (
      let a = x + dx, b = y + dy;
      a >= 0 && b >= 0 && a < size && b < size;
      a += dx, b += dy
    )
      if (occupied.has(`${a},${b}`)) {
        clear = false;
        break;
      }
    if (!clear) continue;
    const points = [
        [x, y],
        [x - dx, y - dy],
      ],
      own = new Set(points.map((p) => p.join(',')));
    const length = 5 + Math.floor(rand() * 9);
    for (let n = 2; n < length; n++) {
      const [tx, ty] = points.at(-1)!;
      const options = dirs
        .map(([a, b]) => [tx + a, ty + b])
        .filter(
          ([a, b]) =>
            available(a, b) &&
            !own.has(`${a},${b}`) &&
            !(dx ? b === y && (a - x) * dx > 0 : a === x && (b - y) * dy > 0),
        );
      if (!options.length) break;
      const p = options[Math.floor(rand() * options.length)];
      points.push(p);
      own.add(p.join(','));
    }
    add(points.reverse());
  }
  if (arrows.length !== count)
    throw new Error(`Special board ${seed}: ${arrows.length}/${count}`);
  return { id: seed, size, arrows };
}
