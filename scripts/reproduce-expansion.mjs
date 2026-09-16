import fs from 'node:fs';
import assert from 'node:assert/strict';
import { expansionData } from '../lib/game/expansion-data.ts';
import { weave } from './authoring/weave.mjs';
import { expansionProfile } from './authoring/expansion-profile.mjs';
import { selectExpansionGoals } from './authoring/expansion-goals.mjs';
const records = JSON.parse(
  fs.readFileSync(
    new URL('../docs/level-design-expansion/catalog.json', import.meta.url),
  ),
).levels;
const requested = process.argv.slice(2).map(Number);
for (const r of records) {
  if (requested.length && !requested.includes(r.profile.id)) continue;
  const p = expansionProfile(r.profile.id),
    g = weave(p, r.trial),
    goal = selectExpansionGoals(p, g, r.trial),
    b = expansionData[p.id - 301];
  assert.deepEqual(p, r.profile);
  assert.deepEqual(g.paths, b.paths, `C${p.id} geometry`);
  assert.deepEqual(goal?.keys, b.keys, `C${p.id} keys`);
  assert.deepEqual(goal?.locks, b.locks, `C${p.id} locks`);
  assert.deepEqual(goal?.objective, b.objective, `C${p.id} objective`);
}
console.log(
  `PASS: ${requested.length || records.length} expansion recipes reproduce exactly.`,
);
