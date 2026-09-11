# Fixed level production

The browser imports checked-in data. It never runs the generator or changes a board after a retry.

- `npm run generate:levels -- 1 300`: bounded offline search for explicit contracts; accepted recipes are cached under ignored `work/authoring-v4`. A failed card exits nonzero, without replacing it with a generic level.
- `npm run assemble:levels`: assemble the 300 cached candidates after checking their current contracts and profile signatures.
- `npm run audit:levels`: independently derive geometry and key dependencies through the actual game engine, check authored relationships and release witnesses, and write the audit report.
- `npm run reproduce:levels`: reconstruct each published board from its recorded trial and profile, comparing every coordinate. This needs no local cache and does not change runtime data.
- `node scripts/authoring/tutorials.mjs`: build the eight separate practice boards.

`contracts.mjs` encodes the 300 design cards. `g` is a direct physical blocking relation, `r` physical ancestry, `no` excluded ancestry, and `mask` exact membership in each goal's complete physical/permission closure. Keys and locks bind to roles. Optional regions are checked using every required arrow's body. Selected `release` witnesses represent reachable states where a move opens several branches within the budget.

Geometry uses reverse insertion. Most permission edges also follow insertion order as a search shortcut. C291 instead permits either key ID order and checks the combined graph for cycles; its recorded route is a topological solution. IDs are identifiers, not a gameplay rule. `innerLength` is a candidate path-length preference, not a minimum difficulty metric.

The audit records structural evidence only. Human comprehension, perceived challenge, enjoyment and retention require playtesting. The stage ranges and thresholds are project hypotheses, not published competitor parameters. See `docs/level-design-300/implementation-notes.md` for interpretations of the design cards.

The old `scripts/generate-challenges.mjs` is retained for historical context and deliberately rejects the v4 catalog. Historical `tests/*-browser.mjs` target earlier releases; v4 UI acceptance is recorded in its release notes.
