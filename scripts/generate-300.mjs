/** Offline bounded authoring; every accepted board retains its role contract. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { construct } from './authoring/geometry.mjs';
import { bind } from './authoring/bind.mjs';
import { contracts } from './authoring/contracts.mjs';
import { profile } from './authoring/profile.mjs';
const design = JSON.parse(
  fs.readFileSync(
    new URL('../docs/level-design-300/design-briefs.json', import.meta.url),
    'utf8',
  ),
);
const dir = new URL('../work/authoring-v4/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const start = +(process.argv[2] || 1),
  end = +(process.argv[3] || 300);

const failures = [];
for (const card of design.levels.filter(
  (c) => c.number >= start && c.number <= end,
)) {
  const c = contracts[card.number];
  if (!c) throw Error('Missing explicit contract ' + card.id);
  if ((c.targets || '').split(',').filter(Boolean).length !== card.targetCount)
    throw Error('Wrong target count ' + card.id);
  const p = profile(card, c),
    signature = createHash('sha256')
      .update(JSON.stringify({ c, p }))
      .digest('hex');
  const dest = new URL(`${card.id}.json`, dir);
  if (
    fs.existsSync(dest) &&
    JSON.parse(fs.readFileSync(dest, 'utf8')).signature === signature
  ) {
    console.log(`${card.id} cached`);
    continue;
  }
  const began = Date.now();
  let found;
  for (let trial = 0; trial < 1600; trial++) {
    p.trial = trial;
    found = bind(p, construct(p, trial), c, 14000);
    if (found) break;
  }
  if (!found) {
    failures.push(card.id);
    console.log(
      `${card.id} FAILED ${((Date.now() - began) / 1000).toFixed(1)}s`,
    );
    continue;
  }
  fs.writeFileSync(
    dest,
    JSON.stringify({ signature, contract: c, card: card.id, ...found }) + '\n',
  );
  console.log(
    `${card.id} ${found.paths.length} arrows / ${found.required.length} needed / depth ${found.depth} / ${found.opening.related.length} related openings / trial ${found.trial} / ${((Date.now() - began) / 1000).toFixed(1)}s`,
  );
}
console.log(JSON.stringify({ failures }));
if (failures.length) process.exitCode = 1;
