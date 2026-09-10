# Relief Balance Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent save-compatibility task. Primary implements content, metrics and UI. Review spec then quality before publication.

**Goal:** Remove severe difficulty drops while retaining meaningful, more forgiving relief levels.

**Architecture:** Existing fixed 30-board pipeline gains explicit opening/goal-depth constraints and continuity checks. A small balance revision preserves achievements and resets only incompatible attempts. Engine gameplay rules and deployment adapter remain intact.

**Tech Stack:** TypeScript, Node generation/tests, React/Vinext, SVG, existing browser regression suite, Cloudflare Worker.

## Task 1 — Content and measurement (primary)

- [x] Add first-failing tests in `tests/challenge-levels.test.ts` for relief goals/keys, >=80% previous arrow count, >=75% required actions, <=2 depth fall, and authored opening ranges. Keep all geometry and target-budget tests.
- [x] Add optional `exits: [number,number]` and `goalDepth: [number,number]` to `lib/game/challenge-briefs.ts`. Use 3–4 exits on6/9/14/21/27, 2–3 on13/20/26/30, 2–5 on ring8 (calibration recorded in spec), 2–4 on other5+ levels. Set five relief counts22/26/28/32/36; retain preceding goal/key combinations and slack3.
- [x] Update `scripts/generate-challenges.mjs`: reject candidate outside opening range or goal-closure depth; compare each relief to preceding selected board. Retain deterministic seeds, reverse insertion, meaningful goals, cross-gap checks and no fallback board.
- [x] Generate fixed data; compare it to `work/baseline-challenge-data.json` to record exactly changed ids in `lib/game/challenge-balance.ts`. Add `scripts/audit-challenges.mjs` for opening/goal/depth and64 seeded route observations at25%/50%; export reviewable JSON/Markdown report.
- [x] Run `npm test` and generator `--check`; inspect changes and record calibrated parameters in the spec.

## Task 2 — Safe balance migration (delegated)

Files: `lib/game/engine.ts`, new `tests/balance.test.ts`; consume primary-owned `lib/game/challenge-balance.ts` exports `BALANCE_REVISION=1`, `REBALANCED_LEVELS: readonly number[]`.

- [x] First-failing tests: an old contentRevision3 save without balanceRevision keeps best/history/preferences/unlocks. Changed level resets current run; unchanged level preserves valid removed ids/mistakes/hints. A new matching-balance save restores failures/hints unchanged. v1/v2 still archive to v3 as before.
- [x] Add progress fields `balanceRevision` and `showBalanceNotice`. After existing historical migration logic, if challenge balance is old and run.level is in changed ids, preserve `newRun(r.level)` and set notice; do not replay obsolete ids. Default/current saves use latest balance revision. Retain pending notice when reading current save so UI can acknowledge it.
- [x] Run targeted tests and full `npm test`, report API and any integration notes. Do not edit content, UI or other agents' files; no commit.

## Task 3 — UI and regression (primary)

- [x] Set visible campaign identifier3.1. On reading `showBalanceNotice`, display a brief explanation of current-board reset and preserved earned progress; acknowledge it without recurring on reload.
- [x] Update obsolete browser labels and goal-count assertions. Add browser checks for old-v3 changed-level notice/history retention and unchanged-level continuation.
- [x] Run33+ unit checks, typecheck/lint/build, current browser suites and actual30-level completion; inspect representative relief/mobile screenshots.
- [x] Independent spec review followed by quality review. Fix material findings and rerun relevant checks.
- [ ] Commit and fast-forward production main; retain existing authorized Wrangler flow, verify live revision/asset hashes and goal/migration behavior. Save release evidence and clean temporary worktree.

## Verification record

- First-failing structural tests reproduced the original four content failures. Balance migration tests reproduced obsolete-ID false awards; five malformed/future marker regressions were also first-failing then passing.
- Final 50 unit tests, TypeScript, lint, production build and diff check passed. Generator --check reproduced every checked-in board.
- Browser production preview passed all30 through real keyboard input,8 viewport checks, touch pinch/duplicate guards, failure/retry/hint/undo, quota/read protection and v1/v2 migration. New balance browser test preserves earned progress, restarts only a changed old attempt, acknowledges notice once, resumes an unchanged attempt, and verifies10 representative mobile boards plus3 English narrow/landscape sizes.
- Inspected actual screenshots of9/14/27 and English320×568 level14. No layout overflow or missing objective/key indicators observed.
- Independent save spec/quality review completed; strict revision compatibility finding fixed. Integrated spec review passed. Final code-quality review found that subset authoring could omit the preceding level; the entry now rejects starting on relief, and a first-failing CLI regression verifies this. Publication is recorded below when complete.

Final quality re-review passed: standalone27 is rejected; range26–27 reproduces the checked-in rows. No remaining findings.
