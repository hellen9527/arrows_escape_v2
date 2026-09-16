import fs from 'node:fs';
import { weave } from './authoring/weave.mjs';
import { expansionProfile } from './authoring/expansion-profile.mjs';
import { selectExpansionGoals } from './authoring/expansion-goals.mjs';
import {
  inspectExpansion,
  expansionFailures,
} from './authoring/expansion-metrics.mjs';
const dir = new URL('../work/authoring-expansion/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const ids = process.argv.slice(2).map(Number);
if (!ids.length) ids.push(...Array.from({ length: 500 }, (_, i) => 301 + i));
for (const id of ids) {
  const p = expansionProfile(id),
    dest = new URL(`${id}.json`, dir);
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
      last = 'count';
      continue;
    }
    const goal = selectExpansionGoals(p, g, trial);
    if (!goal) {
      last = 'goals';
      continue;
    }
    const board = {
      id,
      size: p.size,
      shape: p.style,
      kind: p.intent,
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
    const m = inspectExpansion(l),
      failures = expansionFailures(p, m);
    if (failures.length) {
      last = failures.join(',');
      continue;
    }
    const { geo: _geo, deps: _deps, ...metrics } = m;
    found = { profile: p, trial, board, metrics };
    break;
  }
  if (!found) throw Error(`C${id} failed: ${last}`);
  fs.writeFileSync(dest, JSON.stringify(found));
  console.log(
    `C${id} ${p.intent}: ${p.target} arrows / ${found.metrics.required} required / depth ${found.metrics.depth} / trial ${found.trial} / ${(Date.now() - began) / 1000}s`,
  );
}
