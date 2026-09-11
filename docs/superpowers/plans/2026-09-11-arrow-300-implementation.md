# Arrow Escape 4.0 implementation

Approved scope: implement the 300 formal cards and 8 optional tutorials from the D1 specification, add newcomer/experienced entry, preserve classic and legacy achievements, validate, publish to the existing Cloudflare Worker/domain. Owner edits in `work/arrow-300`; research/review agents remain read-only.

## 1. Progress and rules
- Add regression tests for v3→v4 migration, chapter entry permissions, tutorial resume/return, independent completion, and formal three-heart failure.
- Implement `engine.ts`, `storage.ts`, tutorial data/helpers: formal progress and training session are separate; chapter access never awards stars; failed formal attempts cannot undo; tutorial budget mistakes can be undone.
- Keep classic 60-level behavior and save key.

## 2. Offline content authoring
- Translate design cards into explicit role/geometry/dependency contracts. Bind P/Q/R, A/B and ordinary pivots to real arrow IDs.
- Produce representative coordinates before expanding. Retain deterministic reverse insertion and verify actual geometry, key dependencies, negative sharing and relevant/irrelevant branches.
- Generate and commit 300 fixed boards, 8 tutorial boards, binding records and audit. No runtime generation and no fallback from a failed card to an unrelated board.
- Check unit steps, non-overlap, directions, cycles, complete solvability, target closure, budget, openings, semantic witnesses and duplicate geometry/graphs. Numeric screening is not a human difficulty measure.

## 3. Player flows and mobile controls
- Add newcomer / experienced / returning entry; experienced default C031; all ten chapter starts are accessible, later entries explain new rules.
- Integrate T01–T06 sequence and contextual T07/T08, skip/resume/revisit.
- Update level browser to ten chapters × thirty levels and earned completion totals.
- Implement region → relation → move hint stages, explicit assisted result, and readable zoom/pan with gesture cancellation.
- Preserve the existing look, language preference, sound, reduced motion and full-height phone layout.

## 4. Validation and release
- Run appropriate unit suites, TypeScript, lint, production build; mobile browser checks for entry, play, failure/retry, hints, zoom, save reload and chapter navigation.
- Read-only review of implementation and content audit. Record human playtesting as outstanding calibration, never infer fun from solver success.
- Check existing Git/Cloudflare pipeline, commit and integrate only this work, push main, deploy once through the established mechanism.
- Verify `https://arrows.fategenie.com/` serves the new version/assets and usable controls. Record commit and deployment ID.
