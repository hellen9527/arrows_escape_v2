import { closure } from './weave-metrics.mjs';
import { random } from './weave.mjs';
export function selectGoals(p, g, trial) {
  const n = g.paths.length,
    rng = random(p.id * 104729 + trial * 8999),
    memo = new Map(),
    closures = g.paths.map((_, i) => closure(g.deps, i, memo));
  let targets = [],
    required = new Set(g.paths.map((_, i) => i));
  if (p.targets) {
    const candidates = closures
      .map((c, i) => ({ i, c }))
      .filter(({ c }) => c.size >= n * 0.23 && c.size <= n * 0.88);
    let best = null,
      score = Infinity;
    for (let t = 0; t < 1800; t++) {
      const chosen = [];
      for (let j = 0; j < p.targets; j++)
        chosen.push(candidates[Math.floor(rng() * candidates.length)]?.i);
      if (chosen.includes(undefined) || new Set(chosen).size !== chosen.length)
        continue;
      const union = new Set(chosen.flatMap((i) => [...closures[i]]));
      if (union.size < n * 0.65 || union.size > n * 0.9) continue;
      if (chosen.some((i) => chosen.some((j) => j !== i && closures[j].has(i))))
        continue;
      // Every goal needs its own branch; collecting one cannot automatically solve another.
      if (
        chosen.some(
          (i) =>
            [...closures[i]].filter((a) =>
              chosen.every((j) => j === i || !closures[j].has(a)),
            ).length < Math.max(3, n * 0.025),
        )
      )
        continue;
      const desired = n * (p.hard ? 0.83 : p.relief ? 0.7 : 0.76),
        s = Math.abs(union.size - desired) + rng();
      if (s < score) {
        score = s;
        best = { targets: chosen, required: union };
      }
    }
    if (!best) return null;
    targets = best.targets;
    required = best.required;
  }
  const keys = {},
    locks = {},
    combined = g.deps.map((d) => [...d]),
    taken = new Set(targets);
  for (let group = 0; group < p.keys; group++) {
    const letter = String.fromCharCode(65 + group),
      pairs = [];
    for (const lock of required) {
      if (taken.has(lock)) continue;
      for (const key of required) {
        if (
          taken.has(key) ||
          key <= lock ||
          closures[lock].has(key) ||
          closures[key].size < 3
        )
          continue;
        const a = g.paths[lock].at(-1),
          b = g.paths[key].at(-1),
          distance = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
        if (distance < p.size * 0.3) continue;
        pairs.push({
          lock,
          key,
          score: distance + Math.min(closures[key].size, 15) + rng() * 10,
        });
      }
    }
    pairs.sort((a, b) => b.score - a.score);
    if (!pairs.length) return null;
    const { lock, key } = pairs[0];
    keys[key] = letter;
    locks[lock] = letter;
    taken.add(lock);
    taken.add(key);
    combined[lock].push(key);
  }
  if (p.targets)
    required = new Set(targets.flatMap((i) => [...closure(combined, i)]));
  return {
    keys,
    locks,
    ...(p.targets
      ? {
          objective: {
            type: 'rescue',
            targets,
            moves: required.size + p.slack,
          },
        }
      : {}),
    required: [...required],
  };
}
