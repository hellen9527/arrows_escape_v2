import fs from 'node:fs';
import { weave } from './authoring/weave.mjs';
import { weaveProfile } from './authoring/weave-profile.mjs';
import { selectGoals } from './authoring/weave-goals.mjs';
import { inspectWeave, weaveFailures } from './authoring/weave-metrics.mjs';
const dir = new URL('../work/authoring-v5/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const ids = process.argv.slice(2).map(Number);
if (!ids.length) ids.push(...Array.from({ length: 300 }, (_, i) => i + 1));
for (const id of ids) {
  const dest = new URL(`${id}.json`, dir);
  const p = weaveProfile(id);
  if (
    fs.existsSync(dest) &&
    JSON.stringify(JSON.parse(fs.readFileSync(dest)).profile) ===
      JSON.stringify(p)
  ) {
    console.log(id, 'cached');
    continue;
  }
  const began = Date.now();
  let found, last;
  for (let trial = 0; trial < 160; trial++) {
    const g = weave(p, trial);
    if (g.paths.length !== p.target) {
      last = 'count ' + g.paths.length;
      continue;
    }
    const goal = selectGoals(p, g, trial);
    if (!goal) {
      last = 'goal branches';
      continue;
    }
    const board = {
      id,
      size: p.size,
      shape: p.style,
      kind: 'woven',
      paths: g.paths,
      keys: goal.keys,
      locks: goal.locks,
      ...(goal.objective ? { objective: goal.objective } : {}),
    };
    const l = {
      ...board,
      arrows: board.paths.map((points, id) => ({
        id,
        points,
        key: board.keys[id],
        lock: board.locks[id],
      })),
    };
    const m = inspectWeave(l),
      failures = weaveFailures(p, m);
    if (failures.length) {
      last = failures.join(',');
      continue;
    }
    const { geo: _geo, deps: _deps, ...metrics } = m;
    found = { revision: 5, profile: p, trial, board, metrics };
    break;
  }
  if (!found) throw Error(`C${id} not accepted: ${last}`);
  fs.writeFileSync(dest, JSON.stringify(found));
  console.log(
    `C${id}: ${p.target} arrows, ${found.metrics.required} required, depth ${found.metrics.depth}, trial ${found.trial}, ${((Date.now() - began) / 1000).toFixed(1)}s`,
  );
}
