import fs from 'node:fs';
import assert from 'node:assert/strict';
import { challengeData } from '../lib/game/challenge-data.ts';
import { construct } from './authoring/geometry.mjs';
import { profile } from './authoring/profile.mjs';
import { contracts } from './authoring/contracts.mjs';
const root = new URL('../', import.meta.url);
const cards = JSON.parse(
  fs.readFileSync(
    new URL('docs/level-design-300/design-briefs.json', root),
    'utf8',
  ),
).levels;
const records = JSON.parse(
  fs.readFileSync(
    new URL('docs/level-design-300/production-bindings.json', root),
    'utf8',
  ),
).levels;
for (const [i, card] of cards.entries()) {
  const p = profile(card, contracts[card.number]);
  const result = construct(p, records[i].trial);
  assert.deepEqual(
    result.paths,
    challengeData[i].paths,
    `${card.id}: stored recipe does not reproduce its geometry`,
  );
}
console.log(
  'PASS: all 300 recorded offline recipes reproduce the shipped paths exactly.',
);
