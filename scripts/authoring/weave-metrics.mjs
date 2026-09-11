import { blockers, direction } from '../../lib/game/engine.ts';
export function routeTurns(points) {
  let turns = 0;
  for (let j = 2; j < points.length; j++) {
    const [p, q, r] = [points[j], points[j - 1], points[j - 2]];
    if (p[0] - q[0] !== q[0] - r[0] || p[1] - q[1] !== q[1] - r[1]) turns++;
  }
  return turns;
}
export function closure(deps, id, memo = new Map(), visiting = new Set()) {
  if (memo.has(id)) return memo.get(id);
  if (visiting.has(id) || !deps[id])
    throw Error('Cyclic or missing dependency');
  visiting.add(id);
  const result = new Set([id]);
  for (const b of deps[id])
    for (const a of closure(deps, b, memo, visiting)) result.add(a);
  visiting.delete(id);
  memo.set(id, result);
  return result;
}
export function inspectWeave(level) {
  const arrows = level.arrows,
    n = arrows.length,
    geometric = {
      ...level,
      arrows: arrows.map(({ id, points }) => ({ id, points })),
    };
  const geo = arrows.map((a) => blockers(geometric, [], a.id)),
    deps = arrows.map((a) => blockers(level, [], a.id));
  const memo = new Map(),
    closures = arrows.map((a) => closure(deps, a.id, memo)),
    needed = new Set(
      level.objective
        ? level.objective.targets.flatMap((i) => [...closures[i]])
        : arrows.map((a) => a.id),
    );
  const headings = arrows.map((a) => direction(a).join(',')),
    counts = {};
  for (const h of headings) counts[h] = (counts[h] || 0) + 1;
  const bends = arrows.map((a) => routeTurns(a.points)),
    lengths = arrows.map((a) => a.points.length),
    edges = geo.reduce((s, d) => s + d.length, 0);
  const depthMemo = new Map();
  function depth(id) {
    if (depthMemo.has(id)) return depthMemo.get(id);
    const v = 1 + Math.max(0, ...deps[id].map(depth));
    depthMemo.set(id, v);
    return v;
  }
  const policies = [];
  for (const policy of ['low-id', 'high-id', 'release']) {
    const removed = new Set(),
      openings = [],
      visible = [],
      releases = [],
      order = [];
    while (removed.size < needed.size) {
      const free = [...needed].filter(
        (i) => !removed.has(i) && deps[i].every((j) => removed.has(j)),
      );
      if (!free.length) throw Error('No solution');
      const candidates = [...free];
      const gain = (id) =>
        [...needed].filter(
          (i) =>
            !removed.has(i) &&
            deps[i].includes(id) &&
            deps[i].every((j) => j === id || removed.has(j)),
        ).length;
      if (policy === 'low-id') candidates.sort((a, b) => a - b);
      else if (policy === 'high-id') candidates.sort((a, b) => b - a);
      else candidates.sort((a, b) => gain(b) - gain(a) || a - b);
      const id = candidates[0];
      visible.push(
        deps.filter((d, i) => !removed.has(i) && d.every((j) => removed.has(j)))
          .length /
          (n - removed.size),
      );
      openings.push(free.length);
      releases.push(gain(id));
      order.push(id);
      removed.add(id);
    }
    const fraction = (a, b) => {
      const start = Math.floor(openings.length * a),
        end = Math.max(start + 1, Math.floor(openings.length * b));
      return Math.max(
        ...openings
          .slice(start, end)
          .map((f, i) => f / (needed.size - start - i)),
      );
    };
    const visibleFraction = (a, b) =>
      Math.max(
        ...visible.slice(
          Math.floor(visible.length * a),
          Math.max(
            Math.floor(visible.length * a) + 1,
            Math.floor(visible.length * b),
          ),
        ),
      );
    policies.push({
      policy,
      visibleEarly: visibleFraction(0, 0.25),
      visibleMiddle: visibleFraction(0.25, 0.65),
      visibleLate: visibleFraction(0.65, 0.8),
      early: fraction(0, 0.25),
      middle: fraction(0.25, 0.65),
      late: fraction(0.65, 0.8),
      bursts: releases.filter((x) => x >= 3).length,
      openings,
      order,
    });
  }
  let cross = 0;
  for (let i = 0; i < n; i++)
    for (const j of geo[i]) if (headings[i] !== headings[j]) cross++;
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  return {
    arrows: n,
    required: needed.size,
    meanLength: mean(lengths),
    longFraction: lengths.filter((x) => x >= 8).length / n,
    multiBendFraction: bends.filter((x) => x >= 2).length / n,
    meanTurns: mean(bends),
    directions: counts,
    dominantFraction: Math.max(...Object.values(counts)) / n,
    crossFraction: cross / Math.max(1, edges),
    mergeFraction: geo.filter((d) => d.length >= 2).length / n,
    depth: Math.max(...arrows.map((a) => depth(a.id))),
    opening: deps.filter((d) => !d.length).length,
    density: lengths.reduce((a, b) => a + b, 0) / level.size ** 2,
    policies,
    geo,
    deps,
  };
}
export function weaveFailures(p, m) {
  const errors = [];
  const check = (ok, text) => {
    if (!ok) errors.push(text);
  };
  check(m.arrows === p.target, 'count');
  check(m.longFraction >= 0.7, 'long');
  check(m.multiBendFraction >= 0.55, 'bends');
  check(
    m.dominantFraction <= 0.36 && Object.keys(m.directions).length === 4,
    'headings',
  );
  check(m.crossFraction >= 0.55, 'cross-direction blocking');
  check(m.mergeFraction >= 0.35, 'multiple blockers');
  check(m.depth >= Math.max(9, p.depth - 2), 'depth');
  check(m.opening <= Math.ceil(p.target * 0.12), 'opening');
  check(m.density >= 0.48, 'density');
  check(m.required >= p.target * (p.targets ? 0.6 : 1), 'required work');
  for (const x of m.policies) {
    check(
      x.visibleEarly <= 0.25 && x.visibleMiddle <= 0.4 && x.visibleLate <= 0.6,
      `${x.policy} visible exits`,
    );
    check(x.early <= (p.id < 31 ? 0.28 : 0.22), `${x.policy} early exits`);
    check(x.middle <= (p.id < 31 ? 0.4 : 0.35), `${x.policy} middle exits`);
    check(x.late <= (p.id < 31 ? 0.6 : 0.55), `${x.policy} late exits`);
  }
  return errors;
}
