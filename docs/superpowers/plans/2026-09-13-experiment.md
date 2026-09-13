# Arrow Match playable experiment

Goal: independent playable branch testing directional removal plus a seven-slot triple-matching tray. Current main is the control. Scope: six fixed small boards, all selectable, no timer, undo/restart, safe-path hint, local progress, mobile UI. This experiment does not replace the 300-level campaign.

Reference: BoomBox https://www.boomboxgames.net/ and Zynga's Match Factory announcement https://www.zynga.com/blog/zynga-and-peak-launch-match-factory-creating-3d-puzzle-adventure-fun-on-an-industrial-scale/ support object-matching as a reference. Combining it with directional blockers is our hypothesis, not an established success claim.

A legal arrow goes into the tray. Three of the same symbol disappear before checking capacity. Seven occupied slots ends the attempt; undo remains available. Clicking blocked arrows only explains the blocker. Colors also use A/B/C/D markers. Completion requires an empty board and tray. Successful saved moves are replay-validated; malformed records are ignored. Separate storage namespace. Hints search actual tray state; no claim of safe action on search exhaustion.

Files: lib/experiments/match.ts owns deterministic boards, tray transitions, replay and bounded search; components/experiments/match-game.tsx and match.css own interaction and responsive rendering; Board accepts optional per-arrow palette and symbol; app/page.tsx opens the experiment; app/classic/page.tsx keeps the baseline UI.

Execution: (1) failing rules tests including capacity, blocked input, legal losing choice and undo via replay; (2) implement engine and verify every authored witness; (3) implement accessible UI and storage; (4) test/typecheck/lint/build, actual browser win/loss/undo/reload and mobile size checks; (5) commit on codex/arrow-match and leave main unchanged.

Success criteria for user comparison: can explain why a legal arrow should wait; tray gives understandable choices; matching feels satisfying without making the game visually tiring. Passing automated checks proves rules, not enjoyment.
