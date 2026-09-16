import { inspectWeave, weaveFailures, closure } from './weave-metrics.mjs';
export function inspectExpansion(level) {
  const m = inspectWeave(level),
    targets = level.objective?.targets ?? [],
    memo = new Map();
  const cs = targets.map((id) => closure(m.deps, id, memo));
  const needed = new Set(cs.flatMap((s) => [...s]));
  const common = targets.length
    ? [...needed].filter((id) => cs.every((s) => s.has(id))).length
    : 0;
  const distances = targets.flatMap((id, i) =>
    targets.slice(i + 1).map((other) => {
      const a = level.arrows[id].points.at(-1),
        b = level.arrows[other].points.at(-1);
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    }),
  );
  return {
    ...m,
    commonFraction: common / Math.max(1, needed.size),
    targetDistance: distances.length ? Math.min(...distances) / level.size : 0,
    initialOptional: m.deps.filter((d, i) => !d.length && !needed.has(i))
      .length,
    privateBranches: cs.map(
      (s, i) =>
        [...s].filter((id) => cs.every((other, j) => i === j || !other.has(id)))
          .length,
    ),
  };
}
export function expansionFailures(p, m) {
  const e = weaveFailures(p, m);
  if (
    p.targets &&
    (m.required < p.target * 0.6 || m.required > p.target * 0.84)
  )
    e.push('bounded required work');
  if (
    p.intent === 'detour' &&
    (m.required > p.target * 0.67 || m.initialOptional < 1)
  )
    e.push('real optional opening');
  if (p.intent === 'shared' && m.commonFraction < 0.45)
    e.push('shared target root');
  if (p.intent === 'spread' && m.targetDistance < 0.45)
    e.push('distant targets');
  if (
    p.targets &&
    m.privateBranches.some((n) => n < Math.max(3, p.target * 0.025))
  )
    e.push('independent star branches');
  if (p.intent === 'clear' && !m.policies.every((x) => x.bursts >= 1))
    e.push('visible release opportunities');
  return e;
}
