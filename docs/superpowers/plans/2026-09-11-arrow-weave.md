# Dense Arrow Weave Implementation Plan

Goal: Rebuild the 300 formal boards to address the measured 30–60 plateau.
Architecture: offline deterministic geometry plus goal/key assignment; engine-derived audit independent of generator; fixed runtime data. React/Vinext/Cloudflare architecture remains.
Execution: in this existing task, isolated codex/arrow-weave worktree. User has authorized rework and publishing; no repeated approval gate.

- [ ] Capture regression: tests/dense-levels.test.ts asserts C031 >=100, C060 > C031, length and bend floors. Run against 4.0 and observe failure.
- [ ] Implement scripts/authoring/weave.mjs: deterministic reverse insertion of disjoint segmented routes, direction balance, dependency feedback. Each accepted path can leave before earlier inserted paths. Candidate rejection bounds every search.
- [ ] Implement scripts/authoring/weave-profile.mjs: increasing per-level count and depth, rotating shape/role, no oversized relief drop; explicit profile for each of 300 IDs.
- [ ] Implement independent metrics in scripts/authoring/weave-metrics.mjs using game-engine blocker geometry; sample three removal policies across early/middle/late states, counts, route lengths, turns, heading distribution, cross-direction blockers, branching and tail.
- [ ] Implement scripts/generate-weave.mjs: first generate 31/45/60, inspect, then 1–300; assign goals from closures with required-work floor, pair keys only along acyclic insertion order, compute exact budget; reject weak candidates and retain recipes.
- [ ] Replace active audit/reproduction commands with v5 catalog checks; archive/label v4 design documents clearly. Adapt former 25-cell and old card-specific tests to the new documented requirements, retaining full solution checks.
- [ ] Add v4→v5 progress regression before migration edits in engine.ts/storage.ts. Preserve archive, current stage access and tutorial progress, reset only incompatible formal arrow moves. Add reload and no-fake-completion test.
- [ ] Update page version/copy and board zoom controls; browser-check large geometry and inputs in local production build. Do not alter the user's live localStorage for QA.
- [ ] Run npm run check, npm run reproduce:levels, npm run build, review changes and document actual metrics/limits. Publish tested commit using existing workflow, verify exact production resources and record version ID.
