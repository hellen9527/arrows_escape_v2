const steps: Record<string, number[]> = {
  R: [1, 0],
  D: [0, 1],
  L: [-1, 0],
  U: [0, -1],
};
/** Lossless unit-path encoding keeps the full 300-board download small. */
export function encodeRoute(points: number[][]): string {
  if (
    points.length < 2 ||
    points.some(
      (p) => p.length !== 2 || p.some((n) => !Number.isInteger(n) || n < 0),
    )
  )
    throw Error('Invalid route');
  const [x, y] = points[0];
  return (
    `${x.toString(36)},${y.toString(36)}:` +
    points
      .slice(1)
      .map(([x, y], i) => {
        const dx = x - points[i][0],
          dy = y - points[i][1];
        const entry = Object.entries(steps).find(
          ([, d]) => d[0] === dx && d[1] === dy,
        );
        if (!entry) throw Error('Route must use unit segments');
        return entry[0];
      })
      .join('')
  );
}
export function decodeRoute(encoded: string): number[][] {
  const match = /^([0-9a-z]+),([0-9a-z]+):([RDLU]+)$/.exec(encoded);
  if (!match) throw Error('Invalid encoded route');
  let x = parseInt(match[1], 36),
    y = parseInt(match[2], 36);
  const points = [[x, y]];
  for (const letter of match[3]) {
    const [dx, dy] = steps[letter];
    x += dx;
    y += dy;
    points.push([x, y]);
  }
  return points;
}
