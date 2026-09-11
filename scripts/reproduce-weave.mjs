import fs from 'node:fs';
import assert from 'node:assert/strict';
import { challengeData } from '../lib/game/challenge-data.ts';
import { weave } from './authoring/weave.mjs';
import { weaveProfile } from './authoring/weave-profile.mjs';
import { selectGoals } from './authoring/weave-goals.mjs';
const records = JSON.parse(
  fs.readFileSync(
    new URL('../docs/level-design-300/v5-catalog.json', import.meta.url),
  ),
).levels;
for (const r of records) {
  const p = weaveProfile(r.number),
    g = weave(p, r.trial),
    goal = selectGoals(p, g, r.trial),
    b = challengeData[r.number - 1];
  assert.deepEqual(g.paths, b.paths, `C${r.number} geometry`);
  assert.deepEqual(goal?.keys, b.keys);
  assert.deepEqual(goal?.locks, b.locks);
  assert.deepEqual(goal?.objective, b.objective);
}
console.log(
  'PASS: all 300 v5 geometries, targets, keys and budgets reproduce exactly.',
);
