import { edges } from './contracts.mjs';
import { inside } from './geometry.mjs';
export function graphInfo(deps) {
  const visiting = new Set(),
    closures = [],
    depths = [];
  const visit = (id) => {
    if (visiting.has(id)) throw Error('Cyclic dependency');
    if (closures[id]) return closures[id];
    visiting.add(id);
    const set = new Set([id]);
    let depth = 1;
    for (const d of deps[id]) {
      for (const x of visit(d)) set.add(x);
      depth = Math.max(depth, depths[d] + 1);
    }
    visiting.delete(id);
    closures[id] = set;
    depths[id] = depth;
    return set;
  };
  deps.forEach((_, i) => visit(i));
  return { closures, depths };
}
function rayDistance(paths, from, to) {
  const p = paths[to],
    [x, y] = p.at(-1),
    [a, b] = p.at(-2),
    dx = x - a,
    dy = y - b;
  return Math.min(
    Infinity,
    ...paths[from]
      .filter(([u, v]) =>
        dx ? v === y && (u - x) * dx > 0 : u === x && (v - y) * dy > 0,
      )
      .map(([u, v]) => (u - x) * dx + (v - y) * dy),
  );
}
export function bind(p, result, c, budget = 18000) {
  if (!result || result.paths.length !== p.target) return null;
  const { paths, deps } = result,
    n = paths.length,
    geo = graphInfo(deps);
  const constraints = [
    ...edges(c.g).map((e) => [...e, 'g']),
    ...edges(c.r).map((e) => [...e, 'r']),
    ...edges(c.no).map((e) => [...e, 'no']),
    ...edges(c.far).map((e) => [...e, 'far']),
    ...edges(c.gap).map((e) => [...e, 'gap']),
    ...edges(c.body).map((e) => [...e, 'body']),
    ...edges(c.notDirect).map((e) => [...e, 'notDirect']),
  ];
  const targets = (c.targets || '').split(',').filter(Boolean),
    keys = c.keys || {},
    locks = c.locks || {};
  // Prune impossible private/unrelated bindings before assigning every role.
  // Final checks still include permission edges, which are not present here.
  for (const [role, scope] of Object.entries(c.mask || {}))
    for (const target of targets)
      if (!scope.split(',').includes(target))
        constraints.push([role, target, 'no']);
  for (const role of (c.unrelated || '').split(',').filter(Boolean))
    for (const target of [...targets, ...Object.values(keys)])
      constraints.push([role, target, 'no']);
  const roles = [
    ...new Set([
      ...constraints.flatMap((e) => e.slice(0, 2)),
      ...targets,
      ...Object.values(keys),
      ...Object.keys(locks),
      ...(c.inner ? [c.inner] : []),
      ...(c.free || '').split(',').filter(Boolean),
      ...(c.unrelated || '').split(',').filter(Boolean),
      ...Object.keys(c.only || {}),
      ...Object.values(c.only || {}).flatMap((s) =>
        s.split(',').filter(Boolean),
      ),
      ...Object.keys(c.mask || {}),
    ]),
  ];
  const keyEdges = Object.entries(locks).map(([role, letter]) => [
    keys[letter],
    role,
  ]);
  if (keyEdges.some(([from]) => !from))
    throw Error('Missing key binding ' + p.id);
  // A lock must point to a later insertion id. This is stricter than acyclicity,
  // gives cheap search pruning, and admits star/key/lock relay combinations.
  constraints.push(...keyEdges.map((e) => [...e, 'k']));
  // If X must not affect R, it cannot precede R's key or any other
  // authored prerequisite either. Propagate these exclusions before search.
  const positive = [
    ...constraints
      .filter(([, , t]) => ['g', 'r', 'k', 'far', 'gap', 'body'].includes(t))
      .map(([a, b]) => [a, b]),
    ...Object.entries(c.mask || {}).flatMap(([a, scope]) =>
      scope.split(',').map((b) => [a, b]),
    ),
  ];
  const upstream = (role) => {
    const seen = new Set([role]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [a, b] of positive)
        if (seen.has(b) && !seen.has(a)) {
          seen.add(a);
          changed = true;
        }
    }
    return seen;
  };
  const downstream = (role) => {
    const seen = new Set([role]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [a, b] of positive)
        if (seen.has(a) && !seen.has(b)) {
          seen.add(b);
          changed = true;
        }
    }
    return seen;
  };
  const excluded = new Set(
    constraints
      .filter(([, , t]) => t === 'no')
      .flatMap(([a, b]) =>
        [...downstream(a)].flatMap((x) =>
          [...upstream(b)].map((y) => `${x}>${y}`),
        ),
      ),
  );
  constraints.push(...[...excluded].map((s) => [...s.split('>'), 'no']));
  const outgoing = deps.map(
    (_, id) => deps.filter((d) => d.includes(id)).length,
  );
  const assigned = {},
    used = new Set();
  let calls = 0,
    answer = null;
  const contact = (from, to, predicate) => {
    const line = paths[to],
      [x, y] = line.at(-1),
      [a, b] = line.at(-2),
      dx = x - a,
      dy = y - b;
    return paths[from].some(
      ([u, v], index) =>
        (dx ? v === y && (u - x) * dx > 0 : u === x && (v - y) * dy > 0) &&
        predicate({
          x,
          y,
          dx,
          dy,
          u,
          v,
          index,
          distance: (u - x) * dx + (v - y) * dy,
        }),
    );
  };
  const compare = (a, b, type) =>
    type === 'g'
      ? deps[b].includes(a)
      : type === 'r'
        ? a !== b && geo.closures[b].has(a)
        : type === 'no'
          ? !geo.closures[b].has(a)
          : type === 'k'
            ? c.unorderedKeys
              ? a !== b && !geo.closures[a].has(b)
              : a > b
            : type === 'notDirect'
              ? !deps[b].includes(a)
              : type === 'gap'
                ? contact(a, b, ({ x, y, dx, dy, distance }) =>
                    Array.from(
                      { length: distance - 1 },
                      (_, i) => !inside(p, x + dx * (i + 1), y + dy * (i + 1)),
                    ).some(Boolean),
                  )
                : type === 'body'
                  ? contact(a, b, ({ index }) => index < paths[a].length - 1)
                  : deps[b].includes(a) && rayDistance(paths, a, b) >= 4;
  const base = {};
  for (const role of roles) {
    const children = constraints.filter(
      ([a, , t]) => a === role && t === 'g',
    ).length;
    const parents = constraints.filter(
      ([, b, t]) => b === role && t === 'g',
    ).length;
    base[role] = Array.from({ length: n }, (_, i) => i).filter(
      (i) => outgoing[i] >= children && deps[i].length >= parents,
    );
    if (c.zones?.[role]) {
      const [x0, x1, y0, y1] = c.zones[role];
      base[role] = base[role].filter((i) => {
        const [x, y] = paths[i].at(-1);
        return (
          x >= p.size * x0 &&
          x < p.size * x1 &&
          y >= p.size * y0 &&
          y < p.size * y1
        );
      });
    }
    if ((c.branch || '').split(',').includes(role))
      base[role] = base[role].filter((i) => outgoing[i] > 0);
    if (targets.includes(role))
      base[role] = base[role].filter(
        (i) =>
          geo.closures[i].size >= (locks[role] ? 1 : 3) &&
          geo.closures[i].size < n * 0.77,
      );
    if ((c.free || '').split(',').includes(role))
      base[role] = base[role].filter((i) => deps[i].length === 0);
    if (c.only && role in c.only)
      base[role] = base[role].filter(
        (i) =>
          deps[i].length === c.only[role].split(',').filter(Boolean).length,
      );
    if ((c.long || '').split(',').includes(role))
      base[role] = base[role].filter((i) => paths[i].length >= 6);
    if (c.direction?.[role]) {
      const [dx, dy] = c.direction[role];
      base[role] = base[role].filter((i) => {
        const [x, y] = paths[i].at(-1),
          [a, b] = paths[i].at(-2);
        return x - a === dx && y - b === dy;
      });
    }
    if (role === c.inner)
      base[role] = base[role].filter(
        (i) =>
          deps[i].length === 0 &&
          (p.corridor
            ? paths[i].at(-1)[0] === p.corridor.x &&
              paths[i].at(-1)[1] === p.corridor.y
            : paths[i]
                .at(-1)
                .every((v) => v >= p.size * 0.15 && v <= p.size * 0.85)),
      );
  }
  const compatible = (role, id) =>
    constraints.every(([a, b, t]) =>
      a === role && assigned[b] !== undefined
        ? compare(id, assigned[b], t)
        : b === role && assigned[a] !== undefined
          ? compare(assigned[a], id, t)
          : true,
    );
  const finish = () => {
    const keyIds = Object.fromEntries(
      Object.entries(keys).map(([letter, role]) => [assigned[role], letter]),
    );
    const lockIds = Object.fromEntries(
      Object.entries(locks).map(([role, letter]) => [assigned[role], letter]),
    );
    if (Object.keys(keyIds).length !== Object.keys(keys).length) return;
    const finalDeps = deps.map((d, i) => [
      ...new Set([...d, ...(lockIds[i] ? [assigned[keys[lockIds[i]]]] : [])]),
    ]);
    let final;
    try {
      final = graphInfo(finalDeps);
    } catch {
      return;
    }
    const targetIds = targets.map((t) => assigned[t]);
    const required = new Set(
      targetIds.length && !p.clear
        ? targetIds.flatMap((id) => [...final.closures[id]])
        : deps.map((_, i) => i),
    );
    const free = finalDeps
        .map((d, i) => (d.length ? null : i))
        .filter((i) => i !== null),
      relevant = free.filter((i) => required.has(i));
    if (
      targetIds.length &&
      !p.clear &&
      (required.size < n * (p.tutorial ? 0.2 : 0.32) ||
        required.size > n * 0.76 ||
        relevant.length < (c.related?.[0] ?? (p.tutorial ? 1 : 2)) ||
        relevant.length > (c.related?.[1] ?? 5) ||
        free.every((i) => required.has(i)))
    )
      return;
    if (c.opening && free.length !== c.opening) return;
    if (
      (c.free || '')
        .split(',')
        .filter(Boolean)
        .some((role) => !free.includes(assigned[role]))
    )
      return;
    if (
      (c.unrelated || '')
        .split(',')
        .filter(Boolean)
        .some((role) => required.has(assigned[role]))
    )
      return;
    if (
      Object.entries(c.mask || {}).some(([role, scope]) =>
        targets.some(
          (t, i) =>
            final.closures[targetIds[i]].has(assigned[role]) !==
            scope.split(',').includes(t),
        ),
      )
    )
      return;
    if (
      Object.entries(c.only || {}).some(
        ([role, parents]) =>
          deps[assigned[role]].length !==
            parents.split(',').filter(Boolean).length ||
          parents
            .split(',')
            .filter(Boolean)
            .some((a) => !deps[assigned[role]].includes(assigned[a])),
      )
    )
      return;
    if (Object.keys(keyIds).some((i) => !required.has(+i))) return;
    if (
      edges(c.no).some(([a, b]) => final.closures[assigned[b]].has(assigned[a]))
    )
      return;
    const region = ([x, y]) =>
      Math.min(
        (c.columns || 3) - 1,
        Math.floor((x / p.size) * (c.columns || 3)),
      ) +
      (c.columns || 3) *
        Math.min((c.rows || 1) - 1, Math.floor((y / p.size) * (c.rows || 1)));
    const reserved = (c.unrelatedRegions || '')
      .split(',')
      .filter(Boolean)
      .map((role) => region(paths[assigned[role]].at(-1)));
    if (new Set(reserved).size !== reserved.length) return;
    if (
      reserved.some((zone) =>
        paths.some(
          (path, id) =>
            required.has(id) && path.some((point) => region(point) === zone),
        ),
      )
    )
      return;
    const contacts = edges(c.distinctContacts).map(([from, to]) => {
      const points = [];
      contact(assigned[from], assigned[to], ({ u, v }) => {
        points.push(`${u},${v}`);
        return false;
      });
      return points;
    });
    if (contacts.length && new Set(contacts.flat()).size < contacts.length)
      return;
    for (const [pivot, children] of Object.entries(c.release || {})) {
      const x = assigned[pivot],
        cs = children.split(',').map((role) => assigned[role]);
      const before = new Set([...final.closures[x]].filter((i) => i !== x));
      for (const child of cs)
        for (const d of finalDeps[child])
          if (d !== x) for (const i of final.closures[d]) before.add(i);
      if (
        before.has(x) ||
        cs.some((i) => before.has(i)) ||
        [...before].filter((i) => !required.has(i)).length > p.slack
      )
        return;
      if (cs.some((i) => finalDeps[i].some((d) => d !== x && !before.has(d))))
        return;
    }
    const depth = Math.max(...targetIds.map((i) => final.depths[i]), 0);
    if (
      targetIds.length &&
      !p.clear &&
      depth < (p.tutorial ? 2 : Math.min(5 + Math.floor((p.id - 1) / 60), 9))
    )
      return;
    const objective =
      targetIds.length && !p.clear
        ? { type: 'rescue', targets: targetIds, moves: required.size + p.slack }
        : undefined;
    if (objective && objective.moves >= n) return;
    const solution = [],
      visited = new Set();
    const solve = (id) => {
      if (visited.has(id)) return;
      for (const d of finalDeps[id]) solve(d);
      visited.add(id);
      solution.push(id);
    };
    for (const id of [...required].sort((a, b) => b - a)) solve(id);
    answer = {
      id: p.id,
      size: p.size,
      shape: p.shape,
      kind: p.kind,
      paths,
      keys: keyIds,
      locks: lockIds,
      ...(objective ? { objective } : {}),
      binding: { ...assigned },
      required: [...required].sort((a, b) => a - b),
      solution,
      opening: { all: free, related: relevant },
      depth,
      trial: p.trial,
    };
  };
  const search = () => {
    if (answer || ++calls > budget) return;
    if (used.size === roles.length) {
      finish();
      return;
    }
    let bestRole, options;
    for (const role of roles) {
      if (assigned[role] !== undefined) continue;
      const domain = base[role].filter(
        (i) => !used.has(i) && compatible(role, i),
      );
      if (!domain.length) return;
      if (!options || domain.length < options.length) {
        bestRole = role;
        options = domain;
      }
    }
    for (const id of options) {
      assigned[bestRole] = id;
      used.add(id);
      search();
      used.delete(id);
      delete assigned[bestRole];
      if (answer || calls > budget) return;
    }
  };
  search();
  return answer;
}
