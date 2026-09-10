# Arrow Challenge V3 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the bounded engine/storage task; the primary agent implements content and UI, followed by spec and code review. Checklist items track completion.

**Goal:** Ship the reviewed 30-level mixed clear/rescue campaign with visible objectives, trustworthy hints, finite move budgets and preserved earlier progress.

**Architecture:** Static generated challenge data gains an optional rescue objective; pure engine helpers define completion, failure and necessary dependencies. React and WebMCP consume the same helpers. Campaign revision 3 migrates earlier achievements without replaying old moves. Generation stays offline.

**Tech Stack:** TypeScript, React/Vinext, SVG, Node test runner, Playwright, existing Cloudflare Worker.

## 1. Engine and migration

Files: `lib/game/engine.ts`, `lib/game/storage.ts`, `tests/rescue.test.ts`, `tests/remix.test.ts`, `tests/storage.test.ts`.

- [x] Add behavioral tests first using a 3-arrow board: arrow 0 is goal blocked by 1, arrow 2 is unrelated and initially free. A budget of 2 allows `[1,0]`, fails `[2,1]`, and returns unchanged after terminal state. A budget of 3 allows an undo before failure. Default clear completion remains all arrows.
- [x] Contract: `Level.objective?: { type: 'rescue'; targets: number[]; moves: number }`. Export `isComplete(level, run)`, `movesLeft(level, run): number | null`, `failureReason(level, run): 'hearts' | 'moves' | null`, `requiredArrowIds(level, removed = []): number[]`. Required ids are the transitive blockers of remaining targets plus targets, skipping already removed ids.
- [x] Implement target-aware hint filtering, completion-before-move-exhaustion, finished attempt input guards, and `finishLevel` using the common completion helper. Error and hint accounting retains existing semantics; undo refunds the removed arrow's move without restoring hearts or hints.
- [x] Revision 3: `arrow-escape:challenge:v3` first, then v2, then v1. Accept known older revision values, archive the max scores of `previousBest` and `best`, reconstruct unlocks, reset obsolete run ids. Preserve the original browser keys and never award new content stars from old runs.
- [x] Run targeted tests and existing engine tests. Report new exports and any compatibility issues; do not change generated levels or UI.

## 2. Content pipeline and objective validation

Files: `scripts/generate-challenges.mjs`, `lib/game/challenge-data.ts`, `lib/game/challenge-levels.ts`, `tests/challenge-levels.test.ts`.

- [x] Replace old modulo difficulty and count-based peak assertions with the approved briefs and explicit tiers. Add failing expectations for rescue metadata and a feasible budget below the all-clear count.
- [x] Drive generator from the 30-row design. Preserve geometric reverse-insertion solvability; add explicit key-group and staged-key parameters. Pick 1–3 goal arrows with nonredundant dependency closures, shared relationships and unrelated alternatives. Set move budget to required closure plus the brief's visible slack, always less than full board count.
- [x] Validate actual geometry, keys, uniqueness, budgets, related/unrelated choices and legal solution routes. Reject unsuitable candidates rather than weakening checks invisibly. Report any justified parameter adjustments in the design/results document.
- [x] Generate checked-in data, bilingual titles and focus text; expose explicit tier and objective metadata. Verify reproducibility of the offline output and stability of runtime layouts.

## 3. UI and accessible feedback

Files: `app/page.tsx`, `app/globals.css`, `components/game/board.tsx`, `lib/game/webmcp.ts`.

- [x] Use common completion and failure helpers throughout page, result modal, hint enablement, progress bar and exposed game tools.
- [x] Add star-shaped rescue markers and accessible labels; keep key/lock letter markers distinct. Show target count and moves left, concise optional rule explanation, and accurate win/failure copy in Chinese/English.
- [x] Update revision-intro and campaign naming. Preserve older progress settings, zoom/pan behavior, reduced motion and input cancellation.
- [x] Short feedback for nearest actual collision enables learning; target-aware success feedback does not falsely claim all arrows cleared. Keep animation timings responsive and existing sound controls.

## 4. Review, browser checks and release

- [x] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- [x] Update obsolete browser assertions to the new content and add target win with remaining ordinary arrows, budget failure/reload/retry, target hints, v1/v2 migration, key unlock/undo and language tests.
- [x] Play all 30 via real UI against local production build, inspect representative screenshots, test narrow/mobile/landscape sizes and classic mode.
- [x] Independent spec review, then code quality review; resolve actionable findings and rerun relevant checks.
- [ ] Use existing authorized GitHub/Cloudflare release workflow, preserve actual deployment settings, verify production version and representative interactions. Record commit SHA, deployment evidence and any remaining real-player uncertainty.

## Verification before publication

33 unit tests pass; typecheck, lint and production build pass. Generator check reproduces the exact fixed data. Final local production browser checks pass all 30 UI solutions, eight viewport layouts, real touch cancellation/pinch, move and heart failures, hints/undo/reload, and v1/v2 save migration. Stable mobile screenshots for 4/8/15/22/30 were inspected; independent quality review also checked English narrow/landscape layouts and WebMCP goal completion. Spec review found missing cross-gap lesson geometry in 8/15/22; fixed with an explicit filter and an independently failing-then-passing geometry regression. Both final spec and quality review pass. Physical devices and subjective satisfaction still need player feedback. Publication SHA/version evidence will be recorded in the workspace release log after deploy.
