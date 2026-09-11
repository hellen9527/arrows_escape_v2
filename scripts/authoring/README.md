# Current 5.0 offline production

- `npm run generate:levels`: generate or resume all 300 candidates. Optional arguments are explicit IDs, e.g. `-- 31 45 60`. Cache is ignored `work/authoring-v5`.
- `npm run assemble:levels`: compare current profiles, independently rescan geometry/exit policies, pack fixed routes, and write the runtime data and v5 catalog.
- `npm run audit:levels`: actual-engine geometry, unit paths, overlap/self-ray, full and target solutions, keys, budgets, duplicate layouts, count floors and three sampled removal policies.
- `npm run reproduce:levels`: regenerate each recorded recipe and compare every coordinate, key, lock, target and budget with the runtime data. Run this after generator changes; matching cached profiles alone does not prove cached geometry is current.

`weave-profile.mjs` holds product hypotheses, `weave.mjs` builds reverse insertion geometry, `weave-goals.mjs` assigns goal/key branches, and `weave-metrics.mjs` derives structural process measurements through the actual engine. Runtime uses lossless direction encoding, decoded only when a board is opened. No generator runs in the browser.

The previous v4 scripts and contracts below remain for historical context; the npm commands now use the v5 pipeline. See docs/level-design-300/v5-design-review.md for research boundaries and actual metrics. Structural validation is not human enjoyment or difficulty validation.

---

## Historical 4.0 pipeline

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
