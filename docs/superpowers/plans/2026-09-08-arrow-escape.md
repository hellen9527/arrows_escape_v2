# Arrow Escape Implementation Plan

**Goal:** Deliver a complete, polished 60-level browser puzzle game.

**Architecture:** Pure TypeScript grid engine and reducer, deterministic level data, validated local persistence, React SVG play surface and accessible Shadcn dialogs. Sites/Vinext provides the web delivery.

**Tech Stack:** TypeScript, Node test runner, React, SVG, CSS, Vinext, Sites.

- [x] Write failing behavioral tests in `tests/engine.test.ts`: four directions, blocking, safe moves, undo, hints, score, all-level solvability, malformed saves.
- [x] Implement `lib/game/engine.ts` and `lib/game/levels.ts` with reverse construction and state transitions. Run `node --experimental-strip-types --test tests/engine.test.ts`.
- [x] Implement first complete play surface in `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, and `components/game/board.tsx`. Show the local preview once it compiles and responds.
- [x] Complete dialogs, saved progress and preferences, chapter selection, synthesized sound, tutorial, finish flow, responsive layout and reduced motion.
- [x] Add a bounded WebMCP game-state/tool surface following the Sites guide.
- [x] Run engine suite, `npx tsc --noEmit`, `npm run lint`, and `npm run build`. Fix concrete failures. Review implementation against the spec.
- [ ] Commit and publish the verified version to the registered private Site. Verify terminal deployment status and deliver the playable link with scope limits.

## Verification record

2026-09-08: all six behavioral tests passed, including full solve checks across 60 levels. Typecheck, authored-code lint and production build passed. Local HTTP response is 200. Independent static review verified replay, victory modal scheduling, feedback event isolation, and geometry for all 1,010 arrows. Real browser interaction, physical mobile devices, and the optional live WebMCP registry have not been tested.
